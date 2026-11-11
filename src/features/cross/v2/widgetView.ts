// Maps V2 quote offers onto the V1 widget's view props (EmpxCrossWidget, RailCardStrip, ConfirmTradeModal), so V2 renders in V1's layout.
// Every number is the server's: amounts are formatted, fee amounts are converted to USD only with a known token price, and nothing is estimated here.
import { formatUnits } from "viem";
import type { RouteHop } from "../../../design-system/components";
import type { RailCardData } from "../../../design-system/widgetKit";
import type { JourneyQuote, WireAmount, WireOffer } from "./types";
import type { PlanCheck } from "./planCheck";

export interface CheckedOffer {
  offer: WireOffer;
  check: PlanCheck;
}

const RAIL_NAMES: Record<string, string> = {
  cctp: "CCTP",
  ccip: "CCIP",
  layerzero: "LayerZero",
  "layerzero-vt": "LayerZero VT",
  hyperlane: "Hyperlane Nexus",
  debridge: "deBridge",
  gaszip: "Gas.zip",
  thorchain: "THORChain",
  maya: "Maya",
  chainflip: "Chainflip",
  teleswap: "TeleSwap",
};
/** EMPX contract rails (the relayer sends the signed order); the rest are provider rails the wallet pays directly. */
const CONTRACT_RAILS = new Set(["cctp", "ccip", "layerzero"]);

export const railDisplayName = (rail: string): string => RAIL_NAMES[rail.toLowerCase()] ?? rail;
/** The offer's plan id. A held-back offer can arrive without its plan (`execution`), so fall back to the id its journey names. */
export const planIdOf = (o: Pick<WireOffer, "journey"> & { execution?: { plan?: { id?: string } } }): string =>
  o.execution?.plan?.id ?? o.journey?.hops?.[0]?.planId ?? "";

/** "CCTP", "CCTP Fast", "LayerZero VT", or "CCTP → CCIP" for a journey. The fast variant comes from the plan's own rail quote. */
export const railNameOf = (o: WireOffer): string => {
  const name = o.journey.hops.map((h) => railDisplayName(h.rail)).join(" → ");
  return o.journey.hops.length === 1 && o.execution?.plan?.railQuote?.variant === "fast" ? `${name} Fast` : name;
};

/** One name per offer, unique in the strip (the card click reports only its name): repeats get " 2", " 3". */
export function railCardNames(offers: readonly CheckedOffer[]): string[] {
  const seen = new Map<string, number>();
  return offers.map(({ offer }) => {
    const n = railNameOf(offer);
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return k === 1 ? n : `${n} ${k}`;
  });
}

/** Base units → a short decimal string ("0.99", "1,250.5"). */
export function formatUnitsShort(a: Pick<WireAmount, "amount" | "decimals">, maxFraction = 6): string {
  const n = Number(formatUnits(BigInt(a.amount), a.decimals));
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 2 : maxFraction });
}

export function formatEta(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `~${Math.max(1, Math.round(sec))}s`;
  if (sec < 3600) return `~${Math.round(sec / 60)} min`;
  return `~${(sec / 3600).toFixed(1)} h`;
}

/** Rail cards in the server's ranking order. A plan that fails the local check is shown but tagged and never selectable. */
export function toRailCards(offers: readonly CheckedOffer[], selectedPlanId: string | null): RailCardData[] {
  const firstOk = offers.find((o) => o.check.ok)?.offer;
  const names = railCardNames(offers);
  return offers.map(({ offer, check }, i) => ({
    name: names[i]!,
    mode: offer.journey.hops.every((h) => CONTRACT_RAILS.has(h.rail.toLowerCase())) ? "A" : "B",
    outAmount: formatUnitsShort(offer.journey.expectedOutput),
    eta: formatEta(offer.journey.etaSec),
    tag: !check.ok ? "UNAVAILABLE" : offer === firstOk ? "BEST" : offer.journey.outputGuarantee === "estimate_only" ? "ESTIMATE" : undefined,
    isActive: planIdOf(offer) === selectedPlanId,
  }));
}

/** USD value of fee amounts, when every amount's asset has a known price; otherwise undefined (shown as "—", never guessed). */
export function feeUsd(amounts: readonly WireAmount[], priceOf: (asset: string) => number | null | undefined): number | undefined {
  let total = 0;
  for (const a of amounts) {
    const p = priceOf(a.asset);
    if (p == null) return undefined;
    total += Number(formatUnits(BigInt(a.amount), a.decimals)) * p;
  }
  return total;
}

export interface SelectedOfferView {
  railName: string;
  /** Header badge: tier and whether the minimum is guaranteed. */
  railBadge: string;
  toAmount: string;
  minimumReceived: string;
  estimatedTime: string;
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bridgeFeeUSD?: number;
  relayerFeeUSD?: number;
  slippageBps?: number;
  /** Token-unit fee lines, for the confirm modal. */
  feeLines: Array<{ label: string; value: string }>;
}

const sumLine = (xs: readonly WireAmount[], ticker: (asset: string) => string): string =>
  xs.length ? xs.map((a) => `${formatUnitsShort(a)} ${ticker(a.asset)}`).join(" + ") : "None";

export function selectedOfferView(
  j: JourneyQuote,
  railName: string,
  ticker: (asset: string) => string,
  priceOf: (asset: string) => number | null | undefined,
): SelectedOfferView {
  const minimum = j.minimumOutput
    ? `${formatUnitsShort(j.minimumOutput)} ${ticker(j.minimumOutput.asset)}`
    : `Estimate only${j.fallback ? ` (falls back to ${ticker(j.fallback.asset)})` : ""}`;
  return {
    railName,
    railBadge: `Tier ${j.tier} · ${j.outputGuarantee === "firm_minimum" ? "Guaranteed min" : "Estimate"}`,
    toAmount: formatUnitsShort(j.expectedOutput),
    minimumReceived: minimum,
    estimatedTime: formatEta(j.etaSec),
    protocolFeeBps: j.fees.empx.bps ?? undefined,
    protocolFeeUSD: feeUsd(j.fees.empx.amounts, priceOf),
    bridgeFeeUSD: feeUsd(j.fees.providerBridge.amounts, priceOf),
    relayerFeeUSD: feeUsd(j.fees.relayerGas.amounts, priceOf),
    slippageBps: j.slippage?.toleranceBps,
    feeLines: [
      { label: "EMPX fee", value: sumLine(j.fees.empx.amounts, ticker) },
      { label: "Provider & bridge fee", value: sumLine(j.fees.providerBridge.amounts, ticker) },
      { label: "Relayer & gas", value: sumLine(j.fees.relayerGas.amounts, ticker) },
    ],
  };
}

const LEG_VIA: Record<string, { via: string; venueType: RouteHop["venueType"] }> = {
  source_swap: { via: "Source swap", venueType: "DEX" },
  destination_swap: { via: "Destination swap", venueType: "DEX" },
};

/** V1's route strip from the journey's own legs: one point per token the funds pass through, each labelled with how they move on. */
export function routeHopsOf(
  journey: JourneyQuote,
  ticker: (asset: string) => string,
  chainOf: (caip2: string) => { name: string; color?: string } | undefined,
): RouteHop[] {
  const legs = [...(journey.legs ?? [])].sort((a, b) => a.index - b.index);
  if (!legs.length) return [];
  const point = (asset: string, chain: string): RouteHop => {
    const c = chainOf(chain);
    return { ticker: ticker(asset), chainName: c?.name ?? chain, chainColor: c?.color };
  };
  const hops: RouteHop[] = [point(legs[0]!.input.asset, legs[0]!.fromChain)];
  for (const leg of legs) {
    const rail = journey.hops.find((h) => h.order === leg.order)?.rail;
    const how = LEG_VIA[leg.kind] ?? { via: rail ? railDisplayName(rail) : "Bridge", venueType: "RAIL" as const };
    Object.assign(hops[hops.length - 1]!, how);
    hops.push(point(leg.expectedOutput.asset, leg.toChain));
  }
  return hops;
}
