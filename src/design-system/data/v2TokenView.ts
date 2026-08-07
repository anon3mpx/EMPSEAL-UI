// ─── V2 Token View — thin adapter over existing canonical config ────────────
//
// DOES NOT create a new token registry.  Reads from:
//   • src/config/tokens/index.ts (CHAIN_TOKENS + per-chain JSON) — canonical lists
//   • src/design-system/data/logoRegistry.ts — token addresses for logos
//   • src/design-system/data/empxRegistry.ts — stable classification, settlement
//
// V2 pages call getTokensForChain(chainId) instead of hardcoding TOKENS_BY_CHAIN.

import { CHAIN_TOKENS } from "../../config/tokens";
import { NON_EVM_CHAIN_IDS } from "../../lib/wallet/chainKind";
import { getTokenAddress } from "./logoRegistry";

export interface V2TokenConfig {
  chainId: number;
  ticker: string;
  name: string;
  address?: string;
  providerAssetId?: string;
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

const FALLBACK_TOKENS: Record<number, V2TokenConfig[]> = {
  1: [
    {
      chainId: 1,
      ticker: "ETH",
      name: "Ethereum",
      decimals: 18,
      isNative: true,
    },
    {
      chainId: 1,
      ticker: "USDC",
      name: "USD Coin",
      address: "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48",
      decimals: 6,
      badge: "VERIFIED",
    },
  ],
  130: [{
    chainId: 130,
    ticker: "USDC",
    name: "USD Coin",
    address: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
    decimals: 6,
    badge: "VERIFIED",
  }],
  480: [{
    chainId: 480,
    ticker: "USDC",
    name: "USD Coin",
    address: "0x79A02482A880bCE3F13E09Da970dC34db4CD24d1",
    decimals: 6,
    badge: "VERIFIED",
  }],
  57073: [{
    chainId: 57073,
    ticker: "USDC",
    name: "USD Coin",
    address: "0x2D270e6886d130D724215A266106e6832161EAEd",
    decimals: 6,
    badge: "VERIFIED",
  }],
  59144: [{
    chainId: 59144,
    ticker: "USDC",
    name: "USD Coin",
    address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    decimals: 6,
    badge: "VERIFIED",
  }],
  98866: [{
    chainId: 98866,
    ticker: "USDC",
    name: "USD Coin",
    address: "0x222365EF19F7947e5484218551B56bb3965Aa7aF",
    decimals: 6,
    badge: "VERIFIED",
  }],
  [NON_EVM_CHAIN_IDS.BTC]: [
    {
      chainId: NON_EVM_CHAIN_IDS.BTC,
      ticker: "BTC",
      name: "Bitcoin",
      providerAssetId: "BTC.BTC",
      decimals: 8,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.DOGE]: [
    {
      chainId: NON_EVM_CHAIN_IDS.DOGE,
      ticker: "DOGE",
      name: "Dogecoin",
      providerAssetId: "DOGE.DOGE",
      decimals: 8,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.SOL]: [
    {
      chainId: NON_EVM_CHAIN_IDS.SOL,
      ticker: "SOL",
      name: "Solana",
      providerAssetId: "SOL.SOL",
      decimals: 9,
      isNative: true,
    },
    {
      chainId: NON_EVM_CHAIN_IDS.SOL,
      ticker: "USDC",
      name: "USD Coin",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      providerAssetId: "SOL.USDC",
      decimals: 6,
      badge: "VERIFIED",
    },
  ],
  [NON_EVM_CHAIN_IDS.LTC]: [
    {
      chainId: NON_EVM_CHAIN_IDS.LTC,
      ticker: "LTC",
      name: "Litecoin",
      providerAssetId: "LTC.LTC",
      decimals: 8,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.BCH]: [
    {
      chainId: NON_EVM_CHAIN_IDS.BCH,
      ticker: "BCH",
      name: "Bitcoin Cash",
      providerAssetId: "BCH.BCH",
      decimals: 8,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.COSMOS]: [
    {
      chainId: NON_EVM_CHAIN_IDS.COSMOS,
      ticker: "ATOM",
      name: "Cosmos",
      providerAssetId: "GAIA.ATOM",
      decimals: 6,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.DOT]: [
    {
      chainId: NON_EVM_CHAIN_IDS.DOT,
      ticker: "DOT",
      name: "Polkadot",
      providerAssetId: "DOT.DOT",
      decimals: 10,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.KUJIRA]: [
    {
      chainId: NON_EVM_CHAIN_IDS.KUJIRA,
      ticker: "KUJI",
      name: "Kujira",
      providerAssetId: "KUJI.KUJI",
      decimals: 6,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.DASH]: [
    {
      chainId: NON_EVM_CHAIN_IDS.DASH,
      ticker: "DASH",
      name: "Dash",
      providerAssetId: "DASH.DASH",
      decimals: 8,
      isNative: true,
    },
  ],
  [NON_EVM_CHAIN_IDS.ZCASH]: [
    {
      chainId: NON_EVM_CHAIN_IDS.ZCASH,
      ticker: "ZEC",
      name: "Zcash",
      providerAssetId: "ZEC.ZEC",
      decimals: 8,
      isNative: true,
    },
  ],
};

/** Get tokens for a given chain from the canonical config. Returns [] if unknown. */
export function getTokensForChain(chainId: number): V2TokenConfig[] {
  const rawTokens: TokenJsonEntry[] | undefined = CHAIN_TOKENS[chainId];
  if (!rawTokens) {
    return FALLBACK_TOKENS[chainId] ?? [];
  }

  return rawTokens
    .filter((t) => t.ticker || t.symbol)
    .map((t) => {
      const isZeroAddress = t.address === "0x0000000000000000000000000000000000000000";
      const addr = t.address && !isZeroAddress
        ? t.address
        : undefined;
      const isNative = isZeroAddress || NATIVE_TYPES.has(t.type ?? "");
      const isStable = STABLE_TYPES.has(t.type ?? "");
      const ticker = t.ticker ?? t.symbol ?? "";
      const tickerKey = ticker.toUpperCase();
      const decimals = Number(t.decimal ?? t.decimals ?? 18) || 18;

      return {
        chainId,
        ticker,
        name: t.name || ticker,
        address: (addr || getTokenAddress(chainId, tickerKey)) ?? undefined,
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
