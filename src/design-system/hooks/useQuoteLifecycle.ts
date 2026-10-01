// ─── useQuoteLifecycle — quote age, refresh unlock and auto-refresh ────────
//
// Drives the widget's quote row + the 2px timer bar on the CTA from the
// quote's OWN validity window (issuedAt + validMs), rather than a fixed
// clock, so the UI can never outlive the execution guards
// (useSwapExecution refuses an expired quote).
//
// Lives inside the widget, not the page: it ticks once a second, and
// re-rendering a 1,000-line page every second for a countdown is waste.

import { useCallback, useEffect, useRef, useState } from "react";

export interface QuoteLifecycleOptions {
  /** Epoch ms the current quote was issued. Unset → lifecycle inactive. */
  issuedAt?: number | null;
  /** Quote validity in ms. */
  validMs?: number | null;
  /** Re-fetch the quote. A new quote arrives as a new `issuedAt`. */
  onRefresh?: () => void;
  /** Refresh automatically once the quote expires. */
  autoRefresh?: boolean;
  /** Age (ms) from which a manual refresh is allowed. Defaults to expiry. */
  manualUnlockMs?: number;
  /** Hold auto-refresh (e.g. while the review modal is open or a tx is in flight). */
  paused?: boolean;
}

export interface QuoteLifecycle {
  active: boolean;
  ageSeconds: number;
  totalSeconds: number;
  /** 100 → fresh, 0 → expired. */
  remainingPct: number;
  canRefresh: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/** If a refresh never produces a new quote (e.g. the fetch failed), stop spinning after this. */
const REFRESH_SPINNER_TIMEOUT_MS = 8_000;

export function useQuoteLifecycle({
  issuedAt,
  validMs,
  onRefresh,
  autoRefresh = false,
  manualUnlockMs,
  paused = false,
}: QuoteLifecycleOptions): QuoteLifecycle {
  const active = !!issuedAt && !!validMs && validMs > 0;
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const autoFiredFor = useRef<number | null>(null);
  const [pageHidden, setPageHidden] = useState(() => typeof document !== "undefined" && document.hidden);

  // A background tab shouldn't keep re-quoting; refresh on return instead.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active, issuedAt]);

  // A new quote ends any refresh in progress.
  useEffect(() => {
    setRefreshing(false);
  }, [issuedAt]);

  useEffect(() => {
    if (!refreshing) return;
    const t = setTimeout(() => setRefreshing(false), REFRESH_SPINNER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [refreshing]);

  const refresh = useCallback(() => {
    if (!onRefresh) return;
    setRefreshing(true);
    onRefresh();
  }, [onRefresh]);

  const ageMs = active ? Math.max(0, now - (issuedAt as number)) : 0;
  const expired = active && ageMs >= (validMs as number);

  // Auto-refresh once per quote, on expiry. Re-evaluated when `paused` lifts
  // or the tab becomes visible, so a quote that expired behind the review
  // modal (or in a background tab) refreshes then.
  useEffect(() => {
    if (!active || !autoRefresh || paused || pageHidden || !expired || !onRefresh) return;
    if (autoFiredFor.current === issuedAt) return;
    autoFiredFor.current = issuedAt as number;
    refresh();
  }, [active, autoRefresh, expired, issuedAt, onRefresh, pageHidden, paused, refresh]);

  if (!active) {
    return { active, ageSeconds: 0, totalSeconds: 0, remainingPct: 0, canRefresh: false, refreshing, refresh };
  }

  const totalSeconds = Math.round((validMs as number) / 1000);
  const ageSeconds = Math.min(totalSeconds, Math.floor(ageMs / 1000));
  const unlockMs = manualUnlockMs ?? (validMs as number);
  return {
    active,
    ageSeconds,
    totalSeconds,
    remainingPct: Math.max(0, 100 - (ageMs / (validMs as number)) * 100),
    canRefresh: !!onRefresh && !refreshing && ageMs >= unlockMs,
    refreshing,
    refresh,
  };
}
