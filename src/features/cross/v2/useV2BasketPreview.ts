// Live preview of a basket before it is planned: each leg is quoted on its own (POST /v2/quote, debounced), so the composer can
// show what every output should receive, the slowest leg's ETA and the fees. Nothing is created on the server; review still
// plans the basket (POST /v2/baskets) and its terms are what the user signs.
import { useEffect, useMemo, useState } from "react";
import { getCachedPrice, getTokenPrices } from "../../../design-system/data/priceService";
import { assetInfo } from "./assets";
import type { BasketPlanRequest } from "./basketTypes";
import type { CrossV2Client } from "./client";
import { describeV2Error } from "./errors";
import type { JourneyQuote, WireAmount } from "./types";

const DEBOUNCE_MS = 500;
const REFRESH_MS = 60_000;

export interface PreviewLeg {
  legId: string;
  toAsset: string;
  journey: JourneyQuote | null;
  error: string | null;
}
export interface BasketPreview {
  state: "idle" | "loading" | "ready" | "error";
  legs: PreviewLeg[];
  /** USD price per CAIP-19 asset, for the assets these legs move or charge in (missing when unpriced). */
  prices: Record<string, number>;
}

const IDLE: BasketPreview = { state: "idle", legs: [], prices: {} };

function pricePairOf(asset: string) {
  const info = assetInfo(asset);
  return info && { chainId: info.chainId, ticker: info.ticker, tokenAddress: info.isNative ? undefined : info.address };
}

async function pricesFor(assets: string[]): Promise<Record<string, number>> {
  const pairs = assets.map((a) => [a, pricePairOf(a)] as const).filter((p): p is readonly [string, NonNullable<ReturnType<typeof pricePairOf>>] => !!p[1]);
  await getTokenPrices(pairs.map(([, p]) => p));
  const out: Record<string, number> = {};
  for (const [asset, p] of pairs) {
    const price = getCachedPrice(p.chainId, p.ticker, p.tokenAddress);
    if (price != null) out[asset] = price;
  }
  return out;
}

export const feeAmountsOf = (j: JourneyQuote): WireAmount[] => [
  ...j.fees.empx.amounts, ...j.fees.providerBridge.amounts, ...j.fees.relayerGas.amounts,
];

export function useV2BasketPreview(client: CrossV2Client, request: BasketPlanRequest | null): BasketPreview {
  const key = useMemo(() => (request ? JSON.stringify(request) : null), [request]);
  const [preview, setPreview] = useState<BasketPreview & { key: string | null }>({ ...IDLE, key: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!key) return;
    const request = JSON.parse(key) as BasketPlanRequest;
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setPreview((p) => ({ ...p, key, state: "loading" }));
      const legs = await Promise.all(
        request.legs.map(async (leg, i): Promise<PreviewLeg> => {
          const legId = leg.legId ?? String(i);
          try {
            const res = await client.quote(
              {
                fromAsset: leg.from.asset, amount: leg.from.amount, decimals: leg.from.decimals, toAsset: leg.toAsset,
                sender: request.sender, recipient: leg.recipient ?? request.recipient, slippageBps: request.slippageBps, maxTier: request.maxTier,
              },
              ctl.signal,
            );
            const best = res.plans[0];
            return { legId, toAsset: leg.toAsset, journey: best?.journey ?? null, error: best ? null : "No route for this leg" };
          } catch (e) {
            return { legId, toAsset: leg.toAsset, journey: null, error: describeV2Error(e).text };
          }
        }),
      );
      if (ctl.signal.aborted) return;
      const assets = new Set<string>();
      for (const l of legs) {
        if (!l.journey) continue;
        assets.add(l.journey.input.asset);
        assets.add(l.journey.expectedOutput.asset);
        feeAmountsOf(l.journey).forEach((a) => assets.add(a.asset));
      }
      const prices = await pricesFor([...assets]).catch(() => ({}));
      if (ctl.signal.aborted) return;
      setPreview({ key, legs, prices, state: legs.every((l) => l.error) ? "error" : "ready" });
    }, DEBOUNCE_MS);
    const refresh = setTimeout(() => setTick((t) => t + 1), REFRESH_MS);
    return () => { ctl.abort(); clearTimeout(timer); clearTimeout(refresh); };
  }, [client, key, tick]);

  if (!key) return IDLE;
  // A quote for a different basket is never shown as this one's.
  return preview.key === key ? preview : { ...IDLE, state: "loading" };
}
