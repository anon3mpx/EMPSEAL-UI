// ─── Router + wrapped-token ABI lookups by chain ─────────────────────────────
//
// Pure switch-based selectors that map a chainId → the right ABI.  No state,
// no React, no async.  Extracted from Emp.jsx as part of M7 to make the swap
// page leaner and to give SDK wiring a single, testable seam.
//
// NOTE: identical-shape duplicates currently live in
//   • src/utils/contractCalls.ts
//   • src/widget/widgetContractCalls.ts
// Those callers are intentionally NOT migrated in this commit — they're a
// separate cleanup (widget-side changes ship via a different path).  Track:
// `M7-followup: consolidate getWrappedTokenABI / getRouterABI duplicates`.
//
// When adding a new chain:
//   1. Import the new wrapped-token + router ABIs from utils/abis/*
//   2. Add a `case <chainId>:` arm in both functions
//   3. Default arm currently falls back to PulseChain (369) — see TODO below
//
// TODO (multi-chain neutrality):
//   The default arm landing on PulseChain is a legacy from when EmpX was
//   PulseChain-first.  Multi-chain posture means an unrecognised chainId
//   should not silently route through PulseChain ABIs — that would mask
//   misconfiguration on a new chain integration.  Options:
//     (a) throw new Error(`Unsupported chainId: ${chainId}`)
//     (b) return null and force every call site to handle the missing case
//     (c) explicit registry object + a typed `getRouterABI(chainId): ABI | null`
//   Decision blocked on: do callers (Emp.jsx, contractCalls.ts, widget)
//   currently rely on the PulseChain fallback for any non-369 path?
//   If yes → audit each call site before switching.  If no → option (a)
//   is the safe path (loud failure beats silent wrong behaviour).

import { PLS_ROUTER_ABI } from "../abis/empSealRouterAbi";
import {
  ETHW_ROUTER_ABI,
  SONIC_ROUTER_ABI,
  BASECHAIN_ROUTER_ABI,
  SEI_ROUTER_ABI,
  BERA_ROUTER_ABI,
  ROOTSTOCK_ROUTER_ABI,
  BSC_ROUTER_ABI,
  MONAD_ROUTER_ABI,
  ARBITRUM_ROUTER_ABI,
  OPTIMISM_ROUTER_ABI,
  POLYGON_ROUTER_ABI,
  AVALANCHE_ROUTER_ABI,
  HYPEREVM_ROUTER_ABI,
} from "../abis/empSealRouterAbi";

import { WPLS } from "../abis/wplsABI";
import { WETHW } from "../abis/wethwABI";
import { WSONIC } from "../abis/wsonicABI";
import { WETH } from "../abis/wethBaseABI";
import { WSEI } from "../abis/wseiABI";
import { WBERA } from "../abis/wberaABI";
import { WRBTC } from "../abis/wrbtcABI";
import { WMON } from "../abis/wmonABI";
import { WPOL } from "../abis/wpolABI";
import { WAVAX } from "../abis/wavaxABI";
import { WHYPE } from "../abis/whypeABI";

/**
 * Return the wrapped-native-token ABI for the given chain.  Defaults to WPLS
 * for PulseChain (369) and any unrecognised chainId — matches the original
 * Emp.jsx behaviour exactly.
 */
export const getWrappedTokenABI = (chainId: number | undefined): unknown => {
  switch (chainId) {
    case 10001: // ETHW
      return WETHW;
    case 146: // Sonic
      return WSONIC;
    case 8453: // Base
      return WETH;
    case 1329: // Sei
      return WSEI;
    case 80094: // Berachain
      return WBERA;
    case 30: // Rootstock
      return WRBTC;
    case 143: // Monad
      return WMON;
    case 42161: // Arbitrum
      return WETH;
    case 10: // Optimism
      return WETH;
    case 137: // Polygon
      return WPOL;
    case 43114: // Avalanche
      return WAVAX;
    case 999: // HyperEVM
      return WHYPE;
    case 369: // PulseChain (default)
    default:
      return WPLS;
  }
};

/**
 * Return the EmpSeal router ABI for the given chain.  Defaults to PLS for
 * PulseChain (369) and any unrecognised chainId — matches the original
 * Emp.jsx behaviour exactly.
 */
export const getRouterABI = (chainId: number | undefined): unknown => {
  switch (chainId) {
    case 10001: // ETHW
      return ETHW_ROUTER_ABI;
    case 146: // Sonic
      return SONIC_ROUTER_ABI;
    case 8453: // Base
      return BASECHAIN_ROUTER_ABI;
    case 1329: // Sei
      return SEI_ROUTER_ABI;
    case 80094: // Berachain
      return BERA_ROUTER_ABI;
    case 30: // Rootstock
      return ROOTSTOCK_ROUTER_ABI;
    case 56: // BSC
      return BSC_ROUTER_ABI;
    case 143: // Monad
      return MONAD_ROUTER_ABI;
    case 42161: // Arbitrum
      return ARBITRUM_ROUTER_ABI;
    case 10: // Optimism
      return OPTIMISM_ROUTER_ABI;
    case 137: // Polygon
      return POLYGON_ROUTER_ABI;
    case 43114: // Avalanche
      return AVALANCHE_ROUTER_ABI;
    case 999: // HyperEVM
      return HYPEREVM_ROUTER_ABI;
    case 369: // PulseChain (default)
    default:
      return PLS_ROUTER_ABI;
  }
};
