// ─── Unified price service for V2 pages ────────────────────────────────────
//
// Priority order per V2_COMPLETION_PLAN.md Phase 1.5:
//   1. NativeUsdOracle / SDK router price (when available)
//   2. DefiLlama for covered chains (priceService.ts)
//   3. GeckoTerminal fallback (from legacy src/lib/api/)
//   4. DexScreener fallback (from legacy src/lib/api/)
//   5. null — rendered as "price unavailable" instead of fake USD values
//
// Currently wired: DefiLlama, GeckoTerminal, and DexScreener. The SDK source
// can be added incrementally without changing page call sites.

import { useEffect, useState } from "react";
import { getDexScreenerTokenPrices } from "../../lib/api/dexScreener";
import { getGeckoTerminalTokenPrices } from "../../lib/api/geckoTerminal";
import { getTokenAddress } from "../data/logoRegistry";
import { getCachedPrice, getTokenPrice } from "../data/priceService";

/**
 * Returns the current USD price for a token on a chain, or null if unavailable.
 * Uses DefiLlama first, then GeckoTerminal and DexScreener fallbacks.
 */
export function useUnifiedPrice(
  chainId: number | undefined,
  ticker: string | undefined,
  tokenAddress?: string,
): number | null {
  const resolvedTokenAddress = chainId != null && ticker
    ? tokenAddress ??
      getTokenAddress(chainId, ticker) ??
      getTokenAddress(chainId, `W${ticker}`)
    : null;
  const identity = chainId != null && ticker && resolvedTokenAddress
    ? `${chainId}:${resolvedTokenAddress.toLowerCase()}`
    : null;
  const cachedPrice = chainId != null && ticker
    ? getCachedPrice(chainId, ticker, resolvedTokenAddress ?? undefined)
    : null;
  const [resolved, setResolved] = useState<{
    identity: string | null;
    price: number | null;
  }>({ identity: null, price: null });

  useEffect(() => {
    if (!identity || chainId == null || !ticker || !resolvedTokenAddress) {
      return;
    }

    let cancelled = false;
    setResolved({ identity, price: cachedPrice });

    const token = {
      id: identity,
      address: resolvedTokenAddress,
      chainId,
    };

    void (async () => {
      const defiLlamaPrice = await getTokenPrice(
        chainId,
        ticker,
        resolvedTokenAddress,
      );
      if (defiLlamaPrice != null) {
        if (!cancelled) setResolved({ identity, price: defiLlamaPrice });
        return;
      }

      const geckoTerminalPrices = await getGeckoTerminalTokenPrices([token]);
      const geckoTerminalPrice = geckoTerminalPrices[identity]?.price;
      if (geckoTerminalPrice != null) {
        if (!cancelled) setResolved({ identity, price: geckoTerminalPrice });
        return;
      }

      const dexScreenerPrices = await getDexScreenerTokenPrices([token]);
      if (!cancelled) {
        setResolved({
          identity,
          price: dexScreenerPrices[identity]?.price ?? null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cachedPrice, chainId, identity, resolvedTokenAddress, ticker]);

  // TODO priority 1: SDK router.getTokenPriceUSD() when available.

  return resolved.identity === identity ? resolved.price : cachedPrice;
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
