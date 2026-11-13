// Routes the widget's rail cards do not show, under them in the V1 visual language: a two-step route (shown, not yet executable),
// routes held back by the economic policy (a warning/unpriced one can be accepted explicitly; a blocked one never), when no route
// delivers the requested token, routes that deliver another token instead, and rails whose fee only fits a larger amount. Picking one only selects it: the confirm modal still asks.
import type { ReactNode } from "react";
import { v2ChainById } from "./assets";
import { MicroLabel, railIconUrl, wk } from "../../../design-system/widgetKit";
import type { BelowMinimum } from "./types";
import type { CheckedSubstitute, CheckedWithheld, TwoHopInfo } from "./useV2Quote";
import { formatUnitsShort, planIdOf, railDisplayName, railNameOf, type CheckedOffer } from "./widgetView";

export interface V2OffersFooterProps {
  withheld: CheckedWithheld[];
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

/** A held-back route a person may accept: warning or unpriced, with the policy version to accept, and passing the local check. */
export function acceptableWithheld(o: CheckedWithheld): boolean {
  const a = o.offer.journey.assessment;
  // The server says whether this app's key may commit it at all (an opt-in may refuse unpriced routes): never offer what it would refuse.
  return o.check.ok && o.offer.executableByApiKey !== false && (a?.status === "warning" || a?.status === "unpriced") && typeof a.policyVersion === "string";
}

/** A held-back route's reason in plain words (the server's reason codes are for integrators). */
export function heldBackReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  if (reason.startsWith("value_loss_blocked")) return "Fees and price impact would take too much of this amount. Try a larger amount.";
  if (reason.startsWith("value_loss_warning")) return "Fees and price impact are high for this amount.";
  if (reason.includes("unpriced")) return "EMPX can't price this token yet, so the route's value can't be checked.";
  return "The server held this route back.";
}

const chainName = (caip2: string) => v2ChainById(Number(caip2.split(":")[1]))?.name ?? caip2;

export default function V2OffersFooter(props: V2OffersFooterProps) {
  const { withheld, substitutes, twoHop, selectedPlanId, twoHopSelected, onPickTwoHop, ticker, onPick } = props;
  const below = props.belowMinimum ?? [];
  const subs = substitutes.filter((s) => s.offers.length > 0);
  if (!twoHop && withheld.length === 0 && subs.length === 0 && below.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
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
      {withheld.length > 0 && (
        <Group label="Held-back routes">
          {withheld.map((o) => {
            const a = o.offer.journey.assessment;
            const ok = acceptableWithheld(o);
            return (
              <OfferRow
                key={planIdOf(o.offer)}
                o={o}
                ticker={ticker}
                selected={planIdOf(o.offer) === selectedPlanId}
                tag={a?.status === "blocked" ? "Blocked" : a?.status === "warning" ? "High cost" : a?.status === "unpriced" ? "Unpriced" : "Held back"}
                tone={a?.status === "blocked" ? wk.bad : wk.warn}
                note={!o.check.ok && o.offer.execution && a?.status !== "unpriced" ? o.check.problems[0] : heldBackReason(a?.reason ?? a?.status)}
                action={ok ? "Accept route" : undefined}
                onPick={onPick}
              />
            );
          })}
        </Group>
      )}
      {subs.length > 0 && (
        <Group label="Delivers another token">
          {subs.flatMap((s) =>
            s.offers.map((o) => (
              <OfferRow
                key={planIdOf(o.offer)}
                o={o}
                ticker={ticker}
                selected={planIdOf(o.offer) === selectedPlanId}
                tag={`Delivers ${ticker(s.asset)}`}
                tone={wk.warn}
                note={o.check.ok ? undefined : o.check.problems[0]}
                action={o.check.ok ? "Use this route" : undefined}
                onPick={onPick}
              />
            )),
          )}
        </Group>
      )}
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

function OfferRow(p: {
  o: CheckedOffer;
  ticker: (asset: string) => string;
  selected: boolean;
  tag: string;
  tone: string;
  note?: string;
  action?: string;
  onPick: (planId: string) => void;
}) {
  const j = p.o.offer.journey;
  const out = j.minimumOutput ?? j.expectedOutput;
  const name = railNameOf(p.o.offer);
  const icon = railIconUrl(name);
  return (
    <div
      style={{
        border: `1px solid ${p.selected ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .5)" : wk.border}`, borderRadius: 5, padding: "11px 12px 12px",
        background: p.selected ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .055)" : "transparent",
        display: "flex", flexDirection: "column", gap: 8, fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {icon ? (
            <span style={{ width: 16, height: 16, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,.05)", flexShrink: 0 }}>
              <img src={icon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </span>
          ) : (
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "#93C5FD", boxShadow: "0 0 6px #93C5FD", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: wk.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: p.tone, textTransform: "uppercase", letterSpacing: "0.14em", flexShrink: 0 }}>{p.tag}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 10, color: wk.t3 }}>{j.minimumOutput ? "At least" : "About"}</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, color: wk.t1, letterSpacing: "-.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {formatUnitsShort(out)} <span style={{ fontSize: 11, color: wk.t3 }}>{p.ticker(out.asset)}</span>
          </span>
          {p.note && <span style={{ fontSize: 10, lineHeight: 1.5, color: wk.t3 }}>{p.note}</span>}
        </div>
        {p.action && (
          <button
            type="button"
            disabled={p.selected}
            onClick={() => p.onPick(planIdOf(p.o.offer))}
            style={{
              flexShrink: 0, minHeight: 44, background: "none", border: `1px solid ${p.selected ? wk.orange : wk.borderStrong}`,
              borderRadius: 5, padding: "0 12px", color: p.selected ? wk.orange : wk.t2, fontSize: 11, fontWeight: 600, cursor: p.selected ? "default" : "pointer",
            }}
          >
            {p.selected ? "Selected" : p.action}
          </button>
        )}
      </div>
    </div>
  );
}
