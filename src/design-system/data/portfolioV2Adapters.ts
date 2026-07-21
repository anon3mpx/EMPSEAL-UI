import type { ReactNode } from "react";

import type { NFTItem } from "../components";
import type { MarketCard, PortfolioAsset } from "../EmpxPortfolioPanel";

export interface PortfolioV2Token {
  id?: string;
  address?: string;
  chainId?: number;
  symbol: string;
  name: string;
  logo: ReactNode;
  chain: string;
  chainName?: string;
  chainColor: string;
  amount: number;
  value: number;
  price: number;
  change24h: number;
  change7d?: number;
  allocation: number;
  coinGeckoId?: string;
}

export interface PortfolioV2ChainBalance {
  chain: string;
  chainName: string;
  logo: string;
  value: number;
  tokens: number;
  color: string;
}

export interface PortfolioV2Data {
  totalValue: number;
  change24h: number;
  change7d: number;
  tokens: PortfolioV2Token[];
  chains: PortfolioV2ChainBalance[];
  nfts: unknown[];
  sparklines: Record<string, number[]>;
  chartData: number[];
  lastUpdated?: number;
}

export interface PortfolioActivityRow {
  id: number;
  kind: string;
  summary: string;
  status: "confirmed" | "pending" | "failed";
  timeLabel: string;
  txHashShort: string;
  chainName: string;
  chainColor?: string;
}

export interface PortfolioV2Availability {
  chart: "available" | "unavailable";
  nfts: "available" | "unavailable";
  activity: "available" | "unavailable";
}

export interface PortfolioV2ViewModel {
  totalUSD: number;
  change24hPct: number;
  change24hUSD: number;
  change7dPct?: number;
  chart: number[];
  assets: PortfolioAsset[];
  markets: MarketCard[];
  nfts: NFTItem[];
  activity: PortfolioActivityRow[];
  availability: PortfolioV2Availability;
}

const EMPTY_AVAILABILITY: PortfolioV2Availability = {
  chart: "unavailable",
  nfts: "unavailable",
  activity: "unavailable",
};

export function buildPortfolioV2ViewModel(
  portfolio: PortfolioV2Data | null | undefined,
): PortfolioV2ViewModel {
  if (!portfolio) {
    return {
      totalUSD: 0,
      change24hPct: 0,
      change24hUSD: 0,
      change7dPct: undefined,
      chart: [],
      assets: [],
      markets: [],
      nfts: [],
      activity: [],
      availability: EMPTY_AVAILABILITY,
    };
  }

  const assets = portfolio.tokens.map(toPortfolioAsset);

  return {
    totalUSD: portfolio.totalValue,
    change24hPct: portfolio.change24h,
    change24hUSD: (portfolio.totalValue * portfolio.change24h) / 100,
    change7dPct: portfolio.change7d !== 0 ? portfolio.change7d : undefined,
    // The current API chart/sparkline arrays are deterministic synthetic series,
    // not provider-backed historical candles. Keep the V2 UI honest until a real
    // history source is wired.
    chart: [],
    assets,
    markets: buildPortfolioMarketCards(portfolio.tokens),
    nfts: [],
    activity: [],
    availability: EMPTY_AVAILABILITY,
  };
}

function toPortfolioAsset(token: PortfolioV2Token): PortfolioAsset {
  const hasPrice = token.price > 0;

  return {
    ticker: token.symbol,
    name: token.name,
    logo: token.logo,
    chainName: token.chainName || token.chain,
    chainColor: token.chainColor,
    balance: formatTokenAmount(token.amount),
    balanceUSD: token.value,
    change24h: hasPrice ? token.change24h : undefined,
    change7d: hasPrice && token.change7d !== 0 ? token.change7d : undefined,
    allocation: token.allocation,
  };
}

function buildPortfolioMarketCards(tokens: PortfolioV2Token[]): MarketCard[] {
  return tokens
    .filter((token) => token.price > 0 && token.value > 0)
    .map((token) => ({
      ticker: token.symbol,
      name: token.name,
      price: token.price,
      change24h: token.change24h,
      chainColor: token.chainColor,
      spark: [],
    }));
}

function formatTokenAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  if (amount === 0) return "0";
  if (Math.abs(amount) >= 1) {
    return amount.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  return amount.toLocaleString("en-US", { maximumSignificantDigits: 6 });
}
