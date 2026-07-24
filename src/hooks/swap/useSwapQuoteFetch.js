// ─── useSwapQuoteFetch ───────────────────────────────────────────────────────
//
// Publishes a fast SDK single-route preview first, then upgrades it if bounded
// background split discovery finds a split route. If the fast SDK preview
// fails, the hook retries the existing local `findBestPath` contract read with
// the configured hop-reduction plan. SDK preview routes are re-prepared from
// post-approval state by useSwapExecution before any calldata is submitted.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useEmpxRouter } from "./useEmpxRouter";
import {
  prepareSplitSwapRoute,
  prepareSwapRoute,
} from "./swapRoutePreparation";
import { getQuoteHopFallbackPlan } from "../../config/quoteFallback";
import { convertToBigInt } from "../../utils/utils";
import { EMPTY_ADDRESS } from "../../utils/contractCalls";
import { readLocalSwapQuote } from "../../utils/swap/localSwapQuote";

const PREVIEW_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

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
  recipient,
  slippageBps = 50,
  pairType = "V/V",
}) {
  // SDK router (memoised on chainId+signer in useEmpxRouter).  When router
  // is null (unknown chain / signer not ready), the hook returns no data.
  const { router } = useEmpxRouter({ chainId });

  const [data, setData] = useState(undefined);
  const [preparedRoute, setPreparedRoute] = useState(undefined);
  const [quoteError, setQuoteError] = useState(undefined);
  const [singleToken, setSingleToken] = useState(undefined);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [splitQuoteLoading, setSplitQuoteLoading] = useState(false);

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
      !!selectedTokenA &&
      !!selectedTokenB &&
      !!debouncedAmountIn &&
      parseFloat(debouncedAmountIn) > 0,
    [selectedTokenA, selectedTokenB, debouncedAmountIn],
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

  const quoteFallbackPlan = useMemo(
    () => getQuoteHopFallbackPlan(chainId, BigInt(requestedMaxSteps)),
    [chainId, requestedMaxSteps],
  );

  // ─── Refresh tick — bumping this re-runs the effects ─────────────────────
  const [refreshTick, setRefreshTick] = useState(0);

  // Inflight-cancel guard so a stale response from an earlier input can't
  // overwrite a fresher response.  Same pattern as TanStack Query's
  // request-id check at lower level.
  const inflightId = useRef(0);

  // ─── Preview route — fast single first, bounded split upgrade second ──────
  useEffect(() => {
    if (!isQuoteEnabled) {
      inflightId.current += 1;
      setData(undefined);
      setPreparedRoute(undefined);
      setQuoteError(undefined);
      setQuoteLoading(false);
      setSplitQuoteLoading(false);
      return;
    }
    const myId = ++inflightId.current;
    setQuoteLoading(true);
    setSplitQuoteLoading(false);
    setQuoteError(undefined);
    setData(undefined);
    setPreparedRoute(undefined);

    const localQuote = isDirectRoute
      ? async () => ({
          amounts: [amountInWei, amountInWei],
          path: [selectedTokenA?.address, selectedTokenB?.address],
          adapters: [],
          gasEstimate: "0",
        })
      : readLocalSwapQuote;

    const preparationInput = {
      router,
      localQuote,
      fallbackPlan: quoteFallbackPlan,
      chainId,
      amountIn: amountInWei,
      tokenIn: selectedTokenA?.address || EMPTY_ADDRESS,
      tokenOut: selectedTokenB?.address || EMPTY_ADDRESS,
      localTokenIn: quoteTokenInAddress,
      localTokenOut: quoteTokenOutAddress,
      recipient: recipient || PREVIEW_RECIPIENT,
      maxSteps: requestedMaxSteps,
      slippageBps,
      pairType,
    };

    const publishRoute = (result) => {
      const quote = result.source === "sdk"
        ? result.sdkResult?.tradeInfo
        : result.quote;
      const normalised = normalizePathResult(quote);
      setPreparedRoute(result);
      setData(normalised ?? undefined);
    };

    const prepareProgressiveRoute = async () => {
      try {
        const result = await prepareSwapRoute(preparationInput);
        if (myId !== inflightId.current) return;
        // console.log("[useSwapQuoteFetch] No-split quote:", result);
        publishRoute(result);
        setQuoteLoading(false);

        if (result.source !== "sdk" || isDirectRoute) return;

        setSplitQuoteLoading(true);
        try {
          const splitResult = await prepareSplitSwapRoute(preparationInput);
          if (myId !== inflightId.current) return;
          // console.log("[useSwapQuoteFetch] Auto quote:", splitResult);
          if (splitResult.routing === "split") {
            // console.log("[useSwapQuoteFetch] Split quote:", splitResult);
            publishRoute(splitResult);
          } else {
            // console.log("[useSwapQuoteFetch] Split quote:", null);
          }
        } catch (error) {
          // console.log("[useSwapQuoteFetch] Auto/split quote failed:", error);
          // The fast single quote remains valid when optional split discovery
          // is unavailable or exceeds its bounded search window.
        } finally {
          if (myId === inflightId.current) setSplitQuoteLoading(false);
        }
      } catch (error) {
        if (myId !== inflightId.current) return;
        setData(undefined);
        setPreparedRoute(undefined);
        setQuoteError(error);
        setQuoteLoading(false);
        setSplitQuoteLoading(false);
      }
    };

    void prepareProgressiveRoute();

    return () => {
      if (myId === inflightId.current) inflightId.current += 1;
    };
  }, [
    router,
    isQuoteEnabled,
    isDirectRoute,
    amountInWei,
    chainId,
    selectedTokenA?.address,
    selectedTokenB?.address,
    quoteTokenInAddress,
    quoteTokenOutAddress,
    requestedMaxSteps,
    recipient,
    slippageBps,
    pairType,
    quoteFallbackPlan,
    refreshTick,
  ]);

  // ─── Single-token spot rate (for the "1 X = Y Z" display) ────────────────
  const singleTokenEnabled =
    !isDirectRoute &&
    !!selectedTokenA &&
    !!selectedTokenB &&
    !!router &&
    !!preparedRoute &&
    !quoteLoading &&
    !splitQuoteLoading;

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
    preparedRoute,
    quoteSource: preparedRoute?.source,
    routing: preparedRoute?.routing,
    quoteFallbackActive: preparedRoute?.source === "local",
    quoteError,
    singleToken,
    quoteLoading,
    splitQuoteLoading,
    isQuoteEnabled,
    isDirectRoute,
    refreshQuotes,
    quoteFallbackPlan,
  };
}
