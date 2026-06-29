import { formatUnits, parseUnits } from "viem";

import type { RouteHop } from "../components";
import { CHAIN_ADAPTERS } from "../../config/adapters";
import type { V2ChainConfig } from "./v2ChainView";
import type { V2TokenConfig } from "./v2TokenView";

export const EMPTY_SWAP_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface SwapHookToken {
  ticker: string;
  name: string;
  address: string;
  decimal: number;
  decimals: number;
  chainName: string;
  chainColor?: string;
  badge?: "VERIFIED" | "TRENDING";
  balance?: string;
  balanceUSD?: number;
}

export interface SwapQuoteLike {
  amounts: bigint[];
  path: string[];
  adapters: string[];
  gasEstimate?: string;
}

export interface SwapTradeInfo {
  amountIn: bigint;
  amountOut: bigint;
  fee: string;
  affiliateFee: string;
  totalFeeBps: string;
  amounts: bigint[];
  path: string[];
  pathTokens: SwapHookToken[];
  adapters: string[];
  gasEstimate: string;
  quoteId: string;
  timestamp: number;
  validUntil: number;
  sdkVersion: string;
}

const QUOTE_TTL_MS = 30_000;
const SDK_VERSION = "2.0.1";

function buildQuoteMetadata() {
  const now = Date.now();
  const quoteId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `swap-${now}`;

  return {
    quoteId,
    timestamp: now,
    validUntil: now + QUOTE_TTL_MS,
    sdkVersion: SDK_VERSION,
  };
}

function addressKey(address: string | undefined): string {
  return (address || EMPTY_SWAP_TOKEN_ADDRESS).toLowerCase();
}

const ADDRESS_LIKE = /^0x[0-9a-fA-F]{40}$/;

function resolveAdapterDisplayName(chainId: number | undefined, adapter?: string): string | undefined {
  const raw = adapter?.trim();
  if (!raw) return undefined;
  if (!ADDRESS_LIKE.test(raw)) return raw.replace(/Adapter$/i, "");

  const match = (chainId ? CHAIN_ADAPTERS[chainId] : undefined)?.find(
    (entry) => addressKey(entry.address) === addressKey(raw),
  );
  return match?.name?.replace(/Adapter$/i, "");
}

export function toSwapHookToken(token: V2TokenConfig, chain: V2ChainConfig): SwapHookToken {
  return {
    ticker: token.ticker,
    name: token.name,
    address: token.address ?? EMPTY_SWAP_TOKEN_ADDRESS,
    decimal: token.decimals,
    decimals: token.decimals,
    chainName: chain.name,
    chainColor: chain.color,
    badge: token.badge === "WARNING" ? undefined : token.badge,
  };
}

export function formatSwapQuoteOutput(quote: SwapQuoteLike | null | undefined, outputDecimals: number): string {
  const quotedOut = quote?.amounts?.[quote.amounts.length - 1];
  if (quotedOut == null) return "0";
  return formatUnits(quotedOut, outputDecimals);
}

export function buildSwapTradeInfo({
  quote,
  selectedTokenA,
  selectedTokenB,
  tokenOptions,
  slippageBps,
  protocolFeeBps = 0,
}: {
  quote: SwapQuoteLike | null | undefined;
  selectedTokenA: SwapHookToken | null | undefined;
  selectedTokenB: SwapHookToken | null | undefined;
  tokenOptions: SwapHookToken[];
  slippageBps: number;
  protocolFeeBps?: number;
}): SwapTradeInfo | null {
  if (!quote?.amounts?.length || !quote.path?.length || !selectedTokenA || !selectedTokenB) return null;

  const quotedOut = quote.amounts[quote.amounts.length - 1];
  const safeSlippageBps = Math.max(0, Math.min(10_000, Math.trunc(slippageBps || 0)));
  const safeProtocolFeeBps = Math.max(0, Math.trunc(protocolFeeBps || 0));
  const minOut = (quotedOut * BigInt(10_000 - safeSlippageBps)) / 10_000n;
  const tokenByAddress = new Map(tokenOptions.map((token) => [addressKey(token.address), token]));
  const metadata = buildQuoteMetadata();

  return {
    amountIn: quote.amounts[0],
    amountOut: minOut,
    fee: String(safeProtocolFeeBps),
    affiliateFee: "0",
    totalFeeBps: String(safeProtocolFeeBps),
    amounts: quote.amounts,
    path: quote.path,
    pathTokens: quote.path.map((address, index) => {
      if (index === 0) return selectedTokenA;
      if (index === quote.path.length - 1) return selectedTokenB;
      return tokenByAddress.get(addressKey(address)) ?? selectedTokenA;
    }),
    adapters: quote.adapters ?? [],
    gasEstimate: quote.gasEstimate ?? "0",
    ...metadata,
  };
}

export function buildDirectSwapTradeInfo({
  amountIn,
  selectedTokenA,
  selectedTokenB,
}: {
  amountIn: string;
  selectedTokenA: SwapHookToken | null | undefined;
  selectedTokenB: SwapHookToken | null | undefined;
}): SwapTradeInfo | null {
  if (!selectedTokenA || !selectedTokenB) return null;

  let parsedAmount = 0n;
  try {
    parsedAmount = parseUnits(amountIn || "0", selectedTokenA.decimal);
  } catch {
    parsedAmount = 0n;
  }

  const metadata = buildQuoteMetadata();

  return {
    amountIn: parsedAmount,
    amountOut: parsedAmount,
    fee: "0",
    affiliateFee: "0",
    totalFeeBps: "0",
    amounts: [parsedAmount, parsedAmount],
    path: [selectedTokenA.address, selectedTokenB.address],
    pathTokens: [selectedTokenA, selectedTokenB],
    adapters: [],
    gasEstimate: "0",
    ...metadata,
  };
}

export function buildSwapRouteHops(
  tradeInfo: SwapTradeInfo | null | undefined,
  chain: Pick<V2ChainConfig, "id" | "name" | "color">,
): RouteHop[] | undefined {
  if (!tradeInfo?.pathTokens?.length) return undefined;

  return tradeInfo.pathTokens.map((token, index) => ({
    ticker: token.ticker,
    chainName: chain.name,
    chainColor: chain.color,
    // SDK adapter identifiers can be contract addresses. Resolve those through
    // canonical adapter config and hide unknown addresses instead of rendering
    // raw contract strings into compact route visuals.
    via: index < tradeInfo.pathTokens.length - 1
      ? resolveAdapterDisplayName(chain.id, tradeInfo.adapters[index])
      : undefined,
  }));
}
