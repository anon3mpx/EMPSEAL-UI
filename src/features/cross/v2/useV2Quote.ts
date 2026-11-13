// Live V2 quote for the widget, like V1's useCrossQuote: re-quotes (debounced) whenever the transfer changes, keeps the last offers on
// screen while refreshing, and checks every offer locally before it can be selected. A quote is never reused for a different transfer.
// Uses POST /v2/journeys/quote: `direct` carries the quote, `none` still carries it (with any held-back routes), `two_hop` is shown as
// information until two-order journeys land (plan section 6). Re-quotes before the first offer expires (at least every 60 s) and backs off after a failure, unless paused.
import { useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import type { CrossRailsState } from "../../../design-system/EmpxCrossWidget";
import type { CrossV2Client } from "./client";
import { checkTwoHop, type TwoHopCheck } from "./journeyCheck";
import { checkOffer } from "./planCheck";
import type { BelowMinimum, JourneyQuote, TwoHopQuote, WireOffer, WireQuoteResponse, WithheldOffer } from "./types";
import type { CheckedOffer } from "./widgetView";
import { addressValidFor, chainIdOfCaip2 } from "./nonEvm";
import { isNonEvmChain } from "@/lib/wallet/chainKind";

export interface V2QuoteInput {
  fromAsset: string;
  fromDecimals: number;
  toAsset: string;
  amount: string;
  sender?: string;
  sourceAddress?: string;
  recipient?: string;
  /** Stops the expiry re-quote (confirm modal open, or executing). */
  paused?: boolean;
}

export type CheckedWithheld = CheckedOffer & { offer: WithheldOffer };
export interface CheckedSubstitute {
  asset: string;
  offers: CheckedOffer[];
}
export interface TwoHopInfo {
  viaChain: string;
  viaAsset: string;
  journey: JourneyQuote;
  /** The quote exactly as returned (both plans go back unchanged to POST /v2/journeys) and its local check. */
  quote: TwoHopQuote;
  check: TwoHopCheck;
}

export interface V2QuoteState {
  state: CrossRailsState;
  offers: CheckedOffer[];
  /** Routes economic eligibility held back from automatic selection. */
  withheld: CheckedWithheld[];
  /** Present only when no route delivers the requested asset. */
  substitutes: CheckedSubstitute[];
  belowMinimum: BelowMinimum[];
  /** The server's reason when it returned no route. */
  noneReason: string | null;
  twoHop: TwoHopInfo | null;
  degraded: boolean;
  issuedAt: number | null;
  /** Milliseconds until the first offer expires, from issuedAt. */
  validMs: number | null;
  error: string | null;
  /** A quote for a changed input (amount, tokens, recipient) is in flight: what is on screen is for the previous input. */
  forNewInput: boolean;
  refresh: () => void;
}

const DEBOUNCE_MS = 450;
/** Re-quote this long before the first offer expires, so a selected route is never shown stale. */
const EXPIRY_LEAD_MS = 3_000;
/** Prices move: re-quote at least this often, even when the server's plans stay valid longer (a held-back plan can be valid for 30 min). */
const REFRESH_MAX_MS = 60_000;
/** After a failed quote: retry in 10 s, then 20, 40, 60 s (never a tight loop against a slow server). */
const retryDelayMs = (failures: number) => Math.min(60_000, 10_000 * 2 ** Math.max(0, failures - 1));

export function useV2Quote(client: CrossV2Client, input: V2QuoteInput, describeError: (e: unknown) => string): V2QuoteState {
  const [state, setState] = useState<CrossRailsState>("idle");
  const [offers, setOffers] = useState<CheckedOffer[]>([]);
  const [withheld, setWithheld] = useState<CheckedWithheld[]>([]);
  const [substitutes, setSubstitutes] = useState<CheckedSubstitute[]>([]);
  const [belowMinimum, setBelowMinimum] = useState<BelowMinimum[]>([]);
  const [noneReason, setNoneReason] = useState<string | null>(null);
  const [twoHop, setTwoHop] = useState<TwoHopInfo | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [validMs, setValidMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [forNewInput, setForNewInput] = useState(false);
  const shownKey = useRef<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const hasOffers = useRef(false);
  hasOffers.current = offers.length > 0;

  const { fromAsset, fromDecimals, toAsset, amount, recipient, paused } = input;
  const fromChainId = chainIdOfCaip2(fromAsset.split("/")[0]);
  const toChainId = chainIdOfCaip2(toAsset.split("/")[0]);
  const sender = (isNonEvmChain(fromChainId) ? input.sourceAddress : input.sender)?.trim();

  const clear = () => {
    setOffers([]);
    setWithheld([]);
    setSubstitutes([]);
    setBelowMinimum([]);
    setNoneReason(null);
    setTwoHop(null);
  };

  useEffect(() => {
    let base: bigint;
    try {
      base = parseUnits((amount || "0").replace(/,/g, ""), fromDecimals);
    } catch {
      base = 0n;
    }
    const to = recipient?.trim() || (isNonEvmChain(toChainId) ? undefined : input.sender?.trim());
    const ready = Boolean(sender && to && fromChainId !== undefined && toChainId !== undefined && addressValidFor(fromChainId, sender) && addressValidFor(toChainId, to) && base > 0n && fromAsset !== toAsset);
    if (!ready) {
      shownKey.current = null;
      setForNewInput(false);
      clear();
      setError(null);
      setIssuedAt(null);
      setState("idle");
      return;
    }
    const ctl = new AbortController();
    // Show the fetch at once (not after the typing pause): the offers on screen are for the previous input until the new quote lands.
    const key = [fromAsset, fromDecimals, toAsset, base.toString(), sender, to].join("|");
    setForNewInput(key !== shownKey.current);
    setState(hasOffers.current ? "refreshing" : "loading");
    const timer = setTimeout(async () => {
      setError(null);
      try {
        const res = await client.journeyQuote(
          { fromAsset, amount: base.toString(), decimals: fromDecimals, toAsset, sender: sender!, recipient: to!, maxTier: 3 },
          ctl.signal,
        );
        if (ctl.signal.aborted) return;
        const now = Math.floor(Date.now() / 1000);
        const check = <T extends WireOffer>(offer: T, asset: string, allowHeldBack = false) => ({
          offer,
          check: checkOffer(offer, { fromAsset, amount: base.toString(), toAsset: asset, sender: sender!, recipient: to!, now, allowHeldBack }),
        });
        const q: WireQuoteResponse = res.kind === "two_hop" ? { plans: [] } : res.quote ?? { plans: [] };
        const plans = Array.isArray(q.plans) ? q.plans : [];
        const checked = plans.map((o) => check(o, toAsset));
        const held = (q.withheld ?? []).map((o) => check(o, toAsset, true));
        const subs = (q.substitutes ?? []).map((s) => ({ asset: s.asset, offers: (s.plans ?? []).map((o) => check(o, s.asset)) }));
        const expiries = [...plans, ...(q.withheld ?? []), ...(q.substitutes ?? []).flatMap((s) => s.plans ?? [])].map((p) => p.journey.expiresAt);
        if (res.kind === "two_hop") expiries.push(res.journey.expiresAt);
        const firstExpiry = Math.min(...expiries);
        setOffers(checked);
        setWithheld(held);
        setSubstitutes(subs);
        // Only rails that need more of what the user is sending: anything else could not be acted on here.
        setBelowMinimum((Array.isArray(q.belowMinimum) ? q.belowMinimum : []).filter((b) => b?.minimumInput?.asset === fromAsset));
        setNoneReason(res.kind === "none" ? res.reason : null);
        setTwoHop(
          res.kind === "two_hop"
            ? { viaChain: res.via.chain, viaAsset: res.via.asset, journey: res.journey, quote: res, check: checkTwoHop(res, { fromAsset, amount: base.toString(), toAsset, sender: sender!, recipient: to!, now }) }
            : null,
        );
        setDegraded(q.degraded === true);
        setIssuedAt(Date.now());
        setValidMs(Number.isFinite(firstExpiry) ? Math.min(REFRESH_MAX_MS, Math.max(0, firstExpiry * 1000 - Date.now())) : REFRESH_MAX_MS);
        setFailures(0);
        shownKey.current = key;
        setForNewInput(false);
        setState(checked.length ? "ready" : "empty");
      } catch (e) {
        if (ctl.signal.aborted) return;
        clear();
        // No quote is on screen, so no age or countdown either.
        setIssuedAt(null);
        setValidMs(null);
        setError(describeError(e));
        setFailures((f) => f + 1);
        shownKey.current = null;
        setForNewInput(false);
        setState("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [client, fromAsset, fromDecimals, toAsset, amount, sender, recipient, input.sender, fromChainId, toChainId, nonce, describeError]);

  // Expiry re-quote: never while the user is reviewing or signing (the confirm modal has its own refresh).
  useEffect(() => {
    if (paused || issuedAt === null || validMs === null || state === "loading" || state === "refreshing") return;
    const wait = Math.max(5_000, issuedAt + validMs - EXPIRY_LEAD_MS - Date.now());
    const t = setTimeout(() => setNonce((n) => n + 1), wait);
    return () => clearTimeout(t);
  }, [paused, issuedAt, validMs, state]);

  // Retry after a failure, backing off.
  useEffect(() => {
    if (paused || state !== "error" || failures === 0) return;
    const t = setTimeout(() => setNonce((n) => n + 1), retryDelayMs(failures));
    return () => clearTimeout(t);
  }, [paused, state, failures]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { state, offers, withheld, substitutes, belowMinimum, noneReason, twoHop, degraded, issuedAt, validMs, error, forNewInput, refresh };
}
