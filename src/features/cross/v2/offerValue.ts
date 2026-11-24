// What an offer is worth against what it costs, in words a user can act on: the server's own USD valuation (never computed here from prices),
// turned into one note per offer and one row per step (source swap, bridge, destination swap).
import { formatUnitsShort, railDisplayName } from "./widgetView";
import type { WireAssessment, WireOffer } from "./types";

export interface OfferValue {
  status: WireAssessment["status"];
  tone: "ok" | "warn" | "bad";
  inUsd?: number;
  outUsd?: number;
  changePct?: number;
  note: string;
}
export interface LegRow {
  step: "Source swap" | "Bridge" | "Destination swap";
  detail: string;
  out: string;
  valueText: string;
}

const STEP: Record<string, LegRow["step"]> = {
  source_swap: "Source swap",
  rail_transfer: "Bridge",
  destination_swap: "Destination swap",
};
const toUsd = (s?: string): number | undefined => (s === undefined ? undefined : Number(BigInt(s) / 10n ** 12n) / 1e6);
const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "-" : "±"}${Math.abs(x).toFixed(1)}%`;
const money = (x: number) => `$${x.toFixed(2)}`;

export function offerValueOf(offer: WireOffer, ticker: (asset: string) => string): OfferValue | undefined {
  const a = offer.assessment;
  if (!a) return undefined;
  const inUsd = toUsd(a.journey.inputUsd),
    outUsd = toUsd(a.journey.outputUsd);
  const changePct = inUsd && outUsd !== undefined ? ((outUsd - inUsd) / inUsd) * 100 : undefined;
  const reason = a.reason ?? a.reasons[0] ?? "";
  const cost = () =>
    inUsd !== undefined && outUsd !== undefined && changePct !== undefined
      ? `≈ ${money(inUsd - outUsd)} for ${money(inUsd)} (${pct(changePct)})`
      : "";
  // the token a price problem is about: the input when only the input is unpriced, else what the route delivers
  const priced = /(^|_)input_unpriced/.test(reason) && !/output/.test(reason) ? offer.journey.input.asset : offer.journey.expectedOutput.asset;
  let note: string;
  if (a.status === "acceptable") note = changePct === undefined ? "Value checked" : `Value ${pct(changePct)}`;
  else if (a.status === "warning") note = `High cost: ${cost()}`;
  else if (a.status === "blocked") note = `Very high cost: ${cost()}`;
  else if (reason.endsWith(":implausible-gain")) note = `Price unverified: our ${ticker(priced)} price looks off`;
  else if (reason.endsWith(":no-evidence")) note = `No price for ${ticker(priced)}: value can't be checked`;
  else note = "Price check unavailable right now";
  // name the swap step the problem comes from, when one carries the offer's status
  const leg = a.status === "acceptable" ? undefined : a.legs.find((l) => l.status === a.status && l.leg !== "rail_transfer");
  if (leg && STEP[leg.leg]) note = `${STEP[leg.leg]} · ${note}`;
  const tone = a.status === "acceptable" ? "ok" : a.status === "blocked" ? "bad" : "warn";
  return {
    status: a.status,
    tone,
    ...(inUsd !== undefined ? { inUsd } : {}),
    ...(outUsd !== undefined ? { outUsd } : {}),
    ...(changePct !== undefined ? { changePct } : {}),
    note,
  };
}

export function legRowsOf(offer: WireOffer, ticker: (asset: string) => string, chainName: (chain: string) => string): LegRow[] {
  return (offer.journey.legs ?? [])
    .filter((l) => STEP[l.kind])
    .map((l) => {
      const step = STEP[l.kind]!;
      const rail = offer.journey.hops.find((h) => h.order === l.order)?.rail;
      const detail =
        step === "Bridge"
          ? `${chainName(l.fromChain)} → ${chainName(l.toChain)}${rail ? ` via ${railDisplayName(rail)}` : ""}`
          : `on ${chainName(l.fromChain)}`;
      const checked = offer.assessment?.legs.find((x) => x.leg === l.kind);
      const valueText =
        checked?.lossBps !== undefined
          ? checked.lossBps === 0
            ? "±0.0%"
            : `-${(checked.lossBps / 100).toFixed(1)}%`
          : checked?.status === "unpriced"
            ? "not price-checked"
            : "";
      return { step, detail, out: `${formatUnitsShort(l.expectedOutput)} ${ticker(l.expectedOutput.asset)}`, valueText };
    });
}

/** True only when the server could price no rail at all (it marks every offer `market_pricing_failed`). The quote's `degraded` flag alone
 *  also covers routes sharing one provider, a quote deadline and nothing passing the value check, none of which is a pricing outage. */
export function marketPricingDown(offers: readonly WireOffer[]): boolean {
  return offers.some((o) => o.assessment?.reasons.includes("market_pricing_failed") === true);
}
