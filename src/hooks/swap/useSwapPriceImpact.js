// ─── useSwapPriceImpact ──────────────────────────────────────────────────────
//
// Memoised price-impact derivation for the swap page.  Combines the two
// available impact estimators (route-based and USD-based) into the single
// `priceImpactValue` used everywhere else in the UI, plus the threshold
// booleans + the user-visible message string.
//
// Estimator precedence:
//   1. usdPriceImpactValue  — preferred when both sides have USD prices
//                              (uses external price oracle data; more accurate
//                              for tokens with thin on-chain liquidity).
//   2. routePriceImpactValue — fallback (compares trade output vs. the
//                              single-token spot rate returned by the
//                              router's findBestPath).
//   3. null                  — when the quote is stale, we suppress impact
//                              display entirely rather than show a misleading
//                              number against a frozen quote.
//
// Threshold constants live in utils/swapMath:
//   HIGH_PRICE_IMPACT_WARNING_PERCENT — show warning UI
//   HIGH_PRICE_IMPACT_BLOCK_PERCENT   — disable swap button entirely
//
// One small bonus simplification this commit folds in: highImpactMessage
// was previously useState + useEffect-derived in Emp.jsx — an anti-pattern
// since the string is a pure function of inputs that already trigger re-render.
// Now just a const ternary.  Same UI, one fewer state cell.

import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  HIGH_PRICE_IMPACT_BLOCK_PERCENT,
  HIGH_PRICE_IMPACT_WARNING_PERCENT,
  calculateRoutePriceImpactPercent,
  calculateUsdPriceImpactPercent,
  formatImpactPercent,
} from "../../utils/swapMath";

/**
 * @param {Object} input
 * @param {string} input.amountIn          - user-typed sell amount (decimal string)
 * @param {string} input.amountOut         - computed buy amount (decimal string)
 * @param {unknown} input.singleToken      - 1-unit spot route blob from useSwapQuoteFetch
 * @param {Object|null} input.selectedTokenB - the buy token (needed for decimal scaling)
 * @param {string} input.usdValueTokenA    - USD value of the entire sell-side leg
 * @param {string} input.usdValueTokenB    - USD value of the entire buy-side leg
 * @param {boolean} input.isQuoteStale     - suppress impact while quote is stale
 *
 * @returns {{
 *   priceImpactValue: number|null,
 *   priceImpact: string,
 *   isHighImpactWarning: boolean,
 *   isHighImpactBlocked: boolean,
 *   highImpactMessage: string,
 * }}
 */
export function useSwapPriceImpact({
  amountIn,
  amountOut,
  singleToken,
  selectedTokenB,
  usdValueTokenA,
  usdValueTokenB,
  isQuoteStale,
}) {
  const routePriceImpactValue = useMemo(
    () =>
      calculateRoutePriceImpactPercent({
        amountIn,
        amountOut,
        singleTokenOut:
          singleToken?.amounts?.length >= 2 && selectedTokenB
            ? formatUnits(
                singleToken.amounts[singleToken.amounts.length - 1],
                parseInt(selectedTokenB.decimal),
              )
            : null,
      }),
    [amountIn, amountOut, singleToken, selectedTokenB],
  );

  const usdPriceImpactValue = useMemo(
    () =>
      calculateUsdPriceImpactPercent({
        usdValueTokenA,
        usdValueTokenB,
      }),
    [usdValueTokenA, usdValueTokenB],
  );

  const priceImpactValue = isQuoteStale
    ? null
    : usdPriceImpactValue ?? routePriceImpactValue;

  const priceImpact = formatImpactPercent(priceImpactValue);

  const isHighImpactWarning =
    priceImpactValue !== null &&
    priceImpactValue <= -HIGH_PRICE_IMPACT_WARNING_PERCENT;

  const isHighImpactBlocked =
    priceImpactValue !== null &&
    priceImpactValue <= -HIGH_PRICE_IMPACT_BLOCK_PERCENT;

  // Derived directly — previously useState + useEffect, but the string is a
  // pure function of inputs already driving re-render.  No reason to store it.
  const highImpactMessage = isHighImpactBlocked
    ? `Trade blocked. Price impact ${priceImpact}% is too high for this amount.`
    : isHighImpactWarning
      ? `High price impact detected: ${priceImpact}%. Review the route before swapping.`
      : "";

  return {
    priceImpactValue,
    priceImpact,
    isHighImpactWarning,
    isHighImpactBlocked,
    highImpactMessage,
  };
}
