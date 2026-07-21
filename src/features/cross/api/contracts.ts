export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  srcChainId: number;
  dstChainId: number;
  userAddress: string;
  nativeDstAddress?: string;
  urgency?: "normal" | "fast";
  destinationGas?: Array<{
    provider: "gaszip";
    chainId: number;
    amountWei: string;
    recipient?: string;
  }>;
}

export type RailIdentifier =
  | "CCTP"
  | "CCTP_FAST"
  | "AXELAR"
  | "LAYERZERO"
  | "VIA_LABS"
  | "WORMHOLE"
  | "GASZIP"
  | "HYPERLANE_NEXUS"
  | "OPTIMISM_NATIVE_BRIDGE"
  | "THORCHAIN"
  | "CHAINFLIP"
  | "MAYA"
  | "TELESWAP";

export type RailOfferType =
  | "cctp_standard"
  | "cctp_fast"
  | "axelar_direct"
  | "axelar_dst_swap"
  | "lz_oft"
  | "lz_oft_adapter"
  | "lz_stargate_pool"
  | "lz_stargate_oft"
  | "lz_api_direct"
  | "gaszip_api_direct"
  | "thor_api_direct"
  | "hyperlane_nexus_direct"
  | "optimism_native_bridge_direct"
  | "chainflip_broker_direct"
  | "maya_direct"
  | "teleswap_direct"
  | "hub_multi_hop";

export interface TransactionEnvelope {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gas?: string;
  gasLimit?: string;
}

export interface ProviderApprovalRequest {
  token: string;
  spender: string;
  amount: string;
}

export interface ProviderAssetRef {
  canonicalAssetId: string;
  providerAssetId: string;
  tokenAddress?: string;
  srcTokenAddress?: string;
  dstTokenAddress?: string;
  decimals: number;
  assetKind:
    | "erc20"
    | "native"
    | "btc"
    | "sol"
    | "doge"
    | "ltc"
    | "bch"
    | "cosmos"
    | "dot"
    | "kujira"
    | "dash"
    | "zec";
  assetStandard?: string;
}

export interface QuoteAmountView {
  token: string;
  amount: string;
  decimals?: number;
  symbol?: string;
}

export interface QuoteLegView {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  minimumAmountOut?: string;
  tokenInDecimals?: number;
  tokenOutDecimals?: number;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
}

export interface OfferEconomics {
  providerFeeUSD: number | string;
  protocolFeeUSD: number | string;
  sourceGasUSD: number | string;
  destinationGasUSD?: number | string;
  outboundFeeUSD?: number | string;
  slippageBps?: number;
  priceImpactPct?: number;
  settlementTimeSeconds: number;
  minimumInput?: string;
  protocolFeeBps?: number;
}

export interface RailOffer {
  offerSetId?: string;
  offerId: string;
  rail: RailIdentifier | string;
  railVariant?: string;
  offerType?: RailOfferType;
  railType: "messaging" | "liquidity";
  srcChainId: number;
  dstChainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedOut: string;
  minAmountOut: string;
  expiresAt: number;
  quoteExpiresAt?: number;
  deliveryShape?:
    | "direct"
    | "src_swap_required"
    | "dst_swap_required"
    | "src_and_dst_swap_required"
    | "multi_hop";
  executionMode?: "router_intent" | "provider_direct";
  routeAsset?: ProviderAssetRef;
  sourceSettlementAsset: ProviderAssetRef;
  destinationSettlementAsset: ProviderAssetRef;
  amounts?: {
    input: QuoteAmountView;
    bridgeSettlement?: QuoteAmountView;
    minimumBridgeSettlement?: QuoteAmountView;
    output: QuoteAmountView;
    minimumOutput: QuoteAmountView;
  };
  legs?: {
    sourceSwap?: QuoteLegView;
    bridge?: QuoteLegView;
    destinationSwap?: QuoteLegView;
  };
  economics: OfferEconomics;
  fees?: {
    protocolFeeBps?: number;
    [key: string]: unknown;
  };
  execution: Record<string, unknown>;
  isBest?: boolean;
  isComposedEligible?: boolean;
}

export interface OfferSet {
  offerSetId: string;
  expiresAt: number;
  offers: RailOffer[];
  bestOfferId?: string;
}

export interface GasZipOfferComposition {
  kind: "primary_transfer_with_gaszip_destination_gas";
  primaryTransferOfferId: string;
  gasZipDestinationGasOfferId: string;
  primaryTransferOffer: RailOffer;
  gasZipDestinationGasOffer: RailOffer;
  destinationGasOffers?: RailOffer[];
}

export interface QuoteResponse {
  offerSet: OfferSet;
  quote?: CrossQuote;
  gasZipComposition?: GasZipOfferComposition;
}

export interface CrossQuote {
  intentId: string;
  srcChainId: number;
  dstChainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedOut: string;
  minAmountOut: string;
  rail: RailIdentifier | string;
  expiresAt: number;
  executionMode?: "router_intent" | "provider_direct";
  [key: string]: unknown;
}

export interface RouterIntentIntegration {
  mode: "router_intent";
  integration: {
    contractAddress: string;
    calldata: string;
    value: string;
    expiresAt: number;
    gas?: string;
    gasLimit?: string;
  };
}

export type ProviderDirectAction =
  | { kind: "thorchain_swap"; [key: string]: unknown }
  | { kind: "layerzero_value_transfer_api"; userSteps: unknown[]; [key: string]: unknown }
  | { kind: "gaszip_transfer"; [key: string]: unknown }
  | { kind: "hyperlane_transfer_remote"; [key: string]: unknown }
  | { kind: "chainflip_deposit"; [key: string]: unknown }
  | { kind: "maya_swap"; [key: string]: unknown }
  | { kind: "optimism_standard_bridge"; direction: "deposit" | "withdraw"; [key: string]: unknown }
  | { kind: "teleswap_transfer" | "teleswap_deposit"; [key: string]: unknown };

export interface ProviderDirectIntegration {
  mode: "provider_direct";
  action: ProviderDirectAction;
  approvals?: ProviderApprovalRequest[];
  tx?: TransactionEnvelope;
}

export type SelectedOfferIntegration =
  | RouterIntentIntegration
  | ProviderDirectIntegration;

export interface SelectionResponse {
  quote: CrossQuote;
  intentId: string;
  integration: SelectedOfferIntegration;
}

export interface ComposedSelectionResponse {
  composedIntentId: string;
  status: string;
  primaryTransfer: SelectionResponse;
  gasZipDestinationGas: SelectionResponse;
}

export interface SubmittedRequest {
  userAddress: string;
  srcTxHash?: string;
  sourceTxHash?: string;
  signature?: string;
  timestamp?: number;
}

export interface SingleCrossExecutionSession {
  mode: "single";
  intentId: string;
  selectedOfferId: string;
  offerSetId: string;
  quote: CrossQuote;
  integration: SelectedOfferIntegration;
  status: string;
  sourceChainId: number;
  lastTxHash?: string;
  lastError?: string | null;
}

export interface ComposedCrossExecutionSession {
  mode: "composed";
  composedIntentId: string;
  offerSetId: string;
  selectedOfferId: string;
  selectedGasOfferId: string;
  status: string;
  primaryTransfer: SelectionResponse & { lastTxHash?: string };
  gasZipDestinationGas: SelectionResponse & { lastTxHash?: string };
  composedIds: {
    primary: string;
    gas: string;
  };
  lastTxHash?: string;
  lastError?: string | null;
}

export type CrossExecutionSession =
  | SingleCrossExecutionSession
  | ComposedCrossExecutionSession;
