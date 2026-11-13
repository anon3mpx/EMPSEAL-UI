// REST client for the EMPX V2 API, through the same-origin proxy (never the V1 origin, never a key in the browser). Money-moving calls carry an Idempotency-Key.
import { CROSS_V2_PROXY_BASE } from "./config";
import type { BasketLegSteps, BasketPlanRequest, BasketView } from "./basketTypes";
import type {
  CapabilitiesResponse, CorridorsResponse, HumanAcceptance, IntentStatus, JourneyAdvance, JourneyDetail, JourneyPlanResponse, JourneyQuote, QuoteInput, TwoHopQuote,
  WireOffer, WirePlan, WireQuoteResponse,
} from "./types";

export interface CrossV2ErrorMeta {
  /** `error.details` (POLICY_DENIED / INVALID_PLAN); `details.code` refines the refusal. */
  details?: Record<string, unknown>;
  /** The `x-request-id` header, for support. */
  requestId?: string;
  /** The `Retry-After` header, in seconds. */
  retryAfterSec?: number;
}

export class CrossV2ApiError extends Error {
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly retryAfterSec?: number;
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    meta: CrossV2ErrorMeta = {},
  ) {
    super(message);
    this.name = "CrossV2ApiError";
    this.details = meta.details;
    this.requestId = meta.requestId;
    this.retryAfterSec = meta.retryAfterSec;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

export interface CrossV2ClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** Parses a V2 response: an error body `{error:{code,message,retryable,details}}` becomes a CrossV2ApiError, and a 2xx without a JSON object is refused so no caller sees a null body. */
export async function readV2Response<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const requestId = res.headers.get("x-request-id") ?? undefined;
  if (!res.ok) {
    const e = isObject(parsed) && isObject(parsed.error) ? parsed.error : {};
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new CrossV2ApiError(
      res.status,
      typeof e.code === "string" ? e.code : "HTTP_ERROR",
      typeof e.message === "string" ? e.message : `HTTP ${res.status}`,
      e.retryable === true,
      {
        details: isObject(e.details) ? e.details : undefined,
        requestId,
        retryAfterSec: Number.isFinite(retryAfter) && retryAfter >= 0 && res.headers.has("retry-after") ? retryAfter : undefined,
      },
    );
  }
  if (!isObject(parsed)) {
    throw new CrossV2ApiError(res.status, "BAD_RESPONSE", "the API answered 2xx without a JSON object", false, { requestId });
  }
  return parsed as T;
}

export function createCrossV2Client(o: CrossV2ClientOptions = {}) {
  const baseUrl = o.baseUrl ?? CROSS_V2_PROXY_BASE;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    init: { body?: unknown; idempotencyKey?: string; signal?: AbortSignal } = {},
  ): Promise<T> {
    const f = o.fetchImpl ?? fetch;
    const res = await f(`${baseUrl}${path}`, {
      method,
      signal: init.signal,
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    return readV2Response<T>(res);
  }

  const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

  const quoteBody = (i: QuoteInput) => ({
    from: { asset: i.fromAsset, amount: i.amount, decimals: i.decimals },
    toAsset: i.toAsset,
    sender: i.sender,
    recipient: i.recipient,
    // Sent only when the user set it: the server applies and records its documented default otherwise.
    ...(i.slippageBps !== undefined ? { slippageBps: i.slippageBps } : {}),
    policy: { maxTier: i.maxTier },
  });

  return {
    basketPlan(r: BasketPlanRequest, signal?: AbortSignal) {
      return request<BasketView>("POST", "/v2/baskets", { signal, body: r, idempotencyKey: newKey("basket") });
    },
    basketStatus(basketId: string, signal?: AbortSignal) {
      return request<BasketView>("GET", `/v2/baskets/${encodeURIComponent(basketId)}`, { signal });
    },
    basketBegin(basketId: string, expectedVersion: number, acknowledgeSkipped: string[], signal?: AbortSignal) {
      return request<BasketView>("POST", `/v2/baskets/${encodeURIComponent(basketId)}/begin`, {
        signal, body: { expectedVersion, acknowledgeSkipped }, idempotencyKey: newKey("begin"),
      });
    },
    basketCancel(basketId: string, signal?: AbortSignal) {
      return request<BasketView>("POST", `/v2/baskets/${encodeURIComponent(basketId)}/cancel`, { signal, body: {}, idempotencyKey: `cancel-${basketId}` });
    },
    basketCommitLeg(basketId: string, legId: string, signal?: AbortSignal) {
      return request<{ intentId: string; replayed: boolean }>("POST", `/v2/baskets/${encodeURIComponent(basketId)}/legs/${encodeURIComponent(legId)}/commit`, {
        signal, body: {}, idempotencyKey: `commit-${basketId}-${legId}`,
      });
    },
    basketLegSteps(basketId: string, legId: string, signal?: AbortSignal) {
      return request<BasketLegSteps>("GET", `/v2/baskets/${encodeURIComponent(basketId)}/legs/${encodeURIComponent(legId)}/steps`, { signal });
    },
    basketRequoteLeg(basketId: string, legId: string, expectedVersion: number, signal?: AbortSignal) {
      return request<BasketView>("POST", `/v2/baskets/${encodeURIComponent(basketId)}/legs/${encodeURIComponent(legId)}/requote`, {
        signal, body: { expectedVersion }, idempotencyKey: `requote-${basketId}-${legId}-${expectedVersion}`,
      });
    },
    quote(i: QuoteInput, signal?: AbortSignal): Promise<WireQuoteResponse> {
      return request<WireQuoteResponse>("POST", "/v2/quote", { signal, body: quoteBody(i) });
    },
    /** Same request as quote(): a direct quote, a two-order journey, or none (which still carries the quote). */
    journeyQuote(i: QuoteInput, signal?: AbortSignal): Promise<JourneyPlanResponse> {
      return request<JourneyPlanResponse>("POST", "/v2/journeys/quote", { signal, body: quoteBody(i) });
    },
    corridors(signal?: AbortSignal): Promise<CorridorsResponse> {
      return request<CorridorsResponse>("GET", "/v2/capabilities/corridors", { signal });
    },
    /** Every asset pair the server routes (public); the picker offers each EVM asset named here. */
    capabilities(signal?: AbortSignal): Promise<CapabilitiesResponse> {
      return request<CapabilitiesResponse>("GET", "/v2/capabilities", { signal });
    },
    /** `plan` and `journey` are the objects the API returned, unchanged: the server refuses a journey that is not what the plan determines.
     *  `humanAcceptance` is the user's explicit acceptance of a warning/unpriced route, exactly as displayed. */
    commit(plan: WirePlan, journey: JourneyQuote, sender: string, idempotencyKey: string = newKey("commit"), signal?: AbortSignal, humanAcceptance?: HumanAcceptance) {
      return request<{ intentId: string; kind: "contract" | "provider-direct"; replayed: boolean }>("POST", "/v2/intents", {
        signal,
        idempotencyKey,
        body: { plan, journey, sender, ...(humanAcceptance ? { humanAcceptance } : {}) },
      });
    },
    submitOrder(intentId: string, signature: string, signal?: AbortSignal) {
      return request<{ state: "accepted" | "in_progress"; intentId?: string; replayed?: boolean }>(
        "POST",
        `/v2/intents/${encodeURIComponent(intentId)}/orders`,
        { signal, idempotencyKey: `order-${intentId}`, body: { signature } },
      );
    },
    reportStep(intentId: string, stepId: string, txHash: string, signal?: AbortSignal) {
      return request<{ accepted: boolean; reason?: string; remaining: string[] }>(
        "POST",
        `/v2/intents/${encodeURIComponent(intentId)}/steps`,
        { signal, idempotencyKey: `step-${intentId}-${stepId}-${txHash}`, body: { stepId, txHash } },
      );
    },
    /** Provider-direct intents: link the provider's own reference so the server can track the transfer (one per intent). */
    attachReference(intentId: string, reference: string, signal?: AbortSignal) {
      return request<{ attached: boolean }>("POST", `/v2/intents/${encodeURIComponent(intentId)}/reference`, {
        signal,
        idempotencyKey: `ref-${intentId}`,
        body: { reference },
      });
    },
    /** Commits ONLY the first order of a two-order journey, with the journey quote the user was shown (both plans unchanged). */
    commitJourney(q: TwoHopQuote, sender: string, idempotencyKey: string = newKey("journey"), signal?: AbortSignal) {
      return request<{ journeyId: string; hop1IntentId: string; replayed: boolean }>("POST", "/v2/journeys", {
        signal,
        idempotencyKey,
        body: { hop1: q.execution.hop1.plan, hop2Preview: q.execution.hop2Preview.plan, journey: q.journey, sender },
      });
    },
    journey(journeyId: string, signal?: AbortSignal): Promise<JourneyDetail> {
      return request<JourneyDetail>("GET", `/v2/journeys/${encodeURIComponent(journeyId)}`, { signal });
    },
    /** Builds the second order from the first leg's final delivery. Safe to repeat; never resubmits the first leg. */
    advanceJourney(journeyId: string, signal?: AbortSignal): Promise<JourneyAdvance> {
      return request<JourneyAdvance>("POST", `/v2/journeys/${encodeURIComponent(journeyId)}/advance`, { signal, idempotencyKey: newKey("advance"), body: {} });
    },
    /** The second order did not happen: offers for it afresh from what was received. Changes nothing until acceptNewTerms. */
    restartJourneyQuote(journeyId: string, signal?: AbortSignal): Promise<WireQuoteResponse> {
      return request<WireQuoteResponse>("POST", `/v2/journeys/${encodeURIComponent(journeyId)}/restart-quote`, {
        signal, idempotencyKey: newKey("restart"), body: { policy: { maxTier: 3 } },
      });
    },
    acceptNewTerms(journeyId: string, offer: WireOffer, signal?: AbortSignal): Promise<JourneyDetail> {
      return request<JourneyDetail>("POST", `/v2/journeys/${encodeURIComponent(journeyId)}/accept-new-terms`, {
        signal, idempotencyKey: `accept-${journeyId}-${offer.execution.plan.hash.slice(0, 16)}`, body: { plan: offer.execution.plan, journey: offer.journey },
      });
    },
    status(intentId: string, signal?: AbortSignal): Promise<IntentStatus> {
      return request<IntentStatus>("GET", `/v2/intents/${encodeURIComponent(intentId)}`, { signal });
    },
  };
}
export type CrossV2Client = ReturnType<typeof createCrossV2Client>;
export type { WireOffer };
