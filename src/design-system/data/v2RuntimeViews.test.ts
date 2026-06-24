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
  });

  it("builds token views from canonical per-chain token files", () => {
    const arbitrumTokens = getTokensForChain(42161);
    const pulseNative = getNativeToken(369);

    expect(arbitrumTokens.some((token) => token.ticker === "USDC" && token.decimals === 6)).toBe(true);
    expect(pulseNative).toMatchObject({
      chainId: 369,
      ticker: "PLS",
      decimals: 18,
      isNative: true,
    });
  });

  it("resolves explorer URLs from canonical chain config", () => {
    expect(getExplorerName(42161)?.toLowerCase()).toContain("arbiscan");
    expect(getExplorerTxUrl(42161, "0xabc")).toBe("https://arbiscan.io/tx/0xabc");
    expect(getExplorerAddressUrl(369, "0xabc")).toBe("https://otter.pulsechain.com/address/0xabc");
    expect(getExplorerTxUrl(900, "0xabc")).toBeNull();
  });
});
