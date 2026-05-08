// DeBank API - Free tier: 10,000 calls/day
// Used for: wallet portfolio, token balances, DeFi positions, NFT holdings
// Note: DeBank requires an API key for production use

const DEBANK_BASE = "https://openapi.debank.com/v1";

export interface DeBankToken {
  id: string;
  chain: string;
  symbol: string;
  name: string;
  logo_url?: string;
  balance: number;
  price: number;
  value: number;
}

interface DeBankPortfolio {
  total_networth_usd: number;
  token_list: DeBankToken[];
  project_list?: {
    name: string;
    portfolio_token_list: {
      token: DeBankToken;
      debt?: number;
    }[];
  }[];
}

interface DeBankChainBalance {
  chain: string;
  usd_value: number;
  token_count: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiry: number }>();
const DEFAULT_CACHE_TTL = 60 * 1000; // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttl = DEFAULT_CACHE_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

export async function getPortfolio(address: string): Promise<DeBankPortfolio | null> {
  if (!address) return null;
  
  const cacheKey = `portfolio_${address.toLowerCase()}`;
  const cached = getCached<DeBankPortfolio>(cacheKey);
  if (cached) return cached;
  
  try {
    // Using public endpoint - may need API key for full data
    const url = `${DEBANK_BASE}/user/portfolio?id=${address}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`DeBank API error: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    setCache(cacheKey, data);
    return data as DeBankPortfolio;
  } catch (error) {
    console.error("DeBank portfolio fetch failed:", error);
    return null;
  }
}

export async function getTokenList(address: string): Promise<DeBankToken[]> {
  const portfolio = await getPortfolio(address);
  return portfolio?.token_list || [];
}

export async function getChainBalances(address: string): Promise<DeBankChainBalance[]> {
  const portfolio = await getPortfolio(address);
  if (!portfolio) return [];
  
  // Aggregate by chain
  const chainMap = new Map<string, DeBankChainBalance>();
  
  for (const token of portfolio.token_list || []) {
    const existing = chainMap.get(token.chain);
    if (existing) {
      existing.usd_value += token.value;
      existing.token_count += 1;
    } else {
      chainMap.set(token.chain, {
        chain: token.chain,
        usd_value: token.value,
        token_count: 1,
      });
    }
  }
  
  return Array.from(chainMap.values()).sort((a, b) => b.usd_value - a.usd_value);
}

export async function getDeFiPositions(address: string): Promise<{
  name: string;
  tokens: DeBankToken[];
  totalValue: number;
}[]> {
  const portfolio = await getPortfolio(address);
  if (!portfolio?.project_list) return [];
  
  return portfolio.project_list.map(project => ({
    name: project.name,
    tokens: project.portfolio_token_list.map(p => p.token),
    totalValue: project.portfolio_token_list.reduce((sum, p) => sum + (p.token.value || 0), 0),
  }));
}

// Mock data for development when API is unavailable
export function getMockPortfolio(): DeBankPortfolio {
  return {
    total_networth_usd: 11551.10,
    token_list: [
      {
        id: "eth",
        chain: "eth",
        symbol: "ETH",
        name: "Ethereum",
        logo_url: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
        balance: 1.842,
        price: 2455.12,
        value: 4521.30,
      },
      {
        id: "usdc",
        chain: "base",
        symbol: "USDC",
        name: "USD Coin",
        logo_url: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
        balance: 2400,
        price: 1.00,
        value: 2400.00,
      },
      {
        id: "wbtc",
        chain: "eth",
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        logo_url: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
        balance: 0.024,
        price: 67533,
        value: 1620.80,
      },
      {
        id: "usdt",
        chain: "eth",
        symbol: "USDT",
        name: "Tether",
        logo_url: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
        balance: 1200,
        price: 1.00,
        value: 1200.00,
      },
      {
        id: "dai",
        chain: "eth",
        symbol: "DAI",
        name: "Dai",
        logo_url: "https://assets.coingecko.com/coins/images/9956/small/DAI.png",
        balance: 800,
        price: 1.00,
        value: 800.00,
      },
      {
        id: "pls",
        chain: "pls",
        symbol: "PLS",
        name: "PulseChain",
        logo_url: "",
        balance: 180000,
        price: 0.003,
        value: 540.00,
      },
      {
        id: "arb",
        chain: "arb",
        symbol: "ARB",
        name: "Arbitrum",
        logo_url: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
        balance: 250,
        price: 0.70,
        value: 175.00,
      },
      {
        id: "matic",
        chain: "matic",
        symbol: "MATIC",
        name: "Polygon",
        logo_url: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
        balance: 420,
        price: 0.70,
        value: 294.00,
      },
    ],
  };
}

export function getMockChainBalances(): DeBankChainBalance[] {
  return [
    { chain: "eth", usd_value: 6942, token_count: 4 },
    { chain: "base", usd_value: 2400, token_count: 1 },
    { chain: "pls", usd_value: 540, token_count: 1 },
    { chain: "arb", usd_value: 175, token_count: 1 },
    { chain: "matic", usd_value: 294, token_count: 1 },
    { chain: "bsc", usd_value: 200, token_count: 2 },
  ];
}