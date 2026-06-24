// ─── V2 Token View — thin adapter over existing canonical config ────────────
//
// DOES NOT create a new token registry.  Reads from:
//   • src/config/tokens/index.ts (CHAIN_TOKENS + per-chain JSON) — canonical lists
//   • src/design-system/data/logoRegistry.ts — token addresses for logos
//   • src/design-system/data/empxRegistry.ts — stable classification, settlement
//
// V2 pages call getTokensForChain(chainId) instead of hardcoding TOKENS_BY_CHAIN.

import { CHAIN_TOKENS } from "../../config/tokens";
import { getTokenAddress } from "./logoRegistry";

export interface V2TokenConfig {
  chainId: number;
  ticker: string;
  name: string;
  address?: string;
  decimals: number;
  isNative?: boolean;
  badge?: "VERIFIED" | "TRENDING" | "WARNING";
}

interface TokenJsonEntry {
  ticker?: string;
  symbol?: string;
  name?: string;
  address?: string;
  decimal?: number | string;
  decimals?: number | string;
  type?: string;
  featured?: boolean;
  usdPrice?: number;
}

const STABLE_TYPES = new Set(["STABLE", "STABLECOIN"]);
const NATIVE_TYPES = new Set(["NATIVE_ETH", "NATIVE", "GAS"]);

/** Get tokens for a given chain from the canonical config. Returns [] if unknown. */
export function getTokensForChain(chainId: number): V2TokenConfig[] {
  const rawTokens: TokenJsonEntry[] | undefined = CHAIN_TOKENS[chainId];
  if (!rawTokens) return [];

  return rawTokens
    .filter((t) => t.ticker || t.symbol)
    .map((t) => {
      const isZeroAddress = t.address === "0x0000000000000000000000000000000000000000";
      const addr = t.address && !isZeroAddress
        ? t.address
        : undefined;
      const isNative = isZeroAddress || NATIVE_TYPES.has(t.type ?? "");
      const isStable = STABLE_TYPES.has(t.type ?? "");
      const ticker = (t.ticker ?? t.symbol ?? "").toUpperCase();
      const decimals = Number(t.decimal ?? t.decimals ?? 18) || 18;

      return {
        chainId,
        ticker,
        name: t.name || ticker,
        address: (addr || getTokenAddress(chainId, ticker)) ?? undefined,
        decimals,
        isNative,
        badge: isStable ? "VERIFIED" as const : undefined,
      };
    });
}

/** Get the native token for a chain. Returns null if unknown. */
export function getNativeToken(chainId: number): V2TokenConfig | null {
  return getTokensForChain(chainId).find((t) => t.isNative) ?? null;
}
