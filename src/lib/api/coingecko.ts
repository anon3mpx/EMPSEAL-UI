// CoinGecko API - Free tier: 10-30 calls/minute, 200 calls/day
// Used for: token prices, logos, market data, chain info

const CG_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoPrice {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_7d_inverse?: number;
  };
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank?: number;
  current_price?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_days?: number;
}

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5s between requests for free tier

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
}

export async function getTokenPrices(coinIds: string[]): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {};
  
  try {
    const ids = coinIds.join(",");
    const url = `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) throw new Error(`CG error: ${res.status}`);
    
    const data: CoinGeckoPrice = await res.json();
    
    return Object.fromEntries(
      Object.entries(data).map(([id, info]) => [id, info.usd])
    );
  } catch (error) {
    console.error("CoinGecko price fetch failed:", error);
    return {};
  }
}

export async function getTokenPricesWithHistory(coinIds: string[]): Promise<{
  prices: Record<string, number>;
  changes24h: Record<string, number>;
  changes7d: Record<string, number>;
}> {
  if (coinIds.length === 0) return { prices: {}, changes24h: {}, changes7d: {} };
  
  try {
    const ids = coinIds.join(",");
    const url = `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) throw new Error(`CG error: ${res.status}`);
    
    const data: CoinGeckoPrice = await res.json();
    
    const prices: Record<string, number> = {};
    const changes24h: Record<string, number> = {};
    const changes7d: Record<string, number> = {};
    
    for (const [id, info] of Object.entries(data)) {
      prices[id] = info.usd;
      changes24h[id] = info.usd_24h_change || 0;
      changes7d[id] = info.usd_7d_inverse || 0;
    }
    
    return { prices, changes24h, changes7d };
  } catch (error) {
    console.error("CoinGecko price fetch failed:", error);
    return { prices: {}, changes24h: {}, changes7d: {} };
  }
}

export async function searchTokens(query: string): Promise<CoinGeckoCoin[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${CG_BASE}/search?query=${encodeURIComponent(query)}`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) throw new Error(`CG error: ${res.status}`);
    
    const data = await res.json();
    return (data.coins || []).slice(0, 20);
  } catch (error) {
    console.error("CoinGecko search failed:", error);
    return [];
  }
}

export async function getCoinInfo(coinId: string): Promise<CoinGeckoCoin | null> {
  try {
    const url = `${CG_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) throw new Error(`CG error: ${res.status}`);
    
    const data = await res.json();
    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      image: data.image?.large || data.image?.small || "",
      market_cap_rank: data.market_cap_rank,
      current_price: data.market_data?.current_price?.usd,
      price_change_percentage_24h: data.market_data?.price_change_percentage_24h,
      price_change_percentage_7d_in_days: data.market_data?.price_change_percentage_7d,
    };
  } catch (error) {
    console.error("CoinGecko coin info failed:", error);
    return null;
  }
}

// Common token coin IDs for quick lookup
export const COMMON_TOKEN_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  MATIC: "matic-network",
  ARB: "arbitrum",
  OP: "optimism",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  SOL: "solana",
  PLS: "pulsechain",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  SNX: "havven",
};

export function getCoinGeckoId(symbol: string): string | undefined {
  return COMMON_TOKEN_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
}