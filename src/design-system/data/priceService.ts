// ─── DefiLlama price service ──────────────────────────────────────────────
//
// Browser-callable USD price source.  Independent of the cross-bridge VPS
// — works even before NativeUsdOracle is deployed.  Verified 2026-06-08:
//
//   GET https://coins.llama.fi/prices/current/{slug}:{address},{slug}:{address},...
//   →  { coins: { "ethereum:0xA0b8...": { symbol, decimals, price, timestamp, confidence } } }
//
// Free.  No API key.  No rate-limit headers exposed but DefiLlama documents
// the public endpoint as fair-use.  Coalesces concurrent reads + caches in
// memory + localStorage with TTL so the page doesn't spam the CDN.
//
// When the cross-bridge VPS exposes its own /api/oracle/* endpoint, swap
// the implementation of fetchPrices() — the API surface (getTokenPrice,
// getTokenPrices, useTokenPrice) stays unchanged for the pages.

import { useEffect, useState } from "react";
import { TRUSTWALLET_CHAIN_SLUGS, getTokenAddress } from "./logoRegistry";

const ENDPOINT = "https://coins.llama.fi/prices/current";
const STORAGE_KEY = "empx:priceCache:v1";
const TTL_MS = 5 * 60 * 1000;         // 5 min — matches NativeUsdOracle default

// DefiLlama uses different chain slugs than TrustWallet — but for the chains
// where they overlap (the 7 in TRUSTWALLET_CHAIN_SLUGS) the slugs match.
// Slugs needed: ethereum, arbitrum, base, optimism, polygon, bsc, avax.
const LLAMA_CHAIN_SLUGS: Record<number, string> = {
  1:     "ethereum",
  42161: "arbitrum",
  8453:  "base",
  10:    "optimism",
  137:   "polygon",
  56:    "bsc",
  43114: "avax",
};

interface CacheEntry { price: number; fetchedAt: number }

let _cache: Record<string, CacheEntry> | null = null;
const _inflight = new Map<string, Promise<number | null>>();

function loadCache(): Record<string, CacheEntry> {
  if (_cache) return _cache;
  if (typeof window === "undefined") return (_cache = {});
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return (_cache = {});
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    const fresh: Record<string, CacheEntry> = {};
    for (const k in parsed) {
      if (parsed[k] && now - parsed[k].fetchedAt < TTL_MS) fresh[k] = parsed[k];
    }
    return (_cache = fresh);
  } catch {
    return (_cache = {});
  }
}

function flushCache(): void {
  if (!_cache || typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); } catch { /* noop */ }
}

function cacheKey(chainId: number, ticker: string, tokenAddress?: string): string {
  return tokenAddress
    ? `${chainId}:${tokenAddress.toLowerCase()}`
    : `${chainId}:${ticker.toUpperCase()}`;
}

/**
 * Synchronous read from cache.  Returns null when the price isn't cached
 * yet — caller should kick off an async fetch with getTokenPrice().
 */
export function getCachedPrice(
  chainId: number,
  ticker: string,
  tokenAddress?: string,
): number | null {
  const c = loadCache();
  return c[cacheKey(chainId, ticker, tokenAddress)]?.price ?? null;
}

/**
 * Async fetch.  Returns the live USD price or null on miss / network error.
 * Caches the result with a 5-min TTL.  Concurrent calls for the same
 * key coalesce into one HTTP request.
 */
export async function getTokenPrice(
  chainId: number,
  ticker: string,
  tokenAddress?: string,
): Promise<number | null> {
  const key = cacheKey(chainId, ticker, tokenAddress);

  // Cache hit
  const cached = getCachedPrice(chainId, ticker, tokenAddress);
  if (cached != null) return cached;

  // In-flight dedupe
  if (_inflight.has(key)) return _inflight.get(key)!;

  const slug = LLAMA_CHAIN_SLUGS[chainId];
  const addr = tokenAddress || getTokenAddress(chainId, ticker);
  if (!slug || !addr) return null;

  const p = (async () => {
    try {
      const r = await fetch(`${ENDPOINT}/${slug}:${addr.toLowerCase()}`);
      if (!r.ok) return null;
      const data = await r.json() as { coins?: Record<string, { price?: number }> };
      const coin = data.coins?.[`${slug}:${addr.toLowerCase()}`];
      const price = coin?.price;
      if (typeof price !== "number") return null;
      const c = loadCache();
      c[key] = { price, fetchedAt: Date.now() };
      flushCache();
      return price;
    } catch {
      return null;
    } finally {
      _inflight.delete(key);
    }
  })();
  _inflight.set(key, p);
  return p;
}

/**
 * Batch fetch — useful for the cross page where we have many tokens at once.
 * One HTTP call for all uncached keys.
 */
export async function getTokenPrices(
  pairs: { chainId: number; ticker: string }[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const need: { slug: string; addr: string; key: string }[] = [];

  for (const { chainId, ticker } of pairs) {
    const key = cacheKey(chainId, ticker);
    const cached = getCachedPrice(chainId, ticker);
    if (cached != null) {
      out[key] = cached;
      continue;
    }
    const slug = LLAMA_CHAIN_SLUGS[chainId];
    const addr = getTokenAddress(chainId, ticker);
    if (slug && addr) need.push({ slug, addr: addr.toLowerCase(), key });
  }

  if (need.length === 0) return out;

  try {
    const coinParam = need.map((n) => `${n.slug}:${n.addr}`).join(",");
    const r = await fetch(`${ENDPOINT}/${coinParam}`);
    if (!r.ok) return out;
    const data = await r.json() as { coins?: Record<string, { price?: number }> };
    const c = loadCache();
    for (const n of need) {
      const coin = data.coins?.[`${n.slug}:${n.addr}`];
      const price = coin?.price;
      if (typeof price === "number") {
        c[n.key] = { price, fetchedAt: Date.now() };
        out[n.key] = price;
      }
    }
    flushCache();
  } catch {
    /* swallow; out[] contains only cached hits */
  }
  return out;
}

/**
 * React hook — returns the latest USD price for (chainId, ticker).  Returns
 * the cached value synchronously when available, then refreshes async.
 * Returns null when the (chain, token) isn't covered by DefiLlama yet.
 */
export function useTokenPrice(
  chainId: number | undefined,
  ticker: string | undefined,
  tokenAddress?: string,
): number | null {
  const initial = chainId != null && ticker
    ? getCachedPrice(chainId, ticker, tokenAddress)
    : null;
  const [price, setPrice] = useState<number | null>(initial);

  useEffect(() => {
    if (chainId == null || !ticker) { setPrice(null); return; }
    // Re-sync with cache on identity change
    setPrice(getCachedPrice(chainId, ticker, tokenAddress));
    let cancelled = false;
    getTokenPrice(chainId, ticker, tokenAddress).then((p) => {
      if (!cancelled && p != null) setPrice(p);
    });
    return () => { cancelled = true; };
  }, [chainId, ticker, tokenAddress]);

  return price;
}

/** Useful for diagnostics / admin. */
export function priceCacheSize(): number {
  return Object.keys(loadCache()).length;
}

// Suppress unused-var lint while keeping TRUSTWALLET_CHAIN_SLUGS imported
// for adjacent files that share this module's identity.
void TRUSTWALLET_CHAIN_SLUGS;
