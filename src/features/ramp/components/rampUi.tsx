// Styled primitives for the ramp's secondary panels, in the widget kit's palette and type.
import { useState, type CSSProperties, type ReactNode } from "react";
import { wk } from "../../../design-system/widgetKit";

const INTER = "Inter, sans-serif";

export function RampCard({ title, note, children, label }: { title: string; note?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <section
      aria-label={label}
      style={{
        width: "100%", maxWidth: wk.columnWidth, boxSizing: "border-box",
        padding: "20px 22px", border: `1px solid ${wk.border}`, borderRadius: 6,
        background: "rgba(255,255,255,.02)", fontFamily: INTER,
        display: "flex", flexDirection: "column", gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase", color: wk.t1 }}>{title}</h3>
        {note && <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: wk.t3 }}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function RampCollapsible({ title, note, children, label }: { title: string; note?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <details
      aria-label={label}
      style={{
        width: "100%", maxWidth: wk.columnWidth, boxSizing: "border-box",
        padding: "16px 22px", border: `1px solid ${wk.border}`, borderRadius: 6,
        background: "rgba(255,255,255,.02)", fontFamily: INTER,
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase", color: wk.t2 }}><span style={{ marginLeft: 8 }}>{title}</span></summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        {note && <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: wk.t3 }}>{note}</p>}
        {children}
      </div>
    </details>
  );
}

export function RampText({ children, tone = "muted", role }: { children: ReactNode; tone?: "muted" | "strong" | "bad"; role?: string }) {
  const color = tone === "bad" ? "#F87171" : tone === "strong" ? wk.t1 : wk.t2;
  return <p role={role} style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color, overflowWrap: "anywhere" }}>{children}</p>;
}

export function RampActions({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

export function RampButton({ children, onClick, disabled, primary }: { children: ReactNode; onClick?: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 34, padding: "0 14px", borderRadius: 4, fontFamily: INTER,
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "background .15s, border-color .15s",
        ...(primary
          ? { background: wk.orange, color: "#08080e", border: "none" }
          : { background: "rgba(255,255,255,.04)", color: wk.t1, border: `1px solid ${wk.borderStrong}` }),
      }}
    >
      {children}
    </button>
  );
}

const control: CSSProperties = {
  width: "100%", boxSizing: "border-box", height: 36, padding: "0 12px",
  background: "rgba(255,255,255,.03)", border: `1px solid ${wk.borderStrong}`, borderRadius: 4,
  color: wk.t1, fontFamily: INTER, fontSize: 12.5, outline: "none", colorScheme: "dark",
};

export const rampInput = control;
export const rampSelect: CSSProperties = { ...control, appearance: "auto" };

export function RampField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: INTER }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: wk.t3 }}>{label}</span>
      {children}
    </label>
  );
}

export function RampChecks({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset style={{ margin: 0, padding: 0, border: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <legend style={{ padding: 0, marginBottom: 8, fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: wk.t3 }}>{legend}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </fieldset>
  );
}

export function RampCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px",
        borderRadius: 4, cursor: "pointer", fontFamily: INTER, fontSize: 11, color: checked ? wk.t1 : wk.t2,
        border: `1px solid ${checked ? wk.orange : wk.borderStrong}`, background: checked ? "rgba(255,138,0,.08)" : "transparent",
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#FF8A00", margin: 0 }} />
      {label}
    </label>
  );
}

export type RampStepStatus = "done" | "active" | "todo" | "error";

/** One row of the guided checklist: number badge, title, one-line summary, and the active step's body. */
export function RampStep({ index, title, status, summary, children }: {
  index: number; title: string; status: RampStepStatus; summary?: ReactNode; children?: ReactNode;
}) {
  const badge = status === "done" ? "✓" : status === "error" ? "!" : String(index);
  const tone = status === "done" ? wk.ok : status === "error" ? "#F87171" : status === "active" ? wk.orange : wk.t4;
  return (
    <div style={{ display: "flex", gap: 14, fontFamily: INTER }}>
      <span
        aria-hidden
        style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: status === "todo" ? wk.t3 : "#08080e",
          background: status === "todo" ? "transparent" : tone, border: `1px solid ${tone}`,
        }}
      >
        {badge}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: 1, paddingTop: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: status === "todo" ? wk.t3 : wk.t1 }}>{title}</span>
          {summary && <span style={{ fontSize: 11, color: status === "done" ? wk.ok : wk.t3, textAlign: "right" }}>{summary}</span>}
        </div>
        {status === "active" || status === "error" ? children : null}
      </div>
    </div>
  );
}

/** Label / value row with an optional copy button, for deposit instructions. */
export function RampCopyRow({ label, value, display, copy = true }: { label: string; value: string; display?: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: INTER }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: wk.t3 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: wk.t1, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", textAlign: "right" }}>{display ?? value}</span>
        {copy && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            style={{ height: 24, padding: "0 8px", borderRadius: 4, border: `1px solid ${wk.borderStrong}`, background: "transparent", color: copied ? wk.ok : wk.t2, fontSize: 10, cursor: "pointer", fontFamily: INTER }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </span>
    </div>
  );
}

export function shortAddress(value: string): string {
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
