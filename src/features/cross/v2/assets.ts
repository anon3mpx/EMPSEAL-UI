// Chains and tokens the V2 page offers, in the V1 page's own view types, plus their CAIP-19 asset ids for the V2 API.
// Interim chain set (plan 3.1 replaces it with /v2/capabilities/corridors); tokens come from the shared per-chain lists (V2 has no token list: the quote decides).
import { getV2Chain, type V2ChainConfig } from "../../../design-system/data/v2ChainView";
import { getTokensForChain, type V2TokenConfig } from "../../../design-system/data/v2TokenView";
import { CROSS_V2_CHAINS } from "./config";
import { catalogChain, catalogNativeCoin, catalogTokens } from "./catalog";
import { addressValidFor, caip2OfChainId, chainIdOfCaip2, nativeAssetOf } from "./nonEvm";
import { isNonEvmChain, NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";

/** SLIP-44 coin type of each chain's gas token, as the V2 server names it (packages/adapters/gaszip: ETH 60, BNB 714, POL 966, AVAX 9000).
 *  The server's published capabilities override and extend this; a chain named by neither has no native token offered. */
const NATIVE_SLIP44: Readonly<Record<number, number>> = { 1: 60, 10: 60, 8453: 60, 42161: 60, 56: 714, 137: 966, 43114: 9000 };

const nativeCoin = (chainId: number) => catalogNativeCoin(chainId) ?? NATIVE_SLIP44[chainId];

/** App chain config, else one built from the wallet's chain definition for a chain the server routes. */
export const v2ChainById = (id: number): V2ChainConfig | undefined => getV2Chain(id) ?? catalogChain(id);

const fallbackChain = (c: { id: number; name: string }): V2ChainConfig => ({ id: c.id, name: c.name, ticker: "ETH", color: "#627EEA", kind: "EVM", tier: 1, supportsAggregator: true, supportsPaymaster: false });

/** Interim chain set, used until (or if) the capability corridors load. */
export function v2Chains(): V2ChainConfig[] {
  return CROSS_V2_CHAINS.map((c) => getV2Chain(c.id) ?? fallbackChain(c));
}

/** Picker chains known to the app or wallet, with at least one quotable token. */
export function v2ChainsFor(ids: Iterable<number>): V2ChainConfig[] {
  const out: V2ChainConfig[] = [];
  for (const id of ids) {
    const c = v2ChainById(id);
    if (c && v2Tokens(id).length > 0) out.push(c);
  }
  return out;
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const isNativeToken = (t: Pick<V2TokenConfig, "isNative" | "address">) =>
  Boolean(t.isNative) || !t.address || /^0x0{40}$/i.test(t.address) || /^0xe{40}$/i.test(t.address);

/** Shared/server tokens with known native coin types, EVM token addresses, or Solana SPL mint addresses. */
export function v2Tokens(chainId: number): V2TokenConfig[] {
  const seen = new Set<string>();
  return [...getTokensForChain(chainId), ...catalogTokens(chainId)].filter((t) => {
    const ok = isNonEvmChain(chainId)
      ? isNativeToken(t) ? nativeAssetOf(chainId) !== undefined : chainId === NON_EVM_CHAIN_IDS.SOL && addressValidFor(chainId, t.address ?? "")
      : isNativeToken(t) ? nativeCoin(t.chainId) !== undefined : HEX_ADDRESS.test(t.address ?? "");
    const id = ok ? assetIdOf(t) : "";
    if (!ok || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** CAIP-19 asset id: native SLIP-44, EVM ERC-20, or a case-sensitive Solana token mint. */
export function assetIdOf(t: Pick<V2TokenConfig, "chainId" | "isNative" | "address">): string {
  if (isNonEvmChain(t.chainId)) {
    // SPL mint identifiers are case-sensitive (backend core-types/src/identity.ts: solanaToken).
    if (!isNativeToken(t) && t.chainId === NON_EVM_CHAIN_IDS.SOL) return `${caip2OfChainId(t.chainId)}/token:${t.address}`;
    const asset = nativeAssetOf(t.chainId);
    if (!asset) throw new Error("Unsupported non-EVM asset");
    return asset;
  }
  return isNativeToken(t) ? `eip155:${t.chainId}/slip44:${nativeCoin(t.chainId) ?? 60}` : `eip155:${t.chainId}/erc20:${t.address!.toLowerCase()}`;
}

/** The token to preselect on a chain: the same ticker if the chain has it, else USDC, else the first token. */
export function defaultToken(chainId: number, preferTicker?: string): V2TokenConfig | undefined {
  const tokens = v2Tokens(chainId);
  return tokens.find((t) => t.ticker === preferTicker) ?? tokens.find((t) => t.ticker === "USDC") ?? tokens[0];
}

/** Ticker lookup for formatting server amounts (any asset id seen on these chains). */
export function tickerForAsset(assetId: string): string | undefined {
  const chainId = chainIdOfCaip2(assetId.split("/")[0]);
  if (chainId === undefined) return undefined;
  const id = assetId.startsWith("eip155:") ? assetId.toLowerCase() : assetId;
  return v2Tokens(chainId).find((t) => assetIdOf(t) === id)?.ticker;
}
