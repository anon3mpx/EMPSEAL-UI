// What the V2 server publishes it can route (GET /v2/capabilities), turned into picker chains and tokens.
// EVM assets use shared/LayerZero metadata and wallet chain definitions. Supported non-EVM assets use the app's
// chain configs and native decimals; Solana token mints keep their case-sensitive identifiers.
// Chains without usable app or wallet metadata are not offered.
import type { Chain } from "viem";
import { walletChains } from "@/Wagmi/chains";
import { getV2Chain, type V2ChainConfig } from "../../../design-system/data/v2ChainView";
import type { V2TokenConfig } from "../../../design-system/data/v2TokenView";
import type { LayerZeroValueTransferApiChain, LayerZeroValueTransferApiToken } from "../api/contracts";
import { chainIdOfCaip2, nativeDecimals } from "./nonEvm";

export interface CatalogEntry {
  from: string;
  to: string;
}

const ZERO = "0x0000000000000000000000000000000000000000";
const LZ_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const ASSET = /^([^/]+)\/(erc20|slip44|token):([0-9a-zA-Zx]+)$/;

const nativeCoins = new Map<number, number>();
const assetsByChain = new Map<number, Set<string>>();
const tokensByChain = new Map<number, V2TokenConfig[]>();
const chainsById = new Map<number, V2ChainConfig>();

/** SLIP-44 coin type the server uses for this chain's gas token, if it published one. */
export const catalogNativeCoin = (chainId: number) => nativeCoins.get(chainId);
/** Chain config for a chain the server routes but the app has no config for. */
export const catalogChain = (chainId: number) => chainsById.get(chainId);
/** Tokens the server routes on this chain, with metadata, in CAIP-19 order. */
export const catalogTokens = (chainId: number): readonly V2TokenConfig[] => tokensByChain.get(chainId) ?? [];
/** True once the server's assets loaded and this chain has some. */
export const catalogHasChain = (chainId: number) => assetsByChain.has(chainId);

function walletChainConfig(c: Chain): V2ChainConfig {
  return {
    id: c.id,
    name: c.name,
    ticker: c.nativeCurrency.symbol,
    color: "#888888",
    kind: "EVM",
    tier: 2,
    explorerBaseUrl: c.blockExplorers?.default.url.replace(/\/+$/, ""),
    supportsAggregator: false,
    supportsPaymaster: false,
  };
}

/**
 * Replace the catalogue from the server's capability entries.
 * `known(chainId)` gives the app's own chain config, `listed(chainId)` the shared token list for that chain;
 * LayerZero's chains and tokens fill in metadata for the rest.
 */
export function registerCatalog(
  entries: readonly CatalogEntry[],
  known: (chainId: number) => V2ChainConfig | undefined,
  listed: (chainId: number) => readonly V2TokenConfig[],
  lzChains: readonly LayerZeroValueTransferApiChain[] = [],
  lzTokens: readonly LayerZeroValueTransferApiToken[] = [],
): void {
  nativeCoins.clear();
  assetsByChain.clear();
  tokensByChain.clear();
  chainsById.clear();

  for (const e of entries)
    for (const a of [e.from, e.to]) {
      const m = ASSET.exec(a ?? "");
      if (!m) continue;
      const chainId = chainIdOfCaip2(m[1]);
      if (chainId === undefined || (m[2] === "erc20" && !m[1].startsWith("eip155:"))) continue;
      if (m[2] === "token" && !m[1].startsWith("solana:")) continue;
      (assetsByChain.get(chainId) ?? assetsByChain.set(chainId, new Set()).get(chainId)!).add(a.startsWith("eip155:") ? a.toLowerCase() : a);
      if (m[2] === "slip44") nativeCoins.set(chainId, Number(m[3]));
    }

  const wallet = new Map<number, Chain>(walletChains.map((c) => [c.id, c as Chain]));
  const keyOf = new Map<string, number>();
  for (const c of lzChains) if (c.chainType?.toUpperCase() === "EVM" && typeof c.chainId === "number") keyOf.set(c.chainKey, c.chainId);
  const lzMeta = new Map<string, LayerZeroValueTransferApiToken>();
  for (const t of lzTokens) {
    const chainId = keyOf.get(t.chainKey);
    if (chainId === undefined || t.isSupported === false || !t.address) continue;
    const addr = t.address.toLowerCase();
    lzMeta.set(addr === LZ_NATIVE || addr === ZERO ? `${chainId}/native` : `${chainId}/${addr}`, t);
  }

  for (const [chainId, assets] of assetsByChain) {
    const app = known(chainId) ?? getV2Chain(chainId);
    const w = wallet.get(chainId);
    if (!app && !w) continue; // the wallet cannot switch to it
    if (!app) chainsById.set(chainId, walletChainConfig(w!));
    const ticker = app?.ticker ?? w!.nativeCurrency.symbol;

    const have = new Set(
      listed(chainId).map((t) =>
        t.isNative || !t.address || /^0x(0{40}|e{40})$/i.test(t.address) ? "native" : t.address.toLowerCase(),
      ),
    );
    const out: V2TokenConfig[] = [];
    for (const a of [...assets].sort()) {
      const [, , kind, ref] = ASSET.exec(a)!;
      if (kind === "slip44") {
        if (have.has("native") && app?.kind === "EVM") continue;
        const lz = lzMeta.get(`${chainId}/native`);
        out.push({
          chainId,
          ticker: lz?.symbol ?? ticker,
          name: lz?.name ?? w?.nativeCurrency.name ?? ticker,
          address: ZERO,
          decimals: nativeDecimals(chainId) ?? lz?.decimals ?? w?.nativeCurrency.decimals ?? 18,
          isNative: true,
          logoUrl: lz?.logoUrl,
        });
        continue;
      }
      if (have.has(ref)) continue;
      const lz = lzMeta.get(`${chainId}/${ref}`);
      if (!lz) continue; // no symbol or decimals known for it
      out.push({ chainId, ticker: lz.symbol, name: lz.name, address: lz.address, decimals: lz.decimals, logoUrl: lz.logoUrl });
    }
    tokensByChain.set(chainId, out);
  }
}
