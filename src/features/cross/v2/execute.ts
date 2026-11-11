// Performs a checked plan's wallet steps in dependency order on the user's own wallet and reports each transaction to the API. Mirrors @empx/cross `performSteps` (unpublished) for the steps this slice supports:
// approve, tx, and the EMPX order signature. Nothing is auto-resent after a broadcast: an unclear send/report stops with ambiguousSubmission so the user is told, never retried.
import { encodeFunctionData, parseAbi } from "viem";
import type { CrossV2Client } from "./client";
import { providerReference, referenceKind, type ReceiptLog } from "./providerReference";
import type { WirePlan, WireStep } from "./types";

export interface WalletPort {
  readonly address: string;
  /** Switches the wallet to this EVM chain; rejects if the user declines. */
  ensureChain(chainId: number): Promise<void>;
  /** Current allowance `owner` granted `spender` on an ERC-20 (read-only). Without it the plan's exact approve is always sent. */
  allowance?(chainId: number, token: string, spender: string): Promise<bigint>;
  /** Logs of a mined transaction (read-only); needed to link Hyperlane transfers for tracking. */
  receiptLogs?(chainId: number, hash: string): Promise<ReceiptLog[]>;
  sendTransaction(tx: { chainId: number; to: string; data: string; value: bigint }): Promise<{ hash: string }>;
  signTypedData(args: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<string>;
}

export class AmbiguousSubmission extends Error {
  constructor(readonly stepId: string, readonly txHash: string | undefined, readonly detail: unknown) {
    super(
      txHash
        ? `Step ${stepId} was sent (${txHash}) but the API did not confirm it. Do not resend; check the transaction.`
        : `Step ${stepId} may or may not have been sent from the wallet. Check the wallet before trying again.`,
    );
    this.name = "AmbiguousSubmission";
  }
}

export type StepPhase = "wallet" | "confirming" | "done";
export interface ExecuteOptions {
  onStep?: (stepId: string, phase: StepPhase) => void;
  signal?: AbortSignal;
  stepTimeoutMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Reuse the same commit key to retry the SAME request after a network failure. */
  commitKey?: string;
  /** The intent exists on the server: called before any wallet step, so a stop midway can still be tracked and resumed. */
  onCommitted?: (intentId: string) => void;
  /** A wallet transaction was broadcast (before the API confirms it), so its explorer link is never lost. */
  onSent?: (tx: { stepId: string; chainId: number; hash: string }) => void;
  /** The user's explicit acceptance of a held-back (warning/unpriced) route, sent with the commit. */
  humanAcceptance?: Parameters<CrossV2Client["commit"]>[5];
}
export interface ExecuteResult {
  intentId: string;
  done: string[];
  /** Wallet steps not run because a step they depend on was not completed here. */
  waiting: string[];
  /** Provider-direct intents: whether the provider reference was linked so the server can track delivery. */
  tracking: "not-needed" | "attached" | "unavailable" | "failed";
  /** Transactions the wallet sent and the API accepted, in order. */
  txs: Array<{ stepId: string; chainId: number; hash: string }>;
}

const ERC20_ABI = parseAbi(["function approve(address spender, uint256 amount)"]);
const chainNum = (caip2: string): number => Number(caip2.split(":")[1]);

export async function executeCheckedPlan(
  client: CrossV2Client,
  offer: { plan: WirePlan; journey: Parameters<CrossV2Client["commit"]>[1] },
  sourceChainId: number,
  wallet: WalletPort,
  o: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const { plan, journey } = offer;
  const { intentId, kind } = await client.commit(plan, journey, wallet.address, o.commitKey, o.signal, o.humanAcceptance);
  o.onCommitted?.(intentId);
  return performSteps(client, intentId, kind, plan, sourceChainId, wallet, o);
}

export { intentKindOf } from "./planCheck";

/** Runs the wallet steps of an intent that already exists (a committed plan, or a journey leg the server created). */
export async function performSteps(
  client: CrossV2Client,
  intentId: string,
  kind: "contract" | "provider-direct",
  plan: WirePlan,
  sourceChainId: number,
  wallet: WalletPort,
  o: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const walletSteps = (plan.steps as WireStep[]).filter((s) => s.walletMode !== "server" && s.readiness === "executable");
  const byId = new Map((plan.steps as WireStep[]).map((s) => [s.id, s]));
  const done = new Set<string>();
  const satisfied = (d: string) => done.has(d) || byId.get(d)?.readiness === "informational";
  const remaining = [...walletSteps];

  const hashes = new Map<string, string>();
  const txs: ExecuteResult["txs"] = [];
  const sendAndConfirm = async (tx: { chainId: number; to: string; data: string; value: bigint }, stepId: string) => {
    let hash: string;
    o.onStep?.(stepId, "wallet");
    try {
      hash = (await wallet.sendTransaction(tx)).hash;
    } catch (e) {
      throw new AmbiguousSubmission(stepId, undefined, e);
    }
    o.onSent?.({ stepId, chainId: tx.chainId, hash });
    o.onStep?.(stepId, "confirming");
    const deadline = Date.now() + (o.stepTimeoutMs ?? 180_000);
    for (;;) {
      let r;
      try {
        r = await client.reportStep(intentId, stepId, hash, o.signal);
      } catch (e) {
        throw new AmbiguousSubmission(stepId, hash, e);
      }
      if (r.accepted) {
        hashes.set(stepId, hash);
        txs.push({ stepId, chainId: tx.chainId, hash });
        return;
      }
      if (!/not mined yet/.test(r.reason ?? ""))
        throw new AmbiguousSubmission(stepId, hash, new Error(r.reason ?? "the API did not accept the transaction"));
      if (Date.now() > deadline) throw new AmbiguousSubmission(stepId, hash, new Error("still not mined after the wait"));
      await sleep(o.pollMs ?? 2_000);
    }
  };

  for (let next = remaining.find((s) => s.dependsOn.every(satisfied)); next; next = remaining.find((s) => s.dependsOn.every(satisfied))) {
    remaining.splice(remaining.indexOf(next), 1);
    if (o.signal?.aborted) throw new Error("aborted");
    const s = next;
    if (s.type === "approve") {
      const chainId = chainNum(s.chain);
      await wallet.ensureChain(chainId);
      const amount = BigInt(s.amount);
      const have = wallet.allowance ? await wallet.allowance(chainId, s.token.split("erc20:")[1] ?? "", s.spender) : 0n;
      if (have < amount) {
        await sendAndConfirm(
          {
            chainId,
            to: s.token.split("erc20:")[1] ?? "",
            data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [s.spender as `0x${string}`, amount] }),
            value: 0n,
          },
          s.id,
        );
      }
      done.add(s.id);
    } else if (s.type === "tx") {
      const chainId = chainNum(s.chain);
      await wallet.ensureChain(chainId);
      await sendAndConfirm({ chainId, to: s.to, data: s.data, value: BigInt(s.value) }, s.id);
      done.add(s.id);
    } else if (s.type === "typed_sign" && s.purpose === "empx-order") {
      await wallet.ensureChain(sourceChainId);
      o.onStep?.(s.id, "wallet");
      const signature = await wallet.signTypedData({ domain: s.domain, types: s.types, primaryType: s.primaryType, message: s.message });
      o.onStep?.(s.id, "confirming");
      await client.submitOrder(intentId, signature, o.signal);
      done.add(s.id);
    } else {
      break; // checkOffer refuses these before commit; never guess at one
    }
    o.onStep?.(s.id, "done");
  }
  const waiting = remaining.map((s) => s.id);
  const tracking = kind === "provider-direct" && waiting.length === 0 ? await linkReference(client, intentId, plan, walletSteps, hashes, wallet, o.signal) : "not-needed";
  return { intentId, done: [...done], waiting, tracking, txs };
}

/** Links the provider's reference from the last transaction sent. Never throws: delivery does not depend on it, only the server's tracking does. */
async function linkReference(
  client: CrossV2Client, intentId: string, plan: WirePlan, steps: WireStep[], hashes: Map<string, string>, wallet: WalletPort, signal?: AbortSignal,
): Promise<ExecuteResult["tracking"]> {
  const rail = plan.compiled.rail;
  const kind = referenceKind(rail);
  if (kind === "server") return "not-needed";
  const last = [...steps].reverse().find((s) => s.type === "tx" && hashes.has(s.id));
  const hash = last ? hashes.get(last.id)! : undefined;
  if (!kind || !last || !hash || last.type !== "tx") return "unavailable";
  try {
    const logs = kind === "hyperlane-message" && wallet.receiptLogs ? await wallet.receiptLogs(chainNum(last.chain), hash) : undefined;
    const ref = providerReference(rail, hash, chainNum(plan.journey.toAsset.split("/")[0] ?? "") || null, logs);
    if (!ref) return "unavailable";
    await client.attachReference(intentId, ref, signal);
    return "attached";
  } catch {
    return "failed";
  }
}
