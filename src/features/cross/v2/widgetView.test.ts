import { describe, expect, it } from "vitest";
import { assetIdOf, defaultToken, tickerForAsset, v2Chains, v2Tokens } from "./assets";
import { checkOffer } from "./planCheck";
import { CTX, FROM_ASSET, makeOffer, TO_ASSET } from "./v2Fixtures";
import { feeBreakdownRows, feeUsd, formatEta, railCardNames, railDisplayName, routeHopsOf, selectedOfferView, toRailCards } from "./widgetView";

const ticker = (a: string) => (a === FROM_ASSET || a === TO_ASSET ? "USDC" : "?");

describe("rail cards", () => {
  it("maps ranked offers to V1 rail cards: name, mode, output, ETA, BEST on the first checked route", () => {
    const a = makeOffer();
    const b = makeOffer({ plan: { id: "plan-2" }, journey: { hops: [{ order: 1, planId: "plan-2", planHash: "h", rail: "debridge", expiresAt: 0 }], outputGuarantee: "estimate_only", etaSec: 900 } });
    const cards = toRailCards([{ offer: a, check: checkOffer(a, CTX) }, { offer: b, check: checkOffer(b, CTX) }], "plan-1");
    expect(cards[0]).toEqual({ name: "CCTP", mode: "A", outAmount: "0.99", eta: "~1 min", tag: "BEST", isActive: true });
    expect(cards[1]).toMatchObject({ name: "deBridge", mode: "B", eta: "~15 min", isActive: false });
  });

  it("tags a route that fails the local check as unavailable", () => {
    const bad = makeOffer({ plan: { expiresAt: CTX.now - 1 } });
    const [card] = toRailCards([{ offer: bad, check: checkOffer(bad, CTX) }], null);
    expect(card!.tag).toBe("UNAVAILABLE");
  });

  it("tells CCTP fast from standard by the plan's rail quote, and keeps card names unique", () => {
    const std = makeOffer({ plan: { railQuote: { variant: "standard" } } });
    const fast = makeOffer({ plan: { id: "plan-2", railQuote: { variant: "fast" } } });
    const again = makeOffer({ plan: { id: "plan-3" } });
    const list = [std, fast, again].map((o) => ({ offer: o, check: checkOffer(o, CTX) }));
    expect(railCardNames(list)).toEqual(["CCTP", "CCTP Fast", "CCTP 2"]);
    expect(toRailCards(list, "plan-2").map((c) => [c.name, c.isActive])).toEqual([["CCTP", false], ["CCTP Fast", true], ["CCTP 2", false]]);
  });

  it("draws the route from the journey's legs: source swap, then the rail of that hop", () => {
    const UNI = "eip155:42161/erc20:0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0";
    const AUSDC = "eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831";
    const BUSDC = "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const amt = (asset: string) => ({ asset, amount: "1", decimals: 6 });
    const j = makeOffer().journey;
    j.legs = [
      { index: 1, order: 1, kind: "rail_transfer", input: amt(AUSDC), expectedOutput: amt(BUSDC), fromChain: "eip155:42161", toChain: "eip155:8453" },
      { index: 0, order: 1, kind: "source_swap", input: amt(UNI), expectedOutput: amt(AUSDC), fromChain: "eip155:42161", toChain: "eip155:42161" },
    ];
    const names: Record<string, string> = { [UNI]: "UNI", [AUSDC]: "USDC", [BUSDC]: "USDC" };
    const hops = routeHopsOf(j, (a) => names[a]!, (c) => ({ name: c === "eip155:8453" ? "Base" : "Arbitrum" }));
    expect(hops.map((h) => [h.ticker, h.chainName, h.via])).toEqual([["UNI", "Arbitrum", "Source swap"], ["USDC", "Arbitrum", "CCTP"], ["USDC", "Base", undefined]]);
    expect(routeHopsOf({ ...j, legs: undefined }, String, () => undefined)).toEqual([]);
  });

  it("names rails like the V1 rail guide, falling back to the server id", () => {
    expect(railDisplayName("layerzero-vt")).toBe("LayerZero VT");
    expect(railDisplayName("hyperlane")).toBe("Hyperlane Nexus");
    expect(railDisplayName("newrail")).toBe("newrail");
  });
});

describe("selected offer view", () => {
  it("shows the server's numbers: output, minimum, fee buckets in USD only with a known price", () => {
    const v = selectedOfferView(makeOffer().journey, "CCTP", ticker, (a) => (a === FROM_ASSET ? 1 : null));
    expect(v).toMatchObject({
      railBadge: "Tier 1 · Guaranteed min",
      toAmount: "0.99",
      minimumReceived: "0.985 USDC",
      estimatedTime: "~1 min",
      protocolFeeBps: 30,
      slippageBps: 50,
    });
    expect(v.protocolFeeUSD).toBeCloseTo(0.003);
    expect(v.bridgeFeeUSD).toBeCloseTo(0.005);
    expect(v.relayerFeeUSD).toBeCloseTo(0.002);
    expect(v.feeRows).toEqual(feeBreakdownRows(makeOffer().journey, { ticker, priceOf: (a) => (a === FROM_ASSET ? 1 : null) }));
  });

  it("never guesses a USD value it cannot price", () => {
    expect(feeUsd([{ asset: "x", amount: "1", decimals: 0 }], () => null)).toBeUndefined();
    expect(feeUsd([], () => null)).toBe(0);
  });

  it("says estimate-only instead of a minimum", () => {
    const j = makeOffer({ journey: { minimumOutput: null, outputGuarantee: "estimate_only", fallback: { asset: FROM_ASSET, minAmount: "1" } } }).journey;
    const v = selectedOfferView(j, "deBridge", ticker, () => null);
    expect(v.minimumReceived).toBe("Estimate only (falls back to USDC)");
    expect(v.railBadge).toBe("Tier 1 · Estimate");
  });

  it("formats ETAs", () => {
    expect(formatEta(null)).toBe("—");
    expect(formatEta(20)).toBe("~20s");
    expect(formatEta(7200)).toBe("~2.0 h");
  });
});

describe("assets", () => {
  it("uses the V2 API's CAIP-19 ids", () => {
    expect(assetIdOf({ chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" })).toBe(FROM_ASSET);
    expect(assetIdOf({ chainId: 42161, isNative: true })).toBe("eip155:42161/slip44:60");
    expect(assetIdOf({ chainId: 10, address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" })).toBe("eip155:10/slip44:60");
  });

  it("offers Base, Arbitrum and Optimism with their tokens, USDC preselected", () => {
    expect(v2Chains().map((c) => c.id)).toEqual([8453, 42161, 10]);
    for (const c of v2Chains()) {
      expect(v2Tokens(c.id).length).toBeGreaterThan(0);
      expect(defaultToken(c.id)?.ticker).toBe("USDC");
    }
    expect(tickerForAsset(FROM_ASSET)).toBe("USDC");
  });
});
