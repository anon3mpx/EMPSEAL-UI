// ─── Wallet adapter registry + lazy loader ───────────────────────────────────
//
// Registry of which ChainKinds have wallet adapters available.  The actual
// adapter implementations live in `impl/<kind>.ts` and are dynamically
// imported on first use — they never reach the main bundle until the
// user clicks "Connect" on that kind's <DestinationAddressInput>.
//
// Adding a new adapter:
//   1. Create `impl/<kind>.ts` exporting `adapters: WalletAdapter[]`
//   2. Add the kind to KINDS_WITH_ADAPTERS below
//   3. Add a case to `loadAdaptersFor()` that dynamic-imports the impl
//
// That's it.  The shared component picks up the new kind automatically.

import type { ChainKind } from "../types";
import type { WalletAdapter } from "./types";

/**
 * Kinds that currently have at least one wallet adapter implementation.
 * Static for fast synchronous checks (e.g. should the "Connect" button
 * render at all?).  Update when new adapter impls land.
 */
const KINDS_WITH_ADAPTERS: ReadonlySet<ChainKind> = new Set<ChainKind>([
  "solana",  // Phantom (T5a)
  "bitcoin", // Unisat + Phantom-BTC (T5b)
  "tron",    // TronLink (T5c)
  "cosmos",  // Keplr + Leap (T5d)
  // Future per priority signal:
  // 'doge', 'ltc'   — community adapters less mature; needs assessment
  // 'aptos', 'sui'  — Petra (Aptos), Suiet (Sui) — Move ecosystem
  // 'xrp'           — Xumm, GemWallet
  // 'ton'           — Tonkeeper, OpenMask
  // 'near'          — MyNearWallet, Meteor
  // 'xmr', 'ada'    — wallet ecosystem fragmented; less clear priority
]);

/**
 * Synchronous check: does any wallet adapter exist for this kind?
 * Used by <DestinationAddressInput> to decide whether to render the
 * "Connect" button.  Does NOT do a dynamic import.
 */
export function hasAdaptersFor(kind: ChainKind): boolean {
  return KINDS_WITH_ADAPTERS.has(kind);
}

/**
 * Lazy-load the adapter implementations for a kind.  Returns an array
 * of WalletAdapter instances (typically 1-3 wallets per kind).
 *
 * The dynamic import means the adapter code chunk only ships when the
 * user actually opens a kind's wallet picker.
 *
 * Returns [] for kinds without adapter implementations (caller should
 * gate on hasAdaptersFor() first to avoid hitting this path).
 */
export async function loadAdaptersFor(kind: ChainKind): Promise<WalletAdapter[]> {
  switch (kind) {
    case "solana": {
      const m = await import("./impl/solana");
      return m.adapters;
    }
    case "bitcoin": {
      const m = await import("./impl/bitcoin");
      return m.adapters;
    }
    case "tron": {
      const m = await import("./impl/tron");
      return m.adapters;
    }
    case "cosmos": {
      const m = await import("./impl/cosmos");
      return m.adapters;
    }
    // case "tron":    { const m = await import("./impl/tron");    return m.adapters; }
    // case "cosmos":  { const m = await import("./impl/cosmos");  return m.adapters; }
    default:
      return [];
  }
}

export type { WalletAdapter, ConnectResult, WalletAdapterError } from "./types";
