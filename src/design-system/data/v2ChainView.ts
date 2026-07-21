// ─── V2 Chain View — thin adapter over existing canonical config ─────────────
//
// DOES NOT create a new chain registry.  Reads from:
//   • src/config/chains/index.ts (SUPPORTED_CHAINS) — canonical chain data
//   • src/design-system/data/empxRegistry.ts — tier, paymaster, aggregator flags
//
// V2 pages import from here instead of hardcoding chain constants.

import { SUPPORTED_CHAINS } from "../../config/chains";
import { NON_EVM_CHAIN_IDS } from "../../lib/wallet/chainKind";
import { AGG_CHAIN_IDS, PAYMASTER_CHAIN_IDS, tierForChainId } from "./empxRegistry";

export interface V2ChainConfig {
  id: number;
  name: string;
  ticker: string;
  color: string;
  kind: "EVM" | "BTC" | "SOL" | "OTHER";
  tier: 1 | 2 | 3;
  explorerBaseUrl?: string;
  supportsAggregator: boolean;
  supportsPaymaster: boolean;
}

// ─── Adapter defaults (UI-only fields not in config) ─────────────────────

const CHAIN_COLORS: Record<number, string> = {
  1: "#627EEA", 10: "#FF0420", 30: "#FF9900", 56: "#F0B90B",
  137: "#7B3FE4", 143: "#836EF9", 146: "#FE9A4D", 369: "#FF008F",
  999: "#00D1AB", 1329: "#9B1B30", 8453: "#0052FF", 42161: "#28A0F0",
  43114: "#E84142", 80094: "#F47834", 10001: "#86939B",
  0: "#F7931A", 98: "#C2A633", 99: "#9945FF", 100: "#345D9D",
  101: "#0AC18E", 102: "#2E3148", 103: "#E6007A", 104: "#1B1B1B",
  105: "#008CE7", 106: "#F4B728",
};

const NATIVE_TICKERS: Record<number, string> = {
  1: "ETH", 10: "ETH", 30: "RBTC", 56: "BNB", 137: "POL",
  143: "MON", 146: "S", 369: "PLS", 999: "HYPE", 1329: "SEI",
  8453: "ETH", 42161: "ETH", 43114: "AVAX", 80094: "BERA", 10001: "ETHW",
  0: "BTC", 98: "DOGE", 99: "SOL", 100: "LTC", 101: "BCH",
  102: "ATOM", 103: "DOT", 104: "KUJI", 105: "DASH", 106: "ZEC",
};

const CHAIN_KINDS: Record<number, "EVM" | "BTC" | "SOL" | "OTHER"> = {
  0: "BTC", 98: "OTHER", 99: "SOL", 100: "OTHER", 101: "OTHER",
  102: "OTHER", 103: "OTHER", 104: "OTHER", 105: "OTHER", 106: "OTHER",
};

// ─── Build adapter views from canonical sources ──────────────────────────

function buildFromConfig(chainId: number): V2ChainConfig | null {
  const config = SUPPORTED_CHAINS[chainId];
  if (!config) return null;

  return {
    id: chainId,
    name: config.name,
    ticker: NATIVE_TICKERS[chainId] ?? "ETH",
    color: CHAIN_COLORS[chainId] ?? "#888888",
    kind: CHAIN_KINDS[chainId] ?? "EVM",
    tier: tierForChainId(chainId),
    explorerBaseUrl: config.blockExplorer?.replace(/\/+$/, "").replace(/\/(?:tx|address)$/i, ""),
    supportsAggregator: AGG_CHAIN_IDS.has(chainId),
    supportsPaymaster: PAYMASTER_CHAIN_IDS.has(chainId),
  };
}

function buildNonEvm(chainId: number, name: string): V2ChainConfig {
  return {
    id: chainId,
    name,
    ticker: NATIVE_TICKERS[chainId] ?? "???",
    color: CHAIN_COLORS[chainId] ?? "#888888",
    kind: CHAIN_KINDS[chainId] ?? "OTHER",
    tier: tierForChainId(chainId),
    supportsAggregator: false,
    supportsPaymaster: false,
  };
}

/** All EVM chains from canonical config */
export const V2_AGGREGATOR_CHAINS: V2ChainConfig[] = Object.keys(SUPPORTED_CHAINS)
  .map(Number)
  .map(buildFromConfig)
  .filter((c): c is V2ChainConfig => c !== null)
  .sort((a, b) => a.name.localeCompare(b.name));

/** All chains (EVM + non-EVM) the V2 UI can display */
export const V2_ALL_CHAINS: V2ChainConfig[] = [
  buildFromConfig(1) ?? { id: 1, name: "Ethereum", ticker: "ETH", color: "#627EEA", kind: "EVM", tier: 2, supportsAggregator: false, supportsPaymaster: true },
  ...V2_AGGREGATOR_CHAINS,
  buildNonEvm(NON_EVM_CHAIN_IDS.BTC, "Bitcoin"),
  buildNonEvm(NON_EVM_CHAIN_IDS.DOGE, "Dogecoin"),
  buildNonEvm(NON_EVM_CHAIN_IDS.SOL, "Solana"),
  buildNonEvm(NON_EVM_CHAIN_IDS.LTC, "Litecoin"),
  buildNonEvm(NON_EVM_CHAIN_IDS.BCH, "Bitcoin Cash"),
  buildNonEvm(NON_EVM_CHAIN_IDS.COSMOS, "Cosmos"),
  buildNonEvm(NON_EVM_CHAIN_IDS.DOT, "Polkadot Asset Hub"),
  buildNonEvm(NON_EVM_CHAIN_IDS.KUJIRA, "Kujira"),
  buildNonEvm(NON_EVM_CHAIN_IDS.DASH, "Dash"),
  buildNonEvm(NON_EVM_CHAIN_IDS.ZCASH, "Zcash"),
];

/** Lookup by chain ID */
export function getV2Chain(chainId: number): V2ChainConfig | undefined {
  return V2_ALL_CHAINS.find((c) => c.id === chainId);
}
