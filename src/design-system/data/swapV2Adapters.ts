import { formatUnits, parseUnits } from "viem";

import type { RouteHop, SplitBranch } from "../components";
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

export interface SwapCalldata {
  to: string;
  data: string;
  value: string;
}

export interface PreparedSplitLeg {
  shareBps: number;
  amountIn: bigint;
  expectedOut: bigint;
  minAmountOut: bigint;
  path: string[];
  pathTokens: SwapHookToken[];
  adapters: string[];
}

export interface PreparedSwapRoute {
  source: "sdk" | "local";
  routing: "single" | "split";
  tradeInfo: SwapTradeInfo;
  calldata?: SwapCalldata;
  splits?: PreparedSplitLeg[];
  splitSavingsBps?: number;
  approvalTarget?: string;
  recipient?: string;
  sdkError?: unknown;
}

interface SdkTradeInfoLike {
  amountIn: string;
  amountOut: string;
  fee: string;
  affiliateFee: string;
  totalFeeBps: string;
  amounts: string[];
  path: string[];
  adapters: string[];
  gasEstimate: string;
  quoteId: string;
  timestamp: number;
  validUntil: number;
  sdkVersion: string;
}

interface SdkPreparedRouteLike {
  routing: "single" | "split";
  tradeInfo: SdkTradeInfoLike;
  calldata: SwapCalldata;
  swapType:
    | "WrapNative"
    | "UnwrapNative"
    | "NativeToERC20"
    | "ERC20ToNative"
    | "ERC20ToERC20";
  splits?: Array<{
    shareBps: number;
    amountIn: string;
    expectedOut: string;
    minAmountOut: string;
    path: string[];
    adapters: string[];
  }>;
  splitSavingsBps?: number;
  approvalTarget?: string;
}

const QUOTE_TTL_MS = 30_000;
const SDK_VERSION = "2.2.0";
const SWAP_QUOTE_DISPLAY_DECIMALS = 6;

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
  return match?.name?.replace(/Adapter$/i, "") ?? "Unknown venue";
}

function buildPathTokens(
  path: string[],
  selectedTokenA: SwapHookToken,
  selectedTokenB: SwapHookToken,
  tokenOptions: SwapHookToken[],
): SwapHookToken[] {
  const tokenByAddress = new Map(
    tokenOptions.map((token) => [addressKey(token.address), token]),
  );
  return path.map((address, index) => {
    if (index === 0) return selectedTokenA;
    if (index === path.length - 1) return selectedTokenB;
    return tokenByAddress.get(addressKey(address)) ?? {
      ...selectedTokenA,
      ticker: "TOKEN",
      name: "Intermediate token",
      address,
    };
  });
}

export function normalizeSdkPreparedRoute({
  prepared,
  selectedTokenA,
  selectedTokenB,
  tokenOptions,
  recipient,
}: {
  prepared: SdkPreparedRouteLike;
  selectedTokenA: SwapHookToken;
  selectedTokenB: SwapHookToken;
  tokenOptions: SwapHookToken[];
  recipient?: string;
}): PreparedSwapRoute {
  const trade = prepared.tradeInfo;
  const tradeInfo: SwapTradeInfo = {
    amountIn: BigInt(trade.amountIn),
    amountOut: BigInt(trade.amountOut),
    fee: trade.fee,
    affiliateFee: trade.affiliateFee,
    totalFeeBps: trade.totalFeeBps,
    amounts: trade.amounts.map(BigInt),
    path: [...trade.path],
    pathTokens: buildPathTokens(
      trade.path,
      selectedTokenA,
      selectedTokenB,
      tokenOptions,
    ),
    adapters: [...trade.adapters],
    gasEstimate: trade.gasEstimate,
    quoteId: trade.quoteId,
    timestamp: trade.timestamp,
    validUntil: trade.validUntil,
    sdkVersion: trade.sdkVersion,
  };

  return {
    source: "sdk",
    routing: prepared.routing,
    tradeInfo,
    calldata: prepared.calldata,
    splits: prepared.splits?.map((leg) => ({
      shareBps: leg.shareBps,
      amountIn: BigInt(leg.amountIn),
      expectedOut: BigInt(leg.expectedOut),
      minAmountOut: BigInt(leg.minAmountOut),
      path: [...leg.path],
      pathTokens: buildPathTokens(
        leg.path,
        selectedTokenA,
        selectedTokenB,
        tokenOptions,
      ),
      adapters: [...leg.adapters],
    })),
    splitSavingsBps: prepared.splitSavingsBps,
    approvalTarget: prepared.approvalTarget,
    recipient,
  };
}

export function getSwapRouteLabel(
  route: Pick<PreparedSwapRoute, "source" | "routing"> | null | undefined,
): string | undefined {
  if (!route) return undefined;
  if (route.source === "local") return "No-split fallback · Local router";
  return route.routing === "split" ? "Split swap · SDK" : "Single route · SDK";
}

export function buildSwapSplitBranches(
  route: PreparedSwapRoute | null | undefined,
  chainId: number,
): SplitBranch[] | undefined {
  if (!route || route.routing !== "split" || !route.splits?.length) return undefined;
  return route.splits.map((leg) => ({
    pct: leg.shareBps / 100,
    via:
      leg.adapters
        .map((adapter) => resolveAdapterDisplayName(chainId, adapter) ?? "Unknown venue")
        .join(" → ") || "Unknown venue",
    intermediateTickers: leg.pathTokens.slice(1, -1).map((token) => token.ticker),
  }));
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
  return formatDecimalString(formatUnits(quotedOut, outputDecimals), SWAP_QUOTE_DISPLAY_DECIMALS);
}

function formatDecimalString(value: string, displayDecimals: number): string {
  const sign = value.startsWith("-") ? "-" : "";
  const unsigned = sign ? value.slice(1) : value;
  const [rawInteger = "0", rawFraction = ""] = unsigned.split(".");
  const integer = rawInteger || "0";
  const paddedFraction = rawFraction.padEnd(displayDecimals + 1, "0");
  const visibleFraction = paddedFraction.slice(0, displayDecimals).split("");
  const roundDigit = Number(paddedFraction[displayDecimals] ?? "0");

  if (roundDigit < 5) {
    return `${sign}${integer}.${visibleFraction.join("")}`;
  }

  for (let i = visibleFraction.length - 1; i >= 0; i -= 1) {
    const next = Number(visibleFraction[i]) + 1;
    if (next < 10) {
      visibleFraction[i] = String(next);
      return `${sign}${integer}.${visibleFraction.join("")}`;
    }
    visibleFraction[i] = "0";
  }

  return `${sign}${BigInt(integer) + 1n}.${visibleFraction.join("")}`;
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
