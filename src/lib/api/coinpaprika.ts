// CoinPaprika API - Free tier: 10,000 calls/month
// Used for: additional price data, historical charts, market info
// Alternative to CoinGecko when rate limited

const PAPRIKA_BASE = "https://api.coinpaprika.com/v1";

interface PaprikaPrice {
  price_usd: number;
  volume_24h_usd: number;
  market_cap_usd: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  price_change_24h: number;
  price_change_7d: number;
}

interface PaprikaCoin {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price: number;
}

// Simple cache
const priceCache = new Map<string, { data: PaprikaPrice; expiry: number }>();
const PRICE_CACHE_TTL = 60 * 1000; // 1 minute

function getPriceCached(coinId: string): PaprikaPrice | null {
  const entry = priceCache.get(coinId.toLowerCase());
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  return null;
}

function setPriceCache(coinId: string, data: PaprikaPrice): void {
  priceCache.set(coinId.toLowerCase(), { 
    data, 
    expiry: Date.now() + PRICE_CACHE_TTL 
  });
}

export async function getPrice(coinId: string): Promise<PaprikaPrice | null> {
  if (!coinId) return null;
  
  const cached = getPriceCached(coinId);
  if (cached) return cached;
  
  try {
    const url = `${PAPRIKA_BASE}/coins/${coinId}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`CoinPaprika API error: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const priceData: PaprikaPrice = {
      price_usd: data.price_usd,
      volume_24h_usd: data.volume_24h_usd,
      market_cap_usd: data.market_cap_usd,
      circulating_supply: data.circulating_supply,
      total_supply: data.total_supply,
      max_supply: data.max_supply,
      price_change_24h: data.price_change_24h,
      price_change_7d: data.price_change_7d,
    };
    
    setPriceCache(coinId, priceData);
    return priceData;
  } catch (error) {
    console.error("CoinPaprika price fetch failed:", error);
    return null;
  }
}

export async function getPrices(coinIds: string[]): Promise<Record<string, PaprikaPrice>> {
  const results: Record<string, PaprikaPrice> = {};
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < coinIds.length; i += batchSize) {
    const batch = coinIds.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (id) => {
        const price = await getPrice(id);
        if (price) {
          results[id] = price;
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < coinIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

export async function searchCoins(query: string): Promise<PaprikaCoin[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${PAPRIKA_BASE}/search?q=${encodeURIComponent(query)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Paprika error: ${res.status}`);
    
    const data = await res.json();
    return (data.coins || []).slice(0, 20);
  } catch (error) {
    console.error("CoinPaprika search failed:", error);
    return [];
  }
}

// Map common symbols to Paprika IDs
export const PAPRIKA_IDS: Record<string, string> = {
  ETH: "eth-ethereum",
  BTC: "btc-bitcoin",
  WBTC: "wbtc-wrapped-bitcoin",
  USDC: "usdc-usd-coin",
  USDT: "usdt-tether",
  DAI: "dai-dai",
  MATIC: "matic-polygon",
  ARB: "arb-arbitrum",
  OP: "op-optimism",
  BNB: "bnb-bnb",
  AVAX: "avax-avalanche",
  SOL: "sol-solana",
  PLS: "pls-pulsechain",
  LINK: "link-chainlink",
  UNI: "uni-uniswap",
  AAVE: "aave-aave",
};

export function getPaprikaId(symbol: string): string | undefined {
  return PAPRIKA_IDS[symbol.toUpperCase()];
}

// Historical OHLCV data
export async function getHistoricalPrices(
  coinId: string, 
  start: number, 
  end: number
): Promise<{ time: number; close: number }[]> {
  try {
    const url = `${PAPRIKA_BASE}/coins/${coinId}/ohlcv?start=${start}&end=${end}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Paprika error: ${res.status}`);
    
    const data = await res.json();
    return data.map((item: { timestamp: number; close: number }) => ({
      time: item.timestamp,
      close: item.close,
    }));
  } catch (error) {
    console.error("CoinPaprika historical fetch failed:", error);
    return [];
  }
}