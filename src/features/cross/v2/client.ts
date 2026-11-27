// REST client for the EMPX V2 API, through the same-origin proxy (never the V1 origin, never a key in the browser). Money-moving calls carry an Idempotency-Key.
import { CROSS_V2_PROXY_BASE } from "./config";
import type { BasketLegSteps, BasketPlanRequest, BasketView } from "./basketTypes";
import type { V2WalletScanRequest, V2WalletScanResult, V2LiquidateRequest, V2LiquidateQuote } from "../../basket/api/contracts";
import type { CompositionCommit, CompositionStatus, CompositionLeg } from "./types";
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

/** Reads a streamed journey quote (text/event-stream of `data: <json>` events): each `partial` goes to `onPartial` as it arrives, the `result` event is the
 *  usual body, an `error` event is thrown like an error reply. A server that answered plain JSON is read as before. */
export async function readV2Stream<T>(res: Response, onPartial: (quote: WireQuoteResponse) => void): Promise<T> {
  if (!res.ok || !res.body || !/^text\/event-stream\b/.test(res.headers.get("content-type") ?? "")) return readV2Response<T>(res);
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (let c = await reader.read(); ; c = await reader.read()) {
    buf += c.done ? dec.decode() : dec.decode(c.value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      let ev: unknown;
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (!isObject(ev)) continue;
      if (ev.type === "partial" && isObject(ev.quote)) onPartial(ev.quote as unknown as WireQuoteResponse);
      else if (ev.type === "result") {
        void reader.cancel().catch(() => undefined);
        const { type: _t, ...body } = ev;
        return body as T;
      } else if (ev.type === "error") {
        void reader.cancel().catch(() => undefined);
        const e = isObject(ev.error) ? ev.error : {};
        const status = typeof ev.status === "number" ? ev.status : 500;
        throw new CrossV2ApiError(status, typeof e.code === "string" ? e.code : "HTTP_ERROR", typeof e.message === "string" ? e.message : `HTTP ${status}`, e.retryable === true, {
          details: isObject(e.details) ? e.details : undefined,
          requestId,
        });
      }
    }
    if (c.done) break;
  }
  throw new CrossV2ApiError(res.status, "BAD_RESPONSE", "the quote stream ended without a result", true, { requestId });
}

export function createCrossV2Client(o: CrossV2ClientOptions = {}) {
  const baseUrl = o.baseUrl ?? CROSS_V2_PROXY_BASE;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    init: { body?: unknown; idempotencyKey?: string; signal?: AbortSignal; onPartial?: (quote: WireQuoteResponse) => void } = {},
  ): Promise<T> {
    const f = o.fetchImpl ?? fetch;
    const res = await f(`${baseUrl}${path}`, {
      method,
      signal: init.signal,
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
        ...(init.onPartial ? { Accept: "text/event-stream" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    return init.onPartial ? readV2Stream<T>(res, init.onPartial) : readV2Response<T>(res);
  }

  const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

  const quoteBody = (i: QuoteInput) => ({
    from: { asset: i.fromAsset, amount: i.amount, decimals: i.decimals },
    toAsset: i.toAsset,
    sender: i.sender,
    recipient: i.recipient,
    // Sent only when the user set it: the server applies and records its documented default otherwise.
    ...(i.slippageBps !== undefined ? { slippageBps: i.slippageBps } : {}),
    // Bridge (custodial, estimate-only) quotes only when named; the UI always lists it (owner decision 2026-11-26).
    policy: { maxTier: i.maxTier, explicitRails: ["bridge"] },
  });

  return {
    submitSolana(intentId: string, signedTransaction: string, signal?: AbortSignal) {
      return request<{ signature: string; replayed: boolean }>("POST", `/v2/intents/${encodeURIComponent(intentId)}/solana`, {
        body: { signedTransaction }, idempotencyKey: `solana-${intentId}`, signal,
      });
    },
    scanWallet(r: V2WalletScanRequest, signal?: AbortSignal) {
      return request<V2WalletScanResult>("POST", "/v2/wallet/scan", {signal, body: r});
    },
    liquidateQuote(r: V2LiquidateRequest, signal?: AbortSignal) {
      return request<V2LiquidateQuote>("POST", "/v2/wallet/liquidate/quote", {signal, body: r, idempotencyKey: newKey("liquidate")});
    },
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
    /** Same request as quote(): a direct quote, a two-order journey, or none (which still carries the quote).
     *  With `onPartial` the quote is streamed: the routes found so far arrive as they are found; the returned body stays the one to act on. */
    journeyQuote(i: QuoteInput, signal?: AbortSignal, onPartial?: (quote: WireQuoteResponse) => void): Promise<JourneyPlanResponse> {
      return request<JourneyPlanResponse>("POST", "/v2/journeys/quote", { signal, body: quoteBody(i), ...(onPartial ? { onPartial } : {}) });
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
      // `plan`: present when the deposit address was made at commit (Bridge, Heleket); execute it only after planCheck checkBound.
      return request<{ intentId: string; kind: "contract" | "provider-direct"; replayed: boolean; plan?: WirePlan }>("POST", "/v2/intents", {
        signal,
        idempotencyKey,
        body: { plan, journey, sender, ...(humanAcceptance ? { humanAcceptance } : {}) },
      });
    },
    commitComposition(input: { sender: string; primary: CompositionLeg; gasTopUp: CompositionLeg }, idempotencyKey: string = newKey("composition"), signal?: AbortSignal) {
      return request<CompositionCommit>("POST", "/v2/compositions", { body: input, idempotencyKey, signal });
    },
    compositionStatus(id: string, signal?: AbortSignal) {
      return request<CompositionStatus>("GET", `/v2/compositions/${encodeURIComponent(id)}`, { signal });
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
    /** Commits ONLY the first order of a two-order journey, with the journey quote the user was shown (both plans unchanged).
     *  `humanAcceptance` accepts the journey's displayed label when a leg was held back by the value check. */
    commitJourney(q: TwoHopQuote, sender: string, idempotencyKey: string = newKey("journey"), signal?: AbortSignal, humanAcceptance?: HumanAcceptance) {
      return request<{ journeyId: string; hop1IntentId: string; replayed: boolean; hop1Plan?: WirePlan }>("POST", "/v2/journeys", {
        signal,
        idempotencyKey,
        body: { hop1: q.execution.hop1.plan, hop2Preview: q.execution.hop2Preview.plan, journey: q.journey, sender, ...(humanAcceptance ? { humanAcceptance } : {}) },
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
    acceptNewTerms(journeyId: string, offer: WireOffer, signal?: AbortSignal, humanAcceptance?: HumanAcceptance): Promise<JourneyDetail> {
      return request<JourneyDetail>("POST", `/v2/journeys/${encodeURIComponent(journeyId)}/accept-new-terms`, {
        signal, idempotencyKey: `accept-${journeyId}-${offer.execution.plan.hash.slice(0, 16)}`,
        body: { plan: offer.execution.plan, journey: offer.journey, ...(humanAcceptance ? { humanAcceptance } : {}) },
      });
    },
    status(intentId: string, signal?: AbortSignal): Promise<IntentStatus> {
      return request<IntentStatus>("GET", `/v2/intents/${encodeURIComponent(intentId)}`, { signal });
    },
  };
}
export type CrossV2Client = ReturnType<typeof createCrossV2Client>;
export type { WireOffer };
