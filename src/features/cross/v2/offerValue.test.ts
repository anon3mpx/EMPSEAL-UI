import { describe, expect, it } from "vitest";
import { legRowsOf, marketPricingDown, offerValueOf } from "./offerValue";
import { makeOffer } from "./v2Fixtures";
import type { WireAssessment, WireOffer } from "./types";

const usd = (x: number) => (BigInt(Math.round(x * 1e6)) * 10n ** 12n).toString();
const T = (asset: string) => (asset.includes("0xaf88") ? "USDC" : asset.includes("0xf97f") ? "LINK" : "USDC");
const withAssessment = (a: Partial<WireAssessment>): WireOffer => ({
  ...makeOffer(),
  assessment: { status: "acceptable", reasons: [], journey: { unpricedFees: [] }, legs: [], ...a } as WireAssessment,
});

describe("offerValueOf", () => {
  it("acceptable: shows the value change", () => {
    const v = offerValueOf(withAssessment({ journey: { inputUsd: usd(10), outputUsd: usd(9.97), unpricedFees: [] } }), T);
    expect([v.status, v.tone, v.note]).toEqual(["acceptable", "ok", "Value -0.3%"]);
    expect(v.inUsd).toBeCloseTo(10);
    expect(v.outUsd).toBeCloseTo(9.97);
  });
  it("warning and blocked: name the cost in dollars", () => {
    const j = { inputUsd: usd(10), outputUsd: usd(9.5), unpricedFees: [] };
    expect(offerValueOf(withAssessment({ status: "warning", reason: "value_loss_warning:journey", journey: j }), T).note).toBe("High cost: ≈ $0.50 for $10.00 (-5.0%)");
    const b = offerValueOf(withAssessment({ status: "blocked", reason: "value_loss_blocked:journey", journey: { ...j, outputUsd: usd(5) } }), T);
    expect([b.tone, b.note]).toEqual(["bad", "Very high cost: ≈ $5.00 for $10.00 (-50.0%)"]);
  });
  it("unpriced: says why, and names the step it comes from", () => {
    const link = withAssessment({
      status: "unpriced",
      reason: "output_unpriced:implausible-gain",
      reasons: ["output_unpriced:implausible-gain", "destination_swap_unpriced:implausible-gain"],
      journey: { inputUsd: usd(10), outputUsd: usd(17.68), unpricedFees: [] },
      legs: [
        { leg: "rail_transfer", status: "acceptable", lossBps: 0, reasons: [] },
        { leg: "destination_swap", status: "unpriced", reasons: ["destination_swap_unpriced:implausible-gain"] },
      ],
    });
    link.journey = { ...link.journey, expectedOutput: { asset: "eip155:42161/erc20:0xf97f4df75117a78c1a5a0dbb814af92458539fb4", amount: "1", decimals: 18 } };
    const v = offerValueOf(link, T);
    expect([v.tone, v.note]).toEqual(["warn", "Destination swap · Price unverified: our LINK price looks off"]);
    expect(offerValueOf(withAssessment({ status: "unpriced", reason: "output_unpriced:no-evidence" }), T).note).toBe("No price for USDC: value can't be checked");
    expect(offerValueOf(withAssessment({ status: "unpriced", reason: "price_source_failed" }), T).note).toBe("Price check unavailable right now");
  });
  it("an offer without an assessment has no value note", () => {
    expect(offerValueOf(makeOffer(), T)).toBeUndefined();
  });
});

describe("legRowsOf", () => {
  it("one row per step, in order, with what it delivers and its value check", () => {
    const o = withAssessment({ legs: [{ leg: "rail_transfer", status: "acceptable", lossBps: 30, reasons: [] }] });
    o.journey = {
      ...o.journey,
      legs: [
        { index: 0, order: 1, kind: "rail_transfer", input: o.journey.input, expectedOutput: o.journey.expectedOutput, fromChain: "eip155:8453", toChain: "eip155:42161" },
        { index: 1, order: 1, kind: "destination_swap", input: o.journey.expectedOutput, expectedOutput: { ...o.journey.expectedOutput, amount: "2000000" }, fromChain: "eip155:42161", toChain: "eip155:42161" },
      ],
    };
    const rows = legRowsOf(o, T, (c) => (c === "eip155:8453" ? "Base" : "Arbitrum"));
    expect(rows.map((r) => [r.step, r.detail, r.out, r.valueText])).toEqual([
      ["Bridge", "Base → Arbitrum via CCTP", "0.99 USDC", "-0.3%"],
      ["Destination swap", "on Arbitrum", "2 USDC", ""],
    ]);
  });
});

describe("marketPricingDown", () => {
  it("only when the server says market pricing failed, not for any other kind of degraded quote", () => {
    expect(marketPricingDown([withAssessment({ status: "unpriced", reasons: ["market_pricing_failed"] })])).toBe(true);
    expect(marketPricingDown([withAssessment({ status: "acceptable", reasons: [] }), withAssessment({ status: "warning", reasons: ["value_loss_warning:journey"] })])).toBe(false);
    expect(marketPricingDown([])).toBe(false);
  });
});
