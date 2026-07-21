import type { CrossUiChain, CrossUiToken } from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface ThorchainPoolAsset {
  asset?: string;
  status?: string;
  nativeDecimal?: string | number;
  native_decimal?: string | number;
  decimals?: string | number;
}

interface ThorchainChainMeta {
  chainId: number;
  name: string;
  symbol: string;
  nativeDestinationAddressRequired: boolean;
}

const THORCHAIN_CHAIN_META: Record<string, ThorchainChainMeta> = {
  ETH: { chainId: 1, name: "Ethereum", symbol: "ethereum", nativeDestinationAddressRequired: false },
  OP: { chainId: 10, name: "Optimism", symbol: "optimism", nativeDestinationAddressRequired: false },
  BSC: { chainId: 56, name: "BSC", symbol: "bsc", nativeDestinationAddressRequired: false },
  MATIC: { chainId: 137, name: "Polygon", symbol: "polygon", nativeDestinationAddressRequired: false },
  AVAX: { chainId: 43114, name: "Avalanche", symbol: "avalanche", nativeDestinationAddressRequired: false },
  ARB: { chainId: 42161, name: "Arbitrum", symbol: "arbitrum", nativeDestinationAddressRequired: false },
  BASE: { chainId: 8453, name: "Base", symbol: "base", nativeDestinationAddressRequired: false },
  BTC: { chainId: 0, name: "Bitcoin", symbol: "bitcoin", nativeDestinationAddressRequired: true },
  DOGE: { chainId: 98, name: "Dogecoin", symbol: "dogecoin", nativeDestinationAddressRequired: true },
  SOL: { chainId: 99, name: "Solana", symbol: "solana", nativeDestinationAddressRequired: true },
  LTC: { chainId: 100, name: "Litecoin", symbol: "litecoin", nativeDestinationAddressRequired: true },
  BCH: { chainId: 101, name: "Bitcoin Cash", symbol: "bitcoincash", nativeDestinationAddressRequired: true },
  GAIA: { chainId: 102, name: "Cosmos", symbol: "cosmos", nativeDestinationAddressRequired: true },
};

const DEFAULT_DECIMALS_BY_CHAIN: Record<string, number> = {
  BTC: 8,
  DOGE: 8,
  LTC: 8,
  BCH: 8,
  SOL: 9,
};

function parseDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function parseThorchainAsset(asset?: string) {
  const raw = asset?.trim();
  if (!raw) return null;

  const match = raw.match(/^([A-Za-z0-9]+)\.([A-Za-z0-9]+)(?:-(.+))?$/);
  if (!match) return null;

  return {
    notation: raw,
    chainAlias: match[1].toUpperCase(),
    symbol: match[2].toUpperCase(),
    tokenId: match[3],
  };
}

function normalizePoolTokenId(tokenId: string | undefined): string | null {
  if (!tokenId) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(tokenId)) return tokenId;
  if (/^0X[0-9a-fA-F]{40}$/.test(tokenId)) return `0x${tokenId.slice(2).toLowerCase()}`;
  return tokenId;
}

export function getThorchainUiChains(): CrossUiChain[] {
  return Object.values(THORCHAIN_CHAIN_META).map((chain) => ({
    chainId: chain.chainId,
    name: chain.name,
    symbol: chain.symbol,
  }));
}

export function requiresThorchainNativeDestinationAddress(chainId: number): boolean {
  return Object.values(THORCHAIN_CHAIN_META).some(
    (chain) => chain.chainId === chainId && chain.nativeDestinationAddressRequired,
  );
}

export function getThorchainTokensForChain(
  chainId: number,
  pools: ThorchainPoolAsset[],
): CrossUiToken[] {
  return pools.flatMap((pool) => {
    if (String(pool.status ?? "").toLowerCase() !== "available") return [];

    const parsed = parseThorchainAsset(pool.asset);
    if (!parsed) return [];

    const meta = THORCHAIN_CHAIN_META[parsed.chainAlias];
    if (!meta || meta.chainId !== chainId) return [];

    const tokenId = normalizePoolTokenId(parsed.tokenId);
    const address = tokenId ?? (parsed.symbol === parsed.chainAlias ? parsed.notation : ZERO_ADDRESS);
    const decimals =
      parseDecimal(pool.nativeDecimal ?? pool.native_decimal ?? pool.decimals) ??
      DEFAULT_DECIMALS_BY_CHAIN[parsed.chainAlias] ??
      (/^USDC|USDT|DAI|BUSD$/.test(parsed.symbol) ? 6 : 18);

    return [{
      chainId,
      address,
      symbol: parsed.symbol,
      name: parsed.notation,
      decimals,
      isNative: address === ZERO_ADDRESS || address === parsed.notation,
      featured: !parsed.tokenId,
      stable: /usdc|usdt|dai|busd|usd/i.test(parsed.symbol),
    }];
  });
}

export function mergeCrossTokens(
  primary: CrossUiToken[],
  secondary: CrossUiToken[],
): CrossUiToken[] {
  const seen = new Set(primary.map((token) => token.address.toLowerCase()));
  const merged = [...primary];

  for (const token of secondary) {
    const key = token.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(token);
  }

  return merged;
}
