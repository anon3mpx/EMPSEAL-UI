// What the widget's main rail strip does not show, under it in the V1 visual language: destination gas, a two-step route, when no route
// delivers the requested token the routes that deliver another token (one strip per token), and rails whose fee only fits a larger amount.
// Held-back routes are in the main strip itself (routeCards.ts). Picking one only selects it: the confirm modal still asks.
import type { ReactNode } from "react";
import { v2ChainById } from "./assets";
import { MicroLabel, wk } from "../../../design-system/widgetKit";
import type { BelowMinimum, WireOffer } from "./types";
import SubstituteStrips from "./SubstituteStrips";
import type { CheckedSubstitute, TwoHopInfo } from "./useV2Quote";
import { formatUnitsShort, railDisplayName } from "./widgetView";

export interface V2OffersFooterProps {
  gasTopUp?: { offer: WireOffer; reason: string; enabled: boolean; chain: string; onToggle: () => void };
  substitutes: CheckedSubstitute[];
  twoHop: TwoHopInfo | null;
  selectedPlanId: string | null;
  twoHopSelected: boolean;
  onPickTwoHop: () => void;
  ticker: (asset: string) => string;
  onPick: (planId: string) => void;
  belowMinimum?: BelowMinimum[];
  /** Sets the send amount to a rail's minimum. */
  onUseAmount?: (m: BelowMinimum["minimumInput"]) => void;
}

const chainName = (caip2: string) => v2ChainById(Number(caip2.split(":")[1]))?.name ?? caip2;

export default function V2OffersFooter(props: V2OffersFooterProps) {
  const { substitutes, twoHop, selectedPlanId, twoHopSelected, onPickTwoHop, ticker, onPick } = props;
  const below = props.belowMinimum ?? [];
  const subs = substitutes.filter((s) => s.offers.length > 0);
  if (!props.gasTopUp && !twoHop && subs.length === 0 && below.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
      {props.gasTopUp && (
        <Group label="Destination gas">
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: wk.t1 }}>
            <input type="checkbox" checked={props.gasTopUp.enabled} onChange={props.gasTopUp.onToggle} />
            Add ~{formatUnitsShort(props.gasTopUp.offer.journey.expectedOutput)} {ticker(props.gasTopUp.offer.journey.expectedOutput.asset)} gas on {props.gasTopUp.chain} for {formatUnitsShort(props.gasTopUp.offer.journey.input)} {ticker(props.gasTopUp.offer.journey.input.asset)}
          </label>
          {/* the server's reason is technical (atomic units); the user only needs why and what kind of transfer it is */}
          <p style={{ margin: 0, fontSize: 11, color: wk.t2 }}>Your wallet has almost no gas on {props.gasTopUp.chain}. Sent separately via Gas.zip; arrival is estimated.</p>
          {props.gasTopUp.offer.journey.assessment && props.gasTopUp.offer.journey.assessment.status !== "acceptable" && (
            <p style={{ margin: 0, fontSize: 11, color: wk.warn }}>{props.gasTopUp.offer.journey.assessment.label}. Leaving it on accepts this.</p>
          )}
        </Group>
      )}
      {twoHop && (
        <Group label="Two-step route">
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: wk.t2 }}>
            This transfer needs two orders, via {chainName(twoHop.viaChain)} ({ticker(twoHop.viaAsset)}), expected to deliver{" "}
            {formatUnitsShort(twoHop.journey.expectedOutput)} {ticker(twoHop.journey.expectedOutput.asset)}. You sign the first order now and the
            second once the first lands; in between, the funds wait in your own wallet on {chainName(twoHop.viaChain)}.
          </p>
          {twoHop.check.ok ? (
            <button
              type="button"
              disabled={twoHopSelected}
              onClick={onPickTwoHop}
              style={{
                alignSelf: "flex-start", minHeight: 44, background: "none", border: `1px solid ${twoHopSelected ? wk.orange : wk.borderStrong}`,
                borderRadius: 8, padding: "0 14px", color: twoHopSelected ? wk.orange : wk.t2, fontSize: 12, cursor: twoHopSelected ? "default" : "pointer",
              }}
            >
              {twoHopSelected ? "Selected" : "Use two-step route"}
            </button>
          ) : (
            <span style={{ fontSize: 10, lineHeight: 1.5, color: wk.t3 }}>Not available: {twoHop.check.problems[0]}</span>
          )}
        </Group>
      )}
      {subs.length > 0 && <SubstituteStrips substitutes={subs} selectedPlanId={selectedPlanId} ticker={ticker} onPick={onPick} />}
      {below.length > 0 && (
        <Group label="Needs a larger amount">
          {below.map((b) => (
            <div key={`${b.rail}:${b.cap}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, lineHeight: 1.55, color: wk.t2 }}>
                <span style={{ fontWeight: 600, color: wk.t1 }}>{railDisplayName(b.rail)}</span> needs at least {formatUnitsShort(b.minimumInput)}{" "}
                {ticker(b.minimumInput.asset)}: its fee ({formatUnitsShort(b.fee)} {ticker(b.fee.asset)}) is {b.feeBps} bps of this amount, above the{" "}
                {b.capBps} bps cap.
              </span>
              {props.onUseAmount && (
                <button
                  type="button"
                  onClick={() => props.onUseAmount?.(b.minimumInput)}
                  style={{ minHeight: 44, background: "none", border: `1px solid ${wk.borderStrong}`, borderRadius: 8, padding: "0 14px", color: wk.t2, fontSize: 11, cursor: "pointer" }}
                >
                  Use {formatUnitsShort(b.minimumInput)}
                </button>
              )}
            </div>
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <MicroLabel>{label}</MicroLabel>
      {children}
    </section>
  );
}
