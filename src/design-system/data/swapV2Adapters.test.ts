import { describe, expect, it } from "vitest";

import {
  EMPTY_SWAP_TOKEN_ADDRESS,
  buildDirectSwapTradeInfo,
  buildSwapRouteHops,
  buildSwapTradeInfo,
  formatSwapQuoteOutput,
  toSwapHookToken,
} from "./swapV2Adapters";

const chain = {
  id: 42161,
  name: "Arbitrum",
  color: "#28A0F0",
  ticker: "ETH",
  kind: "EVM" as const,
  tier: 1 as const,
  supportsAggregator: true,
  supportsPaymaster: false,
};

const ethToken = {
  chainId: 42161,
  ticker: "ETH",
  name: "Ether",
  decimals: 18,
  isNative: true,
};

const usdcToken = {
  chainId: 42161,
  ticker: "USDC",
  name: "USD Coin",
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  decimals: 6,
  badge: "VERIFIED" as const,
};

describe("swapV2Adapters", () => {
  it("converts V2 tokens into the legacy swap hook token shape", () => {
    const native = toSwapHookToken(ethToken, chain);
    const stable = toSwapHookToken(usdcToken, chain);

    expect(native).toMatchObject({
      ticker: "ETH",
      address: EMPTY_SWAP_TOKEN_ADDRESS,
      decimal: 18,
      chainName: "Arbitrum",
      chainColor: "#28A0F0",
    });
    expect(stable).toMatchObject({
      ticker: "USDC",
      address: usdcToken.address,
      decimal: 6,
      badge: "VERIFIED",
    });
  });

  it("formats SDK quote output with six display decimals", () => {
    const quote = {
      amounts: [1_000_000_000_000_000_000n, 2_500_000n],
      path: [EMPTY_SWAP_TOKEN_ADDRESS, usdcToken.address],
      adapters: ["Uniswap V3"],
    };

    expect(formatSwapQuoteOutput(quote, 6)).toBe("2.500000");
  });

  it("caps 18-decimal quote output to six display decimals", () => {
    const quote = {
      amounts: [1_000_000_000_000_000_000n, 1_234_567_890_123_456_789n],
      path: [EMPTY_SWAP_TOKEN_ADDRESS, EMPTY_SWAP_TOKEN_ADDRESS],
      adapters: ["Uniswap V3"],
    };

    expect(formatSwapQuoteOutput(quote, 18)).toBe("1.234568");
  });

  it("builds tradeInfo with slippage-adjusted minimum output", () => {
    const sell = toSwapHookToken(ethToken, chain);
    const buy = toSwapHookToken(usdcToken, chain);
    const quote = {
      amounts: [1_000_000_000_000_000_000n, 2_500_000n],
      path: [sell.address, buy.address],
      adapters: ["Uniswap V3"],
    };

    const tradeInfo = buildSwapTradeInfo({
      quote,
      selectedTokenA: sell,
      selectedTokenB: buy,
      tokenOptions: [sell, buy],
      slippageBps: 50,
      protocolFeeBps: 28,
    });

    expect(tradeInfo).toMatchObject({
      amountIn: 1_000_000_000_000_000_000n,
      amountOut: 2_487_500n,
      fee: "28",
      affiliateFee: "0",
      totalFeeBps: "28",
      path: [sell.address, buy.address],
      adapters: ["Uniswap V3"],
    });
    expect(tradeInfo?.pathTokens.map((token) => token.ticker)).toEqual(["ETH", "USDC"]);
    expect(typeof tradeInfo?.quoteId).toBe("string");
    expect(typeof tradeInfo?.timestamp).toBe("number");
    expect(typeof tradeInfo?.validUntil).toBe("number");
    expect(typeof tradeInfo?.sdkVersion).toBe("string");
  });

  it("builds route hops with configured adapter names, never raw addresses", () => {
    const sell = toSwapHookToken(ethToken, chain);
    const buy = toSwapHookToken(usdcToken, chain);
    const tradeInfo = {
      amountIn: 1n,
      amountOut: 1n,
      fee: "28",
      affiliateFee: "0",
      totalFeeBps: "28",
      amounts: [1n, 1n],
      path: [sell.address, buy.address],
      pathTokens: [sell, buy],
      adapters: ["0xa91d8284C199FE4c178d76558A1427790AF7e80F", "0x1111111111111111111111111111111111111111"],
      gasEstimate: "0",
      quoteId: "test-quote",
      timestamp: Date.now(),
      validUntil: Date.now() + 30_000,
      sdkVersion: "2.0.1",
    };

    expect(buildSwapRouteHops(tradeInfo, chain)).toEqual([
      { ticker: "ETH", chainName: "Arbitrum", chainColor: "#28A0F0", via: "UniswapV3" },
      { ticker: "USDC", chainName: "Arbitrum", chainColor: "#28A0F0", via: undefined },
    ]);
  });

  it("builds direct tradeInfo for native wrap or unwrap routes", () => {
    const sell = toSwapHookToken(ethToken, chain);
    const buy = { ...toSwapHookToken(ethToken, chain), ticker: "WETH", address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1" };

    expect(buildDirectSwapTradeInfo({
      amountIn: "1.25",
      selectedTokenA: sell,
      selectedTokenB: buy,
    })).toMatchObject({
      amountIn: 1_250_000_000_000_000_000n,
      amountOut: 1_250_000_000_000_000_000n,
      fee: "0",
      affiliateFee: "0",
      totalFeeBps: "0",
      path: [sell.address, buy.address],
      adapters: [],
      pathTokens: [sell, buy],
    });
  });
});
