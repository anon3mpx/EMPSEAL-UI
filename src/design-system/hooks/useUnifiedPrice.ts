// ─── Unified price service for V2 pages ────────────────────────────────────
//
// Priority order per V2_COMPLETION_PLAN.md Phase 1.5:
//   1. NativeUsdOracle / SDK router price (when available)
//   2. DefiLlama for covered chains (priceService.ts)
//   3. GeckoTerminal / DexScreener fallback (from legacy src/lib/api/)
//   4. null — rendered as "price unavailable" instead of fake USD values
//
// Currently wired: DefiLlama via priceService.ts. SDK and GeckoTerminal
// fallbacks can be added incrementally without changing page call sites.

import { useTokenPrice as useDefiLlamaPrice } from "../data/priceService";

/**
 * Returns the current USD price for a token on a chain, or null if unavailable.
 * Uses DefiLlama first, with extension points for SDK and GeckoTerminal.
 */
export function useUnifiedPrice(
  chainId: number | undefined,
  ticker: string | undefined,
): number | null {
  // Tier 1: DefiLlama (covers 7 of 14 chains)
  const defiLlamaPrice = useDefiLlamaPrice(chainId, ticker);

  // TODO Tier 2: SDK router.getTokenPriceUSD() when available
  // TODO Tier 3: GeckoTerminal / DexScreener from src/lib/api/

  return defiLlamaPrice;
}

/**
 * Format a USD value for display. Returns "—" for null/undefined.
 * Use this instead of `?? 1` fallbacks that show fake prices.
 */
export function formatUSD(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a token amount + USD value pair. Common pattern across all V2 pages.
 */
export function formatAmountWithUSD(
  amount: string,
  ticker: string,
  usdValue: number | null,
): string {
  if (usdValue == null) return `${amount} ${ticker}`;
  return `${amount} ${ticker} (${formatUSD(usdValue)})`;
}
