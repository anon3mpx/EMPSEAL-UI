import { formatUnits, parseUnits } from "viem";
import type { RouteHop, TradeTimelineStep } from "../components";
import type { QuoteRequest } from "../../features/cross/api/contracts";
import {
  getOfferMinimumOutputAmount,
  getOfferOutputAmount,
} from "../../features/cross/utils/amounts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type ChainLike = {
  id: number;
  name: string;
  ticker?: string;
  color?: string;
};

type TokenLike = {
  ticker: string;
  address?: string;
  decimal?: number | string;
  decimals?: number | string;
  isNative?: boolean;
};

export type CrossV2OfferDisplay = {
  offerId: string;
  railName: string;
  outputAmount: string;
  minimumReceived: string;
  bridgeFeeUSD: number;
  protocolFeeUSD: number;
  totalFeeUSD: number;
  estimatedTimeSeconds: number | null;
  isBest: boolean;
};

function readDecimals(token?: TokenLike | null, fallback = 18): number {
  const raw = token?.decimal ?? token?.decimals;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tokenAddress(token?: TokenLike | null): string {
  if (!token) return ZERO_ADDRESS;
  if (token.isNative) return ZERO_ADDRESS;
  return token.address ?? ZERO_ADDRESS;
}

function formatBaseUnits(value: string | undefined, decimals: number): string {
  if (!value) return "0";
  try {
    const formatted = formatUnits(BigInt(value), decimals);
    const numeric = Number(formatted);
    return Number.isFinite(numeric)
      ? numeric.toLocaleString("en-US", { maximumFractionDigits: 6 })
      : formatted;
  } catch {
    return value;
  }
}

function readUsd(value: unknown): number {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSymbol(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof (value as any).canonicalAssetId === "string") return (value as any).canonicalAssetId;
  if (typeof (value as any).providerAssetId === "string") return (value as any).providerAssetId;
  if (typeof (value as any).tokenOutSymbol === "string") return (value as any).tokenOutSymbol;
  if (typeof (value as any).symbol === "string") return (value as any).symbol;
  return null;
}

function normalizeDisplayAmount(display: string): string {
  return display.replace(/,/g, "");
}

export function buildCrossQuoteRequest({
  fromToken,
  toToken,
  fromAmount,
  fromChainId,
  toChainId,
  userAddress,
  nativeDstAddress,
  includeDestinationGas = false,
  destinationGasAmount = "0",
}: {
  fromToken: TokenLike | null;
  toToken: TokenLike | null;
  fromAmount: string;
  fromChainId: number;
  toChainId: number;
  userAddress?: string;
  nativeDstAddress?: string;
  includeDestinationGas?: boolean;
  destinationGasAmount?: string;
}): QuoteRequest | null {
  if (!fromToken || !toToken || !userAddress) return null;

  // This adapter is the only UI -> backend quote-contract translation layer.
  // V2 pages keep using shared token config; the cross API still expects
  // base-unit amounts and zero-address native token semantics.
  let amountIn: string;
  try {
    amountIn = parseUnits(fromAmount || "0", readDecimals(fromToken)).toString();
  } catch {
    amountIn = "0";
  }

  const destinationGasAmountWei = (() => {
    try {
      return parseUnits(destinationGasAmount || "0", 18).toString();
    } catch {
      return "0";
    }
  })();

  return {
    tokenIn: tokenAddress(fromToken),
    tokenOut: tokenAddress(toToken),
    amountIn,
    srcChainId: fromChainId,
    dstChainId: toChainId,
    userAddress,
    nativeDstAddress: nativeDstAddress?.trim() || undefined,
    urgency: "fast",
    destinationGas:
      includeDestinationGas && destinationGasAmountWei !== "0"
        ? [
            {
              provider: "gaszip",
              chainId: toChainId,
              amountWei: destinationGasAmountWei,
            },
          ]
        : undefined,
  };
}

export function formatCrossOffer(offer: any, tokenOutDecimals = 18): CrossV2OfferDisplay {
  // Backend offers can represent output/minimum amounts in a few legacy shapes.
  // Reuse the cross feature amount helpers so V2 displays match the old page.
  const outputAmount = getOfferOutputAmount(offer);
  const minimumAmount = getOfferMinimumOutputAmount(offer);
  const bridgeFeeUSD = readUsd(offer?.economics?.providerFeeUSD ?? offer?.fees?.providerFeeUSD);
  const protocolFeeUSD = readUsd(offer?.economics?.protocolFeeUSD ?? offer?.fees?.protocolFeeUSD);

  return {
    offerId: offer.offerId,
    railName: offer.rail ?? offer.railName ?? "Route",
    outputAmount: normalizeDisplayAmount(formatBaseUnits(outputAmount, tokenOutDecimals)),
    minimumReceived: normalizeDisplayAmount(formatBaseUnits(minimumAmount, tokenOutDecimals)),
    bridgeFeeUSD,
    protocolFeeUSD,
    totalFeeUSD: bridgeFeeUSD + protocolFeeUSD,
    estimatedTimeSeconds:
      typeof offer?.economics?.settlementTimeSeconds === "number"
        ? offer.economics.settlementTimeSeconds
        : null,
    isBest: Boolean(offer.isBest),
  };
}

export function buildCrossRouteHops(
  offer: any,
  fromChain: ChainLike,
  toChain: ChainLike,
  fromTicker: string,
  toTicker: string,
): RouteHop[] {
  // Route hops are descriptive only, but they must come from offer metadata.
  // Falling back to selected tickers keeps the UI stable when older offer
  // payloads omit leg-level symbols.
  const sourceSwapSymbol = readSymbol(offer?.legs?.sourceSwap?.tokenOutSymbol) ??
    readSymbol(offer?.legs?.sourceSwap?.tokenOut) ??
    readSymbol(offer?.routeAsset) ??
    fromTicker;
  const bridgeSymbol = readSymbol(offer?.routeAsset) ?? sourceSwapSymbol;
  const destinationInputSymbol = readSymbol(offer?.destinationSettlementAsset) ?? bridgeSymbol;
  const hasSourceSwap = Boolean(offer?.legs?.sourceSwap);
  const hasDestinationSwap = Boolean(offer?.legs?.destinationSwap);

  const hops: RouteHop[] = [
    {
      ticker: fromTicker,
      chainName: fromChain.name,
      chainColor: fromChain.color,
      via: hasSourceSwap ? "Source swap" : String(offer?.rail ?? "Bridge"),
      venueType: hasSourceSwap ? "DEX" : "RAIL",
    },
  ];

  if (hasSourceSwap) {
    hops.push({
      ticker: sourceSwapSymbol,
      chainName: fromChain.name,
      chainColor: fromChain.color,
      via: String(offer?.rail ?? "Bridge"),
      venueType: "RAIL",
    });
  }

  hops.push({
    ticker: destinationInputSymbol,
    chainName: toChain.name,
    chainColor: toChain.color,
    via: hasDestinationSwap ? "Destination swap" : undefined,
    venueType: hasDestinationSwap ? "DEX" : undefined,
  });

  if (hasDestinationSwap) {
    hops.push({
      ticker: toTicker,
      chainName: toChain.name,
      chainColor: toChain.color,
    });
  }

  return hops;
}

export function buildCrossTimeline(
  tracking: any,
  session: any,
  fromChainName: string,
  toChainName: string,
  toTicker: string,
): TradeTimelineStep[] {
  // Success state is tracking-derived. The modal should not mark delivery
  // complete just because a route was selected or a source tx was submitted.
  const status = tracking?.status ?? tracking?.primaryTransfer?.status ?? session?.status ?? "SELECTED";
  const srcTxHash = tracking?.srcTxHash ?? tracking?.sourceTxHash ?? session?.lastTxHash;
  const dstTxHash = tracking?.dstTxHash ?? tracking?.destinationTxHash;
  const sourceComplete = Boolean(srcTxHash) || ["SUBMITTED", "DELIVERED", "COMPLETED"].includes(status);
  const delivered = Boolean(dstTxHash) || ["DELIVERED", "COMPLETED"].includes(status);

  return [
    {
      label: "Source confirmation",
      description: srcTxHash ?? `${fromChainName} transaction pending`,
      state: sourceComplete ? "complete" : "active",
    },
    {
      label: "Rail settlement",
      description: status,
      state: delivered ? "complete" : sourceComplete ? "active" : "pending",
    },
    {
      label: "Destination delivery",
      description: dstTxHash ?? `${toTicker} delivery on ${toChainName}`,
      state: delivered ? "complete" : "pending",
    },
  ];
}

export function shortHash(hash?: string | null): string {
  if (!hash) return "";
  return hash.length > 12 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}
