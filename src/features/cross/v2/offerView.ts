// Turns a V2 journey quote into the separate labels the page shows: expected output, minimum output (or "estimate only" with its fallback) and each fee bucket. Nothing here is computed: every number is the server's, formatted.
import { formatUnits } from "viem";
import { CROSS_V2_CHAINS } from "./config";
import type { JourneyQuote, WireAmount } from "./types";

const KNOWN_TICKERS = new Map(CROSS_V2_CHAINS.map((c) => [c.usdc.toLowerCase(), "USDC"]));
export const tickerOf = (asset: string): string => {
  const addr = asset.split("erc20:")[1]?.toLowerCase();
  return (addr && KNOWN_TICKERS.get(addr)) || (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : asset);
};
export const formatAmount = (a: WireAmount): string => `${trimZeros(formatUnits(BigInt(a.amount), a.decimals))} ${tickerOf(a.asset)}`;
const trimZeros = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
const sumLine = (xs: WireAmount[]): string => (xs.length ? xs.map(formatAmount).join(" + ") : "none");
const bps = (v: number | null): string => (v === null ? "" : ` (${(v / 100).toFixed(2)}%)`);

export interface OfferView {
  rail: string;
  expectedOutput: string;
  /** "No guaranteed minimum (estimate only)" when the rail only estimates; the fallback asset is named when there is one. */
  minimumOutput: string;
  fees: Array<{ label: string; value: string }>;
  slippage: string;
  tier: string;
  eta: string;
  assessment: string | null;
}

export function describeOffer(j: JourneyQuote): OfferView {
  return {
    rail: j.hops.map((h) => h.rail).join(" → "),
    expectedOutput: formatAmount(j.expectedOutput),
    minimumOutput: j.minimumOutput
      ? formatAmount(j.minimumOutput)
      : `No guaranteed minimum (estimate only)${j.fallback ? `; falls back to ${tickerOf(j.fallback.asset)}` : ""}`,
    fees: [
      { label: "EMPX fee", value: `${sumLine(j.fees.empx.amounts)}${bps(j.fees.empx.bps)}` },
      { label: "Provider & bridge fee", value: `${sumLine(j.fees.providerBridge.amounts)}${bps(j.fees.providerBridge.bps)}` },
      { label: "Relayer & gas", value: `${sumLine(j.fees.relayerGas.amounts)}${bps(j.fees.relayerGas.bps)}` },
    ],
    slippage: j.slippage ? `${(j.slippage.toleranceBps / 100).toFixed(2)}% tolerance` : "not stated",
    tier: `Trust tier ${j.tier}`,
    eta: j.etaSec === null ? "not stated" : j.etaSec >= 90 ? `~${Math.round(j.etaSec / 60)} min` : `~${j.etaSec}s`,
    assessment: j.assessment ? j.assessment.label : null,
  };
}

const STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  claimed: "Claimed",
};
export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s.replace(/_/g, " ");
