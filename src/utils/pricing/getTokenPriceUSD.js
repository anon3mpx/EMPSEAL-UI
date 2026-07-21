// ─── Hybrid USD price fetcher: SDK-first, DexScreener fallback ───────────────
//
// W4 of SDK wiring (post-CHECKPOINT-v6).  Tries empx-swap-sdk's
// `router.getTokenPriceUSD()` first (on-chain stablecoin-routed price);
// falls back to DexScreener if the SDK can't price the token.
//
// Why hybrid rather than full replacement
// ───────────────────────────────────────
//   • SDK price is on-chain, deterministic, and free — better signal for
//     the 14 chains the SDK supports.
//   • DexScreener has broader coverage (aggregated across many DEXes +
//     thinner chains) so it picks up tokens the SDK can't route to USDC.
//   • Falling back preserves the existing UX: no chain or token is left
//     pricing-less just because the SDK doesn't reach it yet.
//   • Saves DexScreener API quota on the chains we DO cover — every SDK
//     hit means one fewer external API call.
//
// The router argument is OPTIONAL.  When undefined / null (e.g. user
// disconnected, or chain unsupported by SDK), we go straight to DexScreener.
//
// SDK-side reference: empx-swap-sdk/src/router.ts → getTokenPriceUSD()
// DexScreener fallback: existing utils/priceFetcher.js (unchanged)

import { fetchTokenPrice as fetchTokenPriceDexscreener } from "../priceFetcher";

/**
 * @param {Object} args
 * @param {Object|null} args.router  - SDK router instance from useEmpxRouter()
 * @param {string|undefined} args.symbol - chain symbol (passed to DexScreener fallback)
 * @param {string|undefined} args.address - ERC-20 token address (or wrapped-native for native tokens)
 * @returns {Promise<number|null>}  - USD price, or null when neither source has it
 */
export async function getTokenPriceUSD({ router, symbol, address }) {
  if (!address) return null;

  // ── Try SDK first ─────────────────────────────────────────────────────
  // router may be null when:
  //   • User is disconnected
  //   • Chain isn't in the SDK's registry
  //   • Signer is still loading
  if (router && typeof router.getTokenPriceUSD === "function") {
    try {
      const sdkPrice = await router.getTokenPriceUSD(address);
      if (typeof sdkPrice === "number" && Number.isFinite(sdkPrice) && sdkPrice > 0) {
        return sdkPrice;
      }
      // If the SDK returns 0 / NaN / non-number, treat as no-price and fall through.
    } catch {
      // SDK error (no stablecoin pool, RPC hiccup, etc.) — fall through.
    }
  }

  // ── DexScreener fallback ──────────────────────────────────────────────
  try {
    const dexPrice = await fetchTokenPriceDexscreener(symbol, address);
    if (typeof dexPrice === "number" && Number.isFinite(dexPrice) && dexPrice > 0) {
      return dexPrice;
    }
    return null;
  } catch {
    return null;
  }
}
