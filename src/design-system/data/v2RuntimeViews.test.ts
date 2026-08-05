import { describe, expect, it } from "vitest";

import { getExplorerAddressUrl, getExplorerName, getExplorerTxUrl } from "./explorers";
import { V2_AGGREGATOR_CHAINS, V2_ALL_CHAINS, getV2Chain } from "./v2ChainView";
import { getNativeToken, getTokensForChain } from "./v2TokenView";

describe("V2 runtime views", () => {
  it("builds aggregator chain views from canonical chain config", () => {
    const arbitrum = getV2Chain(42161);

    expect(arbitrum).toMatchObject({
      id: 42161,
      name: "Arbitrum",
      ticker: "ETH",
      kind: "EVM",
      supportsAggregator: true,
    });
    expect(V2_AGGREGATOR_CHAINS.some((chain) => chain.id === 42161)).toBe(true);
    expect(V2_ALL_CHAINS.some((chain) => chain.id === 0 && chain.kind === "BTC")).toBe(true);
    expect(getV2Chain(98)?.ticker).toBe("DOGE");
    expect(getV2Chain(99)?.ticker).toBe("SOL");
    expect(getV2Chain(100)?.ticker).toBe("LTC");
    expect(getV2Chain(101)?.ticker).toBe("BCH");
    expect(getV2Chain(102)?.ticker).toBe("ATOM");
    expect(V2_ALL_CHAINS.some((chain) => chain.id >= 900 && chain.id <= 904)).toBe(false);
    for (const chainId of [130, 480, 57073, 59144, 98866]) {
      expect(getV2Chain(chainId)).toMatchObject({ id: chainId, kind: "EVM", tier: 2 });
      expect(getTokensForChain(chainId).some((token) => token.ticker === "USDC")).toBe(true);
    }
  });

  it("builds token views from canonical per-chain token files", () => {
    const arbitrumTokens = getTokensForChain(42161);
    const ethereumTokens = getTokensForChain(1);
    const solanaTokens = getTokensForChain(99);
    const ethereumNative = getNativeToken(1);
    const pulseNative = getNativeToken(369);
    const bitcoinNative = getNativeToken(0);

    expect(arbitrumTokens.some((token) => token.ticker === "USDC" && token.decimals === 6)).toBe(true);
    expect(ethereumTokens.find((token) => token.ticker === "USDC")).toMatchObject({
      chainId: 1,
      ticker: "USDC",
      name: "USD Coin",
      address: "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48",
      decimals: 6,
      badge: "VERIFIED",
    });
    expect(solanaTokens.find((token) => token.ticker === "USDC")).toMatchObject({
      chainId: 99,
      ticker: "USDC",
      name: "USD Coin",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      providerAssetId: "SOL.USDC",
      decimals: 6,
      badge: "VERIFIED",
    });
    expect(ethereumNative).toMatchObject({
      chainId: 1,
      ticker: "ETH",
      decimals: 18,
      isNative: true,
    });
    expect(pulseNative).toMatchObject({
      chainId: 369,
      ticker: "PLS",
      decimals: 18,
      isNative: true,
    });
    expect(bitcoinNative).toMatchObject({
      chainId: 0,
      ticker: "BTC",
      providerAssetId: "BTC.BTC",
      decimals: 8,
      isNative: true,
    });
  });

  it("resolves explorer URLs from canonical chain config", () => {
    expect(getExplorerName(42161)?.toLowerCase()).toContain("arbiscan");
    expect(getExplorerTxUrl(42161, "0xabc")).toBe("https://arbiscan.io/tx/0xabc");
    expect(getExplorerAddressUrl(369, "0xabc")).toBe("https://otter.pulsechain.com/address/0xabc");
    expect(getExplorerTxUrl(99, "0xabc")).toBeNull();
  });
});
