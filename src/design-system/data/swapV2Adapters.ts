import { formatUnits, parseUnits } from "viem";

import type { RouteHop } from "../components";
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
}

export interface SwapTradeInfo {
  amountIn: bigint;
  amountOut: bigint;
  amounts: bigint[];
  path: string[];
  pathTokens: SwapHookToken[];
  adapters: string[];
}

function addressKey(address: string | undefined): string {
  return (address || EMPTY_SWAP_TOKEN_ADDRESS).toLowerCase();
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
}: {
  quote: SwapQuoteLike | null | undefined;
  selectedTokenA: SwapHookToken | null | undefined;
  selectedTokenB: SwapHookToken | null | undefined;
  tokenOptions: SwapHookToken[];
  slippageBps: number;
}): SwapTradeInfo | null {
  if (!quote?.amounts?.length || !quote.path?.length || !selectedTokenA || !selectedTokenB) return null;

  const quotedOut = quote.amounts[quote.amounts.length - 1];
  const safeSlippageBps = Math.max(0, Math.min(10_000, Math.trunc(slippageBps || 0)));
  const minOut = (quotedOut * BigInt(10_000 - safeSlippageBps)) / 10_000n;
  const tokenByAddress = new Map(tokenOptions.map((token) => [addressKey(token.address), token]));

  return {
    amountIn: quote.amounts[0],
    amountOut: minOut,
    amounts: quote.amounts,
    path: quote.path,
    pathTokens: quote.path.map((address, index) => {
      if (index === 0) return selectedTokenA;
      if (index === quote.path.length - 1) return selectedTokenB;
      return tokenByAddress.get(addressKey(address)) ?? selectedTokenA;
    }),
    adapters: quote.adapters ?? [],
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

  return {
    amountIn: parsedAmount,
    amountOut: parsedAmount,
    amounts: [parsedAmount, parsedAmount],
    path: [selectedTokenA.address, selectedTokenB.address],
    pathTokens: [selectedTokenA, selectedTokenB],
    adapters: [],
  };
}

export function buildSwapRouteHops(
  tradeInfo: SwapTradeInfo | null | undefined,
  chain: Pick<V2ChainConfig, "name" | "color">,
): RouteHop[] | undefined {
  if (!tradeInfo?.pathTokens?.length) return undefined;

  return tradeInfo.pathTokens.map((token, index) => ({
    ticker: token.ticker,
    chainName: chain.name,
    chainColor: chain.color,
    via: tradeInfo.adapters[index],
  }));
}
