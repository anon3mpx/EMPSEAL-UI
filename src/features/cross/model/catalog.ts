import { SUPPORTED_CHAINS } from "@/config/chains";
import { CHAIN_TOKENS } from "@/config/tokens";
import type { CrossUiChain, CrossUiToken } from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function getCrossUiChains(): CrossUiChain[] {
  return Object.values(SUPPORTED_CHAINS).map((chain) => ({
    chainId: chain.chainId,
    name: chain.name,
    symbol: chain.symbol,
    explorer: chain.blockExplorer,
  }));
}

export function getCrossTokensForChain(chainId: number): CrossUiToken[] {
  const tokens = CHAIN_TOKENS[chainId] ?? [];
  const seenAddresses = new Set<string>();

  return tokens.flatMap((token) => {
    const normalizedAddress = token.address.toLowerCase();
    if (seenAddresses.has(normalizedAddress)) {
      return [];
    }

    seenAddresses.add(normalizedAddress);

    const symbol = token.ticker ?? token.symbol ?? token.name;

    return [
      {
        chainId,
        address: token.address,
        symbol,
        name: token.name,
        decimals: Number(token.decimal ?? token.decimals ?? 18),
        logo: token.image,
        isNative: normalizedAddress === ZERO_ADDRESS,
        featured: Boolean(token.featured),
        stable: /usdc|usdt|dai|busd|usd/i.test(symbol),
      },
    ];
  });
}

export function pickDefaultToken(
  tokens: CrossUiToken[],
): CrossUiToken | undefined {
  return [...tokens].sort((left, right) => {
    const leftRank =
      Number(left.stable) * 4 +
      Number(left.featured) * 2 +
      Number(left.isNative);
    const rightRank =
      Number(right.stable) * 4 +
      Number(right.featured) * 2 +
      Number(right.isNative);

    return rightRank - leftRank;
  })[0];
}
