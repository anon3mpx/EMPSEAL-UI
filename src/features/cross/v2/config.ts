// EMPX V2 cross-chain settings. Whether V2 is shown at all is decided by src/features/cross/engine.ts (VITE_CROSS_ENGINES).

/** Same-origin proxy route (api/cross-v2, and vite.config.js in dev). The browser holds no V2 key and never learns the upstream host. */
export const CROSS_V2_PROXY_BASE = "/api/cross-v2";

export interface CrossV2Chain {
  id: number;
  name: string;
  usdc: string;
}
// Native Circle USDC on the three V2 contract-rail chains (mainnet). Interim picker list until the capability-driven pickers land (plan 3.1).
export const CROSS_V2_CHAINS: readonly CrossV2Chain[] = [
  { id: 8453, name: "Base", usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  { id: 42161, name: "Arbitrum", usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  { id: 10, name: "Optimism", usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
];
export const CROSS_V2_USDC_DECIMALS = 6;
export const crossV2UsdcAsset = (c: CrossV2Chain): string => `eip155:${c.id}/erc20:${c.usdc.toLowerCase()}`;
