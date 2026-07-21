import { describe, expect, it } from "vitest";

import {
  buildPortfolioV2ViewModel,
  type PortfolioV2Data,
} from "./portfolioV2Adapters";

const portfolio: PortfolioV2Data = {
  totalValue: 100.5,
  change24h: 2.5,
  change7d: -1.25,
  tokens: [
    {
      id: "42161:native",
      address: "0x0000000000000000000000000000000000000000",
      chainId: 42161,
      symbol: "ETH",
      name: "Ether",
      logo: "ETH",
      chain: "arbitrum",
      chainName: "Arbitrum",
      chainColor: "#28A0F0",
      amount: 0.1,
      value: 100,
      price: 1000,
      change24h: 3,
      change7d: -1,
      allocation: 99.5,
      coinGeckoId: "ethereum",
    },
    {
      id: "8453:0xusdc",
      address: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      symbol: "USDC",
      name: "USD Coin",
      logo: "USDC",
      chain: "base",
      chainName: "Base",
      chainColor: "#0052FF",
      amount: 0.5,
      value: 0.5,
      price: 1,
      change24h: 0.01,
      change7d: 0,
      allocation: 0.5,
      coinGeckoId: "usd-coin",
    },
    {
      id: "137:unpriced",
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      symbol: "UNP",
      name: "Unpriced",
      logo: "UNP",
      chain: "polygon",
      chainName: "Polygon",
      chainColor: "#7B3FE4",
      amount: 12,
      value: 0,
      price: 0,
      change24h: 0,
      change7d: 0,
      allocation: 0,
    },
  ],
  chains: [],
  nfts: [],
  sparklines: {
    "42161:native": [990, 995, 1000],
  },
  chartData: [97, 98, 100.5],
  lastUpdated: 1780000000000,
};

describe("portfolioV2Adapters", () => {
  it("maps real on-chain portfolio tokens into panel assets without fabricating history", () => {
    const view = buildPortfolioV2ViewModel(portfolio);

    expect(view).toMatchObject({
      totalUSD: 100.5,
      change24hPct: 2.5,
      change24hUSD: 2.5125,
      change7dPct: -1.25,
      chart: [],
      nfts: [],
      activity: [],
    });
    expect(view.assets).toEqual([
      {
        ticker: "ETH",
        name: "Ether",
        logo: "ETH",
        chainName: "Arbitrum",
        chainColor: "#28A0F0",
        balance: "0.1",
        balanceUSD: 100,
        change24h: 3,
        change7d: -1,
        allocation: 99.5,
      },
      {
        ticker: "USDC",
        name: "USD Coin",
        logo: "USDC",
        chainName: "Base",
        chainColor: "#0052FF",
        balance: "0.5",
        balanceUSD: 0.5,
        change24h: 0.01,
        change7d: undefined,
        allocation: 0.5,
      },
      {
        ticker: "UNP",
        name: "Unpriced",
        logo: "UNP",
        chainName: "Polygon",
        chainColor: "#7B3FE4",
        balance: "12",
        balanceUSD: 0,
        change24h: undefined,
        change7d: undefined,
        allocation: 0,
      },
    ]);
    expect(view.assets.some((asset) => asset.spark && asset.spark.length > 0)).toBe(false);
  });

  it("builds market cards only from real priced token rows and never invents sparkline points", () => {
    const view = buildPortfolioV2ViewModel(portfolio);

    expect(view.markets).toEqual([
      {
        ticker: "ETH",
        name: "Ether",
        price: 1000,
        change24h: 3,
        chainColor: "#28A0F0",
        spark: [],
      },
      {
        ticker: "USDC",
        name: "USD Coin",
        price: 1,
        change24h: 0.01,
        chainColor: "#0052FF",
        spark: [],
      },
    ]);
  });

  it("returns explicit unavailable states instead of fake NFTs or activities", () => {
    const view = buildPortfolioV2ViewModel(portfolio);

    expect(view.nfts).toEqual([]);
    expect(view.activity).toEqual([]);
    expect(view.availability).toMatchObject({
      chart: "unavailable",
      nfts: "unavailable",
      activity: "unavailable",
    });
  });

  it("returns a disconnected-safe empty view", () => {
    expect(buildPortfolioV2ViewModel(null)).toMatchObject({
      totalUSD: 0,
      change24hPct: 0,
      change24hUSD: 0,
      change7dPct: undefined,
      chart: [],
      assets: [],
      markets: [],
      nfts: [],
      activity: [],
    });
  });
});
