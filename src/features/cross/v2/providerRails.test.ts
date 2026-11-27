import { describe, expect, it, vi } from "vitest";
import type { CrossV2Client } from "./client";
import { executeCheckedPlan, type WalletPort } from "./execute";
import { bindDeposit, checkOffer, checkPlan, planHashOf, planToExecute } from "./planCheck";
import { DISPATCH_ID_TOPIC, providerReference } from "./providerReference";
import type { WireOffer, WirePlan, WireStep } from "./types";
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
  it("shows a provider's fee as quoted; EMPX orders pass up to the router's 10000 bps hard cap, not past it", () => {
    const o = providerOffer("layerzero-vt", { value: "0" });
    o.execution.plan.fees = { maxTotalBps: 420, breakdown: [] };
    o.execution.plan.hash = planHashOf(o.execution.plan);
    o.journey.hops[0]!.planHash = o.execution.plan.hash;
    expect(checkOffer(o, CTX)).toMatchObject({ ok: true, problems: [] });
    expect(checkOffer(makeOffer({ plan: { fees: { maxTotalBps: 151, breakdown: [] } } }), CTX).ok).toBe(true);
    expect(checkOffer(makeOffer({ plan: { fees: { maxTotalBps: 10_001, breakdown: [] } } }), CTX).ok).toBe(false);
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
    expect(providerReference("bridge", HASH, 42161)).toBeNull();
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


describe("Bridge: a fee leg, then a deposit whose address is made at commit", () => {
  const FEE_TO = "0x9a611d7a2dc613661213ea9d1163285f450c495b";
  const DEPOSIT_TO = "0x4444444444444444444444444444444444444444";
  const TRANSFER_ID = "8706afc3-3f78-4607-9b90-044a6bc7d0d3";
  const TOKEN = FROM_ASSET.split("/erc20:")[1]!;
  const transfer = (to: string, amount: bigint) =>
    `0xa9059cbb${to.slice(2).toLowerCase().padStart(64, "0")}${amount.toString(16).padStart(64, "0")}`;
  function bridgeOffer(o: { feeTo?: string; fee?: bigint; disclosed?: bigint; deposit?: bigint; data?: string; address?: string } = {}): WireOffer {
    const offer = makeOffer();
    const plan = offer.execution.plan;
    plan.compiled = { rail: "bridge", shape: "C" };
    plan.verify = { allowedTargets: [TOKEN], allowedSpenders: [], expectedRecipient: plan.verify.expectedRecipient };
    plan.fees = {
      maxTotalBps: 55,
      feeRecipient: FEE_TO,
      breakdown: [{ kind: "protocol", amount: { asset: FROM_ASSET, amount: String(o.disclosed ?? 3_000n), decimals: 6 } }],
    };
    plan.steps = [
      step({ id: "fee-leg", type: "tx", to: TOKEN, data: o.data ?? transfer(o.feeTo ?? FEE_TO, o.fee ?? 3_000n), value: "0" }),
      step({ id: "deposit", type: "deposit", dependsOn: ["fee-leg"], walletMode: "external-wallet", readiness: "blocked", addressAt: "commit",
        address: o.address ?? "", asset: FROM_ASSET, amount: String(o.deposit ?? 997_000n) }),
      step({ id: "wait", type: "wait", dependsOn: ["deposit"], walletMode: "server", readiness: "informational", until: "delivered" }),
    ];
    plan.hash = planHashOf(plan);
    offer.journey.hops[0]!.planHash = plan.hash;
    return offer;
  }
  const bound = (quoted: WirePlan, over: { address?: string; expiresAt?: number } = {}) =>
    bindDeposit(quoted, { address: over.address ?? DEPOSIT_TO, trackingRef: TRANSFER_ID, expiresAt: over.expiresAt ?? quoted.expiresAt });

  it("accepts the disclosed fee to the disclosed recipient, then the deposit of the rest, before its address exists", () => {
    expect(checkOffer(bridgeOffer(), CTX)).toMatchObject({ ok: true, problems: [] });
  });
  it("refuses a commit-bound deposit that already names an address", () => {
    expect(checkOffer(bridgeOffer({ address: DEPOSIT_TO }), CTX).problems.join()).toMatch(/already names an address/);
  });
  it("refuses a fee transfer to anyone but the plan's fee recipient", () => {
    expect(checkOffer(bridgeOffer({ feeTo: SENDER }), CTX).problems.join()).toMatch(/not the plan's fee recipient/);
  });
  it("refuses a fee transfer that is not the fee the plan discloses", () => {
    expect(checkOffer(bridgeOffer({ fee: 3_001n }), CTX).problems.join()).toMatch(/not the EMPX fee it discloses/);
    expect(checkOffer(bridgeOffer({ fee: 3_001n, disclosed: 3_001n }), CTX).problems.join()).toMatch(/more than the amount being sent/);
  });
  it("refuses a fee and deposit that together exceed the input", () => {
    expect(checkOffer(bridgeOffer({ deposit: 997_001n }), CTX).problems.join()).toMatch(/more than the amount being sent/);
  });
  it("refuses a malformed transfer", () => {
    expect(checkOffer(bridgeOffer({ data: `${transfer(FEE_TO, 3_000n)}00` }), CTX).problems.join()).toMatch(/malformed token transfer/);
  });

  it("executes the bound plan only when it is the quote with just the deposit address, transfer id and a no-later expiry filled in", () => {
    const quoted = bridgeOffer().execution.plan;
    const b = bound(quoted, { expiresAt: quoted.expiresAt - 60 });
    expect(planToExecute(quoted, b)).toBe(b);
    expect(checkPlan(b, CTX)).toMatchObject({ ok: true });
    expect(() => planToExecute(quoted, undefined)).toThrow(/does not match this quote/);
    expect(() => planToExecute(quoted, bound(quoted, { expiresAt: quoted.expiresAt + 60 }))).toThrow(/does not match/);
    expect(() => planToExecute(quoted, bound(quoted, { address: "not-an-address" }))).toThrow(/does not match/);
    // Re-sealed with a larger deposit: its own hash is consistent, but it is not the quote's binding.
    const tampered = structuredClone(b);
    (tampered.steps[1] as { amount: string }).amount = "998000";
    tampered.hash = planHashOf(tampered);
    expect(() => planToExecute(quoted, tampered)).toThrow(/does not match/);
  });

  function setup(committedPlan?: WirePlan) {
    const client = {
      commit: vi.fn(async () => ({ intentId: "i-9", kind: "provider-direct", replayed: false, ...(committedPlan ? { plan: committedPlan } : {}) })),
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
  it("pays the fee and then the deposit address the commit made; the server tracks the transfer itself", async () => {
    const o = bridgeOffer();
    const { client, wallet } = setup(bound(o.execution.plan));
    const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet);
    expect(r).toMatchObject({ done: ["fee-leg", "deposit"], waiting: [], tracking: "not-needed" });
    expect((wallet.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[1]![0]).toMatchObject({ to: TOKEN, data: transfer(DEPOSIT_TO, 997_000n) });
    expect(client.attachReference).not.toHaveBeenCalled();
  });
  it("sends nothing when the commit does not return a matching bound plan", async () => {
    const o = bridgeOffer();
    const { client, wallet } = setup();
    await expect(executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet)).rejects.toThrow(/does not match this quote/);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });
});
