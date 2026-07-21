// Zapper API - Free tier: varies
// Used for: NFT holdings, DeFi positions, token balances
// Note: Zapper requires API key for production

const ZAPPER_BASE = "https://api.zapper.fi/v2";

export interface ZapperToken {
  symbol: string;
  name: string;
  address: string;
  network: string;
  balance: number;
  balanceUSD: number;
  price: number;
}

export interface ZapperNft {
  contractAddress: string;
  tokenId: string;
  name: string;
  collectionName: string;
  network: string;
  balance: number;
  floorPrice?: number;
  imageUrl?: string;
}

interface ZapperPortfolio {
  products: {
    label: string;
    assets: ZapperToken[];
  }[];
}

// Simple cache
const nftCache = new Map<string, { data: ZapperNft[]; expiry: number }>();
const NFT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getNftCached(address: string): ZapperNft[] | null {
  const entry = nftCache.get(address.toLowerCase());
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  return null;
}

function setNftCache(address: string, data: ZapperNft[]): void {
  nftCache.set(address.toLowerCase(), { 
    data, 
    expiry: Date.now() + NFT_CACHE_TTL 
  });
}

export async function getNfts(address: string): Promise<ZapperNft[]> {
  if (!address) return [];
  
  const cached = getNftCached(address);
  if (cached) return cached;
  
  try {
    // Zapper requires API key - using public endpoint as fallback
    const url = `${ZAPPER_BASE}/nfts?addresses[]=${address}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Zapper API error: ${res.status}`);
      return getMockNfts();
    }
    
    const data = await res.json();
    const nfts = data.results?.[address]?.nfts || [];
    setNftCache(address, nfts);
    return nfts;
  } catch (error) {
    console.error("Zapper NFT fetch failed:", error);
    return getMockNfts();
  }
}

export async function getTokenBalances(address: string, networks: string[]): Promise<ZapperToken[]> {
  if (!address || networks.length === 0) return [];
  
  try {
    const networkParams = networks.map(n => `networks[]=${n}`).join("&");
    const url = `${ZAPPER_BASE}/balances?address=${address}&${networkParams}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Zapper API error: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const tokens: ZapperToken[] = [];
    
    for (const product of data.products || []) {
      for (const asset of product.assets || []) {
        tokens.push(asset);
      }
    }
    
    return tokens;
  } catch (error) {
    console.error("Zapper balance fetch failed:", error);
    return [];
  }
}

// Mock data for development
export function getMockNfts(): ZapperNft[] {
  return [
    {
      contractAddress: "0x...seal142",
      tokenId: "142",
      name: "EMPX SEAL #142",
      collectionName: "EMPX Seals",
      network: "ethereum",
      balance: 1,
      floorPrice: 0.42,
      imageUrl: "",
    },
    {
      contractAddress: "0xb47e3cd837dDF8e4c57F05d70Ab865de16e42570",
      tokenId: "8904",
      name: "CryptoPunk #8904",
      collectionName: "CryptoPunks",
      network: "ethereum",
      balance: 1,
      floorPrice: 54,
      imageUrl: "",
    },
    {
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenId: "2291",
      name: "Bored Ape #2291",
      collectionName: "Bored Ape Yacht Club",
      network: "ethereum",
      balance: 1,
      floorPrice: 12.8,
      imageUrl: "",
    },
    {
      contractAddress: "0x...base77",
      tokenId: "77",
      name: "Base Seal #77",
      collectionName: "Base Seals",
      network: "base",
      balance: 1,
      floorPrice: 0.08,
      imageUrl: "",
    },
  ];
}