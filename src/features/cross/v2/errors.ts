// What the user reads when something fails (plan 7.4): the API's stable error codes (empx-core docs/integrators/openapi.yaml, Error), wallet
// rejections and network failures, in plain words. The server's own message is kept only where no better text exists; the request id is kept
// separately so support can find the call.
import { CrossV2ApiError } from "./client";
import { AmbiguousSubmission } from "./execute";

export interface V2ErrorView {
  text: string;
  /** The API's `x-request-id`, for support. */
  requestId?: string;
  /** Seconds to wait before retrying, when the API said so. */
  retryAfterSec?: number;
}

const POLICY_DETAIL: Record<string, string> = {
  two_hop_second_signature_pending_d11: "Two-step transfers are not enabled for this app yet.",
  terms_do_not_match_receipt: "The new terms don't match what arrived. Get new terms again.",
};

const CODE_TEXT: Record<string, string> = {
  REQUOTE_REQUIRED: "Prices moved since this quote. Refresh the quote and review it again.",
  QUOTE_MISMATCH: "This quote no longer matches its route. Refresh the quote.",
  INVALID_PLAN: "This route failed the server's checks. Refresh the quote or pick another route.",
  NO_ROUTE: "No route is available for this transfer right now.",
  KILL_SWITCH_OFF: "Cross-chain transfers are paused right now. Your funds have not moved; try again later.",
  UNSUPPORTED: "This route isn't supported for this transfer.",
  CONFLICT: "This transfer changed in the meantime. Reload its status.",
  NOT_FOUND: "Not found. If this was a transfer, check the reference with support.",
  UNAUTHENTICATED: "The cross-chain service refused this app's access. Contact support.",
  SCOPE_MISSING: "This app isn't allowed to do that yet. Contact support.",
  MODULE_NOT_ENABLED: "This app isn't allowed to do that yet. Contact support.",
  INVALID_AMOUNT: "That amount can't be sent. Check the amount and try again.",
  INVALID_IDENTITY: "That address isn't valid for this chain.",
  INVALID_SLIPPAGE: "That slippage setting isn't allowed.",
  UNSUPPORTED_PLAN_VERSION: "This page is out of date for the cross-chain service. Reload the page.",
  PROVIDER_ERROR: "The bridge provider had a problem. Try again or pick another route.",
  PROVIDER_REJECTED: "The bridge provider refused this transfer. Pick another route or amount.",
  PROVIDER_TIMEOUT: "The bridge provider didn't answer in time. Try again.",
  PROVIDER_RATE_LIMITED: "The bridge provider is busy. Try again in a moment.",
  PROVIDER_UNAVAILABLE: "The bridge provider is unavailable right now. Pick another route.",
  PROVIDER_BAD_RESPONSE: "The bridge provider sent an unreadable answer. Try again or pick another route.",
  BREAKER_OPEN: "This route is paused after recent failures. Pick another route or try later.",
  BUDGET_EXHAUSTED: "This route has reached its limit for now. Pick another route or try later.",
  INCONSISTENT: "The service found conflicting records for this transfer. Contact support with the reference below.",
  NOT_CONFIGURED: "The cross-chain service isn't configured on this site yet.",
  BAD_RESPONSE: "The cross-chain service sent an unreadable answer. Try again.",
  UPSTREAM_TIMEOUT: "Finding a route took too long. Retrying shortly.",
  UPSTREAM_UNAVAILABLE: "The cross-chain service can't be reached right now. Retrying shortly.",
};

const isWalletRejection = (e: unknown): boolean => {
  const x = e as { name?: unknown; code?: unknown; cause?: unknown; detail?: unknown } | null;
  if (!x || typeof x !== "object") return false;
  if (x.name === "UserRejectedRequestError" || x.code === 4001) return true;
  return isWalletRejection(x.cause) || isWalletRejection(x.detail);
};

export function describeV2Error(e: unknown): V2ErrorView {
  if (e instanceof AmbiguousSubmission) {
    // A rejected prompt before anything was sent is not ambiguous: say it plainly.
    if (!e.txHash && isWalletRejection(e.detail)) return { text: "You rejected the request in your wallet. Nothing was sent." };
    if (!e.txHash) return { text: e.message };
    // Say why the API did not confirm it: its own reason, or what the failed call was.
    const d = e.detail;
    const inner = d instanceof CrossV2ApiError ? describeV2Error(d) : null;
    const why = inner?.text ?? (d instanceof Error && d.message ? d.message : null);
    return { text: why ? `${e.message} Reason: ${why.replace(/\.$/, "")}.` : e.message, requestId: inner?.requestId };
  }
  if (isWalletRejection(e)) return { text: "You rejected the request in your wallet. Nothing was sent." };
  if (e instanceof CrossV2ApiError) {
    const meta = { requestId: e.requestId, retryAfterSec: e.retryAfterSec };
    if (e.code === "RATE_LIMITED")
      return { ...meta, text: e.retryAfterSec !== undefined ? `Too many requests. Try again in ${Math.ceil(e.retryAfterSec)} s.` : "Too many requests. Try again shortly." };
    if (e.code === "POLICY_DENIED") {
      const d = typeof e.details?.code === "string" ? e.details.code : undefined;
      return { ...meta, text: (d && POLICY_DETAIL[d]) ?? "This transfer isn't allowed by the routing policy. Pick another route or amount." };
    }
    const known = CODE_TEXT[e.code];
    if (known) return { ...meta, text: known };
    if (e.status >= 500) return { ...meta, text: "The cross-chain service had a problem. Try again in a moment." };
    return { ...meta, text: e.message || "The request was refused." };
  }
  if (e instanceof TypeError && /fetch|network/i.test(e.message)) return { text: "Network error: check your connection and try again." };
  if (e instanceof Error && e.message) return { text: e.message };
  return { text: "Something went wrong." };
}

export const errText = (e: unknown): string => describeV2Error(e).text;
