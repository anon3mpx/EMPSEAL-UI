// ─── Cosmos wallet adapters: Keplr + Leap ────────────────────────────────────
//
// Both Keplr and Leap implement essentially the same provider API (Leap
// was designed Keplr-compatible).  Two adapters, same shape.
//
// API:
//   window.keplr.enable(chainId)     — request user permission for chainId
//   window.keplr.getKey(chainId)     — returns { bech32Address, pubKey, ... }
//
// The 'Cosmos' kind in our chainKind registry represents the bech32-address
// family, not any specific Cosmos chain (there are dozens — Cosmos Hub,
// Osmosis, Celestia, Juno, ...).  For v1 we default to Cosmos Hub
// (cosmoshub-4) since it's the most common destination and uses the
// canonical 'cosmos1...' HRP that our cosmos validator already accepts.
//
// Future enhancement: take a chainHint param so the UI can request a
// specific chain (e.g. when the user has selected Osmosis as the
// destination, request osmosis-1 → returns an 'osmo1...' address).

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

interface KeplrKey {
  bech32Address: string;
  pubKey: Uint8Array;
  name?: string;
}
interface KeplrProvider {
  enable(chainId: string | string[]): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
  disable?(chainId: string): Promise<void>;
}

interface CosmosWindow {
  keplr?: KeplrProvider;
  leap?: KeplrProvider;
}

// Default chain for v1 — Cosmos Hub.  Most common destination + the
// canonical 'cosmos1...' bech32 HRP our validator already handles.
const DEFAULT_COSMOS_CHAIN_ID = "cosmoshub-4";

function makeAdapter(
  brand: string,
  installUrl: string,
  providerKey: "keplr" | "leap",
): WalletAdapter {
  return {
    kind: "cosmos",
    brand,
    installUrl,
    isInstalled() {
      if (typeof window === "undefined") return false;
      return (window as unknown as CosmosWindow)[providerKey] !== undefined;
    },
    async connect(): Promise<ConnectResult> {
      if (typeof window === "undefined") {
        throw wrapError("NOT_INSTALLED", `${brand} not available in this environment`);
      }
      const provider = (window as unknown as CosmosWindow)[providerKey];
      if (!provider) {
        throw wrapError(
          "NOT_INSTALLED",
          `${brand} isn't installed.  Install from ${installUrl} and reload.`,
        );
      }

      try {
        await provider.enable(DEFAULT_COSMOS_CHAIN_ID);
        const key = await provider.getKey(DEFAULT_COSMOS_CHAIN_ID);
        if (!key?.bech32Address) {
          throw wrapError("UNKNOWN", `${brand} did not return a bech32 address`);
        }
        return { address: key.bech32Address };
      } catch (err: unknown) {
        const code = (err as WalletAdapterError).code;
        if (code) throw err;
        const e = err as { code?: number; message?: string };
        const msg = e?.message ?? String(err);
        if (e?.code === 4001 || /rejected|denied|cancel/i.test(msg)) {
          throw wrapError("USER_REJECTED", "Connection cancelled");
        }
        // 'Request rejected' / chain-not-supported variants
        if (/chain.*not (supported|enabled|added)/i.test(msg)) {
          throw wrapError(
            "WRONG_NETWORK",
            `Cosmos Hub isn't enabled in ${brand}.  Add Cosmos Hub in the extension UI and try again.`,
          );
        }
        throw wrapError("UNKNOWN", msg, err);
      }
    },
  };
}

const keplrAdapter = makeAdapter("Keplr", "https://www.keplr.app/", "keplr");
const leapAdapter = makeAdapter("Leap", "https://www.leapwallet.io/", "leap");

export const adapters: WalletAdapter[] = [keplrAdapter, leapAdapter];
