import {
  getOfferCapability,
  getRailCapability,
} from "../../features/cross/model/capabilities";
import { NON_EVM_CHAIN_IDS as BACKEND_NON_EVM_CHAIN_IDS } from "../../lib/wallet/chainKind";

// ─── EmpX UI registry — mirrors the cross-bridge SDK config ────────────────
//
// This file is a *UI-side mirror* of values that live in the cross-bridge
// SDK.  The UI workspace cannot directly import the SDK package today
// (separate build), so we re-export the constants here.  Every value is
// annotated with its source-of-truth file in `D:/empx/empx-cross-bridge/`.
//
// Update rule: when the SDK adds/removes a chain or rail, edit this file in
// the same PR.  No phantom additions — only mirror what's actually wired.

// ─── T1: Aggregator-deployed chains ────────────────────────────────────────
// SOURCE: empx-cross-bridge/src/vps/config/chains.ts → AGG_CHAIN_IDS
// (derived from CHAIN_CONFIGS entries with hasAggregator: true)
export const AGG_CHAIN_IDS = new Set<number>([
  369,    // PulseChain
  56,     // BSC (USDT-dominant)
  42161,  // Arbitrum
  8453,   // Base
  137,    // Polygon
  43114,  // Avalanche
  10,     // Optimism
  143,    // Monad
  146,    // Sonic
  1329,   // Sei
  80094,  // Berachain
  30,     // Rootstock
  10001,  // EthereumPOW
  999,    // HyperEVM
]);

// ─── Paymaster (gasless source) chains ─────────────────────────────────────
// SOURCE: empx-cross-bridge/src/vps/services/PaymasterService.ts → PIMLICO_URLS keys
// Each entry has a Pimlico bundler URL deployed; user can pay gas in input
// token instead of needing native ETH/MATIC/etc.
export const PAYMASTER_CHAIN_IDS = new Set<number>([
  1,      // Ethereum
  42161,  // Arbitrum
  8453,   // Base
  10,     // Optimism
  137,    // Polygon
  43114,  // Avalanche
  56,     // BSC
]);

// ─── Non-EVM chains (T3) ───────────────────────────────────────────────────
// SOURCE: empx-cross-bridge/src/vps/config/chains.ts → CHAIN_CONFIGS with isEVM: false
export const NON_EVM_CHAIN_IDS = new Set<number>([
  BACKEND_NON_EVM_CHAIN_IDS.BTC,
  BACKEND_NON_EVM_CHAIN_IDS.DOGE,
  BACKEND_NON_EVM_CHAIN_IDS.SOL,
  BACKEND_NON_EVM_CHAIN_IDS.LTC,
  BACKEND_NON_EVM_CHAIN_IDS.BCH,
  BACKEND_NON_EVM_CHAIN_IDS.COSMOS,
  BACKEND_NON_EVM_CHAIN_IDS.DOT,
  BACKEND_NON_EVM_CHAIN_IDS.KUJIRA,
  BACKEND_NON_EVM_CHAIN_IDS.DASH,
  BACKEND_NON_EVM_CHAIN_IDS.ZCASH,
]);

// Chain-tier helper — drives ChainPicker badge + TokenPicker filter mode
export type ChainTier = 1 | 2 | 3;
export function tierForChainId(chainId: number): ChainTier {
  if (NON_EVM_CHAIN_IDS.has(chainId)) return 3;
  if (AGG_CHAIN_IDS.has(chainId)) return 1;
  return 2;
}
export function tierLabel(tier: ChainTier): string {
  switch (tier) {
    case 1: return "Aggregator";
    case 2: return "Rail-only";
    case 3: return "Native L1";
  }
}
export function tierHelp(tier: ChainTier): string {
  switch (tier) {
    case 1: return "EmpX aggregator deployed — full token list, any-to-any swaps on this chain.";
    case 2: return "Rail-only EVM chain — token list limited to assets the eligible rails accept.";
    case 3: return "Non-EVM L1 — native asset plus configured settlement assets supported by eligible rails.";
  }
}

// Default settlement token per chain — drives "what stablecoin shows up first"
// SOURCE: empx-cross-bridge/src/vps/config/chains.ts → CHAIN_CONFIGS nativeStable
// BSC is the only T1 chain where USDT dominates; all others default to USDC.
export const DEFAULT_SETTLEMENT_TICKER: Record<number, "USDC" | "USDT"> = {
  56: "USDT",
};
export function defaultSettlementTicker(chainId: number): "USDC" | "USDT" {
  return DEFAULT_SETTLEMENT_TICKER[chainId] ?? "USDC";
}

// ─── Rail registry — UI-facing copy of vps/rails/registry.ts ───────────────
// SOURCE: empx-cross-bridge/src/vps/rails/registry.ts
// Mode A = Solidity-escrow plugin (pluginId nonzero, source-side EmpX contract)
// Mode B = passthrough (pluginId 0x000..., user deposits directly to rail vault)
export type RailName =
  | "CCTP"
  | "CCTP Fast"
  // | "Axelar"
  | "LayerZero"
  | "Wormhole"
  | "deBridge DLN"
  | "Garden"
  // | "Via Labs"
  | "Gas.zip"
  | "THORChain"
  | "Chainflip"
  | "Maya"
  | "TeleSwap"
  | "Hyperlane Nexus"
  | "Optimism Native Bridge";

export interface RailEntry {
  name: RailName;
  mode: "A" | "B";
  badge?: string;
  /** Source chain IDs this rail accepts */
  sources: number[];
  /** Destination chain IDs this rail can settle on */
  destinations: number[];
  /**
   * Baseline ETA in seconds — matches RailConfig.etaSeconds in
   * empx-cross-bridge/src/vps/types/index.ts.
   *
   * IMPORTANT: this is a FALLBACK only.  When a real quote is returned by
   * RailSolver.quote(), use Quote.etaSeconds from the response — that's
   * the live, route-specific ETA that accounts for current network
   * conditions, hop count, attestation queues, etc.  Use this baseline
   * only when no quote has been issued yet.
   */
  etaSecondsBaseline: number;
  /** % success in the last 30d (reliability data plane) */
  reliability: number;
  /** Stuck-detector threshold in minutes */
  stuckThresholdMin: number;
  /** Flat USD fee charged by the rail (atop EmpX protocol fee) */
  baseFeeUSD: number;
  /** Settlement-token support flags from registry.ts */
  supportsUSDC: boolean;
  supportsUSDT: boolean;
  /** Native (Circle-issued) USDC vs bridged */
  nativeUSDC: boolean;
  /** Rail supports LZ OFT routing — any OFT-listed token */
  supportsOFT: boolean;
  /** Rail-specific native asset (e.g. THORChain handles native BTC/ETH/DOGE) */
  supportsNativeL1: boolean;
  /** One-line speciality */
  speciality: string;
}

const RAIL_CATALOG: RailEntry[] = [
  {
    name: "CCTP",
    mode: "A",
    sources: [43114, 10, 42161, 8453, 137, 143, 1329, 146, 999],
    destinations: [43114, 10, 42161, 8453, 137, 143, 1329, 146, 999],
    // CCTP standard: ~15 min hard finality on Ethereum-source attestations
    etaSecondsBaseline: 900,
    reliability: 99.4,
    stuckThresholdMin: 20,
    baseFeeUSD: 0.32,
    supportsUSDC: true,
    supportsUSDT: false,
    nativeUSDC: true,
    supportsOFT: false,
    supportsNativeL1: false,
    speciality: "Circle native USDC",
  },
  {
    name: "CCTP Fast",
    mode: "A",
    badge: "JIT",
    sources: [42161, 8453, 10],
    destinations: [43114, 10, 42161, 8453, 137, 143, 1329, 146, 999],
    // CCTP Fast: JIT attestation, typically 30-60s
    etaSecondsBaseline: 45,
    reliability: 98.7,
    stuckThresholdMin: 5,
    baseFeeUSD: 0.42,
    supportsUSDC: true,
    supportsUSDT: false,
    nativeUSDC: true,
    supportsOFT: false,
    supportsNativeL1: false,
    speciality: "Sub-minute USDC settlement",
  },
  // {
  //   name: "Axelar",
  //   mode: "A",
  //   sources: [1, 42161, 8453, 10, 137, 56, 43114],
  //   destinations: [1, 42161, 8453, 10, 137, 56, 43114],
  //   etaSecondsBaseline: 240,
  //   reliability: 99.1,
  //   stuckThresholdMin: 15,
  //   baseFeeUSD: 0.40,
  //   supportsUSDC: true,
  //   supportsUSDT: true,
  //   nativeUSDC: false,
  //   supportsOFT: false,
  //   supportsNativeL1: false,
  //   speciality: "Multi-asset, multi-chain",
  // },
  {
    name: "LayerZero",
    mode: "A",
    sources: [1, 10, 56, 130, 137, 143, 146, 369, 480, 999, 1329, 8453, 42161, 43114, 57073, 59144, 98866],
    destinations: [1, 10, 56, 130, 137, 143, 146, 369, 480, 999, 1329, 8453, 42161, 43114, 57073, 59144, 98866],
    etaSecondsBaseline: 150,
    reliability: 98.9,
    stuckThresholdMin: 10,
    baseFeeUSD: 0.55,
    supportsUSDC: true,
    supportsUSDT: true,
    nativeUSDC: false,
    supportsOFT: true,
    supportsNativeL1: false,
    speciality: "OFT + value transfer",
  },
  {
    name: "Wormhole",
    mode: "A",
    sources: [1],
    destinations: [42161, 43114, 8453, 56, 10, 137],
    etaSecondsBaseline: 540,
    reliability: 98.2,
    stuckThresholdMin: 25,
    baseFeeUSD: 0.85,
    supportsUSDC: true,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: false,
    speciality: "Attested Ethereum-origin USDC",
  },
  {
    name: "deBridge DLN",
    mode: "B",
    sources: [1, 10, 56, 137, 8453, 42161, 43114, 999, 1329, 143],
    destinations: [1, 10, 56, 137, 8453, 42161, 43114, 999, 1329, 143],
    etaSecondsBaseline: 120,
    reliability: 0,
    stuckThresholdMin: 30,
    baseFeeUSD: 0,
    supportsUSDC: true,
    supportsUSDT: true,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "Provider-direct DLN orders",
  },
  {
    name: "Garden",
    mode: "B",
    sources: [1, 42161, 8453, 56, 999, 143, BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.LTC, BACKEND_NON_EVM_CHAIN_IDS.SOL],
    destinations: [1, 42161, 8453, 56, 999, 143, BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.LTC, BACKEND_NON_EVM_CHAIN_IDS.SOL],
    etaSecondsBaseline: 600,
    reliability: 0,
    stuckThresholdMin: 45,
    baseFeeUSD: 0,
    supportsUSDC: true,
    supportsUSDT: true,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "HTLC atomic swaps",
  },
  // {
  //   name: "Wormhole",
  //   mode: "A",
  //   sources: [1, 42161, 8453, 10, 137, 56, 43114, BACKEND_NON_EVM_CHAIN_IDS.SOL],
  //   destinations: [1, 42161, 8453, 10, 137, 56, 43114, BACKEND_NON_EVM_CHAIN_IDS.SOL],
  //   etaSecondsBaseline: 540,
  //   reliability: 98.2,
  //   stuckThresholdMin: 25,
  //   baseFeeUSD: 0.85,
  //   supportsUSDC: true,
  //   supportsUSDT: false,
  //   nativeUSDC: false,
  //   supportsOFT: false,
  //   supportsNativeL1: true, // SOL via attestation
  //   speciality: "SOL ↔ EVM attestation",
  // },
  // {
    // Via Labs new architecture per developer.vialabs.tech (post-rebuild):
    //   • Contract: VIAMintBurnTokenMinimal inherits ViaIntegrationV1
    //   • Call:     bridge(recipientBytes32, DEST_CHAIN_ID, AMOUNT) + 0.001 ETH msg fee
    //   • Validator: VIA Gateway multisig
    //   • Pattern:  burn-and-mint (constant supply across chains)
    //
    // INITIAL ROUTES per user direction 2026-06-07:
    //   • Base ↔ PulseChain for WETH + USDC (Base → PulseChain inbound)
    //   • PulseChain → {Base, BSC, Arb, OP, Sonic, Cronos, Avax} for WPLS outbound
    //
    // Gateway addresses pending publication per chain.  Mark as Mode A
    // (Solidity-escrow path with EmpX-side custody) until live deploy.
  //   name: "Via Labs",
  //   mode: "A",
  //   sources:      [369, 8453, 1, 42161, 10, 137, 43114, 56, 146, 25],
  //   destinations: [369, 8453, 1, 42161, 10, 137, 43114, 56, 146, 25],
  //   etaSecondsBaseline: 180,
  //   reliability: 98.6,
  //   stuckThresholdMin: 10,
  //   baseFeeUSD: 0.48,
  //   supportsUSDC: true,
  //   supportsUSDT: true,
  //   nativeUSDC: false,
  //   supportsOFT: false,
  //   supportsNativeL1: false,
  //   speciality: "PulseChain ↔ EVM (WETH / USDC / WPLS)",
  // },
  {
    name: "Gas.zip",
    mode: "A",
    sources: [1, 42161, 8453, 10, 137, 56],
    destinations: [1, 42161, 8453, 10, 137, 56, 43114, 146],
    etaSecondsBaseline: 75,
    reliability: 99.0,
    stuckThresholdMin: 5,
    baseFeeUSD: 0.18,
    supportsUSDC: false,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true, // destination native gas
    speciality: "Destination gas refuel",
  },
  {
    name: "THORChain",
    mode: "B",
    badge: "BTC",
    sources: [BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.SOL, BACKEND_NON_EVM_CHAIN_IDS.DOGE, BACKEND_NON_EVM_CHAIN_IDS.LTC, BACKEND_NON_EVM_CHAIN_IDS.BCH, BACKEND_NON_EVM_CHAIN_IDS.COSMOS, 1, 10, 56, 137, 8453, 42161, 43114],
    destinations: [BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.SOL, BACKEND_NON_EVM_CHAIN_IDS.DOGE, BACKEND_NON_EVM_CHAIN_IDS.LTC, BACKEND_NON_EVM_CHAIN_IDS.BCH, BACKEND_NON_EVM_CHAIN_IDS.COSMOS, 1, 10, 56, 137, 8453, 42161, 43114],
    etaSecondsBaseline: 1200,
    reliability: 97.5,
    stuckThresholdMin: 45,
    baseFeeUSD: 0.20,
    supportsUSDC: false,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "Native BTC / DOGE / LTC ↔ EVM",
  },
  {
    name: "Chainflip",
    mode: "B",
    badge: "JIT",
    sources: [BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.SOL, 1, 42161, 8453],
    destinations: [BACKEND_NON_EVM_CHAIN_IDS.BTC, BACKEND_NON_EVM_CHAIN_IDS.SOL, 1, 42161, 8453],
    etaSecondsBaseline: 150,
    reliability: 98.3,
    stuckThresholdMin: 15,
    baseFeeUSD: 0.25,
    supportsUSDC: true,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "JIT liquidity, BTC + SOL",
  },
  {
    name: "Maya",
    mode: "B",
    badge: "MAYA",
    sources: [BACKEND_NON_EVM_CHAIN_IDS.BTC, 1, 42161, 8453, BACKEND_NON_EVM_CHAIN_IDS.DOGE],
    destinations: [BACKEND_NON_EVM_CHAIN_IDS.BTC, 1, 42161, 8453, BACKEND_NON_EVM_CHAIN_IDS.DOGE],
    etaSecondsBaseline: 720,
    reliability: 96.8,
    stuckThresholdMin: 25,
    baseFeeUSD: 0.18,
    supportsUSDC: false,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "Unique chains support",
  },
  {
    name: "TeleSwap",
    mode: "B",
    badge: "BTC AMM",
    sources: [0, 1, 42161, 8453, 137],
    destinations: [0, 1, 42161, 8453, 137],
    etaSecondsBaseline: 600,
    reliability: 96.4,
    stuckThresholdMin: 20,
    baseFeeUSD: 0.30,
    supportsUSDC: false,
    supportsUSDT: false,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "Bitcoin AMM routing",
  },
  {
    name: "Hyperlane Nexus",
    mode: "B",
    badge: "FREE",
    sources: [1, 10, 56, 130, 137, 146, 369, 480, 999, 1329, 8453, 42161, 43114, 57073, 59144, 98866],
    destinations: [1, 10, 56, 130, 137, 146, 369, 480, 999, 1329, 8453, 42161, 43114, 57073, 59144, 98866],
    etaSecondsBaseline: 75,
    reliability: 99.2,
    stuckThresholdMin: 5,
    baseFeeUSD: 0,
    supportsUSDC: true,
    supportsUSDT: true,
    nativeUSDC: false,
    supportsOFT: false,
    supportsNativeL1: false,
    speciality: "Warp-route stables",
  },
  {
    name: "Optimism Native Bridge",
    mode: "B",
    badge: "DEPOSIT",
    sources: [1],
    destinations: [10],
    etaSecondsBaseline: 180,
    reliability: 0,
    stuckThresholdMin: 20,
    baseFeeUSD: 0,
    supportsUSDC: true,
    supportsUSDT: true,
    nativeUSDC: true,
    supportsOFT: false,
    supportsNativeL1: true,
    speciality: "Ethereum → Optimism deposits",
  },
];

const DEFERRED_RAILS = new Set<RailName>(["Chainflip", "Maya", "TeleSwap"]);
export const RAILS: RailEntry[] = RAIL_CATALOG.filter(
  (rail) => !DEFERRED_RAILS.has(rail.name),
);

// ─── Pair-type fees (Mode A) ───────────────────────────────────────────────
// SOURCE: empx-cross-bridge/src/vps/services/_pairTypeFees.ts + FEE-STRUCTURE-AND-STRATEGY.md
const STABLES = new Set(["USDC", "USDT", "DAI", "USDE", "USDS"]);
export function classifyPair(from: string, to: string): "V/V" | "V/S" | "S/S" {
  const f = STABLES.has(from.toUpperCase());
  const t = STABLES.has(to.toUpperCase());
  if (f && t) return "S/S";
  if (f || t) return "V/S";
  return "V/V";
}
export function modeAFeeBps(pair: "V/V" | "V/S" | "S/S"): number {
  return pair === "S/S" ? 9 : pair === "V/S" ? 15 : 28;
}
export const MODE_B_FEE_BPS = 5;

// ─── ETA formatting ───────────────────────────────────────────────────────
//
// Production flow: RailSolver.quote() returns Quote.etaSeconds — that's the
// LIVE figure to display.  Until a quote arrives (or for the static catalog
// view) we display the per-rail baseline from RailEntry.etaSecondsBaseline.
//
// formatEtaSeconds() handles both: it formats any positive integer of
// seconds into a compact human string ("< 1 min", "4 min", "12 min",
// "1h 5min").  The CrossPage adds a "Live" / "Baseline" pill so the user
// can tell which source the value came from.

export function formatEtaSeconds(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return "< 1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin === 0 ? `${hours}h` : `${hours}h ${remMin}min`;
}

// ─── Rail eligibility per (srcChain, dstChain, destTicker) ────────────────
// Returns the list of rails that can actually settle the requested token.
export function eligibleRailsFor(srcChainId: number, dstChainId: number, destTicker?: string): RailEntry[] {
  const upper = destTicker?.toUpperCase();
  return RAILS.filter((r) => {
    const railId = backendRailId(r.name);
    const capability =
      railId === "OPTIMISM_NATIVE_BRIDGE" ||
      railId === "HYPERLANE_NEXUS" ||
      railId === "THORCHAIN"
        ? getOfferCapability({
            rail: railId,
            srcChainId,
            dstChainId,
          })
        : getRailCapability(railId);
    if (capability.status !== "executable" || !capability.selectable) {
      return false;
    }
    if (!r.sources.includes(srcChainId)) return false;
    if (!r.destinations.includes(dstChainId)) return false;
    if (!upper) return true;
    // Match settlement support
    if (upper === "USDC") return r.supportsUSDC;
    if (upper === "USDT") return r.supportsUSDT;
    // Native L1 assets only on supportsNativeL1 rails
    if (["BTC", "ETH", "SOL", "DOGE", "LTC", "BCH"].includes(upper)) return r.supportsNativeL1;
    // Any other ticker — only OFT-capable rails can carry it
    return r.supportsOFT;
  });
}

export function backendRailId(name: RailName): string {
  switch (name) {
    case "CCTP Fast":
      return "CCTP_FAST";
    case "LayerZero":
      return "LAYERZERO";
    case "deBridge DLN":
      return "DEBRIDGE";
    case "Gas.zip":
      return "GASZIP";
    case "THORChain":
      return "THORCHAIN";
    case "Hyperlane Nexus":
      return "HYPERLANE_NEXUS";
    case "Optimism Native Bridge":
      return "OPTIMISM_NATIVE_BRIDGE";
    default:
      return name.toUpperCase();
  }
}
