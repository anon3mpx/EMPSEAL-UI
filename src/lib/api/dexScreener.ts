import { SUPPORTED_CHAINS } from "../../config/chains";

const DEX_SCREENER_BASE = "https://api.dexscreener.com";

const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

interface DexScreenerToken {
  address?: string;
}

interface DexScreenerPair {
  chainId?: string;
  baseToken?: DexScreenerToken;
  quoteToken?: DexScreenerToken;
  priceNative?: string | null;
  priceUsd?: string | null;
  priceChange?: {
    h24?: number;
  } | null;
  liquidity?: {
    usd?: number;
  } | null;
}

interface DexScreenerTokenResponse {
  pairs?: DexScreenerPair[];
}

export interface DexScreenerPriceToken {
  id: string;
  address: string;
  chainId: number;
  isNative?: boolean;
}

export interface DexScreenerTokenPrice {
  price: number;
  change24h: number;
}

const DEXSCREENER_CHAIN_BY_CHAIN_ID: Record<number, string> = {
  1: "ethereum",
  369: "pulsechain",
  146: "sonic",
  8453: "base",
  1329: "sei",
  80094: "berachain",
  30: "rootstock",
  56: "bsc",
  143: "monad",
  42161: "arbitrum",
  10: "optimism",
  137: "polygon_pos",
  43114: "avalanche",
  999: "hyperevm",
};

const WRAPPED_NATIVE_BY_CHAIN_ID: Record<number, string> = {
  369: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  8453: "0x4200000000000000000000000000000000000006",
  42161: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  10: "0x4200000000000000000000000000000000000006",
  137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  56: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  43114: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  146: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
  1329: "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7",
  80094: "0x6969696969696969696969696969696969696969",
  30: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
  10001: "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990",
  999: "0x5555555555555555555555555555555555555555",
};

function parseNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLookupAddress(token: DexScreenerPriceToken): string | null {
  if (
    token.isNative ||
    token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS
  ) {
    return (
      SUPPORTED_CHAINS[token.chainId]?.wethAddress ||
      WRAPPED_NATIVE_BY_CHAIN_ID[token.chainId]
    )?.toLowerCase() || null;
  }

  return token.address.toLowerCase();
}

function getTokenPriceFromPair(
  pair: DexScreenerPair,
  tokenAddress: string,
): number {
  const baseTokenAddress = pair.baseToken?.address?.toLowerCase();
  const quoteTokenAddress = pair.quoteToken?.address?.toLowerCase();
  const basePriceUsd = parseNumber(pair.priceUsd);

  if (tokenAddress === baseTokenAddress) return basePriceUsd;

  if (tokenAddress === quoteTokenAddress) {
    const basePriceInQuoteToken = parseNumber(pair.priceNative);
    return basePriceInQuoteToken > 0 ? basePriceUsd / basePriceInQuoteToken : 0;
  }

  return 0;
}

function getMostLiquidPair(pairs: DexScreenerPair[]): DexScreenerPair | null {
  if (!pairs.length) return null;

  return pairs.reduce((bestPair, pair) => {
    const currentLiquidity = parseNumber(pair.liquidity?.usd);
    const bestLiquidity = parseNumber(bestPair.liquidity?.usd);
    return currentLiquidity > bestLiquidity ? pair : bestPair;
  }, pairs[0]);
}

function filterPairsByChain(
  pairs: DexScreenerPair[],
  chainId: number,
): DexScreenerPair[] {
  const expectedChainId = DEXSCREENER_CHAIN_BY_CHAIN_ID[chainId];
  if (!expectedChainId) return pairs;

  const filtered = pairs.filter(
    (pair) => pair.chainId?.toLowerCase() === expectedChainId,
  );

  return filtered.length ? filtered : pairs;
}

function getBestTokenPrice(
  pairs: DexScreenerPair[],
  tokenAddress: string,
): DexScreenerTokenPrice | null {
  const normalizedAddress = tokenAddress.toLowerCase();
  const basePairs = pairs.filter(
    (pair) => pair.baseToken?.address?.toLowerCase() === normalizedAddress,
  );
  const bestBasePair = getMostLiquidPair(basePairs);
  const basePrice = parseNumber(bestBasePair?.priceUsd);

  if (basePrice > 0) {
    return {
      price: basePrice,
      change24h: parseNumber(bestBasePair?.priceChange?.h24),
    };
  }

  const quotePairs = pairs.filter(
    (pair) => pair.quoteToken?.address?.toLowerCase() === normalizedAddress,
  );
  const bestQuotePair = getMostLiquidPair(quotePairs);
  const quotePrice = bestQuotePair
    ? getTokenPriceFromPair(bestQuotePair, normalizedAddress)
    : 0;

  if (quotePrice > 0) {
    return {
      price: quotePrice,
      change24h: parseNumber(bestQuotePair?.priceChange?.h24),
    };
  }

  return null;
}

export async function getDexScreenerTokenPrices(
  tokens: DexScreenerPriceToken[],
): Promise<Record<string, DexScreenerTokenPrice>> {
  const tokensByAddress = new Map<
    string,
    Array<DexScreenerPriceToken & { lookupAddress: string }>
  >();

  for (const token of tokens) {
    const lookupAddress = getLookupAddress(token);

    if (!lookupAddress) continue;

    const addressTokens = tokensByAddress.get(lookupAddress) || [];
    addressTokens.push({ ...token, lookupAddress });
    tokensByAddress.set(lookupAddress, addressTokens);
  }

  const prices: Record<string, DexScreenerTokenPrice> = {};

  for (const [address, addressTokens] of tokensByAddress.entries()) {
    const url = `${DEX_SCREENER_BASE}/latest/dex/tokens/${address}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`DexScreener error: ${res.status}`);

      const data: DexScreenerTokenResponse = await res.json();
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];

      for (const token of addressTokens) {
        const price = getBestTokenPrice(
          filterPairsByChain(pairs, token.chainId),
          token.lookupAddress,
        );

        if (price) prices[token.id] = price;
      }
    } catch (error) {
      console.warn(`DexScreener price fetch failed for ${address}:`, error);
    }
  }

  return prices;
}
