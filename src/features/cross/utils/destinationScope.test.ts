import { describe, expect, it } from "vitest";
import {
  scopeDestinationTokens,
  settlementDestinationTokens,
  splitDestinationTokens,
  supportsAnyDestinationToken,
} from "./destinationScope";

const rail = (name: string, flags: Partial<{ supportsUSDC: boolean; supportsUSDT: boolean; supportsNativeL1: boolean }> = {}) => ({
  name,
  supportsUSDC: false,
  supportsUSDT: false,
  supportsNativeL1: false,
  ...flags,
}) as any;

const CCTP = rail("CCTP", { supportsUSDC: true });
const THOR = rail("THORChain", { supportsNativeL1: true });
const HYPERLANE = rail("Hyperlane Nexus", { supportsUSDC: true, supportsUSDT: true });

const ETH = { ticker: "ETH", address: "0x0000000000000000000000000000000000000000", category: "native", isNative: true };
const USDC = { ticker: "USDC", address: "0xUSDC", category: "stable" };
const ARB = { ticker: "ARB", address: "0xARB" };
const OFT = { ticker: "PYUSD0", address: "0xOFT" };
const catalog = [ETH, USDC, ARB, OFT];

describe("supportsAnyDestinationToken", () => {
  it("allows any token between aggregator chains with a composable carrier", () => {
    expect(supportsAnyDestinationToken({ srcAggregator: true, dstAggregator: true, rails: [CCTP] })).toBe(true);
  });

  it("requires a composable carrier rail", () => {
    expect(supportsAnyDestinationToken({ srcAggregator: true, dstAggregator: true, rails: [THOR, HYPERLANE] })).toBe(false);
  });

  it("lets a non-aggregator source reach any token only when it already holds USDC", () => {
    const base = { srcAggregator: false, dstAggregator: true, rails: [CCTP] };
    expect(supportsAnyDestinationToken({ ...base, sourceTicker: "usdc" })).toBe(true);
    expect(supportsAnyDestinationToken({ ...base, sourceTicker: "WETH" })).toBe(false);
  });

  it("never allows any token into a chain without an aggregator", () => {
    expect(supportsAnyDestinationToken({ srcAggregator: true, dstAggregator: false, rails: [CCTP] })).toBe(false);
  });
});

describe("settlementDestinationTokens", () => {
  it("keeps only assets a rail settles into directly", () => {
    expect(settlementDestinationTokens(catalog, [HYPERLANE])).toEqual([USDC]);
    expect(settlementDestinationTokens(catalog, [THOR])).toEqual([ETH]);
    expect(settlementDestinationTokens(catalog, [])).toEqual([]);
  });
});

describe("scopeDestinationTokens", () => {
  const settlementTokens = [USDC];

  it("offers the full catalog when any token can be routed", () => {
    expect(scopeDestinationTokens({ candidates: catalog, anyToken: true, settlementTokens, layerZero: { applies: false } }))
      .toEqual(catalog);
  });

  it("limits to LayerZero-listed destinations plus settlement assets", () => {
    const reachable = [{ chainKey: "base", address: "0xOFT", symbol: "PYUSD0", name: "PYUSD0", decimals: 6 }];
    expect(scopeDestinationTokens({
      candidates: catalog,
      anyToken: false,
      settlementTokens,
      layerZero: { applies: true, reachable, chain: { chainKey: "base", chainType: "EVM" } },
    })).toEqual([USDC, OFT]);
  });

  it("keeps the list open while LayerZero discovery is unknown", () => {
    expect(scopeDestinationTokens({
      candidates: catalog,
      anyToken: false,
      settlementTokens,
      layerZero: { applies: true, reachable: undefined, chain: { chainKey: "base", chainType: "EVM" } },
    })).toEqual(catalog);
  });

  it("drops long-tail tokens when LayerZero cannot serve the pair at all", () => {
    expect(scopeDestinationTokens({ candidates: catalog, anyToken: false, settlementTokens, layerZero: { applies: false } }))
      .toEqual([USDC]);
  });
});

describe("splitDestinationTokens", () => {
  it("keeps every candidate, routable ones first", () => {
    expect(splitDestinationTokens(catalog, [OFT, USDC])).toEqual({
      routable: [USDC, OFT],
      unconfirmed: [ETH, ARB],
    });
  });
});
