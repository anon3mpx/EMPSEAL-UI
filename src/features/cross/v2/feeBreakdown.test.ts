import { describe, expect, it } from "vitest";
import { feeBreakdownRows } from "./widgetView";
import { FROM_ASSET, makeOffer } from "./v2Fixtures";
import type { JourneyFeeItem, JourneyQuote } from "./types";

const ETH = "eip155:8453/slip44:60";
const ticker = (a: string) => (a === FROM_ASSET ? "USDC" : a === ETH ? "ETH" : a);
const usdc = (amount: string) => ({ asset: FROM_ASSET, amount, decimals: 6 });
const item = (kind: string, amount: JourneyFeeItem["amount"], bpsOfInput: number | null, order = 1): JourneyFeeItem => ({
  order,
  kind,
  category: kind === "protocol" ? "empx" : kind === "relayer" || kind === "gas" ? "relayer_gas" : "provider_bridge",
  amount,
  bpsOfInput,
});
function journey(
  items: JourneyFeeItem[],
  over: Partial<JourneyQuote["fees"]["allIn"]> = {},
  mode: JourneyQuote["mode"] = "direct",
): JourneyQuote {
  const j = makeOffer().journey;
  return { ...j, mode, fees: { ...j.fees, items, allIn: { ...j.fees.allIn, ...over } } };
}
const rows = (j: JourneyQuote, extra: Parameters<typeof feeBreakdownRows>[1] extends infer O ? Partial<O> : never = {}) =>
  feeBreakdownRows(j, { ticker, priceOf: (a) => (a === FROM_ASSET ? 1 : null), ...extra });

describe("fee breakdown", () => {
  it("lists every charge by what it pays for, in a fixed order, with its share and USD value", () => {
    const r = rows(
      journey([
        item("relayer", usdc("2000"), 20),
        item("protocol", usdc("3000"), 30),
        item("swap", usdc("1000"), 10),
        item("provider", usdc("5000"), 50),
        item("gas", usdc("500"), 5),
      ]),
    );
    expect(r.slice(0, 5).map((x) => [x.label, x.value])).toEqual([
      ["EMPX fee", "0.003 USDC (0.30%) · <$0.01"],
      ["Swap fee", "0.001 USDC (0.10%) · <$0.01"],
      ["Bridge / provider fee", "0.005 USDC (0.50%) · <$0.01"],
      ["Relayer fee", "0.002 USDC (0.20%) · <$0.01"],
      ["Network gas", "0.0005 USDC (0.05%) · <$0.01"],
    ]);
  });
  it("the total states the all-in share and the fee cap; the output is already net of fees", () => {
    const r = rows(journey([item("protocol", usdc("3000000"), 30)], { bps: 30, ceilingBps: 150 }));
    const total = r.find((x) => x.label === "Total fees")!;
    expect(total.value).toBe("$3.00 (0.30% of input)");
    expect(r.find((x) => x.label === "Fee cap")!.value).toBe("up to 1.50%");
    expect(r.find((x) => x.label === "You receive")!.value).toMatch(/already net of these fees/);
  });
  it("an unpriced fee is shown in its token and kept out of the USD total, never guessed", () => {
    const eth = { asset: ETH, amount: "100000000000000", decimals: 18 };
    const r = rows(journey([item("protocol", usdc("3000000"), 30), item("gas", eth, null)], { bps: null }));
    expect(r.find((x) => x.label === "Network gas")!.value).toBe("0.0001 ETH");
    expect(r.find((x) => x.label === "Total fees")!.value).toBe("$3.00 + 0.0001 ETH");
  });
  it("a two-order journey names the order each fee belongs to", () => {
    const r = rows(journey([item("protocol", usdc("3000"), 30, 1), item("protocol", usdc("2000"), 20, 2)], {}, "sequential_wallet"));
    expect(r.slice(0, 2).map((x) => x.label)).toEqual(["Order 1 · EMPX fee", "Order 2 · EMPX fee"]);
  });
  it("a route with no itemised fees says the provider's cost is in the quote and still shows the cap", () => {
    const r = rows(journey([], { bps: null, ceilingBps: 158 }));
    expect(r.map((x) => [x.label, x.value])).toEqual([
      ["Provider fees", "Included in the quoted amount"],
      ["Fee cap", "up to 1.58%"],
    ]);
  });
  it("the relayer cost EMPX covers is shown separately, as not charged", () => {
    const r = rows(journey([item("protocol", usdc("3000"), 30)]), { sponsored: usdc("40000") });
    expect(r.find((x) => x.label === "Relayer cost paid by EMPX")).toMatchObject({
      value: "0.04 USDC",
      muted: true,
      hint: "Not charged to you.",
    });
  });
});
