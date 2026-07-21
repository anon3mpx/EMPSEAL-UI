// ─── Wallet adapter types ────────────────────────────────────────────────────
//
// Shared shape for non-EVM destination wallet adapters.  Each adapter
// connects to ONE wallet brand (e.g. Phantom, Unisat, TronLink) and
// returns the user's address.
//
// Adapters are lazy-loaded — the implementation modules are only fetched
// when the user actually clicks "Connect <Wallet>" for that chain kind.
// This keeps the main bundle ~0 KB for the adapter surface.
//
// v1 scope: address-only retrieval.  Signing flows (for Phase B non-EVM
// SOURCE work) are deferred.  When that lands, AdapterCapabilities widens
// to include `signTransaction`, `signMessage`, etc.

import type { ChainKind } from "../types";

export interface WalletAdapterError extends Error {
  code:
    | "NOT_INSTALLED"
    | "USER_REJECTED"
    | "ALREADY_CONNECTED"
    | "WRONG_NETWORK"
    | "UNKNOWN";
}

export interface ConnectResult {
  /** The address the user authorized this dApp to read.  Already validated by adapter. */
  address: string;
  /** Optional public-key string (different from address on some chains; e.g. Solana). */
  publicKey?: string;
}

export interface WalletAdapter {
  /** The address-format family this adapter serves. */
  kind: ChainKind;
  /** Wallet brand name shown in UI ("Phantom", "Unisat", "TronLink", ...). */
  brand: string;
  /** Whether the wallet's browser extension / mobile API is detected. */
  isInstalled(): boolean;
  /** URL where the user can install this wallet — shown in fallback UI when not installed. */
  installUrl: string;
  /** Optional icon URL (CDN-hosted or embedded data URI).  Falls back to letter pill in UI. */
  iconUrl?: string;
  /**
   * Request the user to authorize this dApp + return their address.
   * Throws WalletAdapterError on failure.  Caller should toast / display
   * the message; do NOT log secrets.
   */
  connect(): Promise<ConnectResult>;
  /** Best-effort disconnect.  Not all wallets support this; safe to no-op. */
  disconnect?(): Promise<void>;
}
