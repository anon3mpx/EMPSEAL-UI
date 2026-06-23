// ─── useSwapQuoteFetch ───────────────────────────────────────────────────────
//
// W3 of SDK wiring (post-CHECKPOINT-v6).  Routes the swap-page quote engine
// through empx-swap-sdk's `router.findBestPath()` instead of wagmi's six
// `useReadContract` calls.
//
// Why findBestPath() and NOT getTradeInfo()
// ──────────────────────────────────────────
// The SDK's `getTradeInfo()` applies protocol fee BEFORE pathfinding via
// `applyProtocolFee()` → that changes the expected output vs the old
// wagmi path which called `findBestPath()` with the full amountIn and
// let Emp.jsx do its own fee math downstream (`setCalculatedRoute`).
// Using `findBestPath()` directly preserves the original behaviour.
// W3.5 could migrate to `getTradeInfo()` once we audit every consumer of
// `data` to ensure fee handling stays consistent — out of scope for now.
//
// Boundary kept identical to the pre-W3 hook
// ──────────────────────────────────────────
//   { data, singleToken, quoteLoading, isQuoteEnabled, isDirectRoute,
//     refreshQuotes, quoteFallbackPlan }
//
// `data` and `singleToken` produce the shape consumers already use:
//   { amounts: bigint[], path: string[], adapters: string[], gasEstimate? }
//
// What's actually gone vs pre-W3
// ──────────────────────────────
//   • The 6 useReadContract calls (primary + 2 fallback × 2 quote types)
//   • All explicit fallback-hop-step plumbing — the SDK's internal
//     `findBestPathPreferAcyclic` already does cycle-detection + step-down
//     fallback, replacing our manual primary/fallback/fallbackOne tiers.
//   • The `routerABI` return (was never consumed by Emp.jsx anyway).
//
// What stays
// ──────────
//   • `quoteFallbackPlan` retained as a shape for backward-compat — now
//     reports `{ enabled: false }` since the SDK handles fallback internally.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useEmpxRouter } from "./useEmpxRouter";
import { convertToBigInt } from "../../utils/utils";
import { EMPTY_ADDRESS } from "../../utils/contractCalls";

const normalizeAddress = (address) => address?.toLowerCase?.() || "";
const isSameAddress = (a, b) => normalizeAddress(a) === normalizeAddress(b);

/**
 * Normalise the SDK's PathResult into the wagmi-compatible shape Emp.jsx
 * already consumes.  PathResult fields are strings (from JSON-RPC); we
 * promote `amounts` to bigint for callers that do BigInt math on them.
 */
function normalizePathResult(result) {
  if (!result) return null;
  const amounts = Array.isArray(result.amounts) ? result.amounts : null;
  const path = Array.isArray(result.path) ? result.path : null;
  const adapters = Array.isArray(result.adapters) ? result.adapters : null;
  if (!amounts || !path || amounts.length < 2 || path.length < 2) return null;
  return {
    amounts: amounts.map((a) => (typeof a === "bigint" ? a : BigInt(a))),
    path,
    adapters: adapters ?? [],
    gasEstimate: result.gasEstimate ?? "0",
  };
}

/**
 * @param {Object} input
 * @returns same shape as the pre-W3 hook
 */
export function useSwapQuoteFetch({
  chainId,
  routerAddress,     // kept for shape compat; SDK reads from chain config
  wethAddress,       // ditto
  maxHops,
  selectedTokenA,
  selectedTokenB,
  debouncedAmountIn,
}) {
  // SDK router (memoised on chainId+signer in useEmpxRouter).  When router
  // is null (unknown chain / signer not ready), the hook returns no data.
  const { router } = useEmpxRouter();

  const [data, setData] = useState(undefined);
  const [singleToken, setSingleToken] = useState(undefined);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // ─── Direct-route check (native↔wrapped wrap/unwrap path) ────────────────
  // Same logic as pre-W3.  We bypass the SDK quote for these since they
  // don't need pathfinding — `setDirectRoute` in Emp.jsx handles them.
  const isDirectRoute = useMemo(() => {
    const weth = wethAddress;
    return (
      (isSameAddress(selectedTokenA?.address, EMPTY_ADDRESS) &&
        isSameAddress(selectedTokenB?.address, weth)) ||
      (isSameAddress(selectedTokenA?.address, weth) &&
        isSameAddress(selectedTokenB?.address, EMPTY_ADDRESS))
    );
  }, [selectedTokenA?.address, selectedTokenB?.address, wethAddress]);

  // ─── Quote-enabled gate ──────────────────────────────────────────────────
  const isQuoteEnabled = useMemo(
    () =>
      !isDirectRoute &&
      !!selectedTokenA &&
      !!selectedTokenB &&
      !!debouncedAmountIn &&
      parseFloat(debouncedAmountIn) > 0,
    [isDirectRoute, selectedTokenA, selectedTokenB, debouncedAmountIn],
  );

  // ─── Resolve token addresses to chain-friendly form (EMPTY → wrapped) ────
  const quoteTokenInAddress = useMemo(() => {
    const a = selectedTokenA?.address;
    return isSameAddress(a, EMPTY_ADDRESS) ? (wethAddress || EMPTY_ADDRESS) : (a || EMPTY_ADDRESS);
  }, [selectedTokenA?.address, wethAddress]);
  const quoteTokenOutAddress = useMemo(() => {
    const b = selectedTokenB?.address;
    return isSameAddress(b, EMPTY_ADDRESS) ? (wethAddress || EMPTY_ADDRESS) : (b || EMPTY_ADDRESS);
  }, [selectedTokenB?.address, wethAddress]);

  const amountInWei = useMemo(() => {
    if (!debouncedAmountIn || !selectedTokenA) return 0n;
    if (isNaN(parseFloat(debouncedAmountIn))) return 0n;
    return convertToBigInt(
      debouncedAmountIn,
      parseInt(selectedTokenA.decimal) || 18,
    );
  }, [debouncedAmountIn, selectedTokenA]);

  const singleTokenAmountInWei = useMemo(() => {
    if (!selectedTokenA?.decimal) return 0n;
    return convertToBigInt(1, parseInt(selectedTokenA.decimal));
  }, [selectedTokenA?.decimal]);

  const requestedMaxSteps = useMemo(
    () => Number(maxHops?.toString?.() || "3") || 3,
    [maxHops],
  );

  // ─── Refresh tick — bumping this re-runs the effects ─────────────────────
  const [refreshTick, setRefreshTick] = useState(0);

  // Inflight-cancel guard so a stale response from an earlier input can't
  // overwrite a fresher response.  Same pattern as TanStack Query's
  // request-id check at lower level.
  const inflightId = useRef(0);

  // ─── Primary quote — uses SDK's findBestPathPreferAcyclic via getTradeInfo's
  //     prefix logic.  Lifted directly: router.findBestPath() exposes the
  //     same low-level call wagmi was using.
  useEffect(() => {
    if (!isQuoteEnabled || !router) {
      setData(undefined);
      return;
    }
    const myId = ++inflightId.current;
    setQuoteLoading(true);
    router
      .findBestPath(
        amountInWei,
        quoteTokenInAddress,
        quoteTokenOutAddress,
        requestedMaxSteps,
      )
      .then((result) => {
        if (myId !== inflightId.current) return; // superseded
        const normalised = normalizePathResult(result);
        setData(normalised ?? undefined);
      })
      .catch(() => {
        if (myId !== inflightId.current) return;
        setData(undefined);
      })
      .finally(() => {
        if (myId === inflightId.current) setQuoteLoading(false);
      });
  }, [
    router,
    isQuoteEnabled,
    amountInWei,
    quoteTokenInAddress,
    quoteTokenOutAddress,
    requestedMaxSteps,
    refreshTick,
  ]);

  // ─── Single-token spot rate (for the "1 X = Y Z" display) ────────────────
  const singleTokenEnabled =
    !isDirectRoute && !!selectedTokenA && !!selectedTokenB && !!router;

  useEffect(() => {
    if (!singleTokenEnabled) {
      setSingleToken(undefined);
      return;
    }
    let cancelled = false;
    router
      .findBestPath(
        singleTokenAmountInWei,
        quoteTokenInAddress,
        quoteTokenOutAddress,
        requestedMaxSteps,
      )
      .then((result) => {
        if (cancelled) return;
        setSingleToken(normalizePathResult(result) ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setSingleToken(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [
    router,
    singleTokenEnabled,
    singleTokenAmountInWei,
    quoteTokenInAddress,
    quoteTokenOutAddress,
    requestedMaxSteps,
    refreshTick,
  ]);

  // ─── Refresh helper — bumps refreshTick → effects re-run ─────────────────
  const refreshQuotes = useCallback(async () => {
    setRefreshTick((t) => t + 1);
    // Resolve immediately — the actual refetch happens via effect.  Caller
    // can await this without blocking; the new quote arrives via state.
    return Promise.resolve();
  }, []);

  return {
    data,
    singleToken,
    quoteLoading,
    isQuoteEnabled,
    isDirectRoute,
    refreshQuotes,
    // Kept for shape compat with the pre-W3 hook; SDK handles fallback
    // internally so we no longer expose an external plan.
    quoteFallbackPlan: { enabled: false, secondStep: null, thirdStep: null },
  };
}
