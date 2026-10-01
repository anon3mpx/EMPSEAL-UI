import { formatUnits, parseUnits } from "viem";
import type { RouteHop, TradeTimelineStep } from "../components";
import type {
  LayerZeroValueTransferApiChain,
  LayerZeroValueTransferApiQuoteContext,
  LayerZeroValueTransferApiToken,
  NativeSourceWallet,
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
  type OfferCapabilityContext,
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
      ticker: configured?.ticker ?? token.symbol,
      name: configured?.name ?? token.name,
      address: chain.chainType.trim().toUpperCase() === "EVM" ? providerAssetId : configured?.address,
      providerAssetId,
      decimals: configured?.decimals ?? token.decimals,
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
  executionLabel: string;
  stepSummary?: string;
  outputAmount: string;
  minimumReceived: string;
  bridgeFeeUSD: number;
  protocolFeeUSD: number;
  totalFeeUSD: number;
  /**
   * Provider-direct rails often report a zero provider fee because it is taken
   * from the output (deBridge, THORChain) — show "Included in quote", not FREE.
   */
  feeIncludedInQuote: boolean;
  /** Fee paid as native msg.value on the source chain (Hyperlane interchain gas), formatted. */
  networkFeeNative?: string;
  estimatedTimeSeconds: number | null;
  isBest: boolean;
  capabilityStatus: RailCapabilityStatus;
  selectable: boolean;
  restrictionReason?: string;
};

function railOfferLabel(offer: any, fallback: string): string {
  const labels: Record<string, string> = {
    cctp_standard: "CCTP Standard",
    cctp_fast: "CCTP Fast",
    lz_oft: "LayerZero OFT",
    lz_oft_adapter: "LayerZero OFT Adapter",
    lz_stargate_pool: "LayerZero Stargate",
    lz_stargate_oft: "LayerZero Stargate OFT",
    lz_stargate_native: "LayerZero Stargate Native",
    lz_api_direct: "LayerZero Transfer API",
  };
  return labels[String(offer?.offerType ?? "").toLowerCase()] ?? fallback;
}

function executionLabel(offer: any): string {
  const mode = offer?.composition?.carrierExecutionMode ?? offer?.executionMode;
  if (mode === "provider_direct") return "Provider Direct";
  if (mode === "router_intent") return "Router Intent";
  return "Wallet Steps";
}

function composedStepSummary(offer: any): string | undefined {
  const kinds = Array.isArray(offer?.planPreview?.stepKinds)
    ? offer.planPreview.stepKinds
    : [];
  if (kinds.length <= 1) return undefined;
  const labels: Record<string, string> = {
    source_swap: "Source swap",
    rail_transfer: "Bridge",
    destination_swap: "Destination swap",
  };
  return `${kinds.length} steps · ${kinds.map((kind: string) => labels[kind] ?? kind).join(" + ")}`;
}

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

function readAmountString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value).toString();
    if (typeof value === "bigint") return value.toString();
  }
  return undefined;
}

function amountIsZero(value: string | undefined) {
  if (!value) return true;
  try {
    return BigInt(value) === 0n;
  } catch {
    return Number(value) === 0;
  }
}

function findNestedAmountByKeys(value: unknown, keys: string[], seen = new Set<unknown>()): string | undefined {
  if (!value || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = readAmountString(record[key]);
    if (direct && !amountIsZero(direct)) return direct;
  }

  for (const child of Object.values(record)) {
    const nested = findNestedAmountByKeys(child, keys, seen);
    if (nested) return nested;
  }

  return undefined;
}

function findNestedNumberByKeys(value: unknown, keys: string[], seen = new Set<unknown>()): number | undefined {
  if (!value || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const parsed = Number(record[key]);
    if (Number.isFinite(parsed)) return parsed;
  }

  for (const child of Object.values(record)) {
    const nested = findNestedNumberByKeys(child, keys, seen);
    if (nested !== undefined) return nested;
  }

  return undefined;
}

function isThorchainOffer(offer: any) {
  return (
    String(offer?.rail ?? "").toUpperCase() === "THORCHAIN" ||
    String(offer?.offerType ?? "").toLowerCase() === "thor_api_direct" ||
    String(offer?.execution?.action?.kind ?? offer?.actionKind ?? "").toLowerCase() === "thorchain_swap"
  );
}

function readThorchainProviderOutput(offer: any, field: "output" | "minimum") {
  const output = findNestedAmountByKeys(
    offer,
    [
      "expected_amount_out",
      "expectedAmountOut",
      "expected_out",
      "expectedOut",
      "amountOut",
      "outputAmount",
      "outAmount",
      "toAmount",
      "dstAmount",
      "destinationAmount",
    ],
  );
  if (field === "output") return output;

  const explicitMinimum = findNestedAmountByKeys(
    offer,
    [
      "minimum_amount_out",
      "minimumAmountOut",
      "min_amount_out",
      "minAmountOut",
      "minOut",
      "minimumOut",
      "minReceived",
      "minimumReceived",
    ],
  );
  if (explicitMinimum) return explicitMinimum;

  const slippageBps = findNestedNumberByKeys(
    offer,
    ["slippage_bps", "slippageBps"],
  );
  if (!output || !Number.isFinite(slippageBps) || slippageBps <= 0) return output;

  try {
    return ((BigInt(output) * BigInt(Math.max(0, 10_000 - Math.trunc(slippageBps)))) / 10_000n).toString();
  } catch {
    return output;
  }
}

function readThorchainDisplayDecimals(offer: any, fallback: number) {
  const explicit = findNestedNumberByKeys(
    offer,
    [
      "outputDecimals",
      "destinationAssetDecimals",
      "destinationDecimals",
      "dstDecimals",
    ],
  );
  if (Number.isFinite(explicit)) return explicit;
  // Raw THORNode quote fields are always in THOR's 1e8 units.
  return isThorchainOffer(offer) ? 8 : fallback;
}

function readUsd(value: unknown): number {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// THORChain-style asset ids: CHAIN.SYMBOL[-CONTRACT], with "/" (synth) or
// "~" (trade asset) separators, e.g. "ETH.USDC-0XA0B8…" or "BTC.BTC".
const THOR_ASSET_ID = /^(?:BTC|ETH|BSC|AVAX|BASE|ARB|GAIA|DOGE|LTC|BCH|TRON|XRP|SOL|THOR|MAYA|DASH|KUJI|ZEC)[./~]([A-Z0-9]+)(?:-.+)?$/i;

/** A short ticker for route display: THOR asset ids → symbol, addresses → null. */
function displaySymbol(raw: string): string | null {
  const value = raw.trim();
  if (!value || /^0x[0-9a-f]{40}$/i.test(value)) return null;
  const thorAsset = THOR_ASSET_ID.exec(value);
  return thorAsset ? thorAsset[1].toUpperCase() : value;
}

function readSymbol(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return displaySymbol(value);
  const candidates = [
    (value as any).canonicalAssetId,
    (value as any).providerAssetId,
    (value as any).tokenOutSymbol,
    (value as any).symbol,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const symbol = displaySymbol(candidate);
    if (symbol) return symbol;
  }
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
  destinationAddress,
  nativeDstAddress,
  refundAddress,
  nativeSource,
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
  destinationAddress?: string;
  nativeDstAddress?: string;
  refundAddress?: string;
  nativeSource?: NativeSourceWallet;
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
    destinationAddress: destinationAddress?.trim() || undefined,
    nativeDstAddress: nativeDstAddress?.trim() || undefined,
    refundAddress: refundAddress?.trim() || undefined,
    nativeSource,
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

export function formatCrossOffer(
  offer: any,
  tokenOutDecimals = 18,
  capabilityContext?: OfferCapabilityContext,
): CrossV2OfferDisplay {
  // Backend offers can represent output/minimum amounts in a few legacy shapes.
  // Reuse the cross feature amount helpers so V2 displays match the old page.
  const quotedOutputAmount = getOfferOutputAmount(offer);
  const quotedMinimumAmount = getOfferMinimumOutputAmount(offer);
  const thorchainOffer = isThorchainOffer(offer);
  const useThorchainProviderOutput =
    thorchainOffer && amountIsZero(quotedOutputAmount);
  const outputAmount = useThorchainProviderOutput
    ? readThorchainProviderOutput(offer, "output") ?? quotedOutputAmount
    : quotedOutputAmount;
  const minimumAmount = useThorchainProviderOutput
    ? readThorchainProviderOutput(offer, "minimum") ?? quotedMinimumAmount
    : quotedMinimumAmount;
  // The backend converts THOR's 1e8 units into the destination token's own
  // decimals for estimatedOut/minAmountOut, so those use tokenOutDecimals like
  // every other rail. Only the raw provider-field fallback is in 1e8 units.
  // Deliberately not offer.amounts.output.decimals: some sequential offers
  // still mislabel it with the carrier's decimals.
  const outputDecimals = useThorchainProviderOutput
    ? readThorchainDisplayDecimals(offer, tokenOutDecimals)
    : tokenOutDecimals;
  const bridgeFeeUSD = readUsd(offer?.economics?.providerFeeUSD ?? offer?.fees?.providerFeeUSD);
  const protocolFeeUSD = readUsd(offer?.economics?.protocolFeeUSD ?? offer?.fees?.protocolFeeUSD);
  const capability = getOfferCapability(offer, capabilityContext);
  const mode = offer?.composition?.carrierExecutionMode ?? offer?.executionMode;
  const interchainGasFee = readAmountString(offer?.execution?.interchainGasFee);

  return {
    offerId: offer.offerId,
    railName: railOfferLabel(offer, capability.label),
    executionLabel: executionLabel(offer),
    stepSummary: composedStepSummary(offer),
    outputAmount: normalizeDisplayAmount(formatBaseUnits(outputAmount, outputDecimals)),
    minimumReceived: normalizeDisplayAmount(formatBaseUnits(minimumAmount, outputDecimals)),
    bridgeFeeUSD,
    protocolFeeUSD,
    totalFeeUSD: bridgeFeeUSD + protocolFeeUSD,
    feeIncludedInQuote: bridgeFeeUSD <= 0.005 && mode === "provider_direct",
    networkFeeNative: amountIsZero(interchainGasFee)
      ? undefined
      : normalizeDisplayAmount(formatBaseUnits(interchainGasFee, 18)),
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

/** USD value of destination gas Gas Drop aims for (matches the backend auto-fund default). */
export const GAS_DROP_TARGET_USD = 2;
/** Requested when the destination native price is unknown. */
export const GAS_DROP_FALLBACK_AMOUNT = "0.001";

/**
 * Destination native amount for Gas Drop, sized to targetUSD at the current
 * native price. Rounded to 2 significant figures so small price ticks do not
 * change the quote request (and trigger a requote).
 */
export function sizeDestinationGasAmount(
  nativePriceUSD: number | null | undefined,
  targetUSD = GAS_DROP_TARGET_USD,
): string {
  if (nativePriceUSD == null || !Number.isFinite(nativePriceUSD) || nativePriceUSD <= 0) {
    return GAS_DROP_FALLBACK_AMOUNT;
  }
  const rounded = Number((targetUSD / nativePriceUSD).toPrecision(2));
  if (!Number.isFinite(rounded) || rounded <= 0) return GAS_DROP_FALLBACK_AMOUNT;
  // Plain decimal (no exponent) with at most 18 decimals, as parseUnits expects.
  return rounded.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 18 });
}

/** Outputs worth more than this multiple of the input are treated as unit bugs. */
export const MAX_PLAUSIBLE_OUTPUT_RATIO = 1.2;

/**
 * True when an offer's output is clearly impossible: priced above
 * MAX_PLAUSIBLE_OUTPUT_RATIO × the priced input. Catches decimal/unit bugs
 * (e.g. 10^10× THORChain outputs) and looping-swap quotes. False whenever
 * either side is unpriced, so missing prices never hide offers.
 */
export function isImplausibleOfferOutput(
  outputAmount: string | number | undefined,
  outputPriceUSD: number | null | undefined,
  inputUSD: number | null | undefined,
  maxRatio = MAX_PLAUSIBLE_OUTPUT_RATIO,
): boolean {
  const output = Number(String(outputAmount ?? "").replace(/,/g, ""));
  if (
    outputPriceUSD == null || inputUSD == null ||
    !Number.isFinite(output) || !Number.isFinite(outputPriceUSD) || !Number.isFinite(inputUSD) ||
    outputPriceUSD <= 0 || inputUSD <= 0
  ) {
    return false;
  }
  return output * outputPriceUSD > inputUSD * maxRatio;
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
    readSymbol(offer?.legs?.bridge?.tokenInSymbol) ??
    readSymbol(offer?.composition?.carrier) ??
    readSymbol(offer?.routeAsset) ??
    fromTicker;
  const bridgeSymbol = readSymbol(offer?.routeAsset) ?? sourceSwapSymbol;
  const destinationInputSymbol = readSymbol(offer?.legs?.bridge?.tokenOutSymbol) ??
    readSymbol(offer?.destinationSettlementAsset) ??
    readSymbol(offer?.composition?.carrier) ??
    bridgeSymbol;
  const stepKinds = Array.isArray(offer?.planPreview?.stepKinds)
    ? offer.planPreview.stepKinds
    : [];
  const hasSourceSwap = Boolean(offer?.legs?.sourceSwap ?? offer?.composition?.sourceSwap) ||
    stepKinds.includes("source_swap");
  const hasDestinationSwap = Boolean(offer?.legs?.destinationSwap ?? offer?.composition?.destinationSwapQuote) ||
    stepKinds.includes("destination_swap");
  const railName = railOfferLabel(offer, String(offer?.rail ?? "Bridge"));

  const hops: RouteHop[] = [
    {
      ticker: fromTicker,
      chainName: fromChain.name,
      chainColor: fromChain.color,
      via: hasSourceSwap ? "Source swap" : railName,
      venueType: hasSourceSwap ? "DEX" : "RAIL",
    },
  ];

  if (hasSourceSwap) {
    hops.push({
      ticker: sourceSwapSymbol,
      chainName: fromChain.name,
      chainColor: fromChain.color,
      via: railName,
      venueType: "RAIL",
    });
  }

  hops.push({
    ticker: destinationInputSymbol,
    chainName: toChain.name,
    chainColor: toChain.color,
    ...(hasDestinationSwap ? { via: "Destination swap", venueType: "DEX" as const } : {}),
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
