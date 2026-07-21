// ─── V2 Explorer URL resolver — sourced from canonical config ───────────────
//
// Reads explorer URLs from src/config/chains/index.ts (SUPPORTED_CHAINS)
// which is the canonical source.  Replaces hardcoded "arbiscan.io" etc.
// across all V2 pages.

import { SUPPORTED_CHAINS } from "../../config/chains";

/**
 * Strip trailing slashes and /tx/ /address/ suffixes from explorer URLs
 * found in the config, so we can append our own path.
 */
function baseExplorerUrl(chainId: number): string | null {
  const cfg = SUPPORTED_CHAINS[chainId];
  if (!cfg?.blockExplorer) return null;
  return cfg.blockExplorer
    .replace(/\/+$/, "")
    .replace(/\/(?:tx|address)$/i, "");
}

/** Build an explorer URL for a transaction hash. Returns null if chain unknown. */
export function getExplorerTxUrl(chainId: number, txHash: string): string | null {
  const base = baseExplorerUrl(chainId);
  if (!base) return null;
  return `${base}/tx/${txHash}`;
}

/** Build an explorer URL for a wallet address. Returns null if chain unknown. */
export function getExplorerAddressUrl(chainId: number, address: string): string | null {
  const base = baseExplorerUrl(chainId);
  if (!base) return null;
  return `${base}/address/${address}`;
}

/** Get the explorer display name. Returns null if unknown. */
export function getExplorerName(chainId: number): string | null {
  const cfg = SUPPORTED_CHAINS[chainId];
  return cfg?.blockExplorerName ?? null;
}

/**
 * Convenience: get explorer URL for a chain not in SUPPORTED_CHAINS (non-EVM).
 * Falls back to v2ChainView for display names where available.
 */
export function getExplorerAddressUrlFor(chain: { id: number }, address: string): string | null {
  return getExplorerAddressUrl(chain.id, address);
}
