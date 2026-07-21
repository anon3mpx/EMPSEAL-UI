// ─── Acknowledged-tokens persistence ──────────────────────────────────────────
//
// Tracks which (chainId, tokenAddress) pairs the user has acknowledged via
// the FirstTimeTokenWarning modal.  Persisted to localStorage so the warning
// fires ONCE per token per browser, not every swap.
//
// Storage key: 'empx.safety.acknowledgedTokens'
// Shape:  { [chainId]: { [tokenAddress.toLowerCase()]: { ackedAt: number } } }

const STORAGE_KEY = "empx.safety.acknowledgedTokens";
const STORAGE_VERSION = 1;

interface AckEntry {
  ackedAt: number;
}

interface AckStore {
  v: number;
  chains: Record<string, Record<string, AckEntry>>;
}

function readStore(): AckStore {
  if (typeof window === "undefined") return { v: STORAGE_VERSION, chains: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: STORAGE_VERSION, chains: {} };
    const parsed = JSON.parse(raw) as AckStore;
    if (parsed?.v !== STORAGE_VERSION) {
      // Schema bump in the future — reset.  Safer than blindly migrating;
      // users re-acknowledge each unverified token, which is the safer
      // default direction anyway.
      return { v: STORAGE_VERSION, chains: {} };
    }
    return parsed;
  } catch {
    return { v: STORAGE_VERSION, chains: {} };
  }
}

function writeStore(store: AckStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage quota exhausted or disabled — silently degrade.  The
    // worst-case is the user sees the warning every time, which is the
    // safer-default direction.
  }
}

/** True when the user has already acknowledged this (chainId, token) pair. */
export function isTokenAcknowledged(
  chainId: number | string | undefined,
  tokenAddress: string | undefined,
): boolean {
  if (chainId === undefined || !tokenAddress) return false;
  const chainKey = String(chainId);
  const tokenKey = tokenAddress.toLowerCase();
  const store = readStore();
  return Boolean(store.chains?.[chainKey]?.[tokenKey]);
}

/** Mark a (chainId, token) pair as acknowledged.  Idempotent. */
export function acknowledgeToken(
  chainId: number | string,
  tokenAddress: string,
): void {
  if (!chainId || !tokenAddress) return;
  const chainKey = String(chainId);
  const tokenKey = tokenAddress.toLowerCase();
  const store = readStore();
  store.chains = store.chains ?? {};
  store.chains[chainKey] = store.chains[chainKey] ?? {};
  store.chains[chainKey][tokenKey] = { ackedAt: Date.now() };
  writeStore(store);
}

/** Operator surface — clear all acknowledgements (for support/debug). */
export function resetAcknowledgements(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Snapshot for /admin or debug surfaces. */
export function snapshotAcknowledgements(): AckStore {
  return readStore();
}
