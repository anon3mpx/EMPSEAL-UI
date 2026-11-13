// Mirrors the EMPX V2 wire types the first UI slice reads (ruflo empx-core/server packages/core-types: plan.ts, journeyQuote.ts; packages/sdk: quoteWire.ts, client.ts).
// @empx/cross is not published, so these are copied, not imported. Amounts are base-unit decimal strings on the wire; floats never carry value.

export interface WireAmount {
  asset: string;
  amount: string;
  decimals: number;
}

export type WireStep = {
  id: string;
  dependsOn: string[];
  walletMode: "evm-signer" | "external-wallet" | "server";
  expiresAt: number;
  readiness: "executable" | "blocked" | "informational";
} & (
  | { type: "approve"; chain: string; token: string; spender: string; amount: string }
  | {
      type: "typed_sign";
      purpose: "empx-order" | "provider-intent";
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    }
  | { type: "tx"; chain: string; to: string; data: string; value: string }
  | { type: "deposit"; chain: string; address: string; memo?: string; asset: string; amount: string }
  | { type: "native_tx" | "submit" | "wait" | "relay" | "recovery"; [k: string]: unknown }
);

export interface WirePlan {
  schemaVersion: number;
  version: number;
  id: string;
  hash: string;
  expiresAt: number;
  journey: { from: WireAmount; toAsset: string; recipient: string };
  /** `trackingRef`: the provider's own tracking id (deBridge order id, LayerZero VT quote id), recorded by the server at commit. */
  compiled: { rail: string; shape: string; carrier?: string; trackingRef?: string };
  amounts: { quoted: WireAmount; minimum: WireAmount | null; actual?: WireAmount };
  delivers: {
    asset: string;
    minAmount: string | null;
    isRequested: boolean;
    fallback?: { asset: string; minAmount: string };
  };
  guarantee: { tier: number; assumptions: string[]; settlementGuarantee: string; output: "firm_minimum" | "estimate_only" };
  steps: WireStep[];
  verify: { allowedTargets: string[]; allowedSpenders: string[]; expectedRecipient: string; hook?: { receiver: string; hookData: string } };
  fees: { maxTotalBps: number; feeRecipient?: string; breakdown: Array<{ kind: string; amount: WireAmount }> };
  slippage?: unknown;
  /** The provider's quote terms; `variant` tells same-rail offers apart (CCTP `fast` / `standard`). */
  railQuote?: { variant?: string };
  /** Value legs in order; a provider plan that swaps first starts with a `source_swap` leg. */
  valueLegs?: Array<{ leg: string; input: WireAmount; output: WireAmount }>;
}

export interface JourneyFeeItem {
  order: number;
  kind: string;
  category: "empx" | "provider_bridge" | "relayer_gas";
  amount: WireAmount;
  bpsOfInput: number | null;
}
export interface JourneyFeeBucket {
  amounts: WireAmount[];
  bps: number | null;
}
export interface JourneyQuote {
  version: number;
  mode: "direct" | "sequential_wallet";
  input: WireAmount;
  toAsset: string;
  recipient: string;
  expectedOutput: WireAmount;
  /** null when the rail only estimates. */
  minimumOutput: WireAmount | null;
  outputGuarantee: "firm_minimum" | "estimate_only";
  fallback: { asset: string; minAmount: string } | null;
  minimumBasis: "journey" | "second_order_on_expected_receipt";
  fees: {
    items: JourneyFeeItem[];
    empx: JourneyFeeBucket & { capBps: number; withinCap: boolean | null };
    providerBridge: JourneyFeeBucket;
    relayerGas: JourneyFeeBucket;
    allIn: { bps: number | null; ceilingBps: number; hardCeilingBps: number; withinCeiling: boolean | null };
  };
  slippage: { toleranceBps: number; origin: string } | null;
  tier: number;
  hops: Array<{ order: number; planId: string; planHash: string; rail: string; expiresAt: number }>;
  /** What happens to the funds, step by step (source swap, rail transfer, destination swap); `order` names the hop whose rail it uses. */
  legs?: Array<{
    index: number;
    order: number;
    kind: "source_swap" | "rail_transfer" | "destination_swap" | string;
    input: WireAmount;
    expectedOutput: WireAmount;
    fromChain: string;
    toChain: string;
  }>;
  expiresAt: number;
  hash: string;
  assessment: {
    status: "acceptable" | "warning" | "blocked" | "unpriced";
    label: string;
    reason: string;
    reasons?: string[];
    /** Sent back in `humanAcceptance` when the user accepts a warning/unpriced route. */
    policyVersion?: string;
    policyApproved?: boolean;
    executableByApiKey: boolean;
    waived?: boolean;
  } | null;
  etaSec: number | null;
  ranking: { rank: number; basis: string; reasons: string[] } | null;
}

export interface WireOffer {
  rank: number;
  journey: JourneyQuote;
  execution: { plan: WirePlan };
  /** Canary tenants: the relayer cost EMPX pays above the capped fee; not charged to the user (empx-core apps/api/src/quoteRoute.ts). */
  sponsoredRelayerFee?: WireAmount;
}
/** An offer economic eligibility held back from automatic selection; a human may accept a warning/unpriced one explicitly. */
export type WithheldOffer = WireOffer & { executableByApiKey?: boolean; label?: string };

export interface WireQuoteResponse {
  plans: WireOffer[];
  withheld?: WithheldOffer[];
  degraded?: boolean;
  /** Present only with `substitutes`. */
  requestedAsset?: string;
  /** Present only when NO offer delivers the requested asset: offers that deliver another asset instead. */
  substitutes?: Array<{ asset: string; plans: WireOffer[] }>;
  /** Rails left out only because their fee is above a cap at this amount, with the smallest input that fits (never dropped silently). */
  belowMinimum?: BelowMinimum[];
}

export interface BelowMinimum {
  rail: string;
  cap: "relayer" | "swap" | "total" | "plan_ceiling";
  feeBps: number;
  capBps: number;
  fee: WireAmount;
  minimumInput: WireAmount;
}

/** POST /v2/journeys/quote. `two_hop` is two separate orders (plan section 6); `none` still carries the quote (with any withheld offers). */
export type JourneyPlanResponse =
  | { kind: "direct"; quote: WireQuoteResponse }
  | { kind: "two_hop"; journey: JourneyQuote; via: { chain: string; asset: string }; execution: { hop1: { plan: WirePlan }; hop2Preview: { plan: WirePlan } } }
  | { kind: "none"; code: "two_hop_second_signature_pending_d11" | "no_eligible_route" | string; reason: string; quote: WireQuoteResponse };

export interface HumanAcceptance {
  status: "warning" | "unpriced";
  policyVersion: string;
}

/** One row of GET /v2/capabilities/corridors. */
export interface CorridorRow {
  from: string;
  to: string;
  /** Rails that can execute this corridor automatically right now. */
  executableAutomatic: number;
  degraded?: boolean;
  unavailable?: Record<string, string[]>;
}
/** GET /v2/capabilities, only the fields the UI reads. */
export interface CapabilitiesResponse {
  entries: Array<{ from: string; to: string }>;
}
export interface CorridorsResponse {
  generatedAt: number;
  rows: CorridorRow[];
}

/** GET /v2/journeys/:id (and the body of advance / accept-new-terms). Derived by the server from the two intents; never stored. */
export interface JourneyLeg {
  intentId: string;
  status: string;
  attempt?: number;
  expired?: boolean;
}
export interface JourneyView {
  journeyId: string;
  state:
    | "created" | "hop1_in_progress" | "hop1_failed" | "awaiting_receipt" | "ready_to_advance" | "needs_review" | "hop2_ready_to_sign"
    | "hop2_in_progress" | "hop2_unsigned_expired" | "hop2_failed" | "requote_required" | "completed";
  funds: "source" | "in_transit_first_leg" | "with_user_at_intermediate" | "in_transit_second_leg" | "delivered_to_recipient";
  nextAction: "commit_hop1" | "sign_hop1" | "wait" | "advance" | "sign_hop2" | "restart_hop2" | "review" | "none";
  hop1: JourneyLeg | null;
  hop2: JourneyLeg | null;
  received?: { asset: string; amount: string; chain: string };
  reason?: string;
}
export interface JourneyDetail {
  view: JourneyView;
  journey: JourneyQuote | null;
  /** The order awaiting the user's signature. */
  next: { intentId: string; execution: { plan: WirePlan } } | null;
}
export type JourneyAdvance = JourneyDetail & {
  advance: { busy: boolean; outcome: { status: "advance" | "waiting" | "blocked" | "REQUOTE_REQUIRED"; detail: string | null } | null };
};
export type TwoHopQuote = Extract<JourneyPlanResponse, { kind: "two_hop" }>;

export interface QuoteInput {
  fromAsset: string;
  amount: string;
  decimals: number;
  toAsset: string;
  sender: string;
  recipient: string;
  slippageBps?: number;
  maxTier: 1 | 2 | 3;
}

export interface IntentStatus {
  intentId: string;
  status: string;
  kind: string;
  rail: string;
  deliveredAmount: string | null;
  deliveredAsset: string | null;
  nextSteps: string[];
  anomalies: string[];
  conflicts: string[];
  guarantee: unknown;
  expiresAt: number;
  /** A parked delivery the recipient can claim on the destination settler (`SettlerBase.claim(key, to)`); null or absent otherwise. */
  claim?: { chain: string; settler: string; key: string; recipient: string; token: string; amount: string } | null;
  /** Source and destination transactions the server has seen, in order. */
  transactions?: Array<{ kind: "source" | "destination"; chain: string; txHash: string }>;
}
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["delivered", "claimed", "refunded", "failed"]);
