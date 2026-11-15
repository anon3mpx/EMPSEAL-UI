// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createCrossV2Client, CrossV2ApiError } from "./client";
import { executeCheckedPlan } from "./execute";
import { makeOffer, NOW } from "./v2Fixtures";
import { describeV2Error } from "./errors";
import { checkPlan, planHashOf } from "./planCheck";
import { createSolanaWallet } from "./solanaWallet";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
const owner = Keypair.fromSeed(new Uint8Array(32).fill(1));
const chain = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
function offer(rail: "cctp-from-solana" | "jupiter" = "cctp-from-solana") {
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: owner.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [],
    }).compileToV0Message(),
  );
  const payload = Buffer.from(tx.serialize()).toString("base64");
  const toAsset = rail === "jupiter" ? `${chain}/slip44:501` : "eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const recipient = rail === "jupiter" ? owner.publicKey.toBase58() : "0x2222222222222222222222222222222222222222";
  const o = makeOffer({
    plan: {
      compiled: { rail, shape: "C" },
      journey: {
        sender: owner.publicKey.toBase58(),
        from: { asset: `${chain}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, amount: "1000000", decimals: 6 },
        toAsset,
        recipient,
      },
      amounts: { quoted: { asset: toAsset, amount: "990000", decimals: 6 }, minimum: { asset: toAsset, amount: "985000", decimals: 6 } },
      delivers: { asset: toAsset, minAmount: "985000", isRequested: true },
      verify: { allowedTargets: [], allowedSpenders: [], expectedRecipient: recipient },
      steps: [
        {
          id: "burn",
          dependsOn: [],
          type: "native_tx",
          chain,
          format: "solana-versioned-tx",
          payload,
          submitVia: rail === "jupiter" ? { kind: "jupiter-execute", requestId: "jup-1" } : { kind: "rpc" },
          walletMode: "solana-signer",
          readiness: "executable",
          expiresAt: NOW + 60,
        },
      ],
    },
  });
  return o;
}
afterEach(() => {
  vi.useRealTimers();
});
it.each(["cctp-from-solana", "jupiter"] as const)("%s signs once, submits once, records server signature and never attaches a client reference", async (rail) => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
  const o = offer(rail),
    signed = "signed",
    fetcher = vi.fn(
      async (url: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(url).endsWith("/solana")
              ? { signature: "solsig", replayed: false }
              : { intentId: "i", kind: "provider-direct", replayed: false },
          ),
        ),
    );
  const client = createCrossV2Client({ fetchImpl: fetcher }),
    sign = vi.fn(async () => signed),
    onSent = vi.fn();
  const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, NON_EVM_CHAIN_IDS.SOL, null, {
    sender: owner.publicKey.toBase58(),
    solanaWallet: { publicKey: () => owner.publicKey.toBase58(), connect: async () => owner.publicKey.toBase58(), signTransaction: sign },
    onSent,
  });
  expect(sign).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]?.[0]).toContain("/v2/intents/i/solana");
  expect(r).toMatchObject({ done: ["burn"], tracking: "attached", txs: [{ hash: "solsig", chainId: NON_EVM_CHAIN_IDS.SOL }] });
  expect(onSent).toHaveBeenCalledWith({ stepId: "burn", hash: "solsig", chainId: NON_EVM_CHAIN_IDS.SOL });
});
it("refuses a fee payer mismatch before asking Phantom to sign", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
  const o = offer(),
    sign = vi.fn(),
    client = createCrossV2Client({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ intentId: "i", kind: "provider-direct" }))),
    });
  await expect(
    executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, NON_EVM_CHAIN_IDS.SOL, null, {
      sender: owner.publicKey.toBase58(),
      solanaWallet: { publicKey: () => PublicKey.default.toBase58(), connect: async () => "", signTransaction: sign },
    }),
  ).rejects.toThrow(/fee payer/);
  expect(sign).not.toHaveBeenCalled();
});
it("local gate accepts only the supported Solana native rail and matching sender", () => {
  const o = offer(),
    p = o.execution.plan,
    ctx = {
      fromAsset: p.journey.from.asset,
      amount: p.journey.from.amount,
      toAsset: p.journey.toAsset,
      sender: owner.publicKey.toBase58(),
      recipient: p.journey.recipient,
      now: NOW,
    };
  expect(checkPlan(p, ctx).problems).toEqual([]);
  p.compiled.rail = "unsupported";
  p.hash = planHashOf(p);
  expect(checkPlan(p, ctx).ok).toBe(false);
});
it("local gate accepts a Jupiter signer step only with its Jupiter execute binding", () => {
  const p = offer("jupiter").execution.plan;
  const ctx = { fromAsset: p.journey.from.asset, amount: p.journey.from.amount, toAsset: p.journey.toAsset, sender: owner.publicKey.toBase58(), recipient: p.journey.recipient, now: NOW };
  expect(checkPlan(p, ctx).problems).toEqual([]);
  const step = p.steps[0]!;
  if (step.type !== "native_tx") throw new Error("fixture");
  step.submitVia = { kind: "rpc" };
  p.hash = planHashOf(p);
  expect(checkPlan(p, ctx).ok).toBe(false);
});
it.each([
  ["sol", "Not enough SOL for fees"],
  ["usdc", "Not enough USDC on Solana"],
])("insufficient %s error gives actionable copy", (need, text) => {
  expect(describeV2Error(new CrossV2ApiError(422, "SOLANA_INSUFFICIENT_BALANCE", "", false, { details: { need } })).text).toBe(text);
});
it("wallet mutation and expiry show safe refusal and requote guidance", () => {
  expect(describeV2Error(new CrossV2ApiError(422, "SOLANA_TX_MODIFIED", "", false)).text).toBe(
    "Your wallet changed the transaction, so it was not sent. Try again, or disable transaction add-ons in the wallet.",
  );
  expect(describeV2Error(new CrossV2ApiError(409, "REQUOTE_REQUIRED", "", false))).toMatchObject({ requote: true });
});
it("Phantom signs only the payer and preserves the event signature without broadcasting", async () => {
  const event = Keypair.fromSeed(new Uint8Array(32).fill(2));
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: owner.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [
        new TransactionInstruction({
          programId: SystemProgram.programId,
          keys: [{ pubkey: event.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.alloc(0),
        }),
      ],
    }).compileToV0Message(),
  );
  tx.sign([event]);
  const before = Buffer.from(tx.signatures[1]!);
  const sign = vi.fn(async (t: VersionedTransaction) => {
      t.sign([owner]);
      return t;
    }),
    broadcast = vi.fn();
  const provider = { publicKey: owner.publicKey, connect: async () => {}, signTransaction: sign, signAndSendTransaction: broadcast };
  const wallet = createSolanaWallet(() => provider);
  const signed = VersionedTransaction.deserialize(
    Buffer.from(await wallet.signTransaction(Buffer.from(tx.serialize()).toString("base64")), "base64"),
  );
  expect(Buffer.from(signed.signatures[1]!)).toEqual(before);
  expect(signed.signatures[0]).not.toEqual(new Uint8Array(64));
  expect(broadcast).not.toHaveBeenCalled();
});
