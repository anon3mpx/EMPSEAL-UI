import { useState } from "react";
import type { BasketView, LegView } from "./basketTypes";
import type { CrossV2Client } from "./client";
import { rememberIntent } from "./journeyStore";
import { tickerOf } from "./offerView";

export default function BasketV2Progress({
  view,
  client,
  wallet,
  busy,
  onRequote,
  onRunLeg,
}: {
  view: BasketView;
  client: CrossV2Client;
  wallet?: string;
  busy: boolean;
  onRequote: (id: string) => Promise<void>;
  onRunLeg: (id: string) => Promise<void>;
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
  return (
    <section aria-label="Basket progress">
      <h2>Basket {view.aggregate.outcome}</h2>
      <p>Legs settle independently. Some may finish while others fail.</p>
      <p>
        {view.basketId} · version {view.version}
      </p>
      {view.legs.map((leg) => (
        <article key={leg.legId} style={{ margin: "16px 0" }}>
          <strong>{leg.legId}</strong> · {leg.state}
          {leg.intentStatus ? ` / ${leg.intentStatus}` : ""}
          {leg.reason && <p>{leg.reason}</p>}
          {leg.delivered && (
            <p>
              Delivered: {leg.delivered.amount} base units · {tickerOf(leg.delivered.asset)}
            </p>
          )}
          {leg.nextAction === "requote" && (
            <button disabled={busy} onClick={() => void onRequote(leg.legId)}>
              Re-quote
            </button>
          )}
          {(leg.nextAction === "commit" || leg.nextAction === "sign") && (
            <button disabled={busy} onClick={() => void onRunLeg(leg.legId)}>
              Continue {leg.legId}
            </button>
          )}
          {(leg.nextAction === "claim" || leg.nextAction === "recover") && leg.intentId && (
            <a
              href="/cross-v2?engine=v2"
              onClick={(e) => {
                e.preventDefault();
                void openIntent(leg);
              }}
            >
              {leg.nextAction === "claim" ? "Claim" : "Recover"}
            </a>
          )}
        </article>
      ))}
      <h3>Aggregate</h3>
      {(
        [
          ["Inputs", view.aggregate.inputsByAsset],
          ["Worst-case fees", view.aggregate.worstCaseFeeByAsset],
          ["Delivered", view.aggregate.deliveredByAsset],
        ] as const
      ).map(([label, amounts]) => (
        <div key={label}>
          <strong>{label}</strong>
          {Object.entries(amounts).map(([asset, amount]) => (
            <p key={asset}>
              {amount} base units · {asset}
            </p>
          ))}
        </div>
      ))}
      {view.aggregate.unknownLegs.length > 0 && <p>Unknown legs: {view.aggregate.unknownLegs.join(", ")}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
