// ─── chainId → ChainKind dispatch ────────────────────────────────────────────
//
// Single source of truth for "what address format does THIS chain accept?".
// Used by <DestinationAddressInput> to pick a validator, by the wallet
// adapter dispatcher to know which lazy adapter to offer, and by the
// cross-format detection to recognise wrong-chain mistakes.
//
// Pseudo chain IDs for non-EVM chains follow the convention from
// empx-cross-bridge/src/vps/types/index.ts (small numbers reserved for
// pseudo-IDs, never collide with real EVM chain IDs).  This module
// extends the bridge's published list with placeholders for additional
// non-EVM chains the UI can accept addresses for; each TBD placeholder
// needs bridge-side coordination before settlement actually works for
// that chain.
//
// Published in VPS registry:
//   BTC = 0,  DOGE = 98,  SOL = 99,  LTC = 100,  BCH = 101,
//   COSMOS = 102, DOT = 103, KUJI = 104, DASH = 105, ZEC = 106
//
// UI-side placeholders (TBD with VPS):
//   TRON = 200, XMR = 210, NEAR = 220, APTOS = 230, SUI = 240,
//   XRP = 250, TON = 260, ADA = 270
//
// All known EVM chain IDs explicitly enumerate so an unmapped chainId
// returns null rather than a misleading default.

import type { ChainKind } from "./types";

/** Pseudo-IDs for non-EVM chains.  Mirrors empx-cross-bridge VPS conventions. */
export const NON_EVM_CHAIN_IDS = {
  // Published in VPS registry — confirmed integer
  BTC: 0,
  DOGE: 98,
  SOL: 99,
  LTC: 100,
  BCH: 101,
  COSMOS: 102,
  DOT: 103,
  KUJIRA: 104,
  DASH: 105,
  ZCASH: 106,
  // UI-side placeholders — TBD with VPS coordination before settlement
  // for these chains comes online.  Picked spaced numbers (10-apart) so
  // the bridge can adopt these IDs OR substitute its own without UI churn.
  TRON: 200,
  XMR: 210,
  NEAR: 220,
  APTOS: 230,
  SUI: 240,
  XRP: 250,
  TON: 260,
  ADA: 270,
} as const;

const BACKEND_NON_EVM_CHAIN_IDS = new Set<number>([
  NON_EVM_CHAIN_IDS.BTC,
  NON_EVM_CHAIN_IDS.DOGE,
  NON_EVM_CHAIN_IDS.SOL,
  NON_EVM_CHAIN_IDS.LTC,
  NON_EVM_CHAIN_IDS.BCH,
  NON_EVM_CHAIN_IDS.COSMOS,
  NON_EVM_CHAIN_IDS.DOT,
  NON_EVM_CHAIN_IDS.KUJIRA,
  NON_EVM_CHAIN_IDS.DASH,
  NON_EVM_CHAIN_IDS.ZCASH,
]);

export function isBackendNonEvmChainId(
  chainId: number | undefined | null,
): boolean {
  return chainId !== null &&
    chainId !== undefined &&
    BACKEND_NON_EVM_CHAIN_IDS.has(chainId);
}

/** Set of EVM chain IDs the dApp recognises.  Sourced from the swap SDK registry. */
const EVM_CHAIN_IDS = new Set<number>([
  1,      // Ethereum
  10,     // Optimism
  30,     // Rootstock (yes, EVM-compatible despite Bitcoin-derived L1)
  56,     // BSC
  137,    // Polygon
  143,    // Monad
  146,    // Sonic
  369,    // PulseChain
  999,    // HyperEVM
  1329,   // Sei (EVM-compat)
  8453,   // Base
  10001,  // EthereumPOW
  42161,  // Arbitrum
  43114,  // Avalanche
  80094,  // Berachain
]);

/**
 * Map a chainId (real EVM or pseudo non-EVM) to its address-format kind.
 * Returns null when the chainId is not recognised — caller should treat
 * unknown chainIds as "do not show destination input" rather than
 * defaulting to EVM (which would mask configuration bugs).
 */
export function chainKindFor(chainId: number | undefined | null): ChainKind | null {
  if (chainId === null || chainId === undefined) return null;

  if (EVM_CHAIN_IDS.has(chainId)) return "evm";

  switch (chainId) {
    // Published in VPS registry
    case NON_EVM_CHAIN_IDS.BTC:    return "bitcoin";
    case NON_EVM_CHAIN_IDS.DOGE:   return "doge";
    case NON_EVM_CHAIN_IDS.SOL:    return "solana";
    case NON_EVM_CHAIN_IDS.LTC:    return "ltc";
    case NON_EVM_CHAIN_IDS.BCH:    return "bch";
    case NON_EVM_CHAIN_IDS.COSMOS: return "cosmos";

    // UI-side placeholders pending VPS coordination
    case NON_EVM_CHAIN_IDS.TRON:   return "tron";
    case NON_EVM_CHAIN_IDS.XMR:    return "xmr";
    case NON_EVM_CHAIN_IDS.NEAR:   return "near";
    case NON_EVM_CHAIN_IDS.APTOS:  return "aptos";
    case NON_EVM_CHAIN_IDS.SUI:    return "sui";
    case NON_EVM_CHAIN_IDS.XRP:    return "xrp";
    case NON_EVM_CHAIN_IDS.TON:    return "ton";
    case NON_EVM_CHAIN_IDS.ADA:    return "ada";

    // DOT intentionally not yet supported — Substrate/SS58 address format
    // is its own beast and needs a dedicated validator + adapter.  Add
    // when DOT settlement comes online and validator design is settled.
    default: return null;
  }
}

/** True iff this chainId accepts EVM-style 0x-prefixed addresses. */
export function isEvmChain(chainId: number | undefined | null): boolean {
  return chainKindFor(chainId) === "evm";
}

/** True iff this chainId requires a non-EVM destination address. */
export function isNonEvmChain(chainId: number | undefined | null): boolean {
  const kind = chainKindFor(chainId);
  return kind !== null && kind !== "evm";
}
