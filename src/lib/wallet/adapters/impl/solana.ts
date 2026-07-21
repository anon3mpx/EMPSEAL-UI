// ─── Solana wallet adapters: Phantom (+ Solflare, Backpack stubs) ────────────
//
// Talks to the wallet's injected provider via window.<wallet>.solana
// (no @solana/wallet-adapter-react dep — that package is ~300KB gzipped
// and ships the React provider/hook ecosystem we don't need for v1).
//
// v1 scope: connect + get address.  Signing flows land later when Phase B
// (non-EVM SOURCE side) needs to sign actual transactions.
//
// Phantom provider shape (per docs.phantom.app):
//   window.phantom?.solana?.isPhantom: true
//   window.phantom?.solana?.connect({ onlyIfTrusted?: boolean })
//     → Promise<{ publicKey: PublicKey }>
//   window.phantom?.solana?.publicKey: PublicKey | null
//   window.phantom?.solana?.disconnect(): Promise<void>
//
// Legacy fallback: older Phantom builds expose at window.solana (not
// window.phantom.solana).  We check both.

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

interface PhantomSolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect?(): Promise<void>;
}

interface PhantomWindow {
  phantom?: { solana?: PhantomSolanaProvider };
  solana?: PhantomSolanaProvider;
}

function getPhantomProvider(): PhantomSolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as PhantomWindow;
  const p = w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
  return p ?? null;
}

const phantomAdapter: WalletAdapter = {
  kind: "solana",
  brand: "Phantom",
  installUrl: "https://phantom.app/download",
  isInstalled() {
    return getPhantomProvider() !== null;
  },
  async connect(): Promise<ConnectResult> {
    const provider = getPhantomProvider();
    if (!provider) {
      throw wrapError(
        "NOT_INSTALLED",
        "Phantom isn't installed in this browser.  Install from phantom.app/download and try again.",
      );
    }
    try {
      const result = await provider.connect();
      const pubkey = result?.publicKey?.toString();
      if (!pubkey) {
        throw wrapError("UNKNOWN", "Phantom did not return a public key");
      }
      return { address: pubkey, publicKey: pubkey };
    } catch (err: unknown) {
      // Phantom throws { code: 4001, message: 'User rejected the request' } on cancel.
      const e = err as { code?: number; message?: string } | undefined;
      const code = e?.code;
      const msg = e?.message ?? String(err);
      if (code === 4001 || /rejected|denied/i.test(msg)) {
        throw wrapError("USER_REJECTED", "Connection cancelled");
      }
      throw wrapError("UNKNOWN", msg, err);
    }
  },
  async disconnect() {
    const provider = getPhantomProvider();
    if (provider?.disconnect) await provider.disconnect();
  },
};

// Future adapters live here:
// const solflareAdapter: WalletAdapter = { ... };  // window.solflare
// const backpackAdapter: WalletAdapter = { ... };  // window.backpack

export const adapters: WalletAdapter[] = [phantomAdapter];
