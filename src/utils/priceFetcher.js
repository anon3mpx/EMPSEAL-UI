export const fetchTokenPrice = async (symbol, address) => {
  try {
    if (!address) return null;

    // Use DexScreener for Sei Network because GeckoTerminal doesn't index its tokens natively yet
    if (symbol?.toLowerCase() === "sei-network" || symbol?.toLowerCase() === "sei") {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );

      if (!response.ok) throw new Error("Failed to fetch from DexScreener");

      const data = await response.json();

      // DexScreener returns an array of pairs. We take the price from the first (most liquid) pair.
      if (data.pairs && data.pairs.length > 0) {
        return parseFloat(data.pairs[0].priceUsd) || null;
      }
      return null;
    }

    // Default GeckoTerminal logic for all other chains
    const response = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${address}`
    );

    if (!response.ok) throw new Error("Failed to fetch from GeckoTerminal");

    const data = await response.json();
    const tokenPrices = data?.data?.attributes?.token_prices;

    if (!tokenPrices) return null;

    return tokenPrices[address.toLowerCase()] || null;

  } catch (error) {
    console.error("Error fetching token price:", error.message);
    return null;
  }
};
