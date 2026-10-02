import type { LayerZeroValueTransferApiToken } from "../api/contracts";
import type { RailEntry } from "../../../design-system/data/empxRegistry";
import { filterLayerZeroDestinations } from "../hooks/useLayerZeroDestinations";

type ScopeRail = Pick<RailEntry, "name" | "supportsUSDC" | "supportsUSDT" | "supportsNativeL1">;
type ScopeToken = {
  ticker: string;
  address?: string;
  providerAssetId?: string;
  category?: string;
  isNative?: boolean;
};

// Rails the backend composes as swap → bridge → swap carriers. LayerZero's
// router rail composes on the same chains, so CCTP coverage is the reliable
// signal; the UI registry overstates LayerZero router reach (BSC, PulseChain).
const COMPOSABLE_RAILS = new Set<string>(["CCTP", "CCTP Fast"]);

/**
 * True when any destination token can be quoted: the destination aggregator
 * swaps out of a composable carrier, and the source either swaps into it or
 * already holds it.
 */
export function supportsAnyDestinationToken({
  srcAggregator,
  dstAggregator,
  sourceTicker,
  rails,
}: {
  srcAggregator: boolean;
  dstAggregator: boolean;
  sourceTicker?: string;
  rails: ScopeRail[];
}): boolean {
  if (!dstAggregator || !rails.some((rail) => COMPOSABLE_RAILS.has(rail.name))) return false;
  return srcAggregator || sourceTicker?.toUpperCase() === "USDC";
}

/** Destination tokens a rail settles into directly, without a destination swap. */
export function settlementDestinationTokens<T extends ScopeToken>(tokens: T[], rails: ScopeRail[]): T[] {
  return tokens.filter((token) => {
    const ticker = token.ticker.toUpperCase();
    if (ticker === "USDC") return rails.some((rail) => rail.supportsUSDC);
    if (ticker === "USDT") return rails.some((rail) => rail.supportsUSDT);
    if (token.isNative || token.category === "native") return rails.some((rail) => rail.supportsNativeL1);
    return false;
  });
}

export type LayerZeroDestinationScope =
  // Either chain is outside LayerZero's catalog: its API can't reach this pair.
  | { applies: false }
  // reachable is undefined while discovery loads or after it fails (unknown).
  | {
      applies: true;
      reachable: LayerZeroValueTransferApiToken[] | undefined;
      chain: { chainKey?: string; chainType?: string };
    };

/** Destination tokens the UI expects to route for the current source selection. */
export function scopeDestinationTokens<T extends ScopeToken>({
  candidates,
  anyToken,
  settlementTokens,
  layerZero,
}: {
  candidates: T[];
  anyToken: boolean;
  settlementTokens: T[];
  layerZero: LayerZeroDestinationScope;
}): T[] {
  if (anyToken) return candidates;
  if (layerZero.applies) {
    return filterLayerZeroDestinations(candidates, layerZero.reachable, layerZero.chain, settlementTokens);
  }
  const keep = new Set(settlementTokens.map(tokenIdentity));
  return candidates.filter((token) => keep.has(tokenIdentity(token)));
}

function tokenIdentity(token: ScopeToken): string {
  return (token.providerAssetId ?? token.address ?? `${token.ticker}:native`).trim().toLowerCase();
}

/**
 * Orders the picker: tokens the UI expects to route first, every other
 * candidate after. Nothing is dropped — the backend quote stays the authority,
 * since other providers can route pairs these rules don't know about.
 */
export function splitDestinationTokens<T extends ScopeToken>(
  candidates: T[],
  routable: T[],
): { routable: T[]; unconfirmed: T[] } {
  const keep = new Set(routable.map(tokenIdentity));
  return {
    routable: candidates.filter((token) => keep.has(tokenIdentity(token))),
    unconfirmed: candidates.filter((token) => !keep.has(tokenIdentity(token))),
  };
}
