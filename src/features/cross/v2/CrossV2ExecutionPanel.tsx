// Execution + tracking under the widget, in the V1 page's visual language: V1's three stages (Payment, Settlement, Delivery) filled from the
// server's intent status, explorer links for the transactions, the claim for a parked delivery, and a copyable support reference.
// It shows what the server reports; delivery is never inferred from a signature or a transaction.
import { getExplorerTxUrl } from "../../../design-system/data/explorers";
import { MicroLabel, wk } from "../../../design-system/widgetKit";
import { statusLabel } from "./offerView";
import type { IntentStatus } from "./types";

export interface CrossV2ExecutionPanelProps {
  stepNote: string | null;
  intentId: string | null;
  status: IntentStatus | null;
  delivered: string | null;
  error: string | null;
  /** `x-request-id` of the failed call, for support. */
  errorRef?: string;
  /** Source transactions this page sent (shown before the server lists them). */
  sentTxs?: Array<{ chainId: number; hash: string }>;
  canClaim?: boolean;
  claiming?: boolean;
  onClaim?: () => void;
  onDone: () => void;
}

type StageState = "done" | "active" | "todo" | "warn" | "bad";
export interface Stage {
  label: string;
  state: StageState;
  note?: string;
}
const STAGE_ORDER = ["created", "submitted", "source_confirmed", "delivery_observed"];
const PAST_DELIVERY = new Set(["delivered", "claimed", "parked", "refunded"]);

/** V1's stages from the V2 status. `paid`: the page saw its source transaction, so a failure is placed after Payment. */
export function stagesOf(status: string | undefined, paid = false): Stage[] {
  const s = status ?? "created";
  const at = PAST_DELIVERY.has(s) ? 4 : s === "failed" ? (paid ? 2 : 0) : Math.max(0, STAGE_ORDER.indexOf(s));
  const st = (done: boolean, active: boolean): StageState => (done ? "done" : active ? "active" : "todo");
  const out: Stage[] = [
    { label: "Payment", state: st(at >= 2, at < 2) },
    { label: "Settlement", state: st(at >= 3, at === 2) },
    { label: "Delivery", state: st(s === "delivered" || s === "claimed", at === 3) },
  ];
  if (s === "parked") out[2] = { label: "Delivery", state: "warn", note: "Waiting to be claimed" };
  if (s === "refunded") out[2] = { label: "Delivery", state: "warn", note: "Refunded" };
  if (s === "failed") {
    const i = out.findIndex((x) => x.state === "active");
    out[i] = { ...out[i]!, state: "bad", note: "Failed" };
  }
  return out;
}

const TONE: Record<StageState, string> = { done: wk.ok, active: wk.orange, todo: wk.t3, warn: wk.warn, bad: wk.bad };
const NOTE: Partial<Record<StageState, string>> = { done: "Done", active: "In progress" };
const short = (h: string) => (h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h);

/** Page-sent and server-listed transactions, deduplicated by hash. */
export function txLinks(sent: Array<{ chainId: number; hash: string }>, status: IntentStatus | null) {
  const all = [
    ...sent.map((t) => ({ kind: "source" as const, chainId: t.chainId, hash: t.hash })),
    ...(status?.transactions ?? []).map((t) => ({ kind: t.kind, chainId: Number(/^eip155:(\d+)$/.exec(t.chain)?.[1]), hash: t.txHash })),
  ];
  return all.filter((t, i) => all.findIndex((x) => x.hash.toLowerCase() === t.hash.toLowerCase()) === i);
}

export default function CrossV2ExecutionPanel(p: CrossV2ExecutionPanelProps) {
  const { stepNote, intentId, status, delivered, error, onDone } = p;
  const finished = status ? ["delivered", "claimed", "refunded", "failed"].includes(status.status) : false;
  const sent = p.sentTxs ?? [];
  return (
    <section aria-label="Execution" data-testid="cross-v2-status" style={{ width: "100%", maxWidth: wk.columnWidth, marginTop: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <MicroLabel>Execution</MicroLabel>
      </div>
      <div style={{ border: `1px solid ${wk.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {stepNote && <span style={{ fontSize: 13, fontWeight: 600, color: wk.t1 }}>{stepNote}</span>}
        {!intentId && !stepNote && !error && <span style={{ fontSize: 13, color: wk.t2 }}>Preparing</span>}
        {intentId &&
          stagesOf(status?.status, sent.length > 0).map((st) => (
            <div key={st.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: TONE[st.state], boxShadow: st.state === "todo" ? "none" : `0 0 10px ${TONE[st.state]}` }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: st.state === "todo" ? wk.t3 : wk.t1 }}>{st.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: wk.t2 }}>{st.note ?? NOTE[st.state] ?? ""}</span>
            </div>
          ))}
        {status && <Row label="Status" value={statusLabel(status.status)} />}
        {intentId && <Row label="Transfer" value={intentId} mono />}
        {delivered && <Row label="Delivered" value={delivered} />}
        {txLinks(sent, status).map((t) => {
          const url = Number.isFinite(t.chainId) ? getExplorerTxUrl(t.chainId, t.hash) : null;
          const mono = { fontFamily: "ui-monospace, monospace" } as const;
          return (
            <div key={t.hash} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11 }}>
              <span style={{ color: wk.t3 }}>{t.kind === "source" ? "Source tx" : "Destination tx"}</span>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" title={t.hash} style={{ ...mono, color: wk.orange }}>
                  {short(t.hash)} ↗
                </a>
              ) : (
                <span title={t.hash} style={{ ...mono, color: wk.t2 }}>{short(t.hash)}</span>
              )}
            </div>
          );
        })}
        {status && status.anomalies.length > 0 && <Row label="Needs attention" value={status.anomalies.join("; ")} tone={wk.warn} />}
        {status?.status === "parked" && (
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: wk.t2 }}>
            The funds reached the destination but could not be delivered automatically. They are held for the recipient and can be claimed to the recipient's wallet.
          </p>
        )}
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: "#FCA5A5" }}>
            {error}
          </p>
        )}
        {p.errorRef && <CopyRow label="Support reference" value={p.errorRef} />}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {p.canClaim && <Button primary label={p.claiming ? "Claiming…" : "Claim to recipient"} disabled={Boolean(p.claiming)} onClick={() => p.onClaim?.()} />}
          {(finished || error) &&<Button label="New transfer" onClick={onDone} />}
        </div>
      </div>
    </section>
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

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, fontSize: 11 }}>
      <span style={{ color: wk.t3, flexShrink: 0 }}>{label}</span>
      <button
        type="button"
        title="Copy"
        onClick={() => void navigator.clipboard?.writeText(value).catch(() => undefined)}
        style={{ minHeight: 44, background: "none", border: "none", padding: 0, color: wk.t2, fontFamily: "ui-monospace, monospace", fontSize: 11, cursor: "pointer", wordBreak: "break-all", textAlign: "right" }}
      >
        {value} ⧉
      </button>
    </div>
  );
}

function Button({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 44, borderRadius: 8, padding: "0 16px", fontSize: 12, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
        background: primary ? wk.orange : "none", color: primary ? "#05050c" : wk.t2, border: `1px solid ${primary ? wk.orange : wk.borderStrong}`, fontWeight: primary ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
