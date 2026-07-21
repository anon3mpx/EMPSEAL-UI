// ─── Bitcoin wallet adapters: Unisat + Phantom-BTC ───────────────────────────
//
// Two adapters for the same chain kind, listed in preference order:
//
//   1. Unisat   — largest BTC-extension share, native Taproot + Runes support
//   2. Phantom  — Phantom now ships BTC support via window.phantom.bitcoin
//                 (added 2024); zero second-wallet-install for Phantom users
//
// Skipped for v1:
//   • Xverse  — uses sats-connect npm package (~50KB), heavier integration
//   • OKX     — window.okxwallet.bitcoin; future addition
//   • Hiro    — window.btc, future
//
// Unisat provider API (per docs.unisat.io):
//   window.unisat.requestAccounts(): Promise<string[]>
//   window.unisat.getAccounts(): Promise<string[]>
//   window.unisat.getNetwork(): Promise<'livenet' | 'testnet'>
//   window.unisat.getPublicKey(): Promise<string>
//   (No promise-based disconnect — users disconnect via the extension UI.)
//
// Phantom BTC provider:
//   window.phantom.bitcoin.requestAccounts(): Promise<Array<{ address, ... }>>
//   The response is an array of accounts (Phantom supports multiple BTC
//   address types per account: P2WPKH, P2TR/Taproot, etc.); we pick the
//   first non-ordinals payment address.

import type { WalletAdapter, ConnectResult, WalletAdapterError } from "../types";

function wrapError(
  code: WalletAdapterError["code"],
  message: string,
  cause?: unknown,
): WalletAdapterError {
  const err = new Error(message) as WalletAdapterError;
  err.code = code;
  if (cause !== undefined) {
    (err as unknown as { cause?: unknown }).cause = cause;
  }
  return err;
}

// ─── Unisat ─────────────────────────────────────────────────────────────────
interface UnisatProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts?(): Promise<string[]>;
  getNetwork?(): Promise<string>;
}
interface UnisatWindow {
  unisat?: UnisatProvider;
}

function getUnisatProvider(): UnisatProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as UnisatWindow).unisat ?? null;
}

const unisatAdapter: WalletAdapter = {
  kind: "bitcoin",
  brand: "Unisat",
  installUrl: "https://unisat.io/download",
  isInstalled() {
    return getUnisatProvider() !== null;
  },
  async connect(): Promise<ConnectResult> {
    const provider = getUnisatProvider();
    if (!provider) {
      throw wrapError(
        "NOT_INSTALLED",
        "Unisat isn't installed.  Install from unisat.io/download and reload.",
      );
    }
    try {
      const accounts = await provider.requestAccounts();
      const address = accounts?.[0];
      if (!address) {
        throw wrapError("UNKNOWN", "Unisat returned no accounts");
      }
      // Network sanity check — if user is on testnet, the address starts
      // with 'tb1' / 'm' / 'n' / '2' and our BTC validator will reject it.
      // We don't switch networks for the user (security/UX choice — they
      // do that in their wallet UI); they'll see the invalid badge.
      try {
        const network = await provider.getNetwork?.();
        if (network && network !== "livenet" && network !== "mainnet") {
          throw wrapError(
            "WRONG_NETWORK",
            `Unisat is on ${network}.  Switch to mainnet (livenet) in the Unisat extension and try again.`,
          );
        }
      } catch (netErr) {
        // If the WRONG_NETWORK we just threw bubbles, re-throw.  Other
        // errors (e.g. getNetwork not implemented in older Unisat) we
        // silently ignore — the validator catches wrong-network shapes
        // anyway.
        if ((netErr as WalletAdapterError).code === "WRONG_NETWORK") throw netErr;
      }
      return { address };
    } catch (err: unknown) {
      const code = (err as WalletAdapterError).code;
      if (code) throw err; // already wrapped
      const e = err as { code?: number; message?: string };
      const msg = e?.message ?? String(err);
      if (e?.code === 4001 || /rejected|denied|cancel/i.test(msg)) {
        throw wrapError("USER_REJECTED", "Connection cancelled");
      }
      throw wrapError("UNKNOWN", msg, err);
    }
  },
};

// ─── Phantom (BTC support) ──────────────────────────────────────────────────
interface PhantomBitcoinAccount {
  address: string;
  /** Account purpose — 'payment' is what we want.  'ordinals' addresses
   *  are for inscriptions and should NOT be used as bridge destinations. */
  purpose?: "payment" | "ordinals" | string;
  addressType?: string;
}
interface PhantomBitcoinProvider {
  requestAccounts(): Promise<PhantomBitcoinAccount[]>;
}
interface PhantomBitcoinWindow {
  phantom?: { bitcoin?: PhantomBitcoinProvider };
}

function getPhantomBtcProvider(): PhantomBitcoinProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as PhantomBitcoinWindow).phantom?.bitcoin ?? null;
}

const phantomBtcAdapter: WalletAdapter = {
  kind: "bitcoin",
  brand: "Phantom",
  installUrl: "https://phantom.app/download",
  isInstalled() {
    return getPhantomBtcProvider() !== null;
  },
  async connect(): Promise<ConnectResult> {
    const provider = getPhantomBtcProvider();
    if (!provider) {
      throw wrapError(
        "NOT_INSTALLED",
        "Phantom (with BTC support) isn't installed.  Install from phantom.app/download.",
      );
    }
    try {
      const accounts = await provider.requestAccounts();
      // Pick the first PAYMENT address (skip ordinals).  Phantom returns
      // an array with the purpose tag — using an ordinals address as a
      // bridge destination would lock funds.  Fall back to first account
      // when purpose isn't set (older Phantom builds).
      const payment =
        accounts?.find((a) => a.purpose === "payment") ?? accounts?.[0];
      if (!payment?.address) {
        throw wrapError("UNKNOWN", "Phantom returned no usable BTC accounts");
      }
      return { address: payment.address };
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      const msg = e?.message ?? String(err);
      if (e?.code === 4001 || /rejected|denied/i.test(msg)) {
        throw wrapError("USER_REJECTED", "Connection cancelled");
      }
      throw wrapError("UNKNOWN", msg, err);
    }
  },
};

export const adapters: WalletAdapter[] = [unisatAdapter, phantomBtcAdapter];
