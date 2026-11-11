import { describe, expect, it, vi } from "vitest";
import type { CrossV2Client } from "./client";
import { executeCheckedPlan, type WalletPort } from "./execute";
import { checkOffer, planHashOf } from "./planCheck";
import { DISPATCH_ID_TOPIC, providerReference } from "./providerReference";
import type { WireOffer, WireStep } from "./types";
import { CTX, FROM_ASSET, makeOffer, NOW, SENDER } from "./v2Fixtures";

const PROVIDER = "0x6666666666666666666666666666666666666666";
const HASH = `0x${"ab".repeat(32)}`;
const step = (over: Partial<WireStep> & Record<string, unknown>) =>
  ({ dependsOn: [], walletMode: "evm-signer", expiresAt: NOW + 600, readiness: "executable", chain: "eip155:8453", ...over }) as WireStep;

/** A provider-direct plan: optional approve, then one provider transaction, then a server wait. */
function providerOffer(rail: string, tx: { value: string; to?: string }, extraSteps: WireStep[] = []): WireOffer {
  const o = makeOffer();
  const plan = o.execution.plan;
  plan.compiled = { rail, shape: "B" };
  plan.verify = { allowedTargets: [PROVIDER], allowedSpenders: [PROVIDER], expectedRecipient: plan.verify.expectedRecipient };
  plan.steps = [
    step({ id: "approve", type: "approve", token: FROM_ASSET, spender: PROVIDER, amount: "1000000" }),
    step({ id: "send", type: "tx", dependsOn: ["approve"], to: tx.to ?? PROVIDER, data: "0x1234", value: tx.value }),
    ...extraSteps,
    step({ id: "wait", type: "wait", dependsOn: ["send"], walletMode: "server", readiness: "informational", until: "delivered" }),
  ];
  plan.hash = planHashOf(plan);
  o.journey.hops[0]!.planHash = plan.hash;
  return o;
}

describe("provider plans in the local check", () => {
  it("accepts an approve + provider transaction with no native value", () => {
    expect(checkOffer(providerOffer("hyperlane", { value: "0" }), CTX)).toMatchObject({ ok: true, problems: [] });
  });
  it("accepts a native provider fee on an ERC-20 transfer and reports it for disclosure", () => {
    const r = checkOffer(providerOffer("debridge", { value: "1000000000000000" }), CTX);
    expect(r.ok).toBe(true);
    expect(r.extraNative).toBe(1_000_000_000_000_000n);
  });
  it("shows a provider's fee as quoted, above EMPX's 150 bps ceiling, while EMPX orders keep the ceiling", () => {
    const o = providerOffer("layerzero-vt", { value: "0" });
    o.execution.plan.fees = { maxTotalBps: 420, breakdown: [] };
    o.execution.plan.hash = planHashOf(o.execution.plan);
    o.journey.hops[0]!.planHash = o.execution.plan.hash;
    expect(checkOffer(o, CTX)).toMatchObject({ ok: true, problems: [] });
    expect(checkOffer(makeOffer({ plan: { fees: { maxTotalBps: 151, breakdown: [] } } }), CTX).ok).toBe(false);
  });
  it("still refuses a provider transaction to a contract the plan does not allow", () => {
    expect(checkOffer(providerOffer("hyperlane", { value: "0", to: SENDER }), CTX).problems.join()).toMatch(/does not allow/);
  });
  it("refuses a route with a blocked wallet step", () => {
    const blocked = step({ id: "sol", type: "native_tx", readiness: "blocked", format: "solana-versioned-tx", payload: "x" });
    expect(checkOffer(providerOffer("debridge", { value: "0" }, [blocked]), CTX).problems.join()).toMatch(/blocked/);
  });
  it("refuses a provider signature", () => {
    const sig = step({ id: "intent", type: "typed_sign", purpose: "provider-intent", domain: {}, types: {}, primaryType: "X", message: {} });
    expect(checkOffer(providerOffer("debridge", { value: "0" }, [sig]), CTX).problems.join()).toMatch(/provider signature/);
  });
});

describe("providerReference", () => {
  it("uses the source transaction hash where the provider tracks by it", () => {
    for (const rail of ["gaszip", "thorchain", "maya", "chainflip", "teleswap"]) expect(providerReference(rail, HASH, 42161)).toBe(HASH);
  });
  it("builds Hyperlane's <destination chain id>:<message id> from the DispatchId log", () => {
    const id = `0x${"cd".repeat(32)}`;
    expect(providerReference("hyperlane", HASH, 42161, [{ address: PROVIDER, topics: [DISPATCH_ID_TOPIC, id] }])).toBe(`42161:${id}`);
    expect(providerReference("hyperlane", HASH, 42161, [])).toBeNull();
  });
  it("returns null for rails whose id the server records itself", () => {
    expect(providerReference("debridge", HASH, 42161)).toBeNull();
    expect(providerReference("layerzero-vt", HASH, 42161)).toBeNull();
  });
});

describe("executeCheckedPlan on a provider-direct intent", () => {
  function setup(kind: "contract" | "provider-direct") {
    const client = {
      commit: vi.fn(async () => ({ intentId: "i-9", kind, replayed: false })),
      reportStep: vi.fn(async () => ({ accepted: true, remaining: [] })),
      attachReference: vi.fn(async () => ({ attached: true })),
    } as unknown as CrossV2Client;
    const wallet: WalletPort = {
      address: SENDER,
      ensureChain: vi.fn(async () => undefined),
      allowance: vi.fn(async () => 0n),
      sendTransaction: vi.fn(async () => ({ hash: HASH })),
      signTypedData: vi.fn(async () => "0x"),
    };
    return { client, wallet };
  }
  it("sends approve then the provider transaction, then links the reference", async () => {
    const { client, wallet } = setup("provider-direct");
    const o = providerOffer("gaszip", { value: "5" });
    const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet);
    expect(r).toMatchObject({ done: ["approve", "send"], waiting: [], tracking: "attached" });
    expect((wallet.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[1]![0]).toMatchObject({ to: PROVIDER, value: 5n });
    expect(client.attachReference).toHaveBeenCalledWith("i-9", HASH, undefined);
  });
  it("sends nothing for rails whose reference the server records itself", async () => {
    const { client, wallet } = setup("provider-direct");
    const o = providerOffer("debridge", { value: "0" });
    const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet);
    expect(r.tracking).toBe("not-needed");
    expect(client.attachReference).not.toHaveBeenCalled();
  });
  it("never attaches a reference to a contract intent", async () => {
    const { client, wallet } = setup("contract");
    const o = providerOffer("gaszip", { value: "0" });
    expect((await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet)).tracking).toBe("not-needed");
  });
});

