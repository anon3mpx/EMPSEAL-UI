// ─── EmpX logo registry ────────────────────────────────────────────────────
//
// Candidate resolution for chain + token logos. Rendering belongs to
// TokenLogo / ChainLogo / ResolvedLogo; this module only builds ordered
// safe URLs and remembers load success/failure.
//
// Sources:
//   • LOCAL    → /public/icons (preferred when present)
//   • CONFIG   → caller-supplied https / root-relative image URLs
//   • CHAINS   → https://icons.llamao.fi/icons/chains/rsz_{slug}.jpg
//   • TOKENS   → Trust Wallet public repo (checksum-cased address path)
//
// Cache identity is the normalized URL. Success lasts 30 days; failure
// lasts 1 hour so broken remotes can recover.

import { getAddress, isAddress, zeroAddress } from "viem";

const STORAGE_KEY = "empx:logoRegistry:v2";
const LEGACY_STORAGE_KEY = "empx:logoRegistry:v1";
const SUCCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 60 * 1000;

const HTTPS_UPGRADE_HOSTS = new Set([
  "api-assets.rubic.exchange",
  "assets.rubic.exchange",
]);

export interface TokenLogoIdentity {
  chainId?: number;
  ticker: string;
  address?: string;
  configuredUrl?: string;
  isNative?: boolean;
}

interface CacheEntry {
  status: "ok" | "fail";
  checkedAt: number;
}

const LOCAL_CHAIN_LOGOS: Record<number, string> = {
  1: "/icons/eth.svg",
  10: "/icons/op.svg",
  56: "/icons/binance.svg",
  137: "/icons/polygon.svg",
  146: "/icons/sonic.png",
  369: "/icons/pls.svg",
  8453: "/icons/base.svg",
  42161: "/icons/arbitrum.svg",
  43114: "/icons/avalanche.svg",
  80094: "/icons/berachain.svg",
};

const LOCAL_TOKEN_LOGOS: Record<string, string> = {
  ETH: "/icons/eth1.svg",
  USDC: "/icons/usdc.svg",
  USDT: "/icons/usdt.svg",
  DAI: "/icons/dai.svg",
  PLS: "/icons/pls.svg",
  WPLS: "/icons/pls.svg",
  PLSX: "/icons/plsx.svg",
  HOA: "/icons/hoa.svg",
};

// Chain-ID → DefiLlama slug. Kept separate from native tickers so ETH-native
// L2s never share Ethereum artwork.
const CHAIN_ID_DEFILLAMA_SLUGS: Record<number, string> = {
  0: "bitcoin",
  1: "ethereum",
  10: "optimism",
  30: "rootstock",
  56: "binance",
  98: "dogecoin",
  99: "solana",
  100: "litecoin",
  101: "bitcoin-cash",
  102: "cosmos",
  103: "polkadot",
  104: "kujira",
  105: "dash",
  106: "zcash",
  130: "unichain",
  137: "polygon",
  143: "monad",
  146: "sonic",
  369: "pulsechain",
  480: "wc",
  999: "hyperliquid",
  1329: "sei",
  8453: "base",
  10001: "ethereumpow",
  42161: "arbitrum",
  43114: "avalanche",
  57073: "ink",
  59144: "linea",
  80094: "berachain",
  98866: "plume",
};

// ─── Legacy ticker → DefiLlama slug map (Ramp / existing consumers) ───────
// Maps our internal chain symbol → the slug DefiLlama uses in URLs.
// New chain artwork must go through CHAIN_ID_DEFILLAMA_SLUGS instead.

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

export function chainLogoUrl(symbol: string): string | null {
  const slug = CHAIN_SLUGS[symbol.toUpperCase()];
  if (!slug) return null;
  return defillamaChainUrl(slug);
}

export function tokenLogoUrlByAddress(chainSlug: string, checksumAddress: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainSlug}/assets/${checksumAddress}/logo.png`;
}

export const TRUSTWALLET_CHAIN_SLUGS: Record<number, string> = {
  1:     "ethereum",
  56:    "smartchain",
  137:   "polygon",
  42161: "arbitrum",
  8453:  "base",
  10:    "optimism",
  43114: "avalanchec",
};

export const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  1: {
    USDC: "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  42161: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    ARB:  "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
  8453: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    cbBTC:"0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  },
  10: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WETH: "0x4200000000000000000000000000000000000006",
    OP:   "0x4200000000000000000000000000000000000042",
  },
  137: {
    USDC:  "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    WETH:  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    POL:   "0x0000000000000000000000000000000000001010",
  },
  56: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    BNB:  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  },
  43114: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    AVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  },
  369: {
    USDC: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07",
    HEX:  "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    WPLS: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    PLSX: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
  },
};

export function getTokenAddress(chainId: number, ticker: string): string | null {
  return TOKEN_ADDRESSES[chainId]?.[ticker.toUpperCase()] ?? null;
}

export function tokenLogoUrl(chainId: number, ticker: string): string | null {
  const slug = TRUSTWALLET_CHAIN_SLUGS[chainId];
  if (!slug) return null;
  const addr = getTokenAddress(chainId, ticker);
  if (!addr) return null;
  return tokenLogoUrlByAddress(slug, addr);
}

function defillamaChainUrl(slug: string): string {
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function normalizeLogoUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol === "https:") return parsed.href;
  if (parsed.protocol === "http:" && HTTPS_UPGRADE_HOSTS.has(parsed.hostname.toLowerCase())) {
    parsed.protocol = "https:";
    return parsed.href;
  }
  return null;
}

export function chainLogoCandidates(chainId?: number, symbol?: string): string[] {
  if (chainId == null) {
    const legacy = symbol ? chainLogoUrl(symbol) : null;
    return legacy ? [legacy] : [];
  }
  const candidates: string[] = [];
  const local = LOCAL_CHAIN_LOGOS[chainId];
  if (local) candidates.push(local);
  const slug = CHAIN_ID_DEFILLAMA_SLUGS[chainId];
  if (slug) candidates.push(defillamaChainUrl(slug));
  return dedupe(candidates);
}

function trustWalletTokenUrl(chainId: number | undefined, address: string | undefined): string | null {
  if (chainId == null || !address) return null;
  const slug = TRUSTWALLET_CHAIN_SLUGS[chainId];
  if (!slug) return null;
  if (!isAddress(address)) return null;
  const checksum = getAddress(address);
  if (checksum.toLowerCase() === zeroAddress) return null;
  return tokenLogoUrlByAddress(slug, checksum);
}

export function tokenLogoCandidates(identity: TokenLogoIdentity): string[] {
  const ticker = identity.ticker.trim().toUpperCase();
  const local = LOCAL_TOKEN_LOGOS[ticker];
  const configured = normalizeLogoUrl(identity.configuredUrl);
  const fromAddress = trustWalletTokenUrl(identity.chainId, identity.address);

  const candidates = identity.isNative
    ? [local, configured, fromAddress]
    : [configured, fromAddress, local];

  return dedupe(candidates.filter((candidate): candidate is string => Boolean(candidate)));
}

// ─── Cache layer (localStorage, lazy-hydrate) ──────────────────────────────

let _cache: Record<string, CacheEntry> | null = null;

function ttlFor(status: CacheEntry["status"]): number {
  return status === "ok" ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
}

function isFresh(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.checkedAt < ttlFor(entry.status);
}

function loadCache(): Record<string, CacheEntry> {
  if (_cache) return _cache;
  if (typeof window === "undefined") return (_cache = {});
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return (_cache = {});
    }
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    const fresh: Record<string, CacheEntry> = {};
    for (const key of Object.keys(parsed)) {
      const entry = parsed[key];
      if (entry?.status && typeof entry.checkedAt === "number" && isFresh(entry, now)) {
        fresh[key] = entry;
      }
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

export function getCachedLogoStatus(url: string): "ok" | "fail" | null {
  const normalized = normalizeLogoUrl(url) ?? url.trim();
  if (!normalized) return null;
  const entry = loadCache()[normalized];
  if (!entry) return null;
  if (!isFresh(entry)) {
    delete loadCache()[normalized];
    flushCache();
    return null;
  }
  return entry.status;
}

export function setCachedLogoStatus(url: string, status: "ok" | "fail"): void {
  const normalized = normalizeLogoUrl(url) ?? url.trim();
  if (!normalized) return;
  const cache = loadCache();
  cache[normalized] = { status, checkedAt: Date.now() };
  flushCache();
}

export function resetLogoRegistryCache(): void {
  _cache = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* storage disabled */
  }
}

/** Legacy cache lookup used by TokenLogo/ChainLogo until they switch to URL keys. */
export function getCachedLogo(key: string): { url: string; ok: boolean; fetchedAt: number } | null {
  const status = getCachedLogoStatus(key);
  if (!status) return null;
  const entry = loadCache()[normalizeLogoUrl(key) ?? key.trim()];
  if (!entry) return null;
  return { url: key, ok: status === "ok", fetchedAt: entry.checkedAt };
}

export function setCachedLogo(key: string, url: string, ok: boolean): void {
  setCachedLogoStatus(url || key, ok ? "ok" : "fail");
}

export function cacheSize(): number {
  return Object.keys(loadCache()).length;
}
