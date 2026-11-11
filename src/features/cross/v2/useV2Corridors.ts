// Which chain pairs V2 can execute automatically right now, from GET /v2/capabilities/corridors (public, no key).
// Only EVM corridors with at least one automatic rail count; the interim USDC chain set stands in until (or if) the fetch fails.
import { useEffect, useMemo, useState } from "react";
import type { V2ChainConfig } from "../../../design-system/data/v2ChainView";
import { v2Chains, v2ChainsFor } from "./assets";
import type { CrossV2Client } from "./client";
import type { CorridorRow } from "./types";

/** source chain id -> destination chain ids it can reach. */
export type CorridorMap = ReadonlyMap<number, ReadonlySet<number>>;

const evmId = (caip2: string): number | null => {
  const m = /^eip155:(\d+)$/.exec(caip2);
  return m ? Number(m[1]) : null;
};

export function corridorMap(rows: readonly CorridorRow[]): CorridorMap {
  const map = new Map<number, Set<number>>();
  for (const r of rows) {
    const from = evmId(r.from);
    const to = evmId(r.to);
    if (from === null || to === null || from === to || !(r.executableAutomatic > 0)) continue;
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
    client
      .corridors(ctl.signal)
      .then((res) => {
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
