import { describe, expect, it } from "vitest";
import { checkOffer, planHashOf } from "./planCheck";
import { CTX, makeOffer, RECIPIENT, SENDER } from "./v2Fixtures";
import type { WireOffer } from "./types";

const problems = (o: WireOffer | null | undefined, ctx = CTX) => {
  const r = checkOffer(o, ctx);
  expect(r.ok).toBe(false);
  return r.problems.join(" | ");
};

describe("checkOffer", () => {
  it("accepts a sealed offer for the requested transfer", () => {
    const r = checkOffer(makeOffer(), CTX);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sourceChainId).toBe(8453);
  });

  it.each([null, undefined, {} as WireOffer, { rank: 1, journey: {}, execution: null } as unknown as WireOffer])(
    "refuses a bad 200 / null integration: %j",
    (o) => {
      expect(problems(o)).toMatch(/no usable offer/);
    },
  );

  it("refuses a plan whose content changed after it was hashed", () => {
    const o = makeOffer();
    o.execution.plan.amounts.minimum!.amount = "1";
    expect(problems(o)).toMatch(/hash does not match/);
  });

  it("refuses an expired plan and an expired quote", () => {
    expect(problems(makeOffer(), { ...CTX, now: CTX.now + 10_000 })).toMatch(/expired/);
  });

  it("refuses an offer for a different recipient, amount or destination asset", () => {
    expect(problems(makeOffer(), { ...CTX, recipient: "0x4444444444444444444444444444444444444444" })).toMatch(/recipient/);
    expect(problems(makeOffer(), { ...CTX, amount: "2000000" })).toMatch(/not what was requested/);
    expect(problems(makeOffer(), { ...CTX, toAsset: "eip155:11155420/erc20:0xabc" })).toMatch(/destination asset/);
  });

  it("refuses a journey that disagrees with its plan", () => {
    const o = makeOffer();
    o.journey.expectedOutput = { ...o.journey.expectedOutput, amount: "999999" };
    expect(problems(o)).toMatch(/expected output/);
    const p = makeOffer();
    p.journey.hops[0]!.planHash = "0".repeat(64);
    expect(problems(p)).toMatch(/does not name this plan/);
  });

  it("never shows an estimate as a floor, and a firm floor must sit under the expected output", () => {
    const est = makeOffer({
      plan: { guarantee: { tier: 1, assumptions: [], settlementGuarantee: "none", output: "estimate_only" } },
    });
    expect(problems(est)).toMatch(/estimate-only plan must not state a minimum/);
    const high = makeOffer({ plan: { amounts: { quoted: { asset: "x", amount: "10", decimals: 6 }, minimum: { asset: "x", amount: "20", decimals: 6 } } } });
    expect(problems(high)).toMatch(/minimum/);
  });

  it("refuses fees above the ceiling and assessments that are not acceptable", () => {
    expect(problems(makeOffer({ plan: { fees: { maxTotalBps: 151, breakdown: [] } } }))).toMatch(/fees/);
    const w = makeOffer({ journey: { assessment: { status: "warning", label: "Poor value", reason: "", executableByApiKey: false } } });
    expect(problems(w)).toMatch(/Poor value/);
    expect(problems(makeOffer({ journey: { assessment: null } }))).toMatch(/no value assessment/);
  });

  it("refuses a two-order journey", () => {
    expect(problems(makeOffer({ journey: { mode: "sequential_wallet" } }))).toMatch(/two-order/);
  });

  it("refuses wallet steps that leave the plan's allow-lists or the connected wallet", () => {
    const spender = makeOffer();
    (spender.execution.plan.steps[0] as { spender: string }).spender = "0x9999999999999999999999999999999999999999";
    spender.execution.plan.hash = planHashOf(spender.execution.plan);
    spender.journey.hops[0]!.planHash = spender.execution.plan.hash;
    expect(problems(spender)).toMatch(/spender the plan does not allow/);

    const user = makeOffer();
    (user.execution.plan.steps[1] as unknown as { message: { witness: Record<string, unknown> } }).message.witness.user = "0x5555555555555555555555555555555555555555";
    user.execution.plan.hash = planHashOf(user.execution.plan);
    user.journey.hops[0]!.planHash = user.execution.plan.hash;
    expect(problems(user)).toMatch(/not for the connected wallet/);

    const pays = makeOffer();
    (pays.execution.plan.steps[1] as unknown as { message: { witness: Record<string, unknown> } }).message.witness.recipient = "0x5555555555555555555555555555555555555555";
    pays.execution.plan.hash = planHashOf(pays.execution.plan);
    pays.journey.hops[0]!.planHash = pays.execution.plan.hash;
    expect(problems(pays)).toMatch(/someone other than the requested recipient/);
  });

  it("matches addresses case-insensitively", () => {
    expect(checkOffer(makeOffer(), { ...CTX, sender: SENDER.toUpperCase().replace("0X", "0x"), recipient: RECIPIENT }).ok).toBe(true);
  });
});
