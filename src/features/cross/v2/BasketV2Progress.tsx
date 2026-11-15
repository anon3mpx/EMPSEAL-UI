import { useState } from "react";
import type { BasketView, LegView } from "./basketTypes";
import type { CrossV2Client } from "./client";
import { rememberIntent } from "./journeyStore";
import { MicroLabel, wk } from "../../../design-system/widgetKit";
import { columnStyle, formatAsset, LegRow, legDetails, Note, SmallButton } from "./MultiV2Panels";

export default function BasketV2Progress({
  view,
  client,
  wallet,
  busy,
  onRequote,
  onRunLeg,
  toAssetOf,
}: {
  view: BasketView;
  client: CrossV2Client;
  wallet?: string;
  busy: boolean;
  onRequote: (id: string) => Promise<void>;
  onRunLeg: (id: string) => Promise<void>;
  toAssetOf?: (legId: string) => string | undefined;
}) {
  const [error, setError] = useState<string | null>(null);
  async function openIntent(leg: LegView) {
    if (!wallet || !leg.intentId) return;
    try {
      const detail = await client.basketLegSteps(view.basketId, leg.legId);
      const p = detail.execution.plan;
      rememberIntent(wallet, {
        intentId: leg.intentId,
        createdAt: Date.now(),
        fromChain: p.journey.from.asset.split("/")[0]!,
        toChain: p.journey.toAsset.split("/")[0]!,
        toAsset: p.journey.toAsset,
        sourceTxs: [],
      });
      window.location.assign(`/cross-v2?engine=v2`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  const outcome = view.aggregate.outcome.replace(/_/g, " ");
  const totals = (
    [
      ["Inputs", view.aggregate.inputsByAsset],
      ["Worst-case fees", view.aggregate.worstCaseFeeByAsset],
      ["Delivered", view.aggregate.deliveredByAsset],
    ] as const
  ).filter(([, amounts]) => Object.keys(amounts).length > 0);
  return (
    <section aria-label="Basket progress" style={{ ...columnStyle, marginTop: 8 }}>
      <div style={{ height: 1, background: wk.border, margin: "8px 0 18px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MicroLabel>Basket · {outcome}</MicroLabel>
        <span style={{ fontSize: 10, color: wk.t3, fontVariantNumeric: "tabular-nums" }}>{view.basketId} · v{view.version}</span>
      </div>
      <Note>Legs settle independently. Some may finish while others fail.</Note>
      <div style={{ marginTop: 10 }}>
        {view.legs.map((leg, i) => (
          <LegRow
            key={leg.legId}
            index={i}
            state={leg.intentStatus ?? leg.state}
            fromAsset={leg.input?.asset}
            fromAmount={leg.input?.amount}
            toAsset={leg.delivered?.asset ?? toAssetOf?.(leg.legId)}
            toAmount={leg.delivered?.amount ?? leg.quotedOut ?? undefined}
            details={[...(leg.delivered ? ["Delivered"] : leg.quotedOut ? ["Quoted"] : []), ...legDetails(leg)]}
            reason={leg.reason}
            actions={
              <>
                {leg.nextAction === "requote" && <SmallButton disabled={busy} onClick={() => void onRequote(leg.legId)}>Re-quote</SmallButton>}
                {(leg.nextAction === "commit" || leg.nextAction === "sign") && (
                  <SmallButton tone="accent" disabled={busy} onClick={() => void onRunLeg(leg.legId)}>Continue leg {i + 1}</SmallButton>
                )}
                {(leg.nextAction === "claim" || leg.nextAction === "recover") && leg.intentId && (
                  <SmallButton tone="accent" onClick={() => void openIntent(leg)}>{leg.nextAction === "claim" ? "Claim" : "Recover"}</SmallButton>
                )}
              </>
            }
          />
        ))}
      </div>
      {totals.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${wk.border}`, paddingTop: 12 }}>
          {totals.map(([label, amounts]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 10.5 }}>
              <span style={{ color: wk.t3 }}>{label}</span>
              <span style={{ color: wk.t1, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {Object.entries(amounts).map(([asset, amount]) => formatAsset(asset, amount)).join(" + ")}
              </span>
            </div>
          ))}
        </div>
      )}
      {view.aggregate.unknownLegs.length > 0 && <Note tone="warn">Status unknown for: {view.aggregate.unknownLegs.join(", ")}</Note>}
      {error && <Note tone="error" role="alert">{error}</Note>}
    </section>
  );
}
