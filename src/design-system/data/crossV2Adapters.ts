import { formatUnits, parseUnits } from "viem";
import type { RouteHop, TradeTimelineStep } from "../components";
import type {
  LayerZeroValueTransferApiChain,
  LayerZeroValueTransferApiQuoteContext,
  LayerZeroValueTransferApiToken,
  QuoteRequest,
} from "../../features/cross/api/contracts";
import { NON_EVM_CHAIN_IDS } from "../../lib/wallet/chainKind";
import { isBackendNonEvmChainId } from "../../lib/wallet/chainKind";
import {
  getOfferMinimumOutputAmount,
  getOfferOutputAmount,
} from "../../features/cross/utils/amounts";
import {
  getOfferCapability,
  type RailCapabilityStatus,
} from "../../features/cross/model/capabilities";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CROSS_V2_DEFAULT_SELECTION = {
  fromChainId: 8453,
  toChainId: 42161,
  fromTicker: "USDC",
  toTicker: "USDC",
  fromAmount: "10",
} as const;

export type LayerZeroChainCatalogEntry = LayerZeroValueTransferApiChain & {
  id: number;
  quoteChainId: number;
  providerChainKey: string;
  providerChainType: string;
};

export type LayerZeroAwareChainOption = {
  id: number;
  name: string;
  ticker: string;
  color: string;
  kind?: "EVM" | "BTC" | "SOL" | "OTHER";
  quoteChainId?: number;
  providerChainKey?: string;
  providerChainType?: string;
};

const LAYERZERO_NON_EVM_UI_IDS: Record<string, number> = {
  bitcoin: NON_EVM_CHAIN_IDS.BTC,
  dogecoin: NON_EVM_CHAIN_IDS.DOGE,
  solana: NON_EVM_CHAIN_IDS.SOL,
  litecoin: NON_EVM_CHAIN_IDS.LTC,
  bitcoin_cash: NON_EVM_CHAIN_IDS.BCH,
  cosmos: NON_EVM_CHAIN_IDS.COSMOS,
  polkadot: NON_EVM_CHAIN_IDS.DOT,
  kujira: NON_EVM_CHAIN_IDS.KUJIRA,
  dash: NON_EVM_CHAIN_IDS.DASH,
  zcash: NON_EVM_CHAIN_IDS.ZCASH,
  aptos: NON_EVM_CHAIN_IDS.APTOS,
};

function providerUiChainId(chain: LayerZeroValueTransferApiChain, index: number): number {
  if (chain.chainType.trim().toUpperCase() === "EVM" && Number.isSafeInteger(chain.chainId)) {
    return Number(chain.chainId);
  }
  const key = chain.chainKey.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return LAYERZERO_NON_EVM_UI_IDS[key] ?? -(index + 1);
}

export function buildLayerZeroChainCatalog(
  chains: LayerZeroValueTransferApiChain[],
): LayerZeroChainCatalogEntry[] {
  return chains.map((chain, index) => ({
    ...chain,
    id: providerUiChainId(chain, index),
    quoteChainId: Number.isSafeInteger(chain.chainId) ? Number(chain.chainId) : providerUiChainId(chain, index),
    providerChainKey: chain.chainKey,
    providerChainType: chain.chainType,
  }));
}

function providerChainKind(chain: LayerZeroChainCatalogEntry): LayerZeroAwareChainOption["kind"] {
  const type = chain.chainType.trim().toUpperCase();
  const key = chain.chainKey.trim().toLowerCase();
  if (type === "EVM") return "EVM";
  if (type === "SOLANA" || key === "solana") return "SOL";
  if (key === "bitcoin") return "BTC";
  return "OTHER";
}

export function mergeLayerZeroChainOptions<T extends LayerZeroAwareChainOption>(
  localChains: T[],
  providerChains: LayerZeroChainCatalogEntry[],
): Array<T | LayerZeroAwareChainOption> {
  const remaining = new Map(providerChains.map((chain) => [chain.id, chain]));
  const enriched = localChains.map((chain) => {
    const provider = remaining.get(chain.id);
    if (!provider) return chain;
    remaining.delete(chain.id);
    return {
      ...chain,
      quoteChainId: provider.quoteChainId,
      providerChainKey: provider.providerChainKey,
      providerChainType: provider.providerChainType,
    };
  });

  const discovered = [...remaining.values()].map((chain) => ({
    id: chain.id,
    name: chain.name,
    ticker: chain.nativeCurrency?.symbol ?? chain.shortName,
    color: "#6B7280",
    kind: providerChainKind(chain),
    quoteChainId: chain.quoteChainId,
    providerChainKey: chain.providerChainKey,
    providerChainType: chain.providerChainType,
  }));
  return [...enriched, ...discovered];
}

type CatalogToken = {
  chainId: number;
  ticker: string;
  name: string;
  address?: string;
  providerAssetId?: string;
  decimals: number;
  isNative?: boolean;
  badge?: "VERIFIED" | "TRENDING" | "WARNING";
};

function normalizeProviderTokenId(value: string, chainType: string): string {
  return chainType.trim().toUpperCase() === "EVM"
    ? value.trim().toLowerCase()
    : value.trim();
}

export function mergeLayerZeroTokens(
  configuredTokens: CatalogToken[],
  providerTokens: LayerZeroValueTransferApiToken[],
  chain: { uiChainId: number; chainKey: string; chainType: string },
): CatalogToken[] {
  const relevant = providerTokens.filter(
    (token) => token.chainKey === chain.chainKey && token.isSupported !== false,
  );
  const byIdentifier = new Map<string, CatalogToken>();

  for (const token of relevant) {
    const providerAssetId = token.address.trim();
    const key = normalizeProviderTokenId(providerAssetId, chain.chainType);
    const configured = configuredTokens.find((candidate) => {
      const identifier = candidate.providerAssetId ?? candidate.address;
      return identifier
        ? normalizeProviderTokenId(identifier, chain.chainType) === key
        : false;
    });
    byIdentifier.set(key, {
      ...configured,
      chainId: chain.uiChainId,
      ticker: token.symbol,
      name: token.name,
      address: chain.chainType.trim().toUpperCase() === "EVM" ? providerAssetId : configured?.address,
      providerAssetId,
      decimals: token.decimals,
      isNative: configured?.isNative,
      badge: configured?.badge ?? "VERIFIED",
    });
  }

  return [...byIdentifier.values()];
}

export function getCrossQuoteUiState({
  walletConnected,
  quoteReady,
  isFetching,
  offerCount,
}: {
  walletConnected: boolean;
  quoteReady: boolean;
  isFetching: boolean;
  offerCount: number;
}): { summary: string; emptyMessage: string } {
  if (!walletConnected) {
    return {
      summary: "Connect to quote",
      emptyMessage: "Connect a wallet to fetch live cross-chain offers.",
    };
  }

  if (!quoteReady) {
    return {
      summary: "Quote not ready",
      emptyMessage: "Enter an amount and choose different source and destination chains.",
    };
  }

  if (isFetching) {
    return {
      summary: "Fetching live offers",
      emptyMessage: "Fetching executable routes from the cross-chain quote API...",
    };
  }

  return {
    summary: `${offerCount} live offer${offerCount === 1 ? "" : "s"}`,
    emptyMessage:
      offerCount === 0
        ? "No live offers were returned for this pair. Try another token or route."
        : "",
  };
}

type ChainLike = {
  id: number;
  name: string;
  ticker?: string;
  color?: string;
};

type TokenLike = {
  chainId?: number;
  ticker: string;
  name?: string;
  address?: string;
  providerAssetId?: string;
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
  capabilityStatus: RailCapabilityStatus;
  selectable: boolean;
  restrictionReason?: string;
};

function readDecimals(token?: TokenLike | null, fallback = 18): number {
  const raw = token?.decimal ?? token?.decimals;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tokenAddress(token?: TokenLike | null): string {
  if (!token) return ZERO_ADDRESS;
  if (token.providerAssetId) return token.providerAssetId;
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
  layerZeroValueTransferApi,
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
  layerZeroValueTransferApi?: LayerZeroValueTransferApiQuoteContext;
  includeDestinationGas?: boolean;
  destinationGasAmount?: string;
}): QuoteRequest | null {
  if (!fromToken || !toToken || !userAddress) return null;
  if (isBackendNonEvmChainId(toChainId) && !nativeDstAddress?.trim()) {
    return null;
  }

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
    layerZeroValueTransferApi,
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
  const capability = getOfferCapability(offer);

  return {
    offerId: offer.offerId,
    railName: capability.label,
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
    capabilityStatus: capability.status,
    selectable: capability.selectable,
    restrictionReason: capability.reason,
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
