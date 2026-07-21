// ─── EmpX logo registry ────────────────────────────────────────────────────
//
// One growing source of truth for chain + token + rail logos.
//
// Sources (verified 2026-06):
//   • CHAINS   → https://icons.llamao.fi/icons/chains/rsz_{slug}.jpg
//                DefiLlama's CDN.  Predictable URL pattern, no API call needed.
//   • TOKENS   → https://raw.githubusercontent.com/trustwallet/assets/master/
//                blockchains/{chain}/assets/{EIP55_address}/logo.png
//                Trust Wallet public repo.  Case-sensitive — must use
//                checksum-cased address.
//   • RAILS    → curated local /public/rails/{slug}.svg (no public CDN
//                ships official rail logos consistently)
//
// CACHE: a small localStorage map stores per-key { url, ok, fetchedAt }.
// On first <ChainLogo /> mount we hydrate the cache.  On first failed
// image load we mark ok:false and never try that URL again in the session,
// avoiding broken-icon flicker on subsequent renders.
//
// The collection grows naturally — every successful first-load gets cached
// with timestamp.  No build-time prefetch, no manifest commit required.

const STORAGE_KEY = "empx:logoRegistry:v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── DefiLlama chain slug map ─────────────────────────────────────────────
// Maps our internal chain symbol → the slug DefiLlama uses in URLs.
// When a chain isn't in this map, ChainLogo falls back to the letter-pill.

export const CHAIN_SLUGS: Record<string, string> = {
  ETH:   "ethereum",
  ARB:   "arbitrum",
  BASE:  "base",
  OP:    "optimism",
  POL:   "polygon",
  BSC:   "binance",
  AVAX:  "avalanche",
  RSK:   "rootstock",
  SEI:   "sei",
  SONIC: "sonic",
  BERA:  "berachain",
  MON:   "monad",
  HYPE:  "hyperliquid",
  PLS:   "pulsechain",
  ETHW:  "ethereumpow",
  // Non-EVM
  BTC:   "bitcoin",
  SOL:   "solana",
  DOGE:  "dogecoin",
  LTC:   "litecoin",
  BCH:   "bitcoin-cash",
  TRX:   "tron",
  ATOM:  "cosmos",
  ADA:   "cardano",
  XRP:   "xrp",
  TON:   "ton",
  APT:   "aptos",
  SUI:   "sui",
  NEAR:  "near",
  XMR:   "monero",
};

// ─── URL builders ──────────────────────────────────────────────────────────

export function chainLogoUrl(symbol: string): string | null {
  const slug = CHAIN_SLUGS[symbol.toUpperCase()];
  if (!slug) return null;
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

export function tokenLogoUrlByAddress(chainSlug: string, checksumAddress: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainSlug}/assets/${checksumAddress}/logo.png`;
}

// ─── TrustWallet chain slug map ───────────────────────────────────────────
// TrustWallet uses DIFFERENT slugs than DefiLlama (BSC = "smartchain", not
// "binance"; Avalanche = "avalanchec", not "avalanche").  Only chains
// covered by TrustWallet's assets repo land token logos via this CDN.
// Chains absent here gracefully fall back to ticker pill in <TokenLogo />.

export const TRUSTWALLET_CHAIN_SLUGS: Record<number, string> = {
  1:     "ethereum",
  56:    "smartchain",
  137:   "polygon",
  42161: "arbitrum",
  8453:  "base",
  10:    "optimism",
  43114: "avalanchec",
  // No TrustWallet coverage for: PulseChain (369), Sonic (146), Sei (1329),
  // Berachain (80094), Monad (143), HyperEVM (999), Rootstock (30),
  // EthereumPOW (10001).  TokenLogo falls back to ticker pill on these.
};

// ─── Token address registry — starter set ─────────────────────────────────
// Per-chain canonical token addresses.  Adding a chain = adding a row here;
// the logo resolver picks up logos via TrustWallet's predictable URL.
//
// Addresses sourced from:
//   • empx-cross-bridge/src/vps/config/routeMetadata.ts (where verified)
//   • Circle's official USDC docs (for chains where SDK doesn't have it yet)
//   • Tether's official USDT deploy list
//   • WETH canonical bridge addresses (chain documentation)
//
// EIP-55 checksum casing is REQUIRED — TrustWallet's repo paths are case-sensitive.

export const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  // Ethereum mainnet
  1: {
    USDC: "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  // Arbitrum (USDC verified from SDK routeMetadata.ts:72)
  42161: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    ARB:  "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
  // Base (USDC verified from SDK routeMetadata.ts:40)
  8453: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    cbBTC:"0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  },
  // Optimism (USDC verified from SDK routeMetadata.ts:116)
  10: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WETH: "0x4200000000000000000000000000000000000006",
    OP:   "0x4200000000000000000000000000000000000042",
  },
  // Polygon
  137: {
    USDC:  "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    WETH:  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    POL:   "0x0000000000000000000000000000000000001010",
  },
  // BSC
  56: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    BNB:  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  },
  // Avalanche
  43114: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    AVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  },
  // PulseChain (no TrustWallet coverage — entries here serve other lookups)
  369: {
    USDC: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07",
    HEX:  "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    PLSX: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
  },
};

/**
 * Resolve a checksum address for a ticker on a chain.  Returns null when
 * unknown — caller should fall back to the ticker pill.  Adding a chain
 * = adding an entry to TOKEN_ADDRESSES above.
 */
export function getTokenAddress(chainId: number, ticker: string): string | null {
  return TOKEN_ADDRESSES[chainId]?.[ticker.toUpperCase()] ?? null;
}

/**
 * Build the TrustWallet logo URL for a (chain, ticker) pair.  Returns null
 * when TrustWallet doesn't cover the chain OR the ticker isn't in our map.
 */
export function tokenLogoUrl(chainId: number, ticker: string): string | null {
  const slug = TRUSTWALLET_CHAIN_SLUGS[chainId];
  if (!slug) return null;
  const addr = getTokenAddress(chainId, ticker);
  if (!addr) return null;
  return tokenLogoUrlByAddress(slug, addr);
}

// ─── Cache layer (localStorage, lazy-hydrate) ──────────────────────────────

interface CacheEntry { url: string; ok: boolean; fetchedAt: number }

let _cache: Record<string, CacheEntry> | null = null;

function loadCache(): Record<string, CacheEntry> {
  if (_cache) return _cache;
  if (typeof window === "undefined") return (_cache = {});
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return (_cache = {});
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    // Prune expired
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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
  } catch {
    /* quota or storage disabled — silently degrade */
  }
}

export function getCachedLogo(key: string): CacheEntry | null {
  const c = loadCache();
  return c[key] ?? null;
}

export function setCachedLogo(key: string, url: string, ok: boolean): void {
  const c = loadCache();
  c[key] = { url, ok, fetchedAt: Date.now() };
  flushCache();
}

/** Useful for /admin or for the user to see how many logos we've collected. */
export function cacheSize(): number {
  return Object.keys(loadCache()).length;
}
