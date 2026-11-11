// Chains and tokens the V2 page offers, in the V1 page's own view types, plus their CAIP-19 asset ids for the V2 API.
// Interim chain set (plan 3.1 replaces it with /v2/capabilities/corridors); tokens come from the shared per-chain lists (V2 has no token list: the quote decides).
import { getV2Chain, type V2ChainConfig } from "../../../design-system/data/v2ChainView";
import { getTokensForChain, type V2TokenConfig } from "../../../design-system/data/v2TokenView";
import { CROSS_V2_CHAINS } from "./config";

/** SLIP-44 coin type of each chain's gas token, as the V2 server names it (packages/adapters/gaszip: ETH 60, BNB 714, POL 966, AVAX 9000).
 *  A chain not listed here has no nameable native asset, so its native token is not offered. */
const NATIVE_SLIP44: Readonly<Record<number, number>> = { 1: 60, 10: 60, 8453: 60, 42161: 60, 56: 714, 137: 966, 43114: 9000 };

const fallbackChain = (c: { id: number; name: string }): V2ChainConfig => ({ id: c.id, name: c.name, ticker: "ETH", color: "#627EEA", kind: "EVM", tier: 1, supportsAggregator: true, supportsPaymaster: false });

/** Interim chain set, used until (or if) the capability corridors load. */
export function v2Chains(): V2ChainConfig[] {
  return CROSS_V2_CHAINS.map((c) => getV2Chain(c.id) ?? fallbackChain(c));
}

/** The chains the picker can show for these EVM chain ids: known to the app and with at least one quotable token. */
export function v2ChainsFor(ids: Iterable<number>): V2ChainConfig[] {
  const out: V2ChainConfig[] = [];
  for (const id of ids) {
    const c = getV2Chain(id);
    if (c && c.kind === "EVM" && v2Tokens(id).length > 0) out.push(c);
  }
  return out;
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const isNativeToken = (t: Pick<V2TokenConfig, "isNative" | "address">) =>
  Boolean(t.isNative) || !t.address || /^0x0{40}$/i.test(t.address) || /^0xe{40}$/i.test(t.address);

/** Tokens the V2 page can quote on a chain: a native token whose coin type is known, or an ERC-20 with a real address. */
export function v2Tokens(chainId: number): V2TokenConfig[] {
  const seen = new Set<string>();
  return getTokensForChain(chainId).filter((t) => {
    const ok = isNativeToken(t) ? NATIVE_SLIP44[t.chainId] !== undefined : HEX_ADDRESS.test(t.address ?? "");
    const id = ok ? assetIdOf(t) : "";
    if (!ok || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** CAIP-19 id the V2 API uses: `eip155:<chain>/erc20:<lower-case address>`, or `eip155:<chain>/slip44:<coin type>` for the gas token. */
export function assetIdOf(t: Pick<V2TokenConfig, "chainId" | "isNative" | "address">): string {
  return isNativeToken(t) ? `eip155:${t.chainId}/slip44:${NATIVE_SLIP44[t.chainId] ?? 60}` : `eip155:${t.chainId}/erc20:${t.address!.toLowerCase()}`;
}

/** The token to preselect on a chain: the same ticker if the chain has it, else USDC, else the first token. */
export function defaultToken(chainId: number, preferTicker?: string): V2TokenConfig | undefined {
  const tokens = v2Tokens(chainId);
  return tokens.find((t) => t.ticker === preferTicker) ?? tokens.find((t) => t.ticker === "USDC") ?? tokens[0];
}

/** Ticker lookup for formatting server amounts (any asset id seen on these chains). */
export function tickerForAsset(assetId: string): string | undefined {
  const chainId = Number(/^eip155:(\d+)\//.exec(assetId)?.[1]);
  if (!Number.isFinite(chainId)) return undefined;
  const id = assetId.toLowerCase();
  return v2Tokens(chainId).find((t) => assetIdOf(t) === id)?.ticker;
}
