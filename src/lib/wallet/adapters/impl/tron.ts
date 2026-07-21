// ─── Tron wallet adapter: TronLink ───────────────────────────────────────────
//
// TronLink injects two globals:
//   window.tronLink — the extension provider, exposes request() API
//   window.tronWeb  — a TronWeb instance, populated AFTER successful auth
//
// Connection flow (modern TronLink, post-2022):
//   const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
//     res.code === 200  → connected (or already-authorized)
//     res.code === 4000 → already authorized (no popup needed)
//     res.code === 4001 → user rejected
//   Then read window.tronWeb.defaultAddress.base58
//
// We accept both 200 and 4000 as success.  We don't auto-switch network;
// if user is on Shasta testnet, their address might (uncommon) start with a
// non-T character — Tron validator catches that.

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

interface TronLinkResponse {
  code: number;
  message?: string;
}
interface TronLinkProvider {
  request(args: { method: string; params?: unknown }): Promise<TronLinkResponse>;
}
interface TronWebInstance {
  defaultAddress?: {
    base58?: string;
    hex?: string;
  };
  ready?: boolean;
}
interface TronWindow {
  tronLink?: TronLinkProvider;
  tronWeb?: TronWebInstance;
}

function getTronLink(): TronLinkProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as TronWindow).tronLink ?? null;
}

function getTronWeb(): TronWebInstance | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as TronWindow).tronWeb ?? null;
}

const tronLinkAdapter: WalletAdapter = {
  kind: "tron",
  brand: "TronLink",
  installUrl: "https://www.tronlink.org/dlDetails/",
  isInstalled() {
    return getTronLink() !== null;
  },
  async connect(): Promise<ConnectResult> {
    const provider = getTronLink();
    if (!provider) {
      throw wrapError(
        "NOT_INSTALLED",
        "TronLink isn't installed.  Install from tronlink.org and reload.",
      );
    }

    try {
      const res = await provider.request({ method: "tron_requestAccounts" });
      // 200 = freshly authorised; 4000 = already authorised in a prior session.
      if (res.code !== 200 && res.code !== 4000) {
        if (res.code === 4001) {
          throw wrapError("USER_REJECTED", "Connection cancelled");
        }
        throw wrapError("UNKNOWN", res.message || `TronLink returned code ${res.code}`);
      }

      const tronWeb = getTronWeb();
      const address = tronWeb?.defaultAddress?.base58;
      if (!address) {
        throw wrapError(
          "UNKNOWN",
          "TronLink connected but did not expose an address.  Ensure your TronLink account is unlocked.",
        );
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

export const adapters: WalletAdapter[] = [tronLinkAdapter];
