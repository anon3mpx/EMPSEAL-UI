import { VersionedTransaction } from "@solana/web3.js";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import { decodeSolanaTransactionBytes } from "../execution/solanaTransaction";
import { CrossV2ApiError, type CrossV2Client } from "./client";
import type { ExecuteOptions, ExecuteResult } from "./execute";
import type { WirePlan } from "./types";
import { solanaSubmissionMatches } from "./solanaSwap";

export async function performSolanaSteps(
  client: CrossV2Client,
  intentId: string,
  plan: WirePlan,
  sourceChainId: number,
  o: ExecuteOptions,
): Promise<ExecuteResult> {
  const steps = plan.steps.filter((s) => s.walletMode !== "server" && s.readiness === "executable");
  const s = steps[0];
  if (
    sourceChainId !== NON_EVM_CHAIN_IDS.SOL ||
    steps.length !== 1 ||
    s?.type !== "native_tx" ||
    s.walletMode !== "solana-signer" ||
    s.format !== "solana-versioned-tx" ||
    !solanaSubmissionMatches(plan.compiled.rail, s.submitVia)
  )
    throw new Error("Unsupported Solana wallet steps.");
  const wallet = o.solanaWallet;
  if (!wallet) throw new Error("Connect Phantom to sign this transfer.");
  if (Math.min(plan.expiresAt, s.expiresAt) <= Math.floor(Date.now() / 1000))
    throw new CrossV2ApiError(409, "REQUOTE_REQUIRED", "The Solana transaction expired.", false);
  o.signal?.throwIfAborted();
  const tx = VersionedTransaction.deserialize(decodeSolanaTransactionBytes(s.payload));
  const payer = tx.message.staticAccountKeys[0]?.toBase58();
  if (!payer || wallet.publicKey() !== payer || plan.journey.sender !== payer || o.sender !== payer)
    throw new Error("Connected Solana wallet does not match the transaction fee payer.");
  o.onStep?.(s.id, "wallet");
  const signedTransaction = await wallet.signTransaction(s.payload);
  o.onStep?.(s.id, "confirming");
  let result: { signature: string; replayed: boolean };
  try {
    result = await client.submitSolana(intentId, signedTransaction, o.signal);
  } catch (e) {
    if (e instanceof CrossV2ApiError) throw e;
    throw new Error(
      "The Solana submission result is unknown. Check this transfer's status before creating another; do not sign a replacement.",
    );
  }
  const sent = { stepId: s.id, chainId: sourceChainId, hash: result.signature };
  o.onSent?.(sent);
  o.onStep?.(s.id, "done");
  return { intentId, done: [s.id], waiting: [], tracking: "attached", txs: [sent] };
}
