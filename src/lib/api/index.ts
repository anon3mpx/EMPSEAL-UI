// Main API Aggregator
// Portfolio balances are fetched on-chain through wagmi/viem multicall.
// Pricing is supplied by the configured market-data provider.

import { getTokenPricesWithHistory, getCoinGeckoId, COMMON_TOKEN_IDS } from "./coingecko";
import { getPrice, getPaprikaId, PAPRIKA_IDS } from "./coinpaprika";
import { CHAIN_CONFIG, ChainId, CHAIN_LIST } from "./chains";
import { fetchOnchainPortfolio } from "./onchainPortfolio";

export interface PortfolioToken {
  id?: string;
  address?: string;
  chainId?: number;
  symbol: string;
  name: string;
  logo: string;
  chain: string;
  chainName?: string;
  chainColor: string;
  amount: number;
  value: number;
  price: number;
  change24h: number;
  change7d: number;
  allocation: number;
  coinGeckoId?: string;
}

export interface ChainBalance {
  chain: string;
  chainName: string;
  logo: string;
  value: number;
  tokens: number;
  color: string;
}

export interface NftHolding {
  id: number;
  name: string;
  collection: string;
  chain: string;
  icon: string;
  floor: string;
  rare: string;
}

export interface PortfolioData {
  totalValue: number;
  change24h: number;
  change7d: number;
  tokens: PortfolioToken[];
  chains: ChainBalance[];
  nfts: NftHolding[];
  sparklines: Record<string, number[]>;
  chartData: number[];
  lastUpdated?: number;
}

export interface FetchPortfolioOptions {
  forceRefresh?: boolean;
}

// Aggregated portfolio data fetcher
export async function fetchPortfolio(
  address: string,
  options: FetchPortfolioOptions = {},
): Promise<PortfolioData> {
  // If no address, return mock data for demo
  if (!address) {
    return getMockData();
  }

  try {
    return await fetchOnchainPortfolio(address, options);
  } catch (error) {
    console.error("Portfolio fetch failed:", error);
    return {
      totalValue: 0,
      change24h: 0,
      change7d: 0,
      tokens: [],
      chains: [],
      nfts: [],
      sparklines: {},
      chartData: [],
    };
  }
}

// Mock data generator for demo mode
function getMockData(): PortfolioData {
  const tokens: PortfolioToken[] = [
    { symbol: "ETH", name: "Ethereum", logo: "Ξ", chain: "ethereum", chainColor: "#FF8A00", amount: 1.842, value: 4521.30, price: 2455.12, change24h: 1.2, change7d: 4.8, allocation: 38 },
    { symbol: "USDC", name: "USD Coin", logo: "$", chain: "base", chainColor: "#FF8A00", amount: 2400, value: 2400.00, price: 1.00, change24h: 0.01, change7d: 0.02, allocation: 20 },
    { symbol: "WBTC", name: "Wrapped Bitcoin", logo: "₿", chain: "ethereum", chainColor: "#F7931A", amount: 0.024, value: 1620.80, price: 67533, change24h: 2.8, change7d: 6.1, allocation: 14 },
    { symbol: "USDT", name: "Tether", logo: "₮", chain: "ethereum", chainColor: "#26A17B", amount: 1200, value: 1200.00, price: 1.00, change24h: -0.01, change7d: -0.02, allocation: 10 },
    { symbol: "DAI", name: "Dai", logo: "◈", chain: "ethereum", chainColor: "#F5AC37", amount: 800, value: 800.00, price: 1.00, change24h: 0.0, change7d: 0.0, allocation: 7 },
    { symbol: "PLS", name: "PulseChain", logo: "P", chain: "pulsechain", chainColor: "#FF8A00", amount: 180000, value: 540.00, price: 0.003, change24h: 5.1, change7d: 12.4, allocation: 5 },
    { symbol: "ARB", name: "Arbitrum", logo: "A", chain: "arbitrum", chainColor: "#FF8A00", amount: 250, value: 175.00, price: 0.70, change24h: 3.2, change7d: 8.9, allocation: 3 },
    { symbol: "MATIC", name: "Polygon", logo: "M", chain: "polygon", chainColor: "#F5AC37", amount: 420, value: 294.00, price: 0.70, change24h: -1.4, change7d: -3.2, allocation: 3 },
  ];

  const chains: ChainBalance[] = [
    { chain: "eth", chainName: "Ethereum", logo: "Ξ", value: 6942, tokens: 4, color: "#FF8A00" },
    { chain: "base", chainName: "Base", logo: "B", value: 2400, tokens: 1, color: "#FF8A00" },
    { chain: "pls", chainName: "PulseChain", logo: "P", value: 540, tokens: 1, color: "#FF8A00" },
    { chain: "arb", chainName: "Arbitrum", logo: "A", value: 175, tokens: 1, color: "#FF8A00" },
    { chain: "matic", chainName: "Polygon", logo: "M", value: 294, tokens: 1, color: "#F5AC37" },
    { chain: "bsc", chainName: "BNB Chain", logo: "B", value: 200, tokens: 2, color: "#F3BA2F" },
  ];

  const nfts: NftHolding[] = [
    { id: 1, name: "EMPX SEAL #142", collection: "EMPX Seals", chain: "ETH", icon: "⬡", floor: "0.42 ETH", rare: "LEGENDARY" },
    { id: 2, name: "Punk #8904", collection: "CryptoPunks", chain: "ETH", icon: "◈", floor: "54 ETH", rare: "RARE" },
    { id: 3, name: "Ape #2291", collection: "BAYC", chain: "ETH", icon: "⬟", floor: "12.8 ETH", rare: "RARE" },
    { id: 4, name: "Base Seal #77", collection: "Base Seals", chain: "BASE", icon: "◉", floor: "0.08 ETH", rare: "COMMON" },
  ];

  return {
    totalValue: 11551.10,
    change24h: 2.52,
    change7d: 7.87,
    tokens,
    chains,
    nfts,
    sparklines: generateSparklines(tokens),
    chartData: generateChartData(11551.10),
  };
}

function generateSparklines(tokens: PortfolioToken[]): Record<string, number[]> {
  const sparklines: Record<string, number[]> = {};
  
  for (const token of tokens) {
    const basePrice = token.price;
    const change7d = token.change7d / 100;
    const points = 7;
    const sparkline: number[] = [];
    
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const variation = (Math.random() - 0.5) * 0.02;
      const trend = basePrice * (1 - change7d * (1 - progress));
      sparkline.push(trend * (1 + variation));
    }
    
    sparkline.push(basePrice);
    sparklines[token.symbol] = sparkline;
  }
  
  return sparklines;
}

function generateChartData(currentValue: number): number[] {
  const points = 28;
  const data: number[] = [];
  const startValue = currentValue * 0.85;
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend = startValue + (currentValue - startValue) * progress;
    const noise = (Math.random() - 0.5) * currentValue * 0.02;
    data.push(trend + noise);
  }
  
  return data;
}

function getNftIcon(collection: string): string {
  const icons: Record<string, string> = {
    "EMPX Seals": "⬡",
    "CryptoPunks": "◈",
    "Bored Ape Yacht Club": "⬟",
    "Base Seals": "◉",
  };
  return icons[collection] || "◇";
}

function getNftRarity(floorPrice?: number): string {
  if (!floorPrice) return "COMMON";
  if (floorPrice > 10) return "LEGENDARY";
  if (floorPrice > 1) return "RARE";
  return "COMMON";
}

// Export individual API modules for direct access
export { getTokenPricesWithHistory, getCoinGeckoId, COMMON_TOKEN_IDS } from "./coingecko";
export { fetchOnchainPortfolio } from "./onchainPortfolio";
export { getGeckoTerminalTokenPrices } from "./geckoTerminal";
export { getDexScreenerTokenPrices } from "./dexScreener";
export { getPrice, getPaprikaId, PAPRIKA_IDS } from "./coinpaprika";
export type { CHAIN_CONFIG, CHAIN_LIST, ChainId } from "./chains";
