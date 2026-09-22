export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  srcChainId: number;
  dstChainId: number;
  userAddress: string;
  destinationAddress?: string;
  nativeDstAddress?: string;
  refundAddress?: string;
  nativeSource?: NativeSourceWallet;
  layerZeroValueTransferApi?: LayerZeroValueTransferApiQuoteContext;
  urgency?: "normal" | "fast";
  destinationGas?: Array<{
    provider: "gaszip";
    chainId: number;
    amountWei: string;
    recipient?: string;
  }>;
}

export type NativeSourceWallet =
  | {
      runtime: "bitcoin";
      network: "mainnet";
      ownerAddress: string;
      refundAddress: string;
      signingAccount: {
        address: string;
        publicKey: string;
        addressType: "p2wpkh" | "p2tr";
      };
    }
  | {
      runtime: "solana";
      network: "mainnet-beta";
      ownerAddress: string;
      refundAddress: string;
      signingAccount: {
        address: string;
        feePayer: string;
      };
    };

export interface LayerZeroValueTransferApiQuoteContext {
  srcChainKey: string;
  dstChainKey: string;
  srcChainType: string;
  dstChainType: string;
  srcWalletAddress: string;
  dstWalletAddress: string;
}

export interface LayerZeroValueTransferApiToken {
  isSupported?: boolean;
  chainKey: string;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  logoUrl?: string;
  price?: { usd?: number };
}

export interface LayerZeroValueTransferApiChain {
  name: string;
  shortName: string;
  chainKey: string;
  nativeCurrency?: LayerZeroValueTransferApiToken;
  chainType: string;
  chainId?: number;
}

export interface LayerZeroValueTransferApiChainsResponse {
  chains: LayerZeroValueTransferApiChain[];
  pagination?: { nextToken?: string };
}

export interface LayerZeroValueTransferApiTokensResponse {
  tokens: LayerZeroValueTransferApiToken[];
  pagination?: { nextToken?: string };
}

export type RailIdentifier =
  | "CCTP"
  | "CCTP_FAST"
  | "AXELAR"
  | "LAYERZERO"
  | "VIA_LABS"
  | "WORMHOLE"
  | "DEBRIDGE"
  | "GARDEN"
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
  | "lz_stargate_native"
  | "lz_api_direct"
  | "wormhole_token_bridge"
  | "debridge_dln_direct"
  | "garden_htlc"
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
  executionMode?: "router_intent" | "provider_direct" | "sequential_wallet";
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
  executionMode?: "router_intent" | "provider_direct" | "sequential_wallet";
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
  | { kind: "debridge_dln_order"; [key: string]: unknown }
  | { kind: "garden_htlc_order"; [key: string]: unknown }
  | { kind: "teleswap_transfer" | "teleswap_deposit"; [key: string]: unknown };

export interface GardenNativeUtxo {
  txid: string;
  vout: number;
  valueSats: string;
  scriptPubKey: string;
  confirmations?: number;
}

export interface GardenBitcoinNativeSourceFunding {
  runtime: "bitcoin";
  utxos: GardenNativeUtxo[];
  feeRateSatVbyte: number;
  replaceByFee: true;
  changeAddress: string;
}

export interface GardenNativeFundingSigningRequest {
  format: "psbt" | "solana-versioned-transaction";
  encoding: "base64";
  account: string;
  publicKey?: string;
  feePayer?: string;
}

export interface GardenNativeFunding {
  runtime: "bitcoin" | "solana";
  unsignedTransaction: string;
  depositAddress?: string;
  depositAmount?: string;
  changeAtomic?: string;
  feeAtomic?: string;
  sourceOwner?: string;
  refundAddress?: string;
  fundingInputs?: GardenNativeUtxo[];
  signingRequest?: GardenNativeFundingSigningRequest;
  [key: string]: unknown;
}

export interface NativeCallbackAuth {
  submissionToken: string;
  recoveryToken?: string;
}

export interface GardenSubmittedRequest {
  userAddress: string;
  sourceTxHash: string;
  submissionToken: string;
}

export interface GardenRefundRequest {
  userAddress: string;
  recoveryToken: string;
  reason: string;
}

export interface ProviderDirectIntegration {
  mode: "provider_direct";
  action: ProviderDirectAction;
  approvals?: ProviderApprovalRequest[];
  tx?: TransactionEnvelope;
  nativeFunding?: GardenNativeFunding;
}

export interface SequentialWalletIntegration {
  mode: "sequential_wallet";
  planId: string;
  stepId: string;
  expectedVersion: number;
  tx: TransactionEnvelope;
  approvals?: ProviderApprovalRequest[];
}

export type SelectedOfferIntegration =
  | RouterIntentIntegration
  | ProviderDirectIntegration
  | SequentialWalletIntegration;

export interface ExecutionPlanStep {
  stepId: string;
  index: number;
  kind: "source_swap" | "rail_transfer" | "destination_swap";
  chainId: number;
  status: "PLANNED" | "READY" | "SUBMITTED" | "CONFIRMED" | "SETTLED" | "FAILED" | "SKIPPED";
  tokenIn: string;
  tokenOut: string;
  quotedAmountIn: string;
  quotedAmountOut: string;
  minimumAmountOut: string;
  dependsOnStepId?: string;
  integration?: Record<string, unknown>;
  preparedAction?: {
    tx: TransactionEnvelope;
    approvals?: ProviderApprovalRequest[];
  };
  txHash?: string;
  expiresAt: number;
}

export interface ExecutionPlan {
  planId: string;
  intentId: string;
  mode: "sequential_wallet";
  status: "PLANNED" | "ACTIVE" | "REQUOTE_REQUIRED" | "COMPLETED" | "FAILED" | "EXPIRED";
  version: number;
  atomic: boolean;
  carrierAsset?: string;
  currentStep: number;
  steps: ExecutionPlanStep[];
  expiresAt: number;
}

export interface SelectionResponse {
  quote: CrossQuote;
  intentId: string;
  integration: SelectedOfferIntegration;
  executionPlan?: ExecutionPlan;
  currentAction?: {
    tx: TransactionEnvelope;
    approvals?: ProviderApprovalRequest[];
  };
  nativeCallbackAuth?: NativeCallbackAuth;
}

export type SequentialSelectionResponse = SelectionResponse & {
  integration: SequentialWalletIntegration;
  executionPlan: ExecutionPlan;
  currentAction: {
    tx: TransactionEnvelope;
    approvals?: ProviderApprovalRequest[];
  };
};

export class InvalidSelectionResponseError extends Error {
  readonly code = "INVALID_SELECTION_RESPONSE";
  readonly status = 422;
  readonly body: { error: "INVALID_SELECTION_RESPONSE"; message: string };

  constructor(message = "The route response was incomplete. No transaction was sent.") {
    super(message);
    this.name = "InvalidSelectionResponseError";
    this.body = { error: "INVALID_SELECTION_RESPONSE", message };
  }
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

export interface ExecutionPlanStepSubmittedRequest {
  userAddress: string;
  txHash: string;
  expectedVersion: number;
  idempotencyKey: string;
  timestamp: number;
  signature: string;
}

export interface ExecutionPlanResponse {
  executionPlan: ExecutionPlan;
}

export interface SingleCrossExecutionSession {
  mode: "single";
  intentId: string;
  selectedOfferId: string;
  offerSetId: string;
  quote: CrossQuote;
  integration: SelectedOfferIntegration;
  executionPlan?: ExecutionPlan;
  status: string;
  sourceChainId: number;
  lastTxHash?: string;
  lastError?: string | null;
  nativeCallbackAuth?: NativeCallbackAuth;
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

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_DATA = /^0x(?:[0-9a-fA-F]{2})*$/;
const QUANTITY = /^(0|[1-9]\d*|0x[0-9a-fA-F]+)$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseTransactionEnvelope(value: unknown): TransactionEnvelope {
  const tx = asRecord(value);
  const to = readString(tx?.to);
  const data = readString(tx?.data);
  const rawValue = readString(tx?.value) ?? (tx?.value === undefined ? "0" : null);
  const chainId = Number(tx?.chainId);
  if (!to || !ADDRESS.test(to) || !data || !HEX_DATA.test(data)
    || !rawValue || !QUANTITY.test(rawValue)
    || !Number.isInteger(chainId) || chainId <= 0) {
    throw new InvalidSelectionResponseError();
  }
  return { to, data, value: rawValue, chainId };
}

function parseSequentialIntegration(value: Record<string, unknown>): SequentialWalletIntegration {
  const planId = readString(value.planId);
  const stepId = readString(value.stepId);
  const expectedVersion = Number(value.expectedVersion);
  if (!planId || !stepId || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new InvalidSelectionResponseError();
  }
  return {
    mode: "sequential_wallet",
    planId,
    stepId,
    expectedVersion,
    tx: parseTransactionEnvelope(value.tx),
    approvals: Array.isArray(value.approvals) ? value.approvals as ProviderApprovalRequest[] : [],
  };
}

export function parseSelectionResponse(value: unknown): SelectionResponse {
  const record = asRecord(value);
  const intentId = readString(record?.intentId);
  const quote = asRecord(record?.quote);
  const integration = asRecord(record?.integration);
  if (!record || !intentId || !quote || !integration || !readString(integration.mode)) {
    throw new InvalidSelectionResponseError();
  }

  if (integration.mode === "sequential_wallet") {
    const sequential = parseSequentialIntegration(integration);
    const executionPlan = asRecord(record.executionPlan);
    const currentAction = asRecord(record.currentAction);
    if (!executionPlan || !readString(executionPlan.planId) || !currentAction) {
      throw new InvalidSelectionResponseError();
    }
    return {
      intentId,
      quote: quote as unknown as CrossQuote,
      integration: sequential,
      executionPlan: executionPlan as unknown as ExecutionPlan,
      currentAction: {
        tx: parseTransactionEnvelope(currentAction.tx),
        approvals: Array.isArray(currentAction.approvals)
          ? currentAction.approvals as ProviderApprovalRequest[]
          : undefined,
      },
    };
  }

  if (integration.mode === "router_intent") {
    const nested = asRecord(integration.integration);
    if (!nested || !readString(nested.contractAddress) || !readString(nested.calldata)) {
      throw new InvalidSelectionResponseError();
    }
  }

  return record as unknown as SelectionResponse;
}
