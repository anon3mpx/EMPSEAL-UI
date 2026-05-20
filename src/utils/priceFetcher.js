import { optimism } from "viem/chains";

const parsePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const DEXSCREENER_CHAIN_BY_SYMBOL = {
  pulsechain: "pulsechain",
  ethw: "ethw",
  sonic: "sonic",
  base: "base",
  "sei-network": "sei",
  sei: "sei",
  berachain: "berachain",
  rootstock: "rootstock",
  bsc: "bsc",
  monad: "monad",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon_pos",
  avalanche: "avalanche",
};

const getMostLiquidPair = (pairs = []) => {
  if (!pairs.length) return null;

  return pairs.reduce((bestPair, pair) => {
    const currentLiquidity = Number(pair?.liquidity?.usd || 0);
    const bestLiquidity = Number(bestPair?.liquidity?.usd || 0);
    return currentLiquidity > bestLiquidity ? pair : bestPair;
  }, pairs[0]);
};

const getDexScreenerTokenPrice = (pairs, tokenAddress) => {
  if (!Array.isArray(pairs) || !pairs.length || !tokenAddress) return null;

  const normalizedAddress = tokenAddress.toLowerCase();

  // Preferred path: token is baseToken, so priceUsd is already token USD price.
  const basePairs = pairs.filter(
    (pair) => pair?.baseToken?.address?.toLowerCase() === normalizedAddress
  );
  const bestBasePair = getMostLiquidPair(basePairs);
  const basePrice = parsePrice(bestBasePair?.priceUsd);
  if (basePrice !== null) return basePrice;

  // Fallback path: token is quoteToken. Derive quote USD price from base USD and base/quote rate.
  const quotePairs = pairs.filter(
    (pair) => pair?.quoteToken?.address?.toLowerCase() === normalizedAddress
  );
  const bestQuotePair = getMostLiquidPair(quotePairs);
  const baseUsdPrice = parsePrice(bestQuotePair?.priceUsd);
  const baseToQuoteRate = parsePrice(bestQuotePair?.priceNative);

  if (
    baseUsdPrice !== null &&
    baseToQuoteRate !== null &&
    baseToQuoteRate > 0
  ) {
    return baseUsdPrice / baseToQuoteRate;
  }

  return null;
};

const filterPairsByChain = (pairs, symbol) => {
  if (!Array.isArray(pairs) || !pairs.length) return [];

  const expectedChainId = DEXSCREENER_CHAIN_BY_SYMBOL[symbol?.toLowerCase()];
  if (!expectedChainId) return pairs;

  const filtered = pairs.filter(
    (pair) => pair?.chainId?.toLowerCase() === expectedChainId
  );

  return filtered.length ? filtered : pairs;
};

const getGeckoPriceByAddress = (tokenPrices, tokenAddress) => {
  if (!tokenPrices || !tokenAddress) return null;

  const normalizedAddress = tokenAddress.toLowerCase();
  const direct = parsePrice(tokenPrices[normalizedAddress]);
  if (direct !== null) return direct;

  const matchedKey = Object.keys(tokenPrices).find(
    (key) => key.toLowerCase() === normalizedAddress
  );
  return matchedKey ? parsePrice(tokenPrices[matchedKey]) : null;
};

const fetchJsonWithTimeout = async (url, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizePositivePrice = (value) => {
  const parsed = parsePrice(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

export const fetchTokenPrice = async (symbol, address) => {
  try {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();

    // Use DexScreener for Sei Network because GeckoTerminal doesn't index its tokens natively yet.
    if (
      symbol?.toLowerCase() === "sei-network" ||
      symbol?.toLowerCase() === "sei" || 
      symbol?.toLowerCase() === "polygon_pos" || symbol?.toLowerCase() === "polygon"
    ) {
      const data = await fetchJsonWithTimeout(
        `https://api.dexscreener.com/latest/dex/tokens/${normalizedAddress}`,
      );
      return normalizePositivePrice(
        getDexScreenerTokenPrice(
          filterPairsByChain(data?.pairs, symbol),
          normalizedAddress,
        ),
      );
    }

    let price = null;
    let fetchSuccess = false;

    try {
      const data = await fetchJsonWithTimeout(
        `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${normalizedAddress}`,
      );
      const tokenPrices = data?.data?.attributes?.token_prices;
      const geckoPrice = normalizePositivePrice(
        getGeckoPriceByAddress(tokenPrices, normalizedAddress),
      );

      if (geckoPrice !== null) {
        price = geckoPrice;
        fetchSuccess = true;
      }
    } catch (error) {
      console.warn(
        "GeckoTerminal failed, falling back to DexScreener:",
        error.message,
      );
    }

    if (!fetchSuccess) {
      try {
        const data = await fetchJsonWithTimeout(
          `https://api.dexscreener.com/latest/dex/tokens/${normalizedAddress}`,
        );
        const dexPrice = normalizePositivePrice(
          getDexScreenerTokenPrice(
            filterPairsByChain(data?.pairs, symbol),
            normalizedAddress,
          ),
        );
        if (dexPrice !== null) {
          price = dexPrice;
        }
      } catch (error) {
        console.error("DexScreener API also failed:", error.message);
      }
    }

    return normalizePositivePrice(price);
  } catch (error) {
    console.error("Error fetching token price:", error.message);
    return null;
  }
};
