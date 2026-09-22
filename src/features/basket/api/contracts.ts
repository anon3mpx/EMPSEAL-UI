export type BasketMode =
  | "multi-to-one"
  | "one-to-many"
  | "wallet-liquidator"
  | "many-to-many";

export type BasketPlanMode = "sequential" | "multicall";

export type BasketAction = "plan" | "submitted" | "retry" | "status";

export type BasketState =
  | "QUOTED"
  | "READY"
  | "IN_PROGRESS"
  | "PARTIAL_SETTLED"
  | "PARTIAL_FAILED"
  | "SETTLED"
  | "FAILED"
  | "STUCK"
  | "EXPIRED";

export type BasketLegState =
  | "QUOTED"
  | "READY"
  | "SUBMITTED"
  | "CONFIRMED"
  | "SETTLED"
  | "FAILED"
  | "STUCK"
  | "SKIPPED";

export interface BasketInput {
  chainId: number;
  token: string;
  amount: string;
  wallet: string;
  slippageBps?: number;
  nativeAddress?: string;
}

export interface BasketOutput {
  chainId: number;
  token: string;
  allocationBps: number;
  fixedAmount?: string;
  recipient?: string;
  nativeAddress?: string;
}

export interface BasketConstraints {
  slippageBps?: number;
  deadlineSeconds?: number;
  maxLegs?: number;
  allowPartial?: boolean;
  atomicRequired?: boolean;
}

export interface BasketQuoteRequest {
  mode: BasketMode;
  inputs: BasketInput[];
  outputs: BasketOutput[];
  constraints?: BasketConstraints;
}

export interface BasketModeCapability {
  enabled: boolean;
  reason?: string;
}

export interface BasketCapabilities {
  enabled: boolean;
  modes: Record<BasketMode, BasketModeCapability>;
  supportedChainIds: number[];
  limits: {
    maxInputs?: number;
    maxOutputs?: number;
    maxLegs?: number;
    maxLegsPerBatch?: number;
  };
  multicall: Record<string, unknown>;
}

export interface WalletScanRequest {
  wallet: string;
  chainIds: number[];
  tokensByChain?: Record<number, string[]>;
}

export interface WalletScanBalance {
  chainId: number;
  token: string;
  symbol?: string;
  decimals: number;
  balance: string;
  balanceUsd?: number;
}

export interface WalletScanResult {
  wallet: string;
  scannedAt: number;
  balances: WalletScanBalance[];
  skipped: Array<{ chainId: number; reason: string }>;
}

export interface BasketQuoteCapabilities {
  canPlan: boolean;
  canUseMulticall: boolean;
  canSatisfyAtomicRequired: boolean;
  unavailableReasons: string[];
}

export interface BasketQuoteLeg {
  legId: string;
  legIndex: number;
  estimatedOut: string;
  minAmountOut: string;
  etaSeconds: number;
  feeUsd: number;
  revenueTier: "agg-wired" | "api-direct" | "unknown" | string;
  opaqueLegRef: string;
  quoteExpiresAt: number;
  legKind?: "single-chain" | "cross-chain";
  estimatedInUsd?: number;
  estimatedOutUsd?: number;
}

export interface BasketSkippedLeg {
  legIndex: number;
  reason: string;
  legId?: string;
}

export interface BasketQuote {
  schemaVersion: 2;
  basketId: string;
  quoteVersion: number;
  mode: BasketMode;
  legs: BasketQuoteLeg[];
  totals: {
    inputsUsd: number;
    outputsUsd: number;
    feeUsd: number;
    worstEtaSeconds: number;
    parallelEtaSeconds: number;
  };
  aggregateTier: string;
  skipped: BasketSkippedLeg[];
  capabilities: BasketQuoteCapabilities;
  expiresAt: number;
  ownerKind?: string;
}

export interface BasketApprovalRequest {
  approvalId: string;
  chainId: number;
  token: string;
  spender: string;
  amount: string;
  coveredLegIds: string[];
}

export interface BasketTransactionRequest {
  transactionId: string;
  chainId: number;
  to: string;
  data: string;
  value: string;
  kind: "approval" | "same-chain-swap" | "cross-chain-intent" | "multicall";
  coveredLegIds: string[];
}

export interface BasketPlannedLeg {
  legId: string;
  legIndex: number;
  legKind: "single-chain" | "cross-chain";
  state: BasketLegState;
  attemptNumber: number;
  intentId?: string;
  approvalIds: string[];
  transactionIds: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface BasketExecutionPlan {
  schemaVersion: 2;
  planId: string;
  basketId: string;
  version: number;
  status: "READY" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "EXPIRED";
  approvals: BasketApprovalRequest[];
  transactions: BasketTransactionRequest[];
  legs: BasketPlannedLeg[];
  atomicity: {
    requested: boolean;
    achieved: boolean;
    reason?: string;
  };
  simulation: {
    kind: "not-performed" | "rpc-call";
    performedAtBlock?: number;
  };
  createdAt: number;
  expiresAt: number;
}

export interface SignedBasketAction {
  action: BasketAction;
  basketId: string;
  wallet: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
  legId?: string;
  planVersion?: number;
  idempotencyKey?: string;
}

export interface BasketPlanRequest {
  basketId: string;
  expectedQuoteVersion: number;
  acknowledgeSkippedLegIds: string[];
  mode?: BasketPlanMode;
  wallet: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

export interface BasketSubmittedRequest {
  basketId: string;
  legId: string;
  transactionId: string;
  txHash: string;
  chainId: number;
  sender: string;
  expectedPlanVersion: number;
  wallet: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

export interface BasketRetryRequest {
  basketId: string;
  legId: string;
  expectedPlanVersion: number;
  wallet: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

export interface BasketSubmittedResponse {
  basketId: string;
  legId: string;
  state: BasketLegState;
  sourceTxHash?: string;
  updatedAt: number;
}

export interface BasketRetryResponse {
  basketId: string;
  legId: string;
  state: BasketLegState;
  attemptNumber: number;
  updatedAt: number;
}

export interface BasketStatusLeg {
  legId: string;
  legIndex: number;
  legKind: "single-chain" | "cross-chain";
  state: BasketLegState;
  attemptNumber: number;
  intentId?: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  errorCode?: string;
  errorMessage?: string;
  updatedAt: number;
}

export interface BasketStatus {
  schemaVersion: 2;
  basketId: string;
  composite: BasketState;
  counts: {
    total: number;
    quoted: number;
    ready: number;
    submitted: number;
    confirmed: number;
    settled: number;
    failed: number;
    stuck: number;
    skipped: number;
  };
  legs: BasketStatusLeg[];
  generatedAt: number;
}

export interface BasketSessionSnapshot {
  basketId: string;
  quoteVersion?: number;
  planId?: string;
  planVersion?: number;
  wallet: string;
  mode: BasketMode;
}
