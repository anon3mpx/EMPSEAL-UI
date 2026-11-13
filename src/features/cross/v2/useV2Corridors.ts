// Which chain pairs V2 can execute automatically right now, from GET /v2/capabilities/corridors (public, no key).
// Supported EVM and non-EVM corridors with at least one automatic rail count; the interim USDC set stands in if the fetch fails.
// Alongside, GET /v2/capabilities names every asset the server routes, so the pickers offer those chains and tokens too.
import { useEffect, useMemo, useState } from "react";
import type { V2ChainConfig } from "../../../design-system/data/v2ChainView";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { getTokensForChain } from "../../../design-system/data/v2TokenView";
import { crossApi } from "../api/crossApi";
import { v2Chains, v2ChainsFor } from "./assets";
import { registerCatalog } from "./catalog";
import type { CrossV2Client } from "./client";
import type { CorridorRow } from "./types";
import { chainIdOfCaip2 } from "./nonEvm";

/** source chain id -> destination chain ids it can reach. */
export type CorridorMap = ReadonlyMap<number, ReadonlySet<number>>;


export function corridorMap(rows: readonly CorridorRow[]): CorridorMap {
  const map = new Map<number, Set<number>>();
  for (const r of rows) {
    const from = chainIdOfCaip2(r.from);
    const to = chainIdOfCaip2(r.to);
    if (from === undefined || to === undefined || from === to || !(r.executableAutomatic > 0)) continue;
    (map.get(from) ?? map.set(from, new Set()).get(from)!).add(to);
  }
  return map;
}

function fallbackMap(): CorridorMap {
  const ids = v2Chains().map((c) => c.id);
  return new Map(ids.map((id) => [id, new Set(ids.filter((x) => x !== id))]));
}

export interface V2Corridors {
  /** Chains the source picker offers. */
  sources: V2ChainConfig[];
  /** Chains the destination picker offers for this source. */
  destinationsFor: (fromChainId: number) => V2ChainConfig[];
  /** True once the live corridors replaced the interim set. */
  live: boolean;
}

export function useV2Corridors(client: CrossV2Client): V2Corridors {
  const [map, setMap] = useState<CorridorMap>(fallbackMap);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    const lz = <T,>(p: Promise<T>) => p.catch(() => [] as unknown as T);
    Promise.all([
      client.corridors(ctl.signal),
      client.capabilities(ctl.signal).catch(() => null),
      lz(crossApi.listAllLayerZeroChains(ctl.signal)),
      lz(crossApi.listAllLayerZeroTokens({}, ctl.signal)),
    ])
      .then(([res, caps, lzChains, lzTokens]) => {
        if (caps && Array.isArray(caps.entries)) registerCatalog(caps.entries, getV2Chain, getTokensForChain, lzChains, lzTokens);
        const m = corridorMap(Array.isArray(res.rows) ? res.rows : []);
        // Keep the interim set if no live source chain is one the app can show.
        if (v2ChainsFor(m.keys()).length > 0) {
          setMap(m);
          setLive(true);
        }
      })
      .catch(() => undefined);
    return () => ctl.abort();
  }, [client]);

  return useMemo(() => {
    const sources = v2ChainsFor(map.keys()).filter((c) => v2ChainsFor(map.get(c.id) ?? []).length > 0);
    return { sources, destinationsFor: (from) => v2ChainsFor(map.get(from) ?? []), live };
  }, [map, live]);
}
