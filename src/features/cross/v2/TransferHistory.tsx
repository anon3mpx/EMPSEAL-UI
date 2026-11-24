// The wallet's earlier transfers, under the Execution panel: route, token, when, and the last status the page saw. Nothing opens by itself;
// Track opens one in the Execution panel, which then polls the server (the status is the server's word, this list only remembers it).
import { useState } from "react";
import { MicroLabel, wk } from "../../../design-system/widgetKit";
import { v2ChainById } from "./assets";
import type { StoredIntent } from "./journeyStore";
import { chainIdOfCaip2 } from "./nonEvm";
import { statusLabel } from "./offerView";

const SHOWN = 5;
const FINAL = new Set(["delivered", "claimed", "refunded", "failed", "delivered_without_gas"]);

const chainName = (caip2: string) => {
  const id = chainIdOfCaip2(caip2);
  return (id !== undefined ? v2ChainById(id)?.name : undefined) ?? caip2;
};
const statusText = (s?: string) =>
  !s ? "Not checked yet" : s === "delivered_without_gas" ? "Delivered, gas top-up failed" : FINAL.has(s) ? statusLabel(s) : "In progress";
const when = (ms: number) => new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function TransferHistory(p: {
  entries: readonly StoredIntent[];
  activeId: string | null;
  onOpen: (e: StoredIntent) => void;
  ticker: (asset: string) => string;
}) {
  const [all, setAll] = useState(false);
  if (p.entries.length === 0) return null;
  const shown = all ? p.entries : p.entries.slice(0, SHOWN);
  return (
    <section aria-label="History" style={{ width: "100%", maxWidth: wk.columnWidth, marginTop: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <MicroLabel>History</MicroLabel>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, border: `1px solid ${wk.border}`, borderRadius: 10 }}>
        {shown.map((e, i) => {
          const open = e.intentId === p.activeId;
          const done = FINAL.has(e.lastStatus ?? "");
          return (
            <li key={e.intentId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${wk.border}` : "none" }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: wk.t1 }}>{chainName(e.fromChain)} → {chainName(e.toChain)} · {p.ticker(e.toAsset)}</span>
                <span style={{ fontSize: 10.5, color: wk.t3 }}>{when(e.createdAt)}</span>
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: done ? wk.t2 : wk.orange, whiteSpace: "nowrap" }}>{statusText(e.lastStatus)}</span>
              <button
                type="button"
                disabled={open}
                onClick={() => p.onOpen(e)}
                style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 11, background: "none", color: wk.t2, border: `1px solid ${wk.borderStrong}`, cursor: open ? "default" : "pointer", opacity: open ? 0.6 : 1 }}
              >
                {open ? "Open" : "Track"}
              </button>
            </li>
          );
        })}
      </ul>
      {!all && p.entries.length > SHOWN && (
        <button type="button" onClick={() => setAll(true)} style={{ marginTop: 8, minHeight: 32, background: "none", border: "none", padding: 0, fontSize: 11, color: wk.t2, cursor: "pointer" }}>
          Show all {p.entries.length}
        </button>
      )}
    </section>
  );
}
