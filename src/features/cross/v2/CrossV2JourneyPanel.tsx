// Progress of a two-order journey under the widget, in the same visual language as CrossV2ExecutionPanel: both legs, where the funds
// are right now (the server's word), and the one action the user has to take, if any. Signing is always the user's click.
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { MicroLabel, wk } from "../../../design-system/widgetKit";
import type { JourneyView } from "./types";
import type { V2JourneyState } from "./useV2Journey";
import { formatUnitsShort } from "./widgetView";

export interface CrossV2JourneyPanelProps {
  journeyId: string;
  j: V2JourneyState;
  fromChain: string;
  viaChain: string;
  toChain: string;
  ticker: (asset: string) => string;
  onDone: () => void;
}

const chainName = (caip2: string) => getV2Chain(Number(caip2.split(":")[1]))?.name ?? caip2;

function fundsText(v: JourneyView, via: string): string {
  switch (v.funds) {
    case "source":
      return "Your funds are still in your wallet.";
    case "in_transit_first_leg":
      return `Your funds are on their way to your wallet on ${via} (first order).`;
    case "with_user_at_intermediate":
      return `Your funds are in your own wallet on ${via}, waiting for the second order.`;
    case "in_transit_second_leg":
      return "Your funds are on their way to the recipient (second order).";
    case "delivered_to_recipient":
      return "Delivered to the recipient.";
  }
}

const legTone = (status: string | undefined) =>
  status === "delivered" || status === "claimed" ? wk.ok : status === "failed" || status === "refunded" ? wk.bad : status ? wk.orange : wk.t3;

export default function CrossV2JourneyPanel({ journeyId, j, fromChain, viaChain, toChain, ticker, onDone }: CrossV2JourneyPanelProps) {
  const v = j.detail?.view;
  const via = chainName(v?.received?.chain ?? viaChain);
  const done = v?.state === "completed";
  const action = v?.nextAction;
  // Shown only when an order spending the received asset states its decimals: a guessed unit would misstate the amount.
  const receivedDecimals = j.detail?.next?.execution.plan.journey.from.decimals ?? j.newTerms?.offer.journey.input.decimals;
  return (
    <section aria-label="Two-step transfer" data-testid="cross-v2-journey" style={{ width: "100%", maxWidth: wk.columnWidth, marginTop: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <MicroLabel>Two-step transfer</MicroLabel>
      </div>
      <div style={{ border: `1px solid ${wk.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Leg n={1} label={`${chainName(fromChain)} → ${via}`} status={v?.hop1?.status} />
        <Leg n={2} label={`${via} → ${chainName(toChain)}`} status={v?.hop2?.status ?? (v ? "not started" : undefined)} />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: wk.t1 }}>{j.stepNote ?? (v ? fundsText(v, via) : "Loading the journey…")}</p>
        {v?.received && receivedDecimals !== undefined && (
          <Row label={`Received on ${via}`} value={`${formatUnitsShort({ amount: v.received.amount, decimals: receivedDecimals })} ${ticker(v.received.asset)}`} />
        )}
        {v?.reason && <Row label="Note" value={v.reason} tone={wk.warn} />}
        {action === "review" && <Row label="Needs review" value={`Contact support with journey ${journeyId}. Your funds are not lost.`} tone={wk.warn} />}
        {j.newTerms && (
          <Row
            label="New terms"
            value={`${j.newTerms.offer.journey.minimumOutput ? "At least" : "About"} ${formatUnitsShort(j.newTerms.offer.journey.minimumOutput ?? j.newTerms.offer.journey.expectedOutput)} ${ticker(j.newTerms.offer.journey.toAsset)}`}
          />
        )}
        <Row label="Journey" value={journeyId} mono />
        {j.error && (
          <p role="alert" style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: "#FCA5A5" }}>
            {j.error}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {action === "sign_hop1" && <Action primary label="Sign the first order" busy={j.busy} onClick={j.signNext} />}
          {action === "sign_hop2" && <Action primary label="Sign the second order" busy={j.busy} onClick={j.signNext} />}
          {action === "restart_hop2" && !j.newTerms && <Action primary label="Get new terms" busy={j.busy} onClick={j.fetchNewTerms} />}
          {action === "restart_hop2" && j.newTerms && <Action primary label="Accept new terms" busy={j.busy} onClick={j.acceptNewTerms} />}
          {(done || action === "none") && <Action label="New transfer" busy={false} onClick={onDone} />}
        </div>
      </div>
    </section>
  );
}

function Leg({ n, label, status }: { n: number; label: string; status?: string }) {
  const tone = legTone(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: tone, boxShadow: `0 0 10px ${tone}` }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: wk.t1 }}>
        Order {n} · {label}
      </span>
      <span style={{ marginLeft: "auto", fontSize: 11, color: wk.t2 }}>{status ?? "—"}</span>
    </div>
  );
}

function Row({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11 }}>
      <span style={{ color: wk.t3, flexShrink: 0 }}>{label}</span>
      <span style={{ color: tone ?? wk.t2, textAlign: "right", wordBreak: "break-all", fontFamily: mono ? "ui-monospace, monospace" : undefined }}>{value}</span>
    </div>
  );
}

function Action({ label, onClick, busy, primary }: { label: string; onClick: () => void; busy: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      style={{
        minHeight: 44, borderRadius: 8, padding: "0 16px", fontSize: 12, cursor: busy ? "default" : "pointer",
        background: primary ? wk.orange : "none", color: primary ? "#05050c" : wk.t2,
        border: `1px solid ${primary ? wk.orange : wk.borderStrong}`, fontWeight: primary ? 600 : 400, opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "Working…" : label}
    </button>
  );
}
