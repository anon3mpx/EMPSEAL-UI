import { describe, expect, it, vi } from "vitest";
import type { CrossV2Client } from "./client";
import { EMPX_DEPLOYMENTS } from "./deployments";
import type { WalletPort } from "./execute";
import { checkSecondOrder, checkTwoHop } from "./journeyCheck";
import { forgetJourney, openJourneys, rememberJourney } from "./journeyStore";
import { planHashOf } from "./planCheck";
import type { JourneyDetail, TwoHopQuote, WirePlan, WireStep } from "./types";
import { startTwoHop } from "./useV2Journey";
import { CTX, makeOffer, NOW, RECIPIENT, SENDER } from "./v2Fixtures";

const ARB_USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const OP_USDC = "0x0b2c639c533813f4aa9d7837caf62653d097ff85";
const VIA = `eip155:42161/erc20:${ARB_USDC}`;
const FINAL = `eip155:10/erc20:${OP_USDC}`;
type Sign = Extract<WireStep, { type: "typed_sign" }> & { message: Record<string, any> };
const reseal = (p: WirePlan) => ((p.hash = planHashOf(p)), p);

/** Leg 1: Base USDC -> Arbitrum USDC, paid to the sender's own address. */
function hop1Plan(): WirePlan {
  const p = makeOffer().execution.plan;
  p.id = "hop1";
  p.journey.recipient = SENDER;
  p.verify.expectedRecipient = SENDER;
  (p.steps[1] as Sign).message.witness.recipient = SENDER;
  return reseal(p);
}
/** Leg 2: Arbitrum USDC -> Optimism USDC, paid to the requested recipient. */
function hop2Plan(amount = "990000"): WirePlan {
  const p = makeOffer().execution.plan;
  const arb = EMPX_DEPLOYMENTS[42161]!;
  p.id = "hop2";
  p.journey = { from: { asset: VIA, amount, decimals: 6 }, toAsset: FINAL, recipient: RECIPIENT };
  p.amounts = { quoted: { asset: FINAL, amount: "980000", decimals: 6 }, minimum: { asset: FINAL, amount: "975000", decimals: 6 } };
  p.delivers = { asset: FINAL, minAmount: "975000", isRequested: true };
  const approve = p.steps[0] as Extract<WireStep, { type: "approve" }>;
  approve.chain = "eip155:42161";
  approve.token = VIA;
  approve.amount = amount;
  const s = p.steps[1] as Sign;
  s.domain = { ...s.domain, chainId: 42161 };
  s.message.permitted = { token: ARB_USDC, amount };
  s.message.witness.source = { token: ARB_USDC, amount, rail: arb.rails.cctp.rail };
  s.message.witness.destination = { chainId: "10", settler: EMPX_DEPLOYMENTS[10]!.rails.cctp.settler };
  return reseal(p);
}
function twoHop(over: (q: TwoHopQuote) => void = () => undefined): TwoHopQuote {
  const hop1 = hop1Plan();
  const hop2 = hop2Plan();
  const base = makeOffer().journey;
  const q: TwoHopQuote = {
    kind: "two_hop",
    via: { chain: "eip155:42161", asset: VIA },
    journey: {
      ...base, mode: "sequential_wallet", toAsset: FINAL, recipient: RECIPIENT, minimumBasis: "second_order_on_expected_receipt",
      hops: [
        { order: 1, planId: hop1.id, planHash: hop1.hash, rail: "cctp", expiresAt: NOW + 600 },
        { order: 2, planId: hop2.id, planHash: hop2.hash, rail: "cctp", expiresAt: NOW + 600 },
      ],
    },
    execution: { hop1: { plan: hop1 }, hop2Preview: { plan: hop2 } },
  };
  over(q);
  return q;
}
const ctx = { ...CTX, toAsset: FINAL };

describe("checkTwoHop", () => {
  it("accepts two orders where leg 1 pays the sender at the intermediate chain and leg 2 pays the recipient", () => {
    const r = checkTwoHop(twoHop(), ctx);
    expect(r.problems).toEqual([]);
    expect(r.hop1?.sourceChainId).toBe(8453);
  });
  it("refuses a first leg that pays anyone but the sender", () => {
    const q = twoHop((x) => {
      const p = x.execution.hop1.plan;
      p.journey.recipient = RECIPIENT;
      p.verify.expectedRecipient = RECIPIENT;
      reseal(p);
      x.journey.hops[0]!.planHash = p.hash;
    });
    expect(checkTwoHop(q, ctx).problems.join()).toMatch(/first order: the plan's recipient/);
  });
  it("refuses a journey that does not name both plans, or another transfer", () => {
    expect(checkTwoHop(twoHop((x) => { x.journey.hops[1]!.planHash = "f".repeat(64); }), ctx).problems.join()).toMatch(/second order is not this plan/);
    expect(checkTwoHop(twoHop(), { ...ctx, recipient: SENDER }).problems.join()).toMatch(/does not describe the requested transfer/);
    expect(checkTwoHop(twoHop((x) => { x.journey.mode = "direct"; }), ctx).ok).toBe(false);
  });
});

describe("checkSecondOrder", () => {
  const detail = (plan: WirePlan, received = { asset: VIA, amount: "990000", chain: "eip155:42161" }): JourneyDetail => ({
    view: { journeyId: "j1", state: "hop2_ready_to_sign", funds: "with_user_at_intermediate", nextAction: "sign_hop2", hop1: { intentId: "i1", status: "delivered" }, hop2: { intentId: "i2", status: "quoted" }, received },
    journey: null,
    next: { intentId: "i2", execution: { plan } },
  });
  const want = { toAsset: FINAL, recipient: RECIPIENT, sender: SENDER, now: NOW };
  it("accepts an order spending exactly what arrived", () => {
    expect(checkSecondOrder(detail(hop2Plan()), want)).toMatchObject({ ok: true, sourceChainId: 42161 });
  });
  it("refuses an order spending more than arrived, or paying someone else", () => {
    expect(checkSecondOrder(detail(hop2Plan("995000")), want).problems.join()).toMatch(/input is not what was requested/);
    expect(checkSecondOrder(detail(hop2Plan()), { ...want, recipient: SENDER }).ok).toBe(false);
  });
});

describe("startTwoHop", () => {
  it("commits only the first order with both plans unchanged, remembers it, then runs the first order's steps", async () => {
    const calls: string[] = [];
    const client = {
      commitJourney: vi.fn(async () => (calls.push("commit"), { journeyId: "j1", hop1IntentId: "i1", replayed: false })),
      reportStep: vi.fn(async () => (calls.push("report"), { accepted: true, remaining: [] })),
      submitOrder: vi.fn(async (id: string) => (calls.push(`order:${id}`), { state: "accepted" as const })),
    } as unknown as CrossV2Client;
    const wallet: WalletPort = {
      address: SENDER,
      ensureChain: vi.fn(async () => undefined),
      allowance: vi.fn(async () => 0n),
      sendTransaction: vi.fn(async () => (calls.push("send"), { hash: `0x${"1".repeat(64)}` })),
      signTypedData: vi.fn(async () => (calls.push("sign"), "0xsig")),
    };
    const q = twoHop();
    const remember = vi.fn((id: string) => void calls.push(`remember:${id}`));
    await startTwoHop(client, q, { plan: q.execution.hop1.plan, sourceChainId: 8453 }, wallet, { commitKey: "k1", remember });
    expect(calls).toEqual(["commit", "remember:j1", "send", "report", "sign", "order:i1"]);
    expect((client.commitJourney as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([q, SENDER, "k1"]);
  });
});

describe("journeyStore", () => {
  it("keeps open journeys per wallet, newest first, and forgets one", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
    const j = (id: string) => ({ journeyId: id, createdAt: 1, fromChain: "eip155:8453", viaChain: "eip155:42161", toChain: "eip155:10", toAsset: FINAL, recipient: RECIPIENT });
    rememberJourney(SENDER, j("a"));
    rememberJourney(SENDER.toUpperCase().replace("0X", "0x"), j("b"));
    expect(openJourneys(SENDER).map((x) => x.journeyId)).toEqual(["b", "a"]);
    forgetJourney(SENDER, "b");
    expect(openJourneys(SENDER).map((x) => x.journeyId)).toEqual(["a"]);
    vi.unstubAllGlobals();
  });
  it("offers nothing (and never throws) when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => rememberJourney(SENDER, { journeyId: "z", createdAt: 1, fromChain: "", viaChain: "", toChain: "", toAsset: "", recipient: "" })).not.toThrow();
    expect(openJourneys(SENDER)).toEqual([]);
    vi.unstubAllGlobals();
  });
});
