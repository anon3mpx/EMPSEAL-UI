// ─── EmpxMultiWidget — IntentBasket composer, locked single-column shape ───
//
// Ported from public/multi-drafts.html (owner-approved 2026-08-23). Purely
// presentational: MultiPage.tsx keeps every real behaviour — the four
// BasketMode structural rules, allocation-bps math, DefiLlama pricing,
// BASKET_LIMITS cap checks, the demo quote engine — and only the render
// layer changed, same approach as the cross and gas ports.
//
// Shape, and why:
//   - Mode switcher is WidgetTabs (underline), never a filled segmented
//     control: the frameless decision removes pill backgrounds from
//     navigation. `dense` is on because four tabs overflow a 375px viewport.
//   - Leg rows are frameless — separation comes from 26px gaps, not a
//     border-bottom per row. Eight hairlines on one surface is exactly what
//     "one hairline, structure from gaps" rules out.
//   - Token selectors are the locked TokenIdentityRow in its `compact`
//     form; legs stack, so the two-line variant is reserved for surfaces
//     where it earns the height.
//   - Liquidator selection reads from a background wash, not a checkbox
//     border — the same correction already applied to TokenPicker's recent
//     chips (a8f2de5).
//   - Explanatory prose lives behind one Disclosure. The locked widgets
//     carry no standing paragraphs.

import { ReactNode } from "react";
import TouchTooltip from "../components/TouchTooltip";
import {
  ChainPill,
  Disclosure,
  LogoFrame,
  MicroLabel,
  TokenIdentityRow,
  ToggleRow,
  WidgetCTA,
  WidgetShell,
  WidgetTabs,
  eyebrow,
  grid2,
  numeral,
  rule,
  wk,
  type CtaState,
} from "./widgetKit";

export type MultiMode = "multi-to-one" | "one-to-many" | "wallet-liquidator" | "many-to-many";

export interface MultiChain {
  id: number;
  name: string;
  color?: string;
  logoUrl?: string;
}

export interface MultiToken {
  ticker: string;
  name?: string;
  logoUrl?: string;
}

export interface MultiInputLeg {
  id: string;
  chain: MultiChain;
  token: MultiToken;
  amount: string;
  usdValue: number;
}

export interface MultiOutputLeg {
  id: string;
  chain: MultiChain;
  token: MultiToken;
  /** one-to-many / many-to-many express the output as a share, not a figure. */
  allocationBps?: number;
  /** multi-to-one / liquidator converge to a single computed figure. */
  convergedAmount?: string;
  convergedUsd?: number;
  gasTopUpEnabled?: boolean;
}

export interface MultiScanRow {
  id: string;
  token: MultiToken;
  chainName: string;
  amount: string;
  usdValue: number;
  selected: boolean;
}

export interface EmpxMultiWidgetProps {
  mode: MultiMode;
  onModeChange: (m: MultiMode) => void;
  /** One-line shape hint under the tabs, e.g. "N tokens → 1 target". */
  modeSubtitle: string;
  /** Full explanation + worked example, shown only inside the disclosure. */
  modeBlurb: string;
  modeExample: string[];

  legCount: number;
  maxLegs: number;

  inputs: MultiInputLeg[];
  onInputAmountChange: (id: string, v: string) => void;
  onSelectInputChain: (id: string) => void;
  onSelectInputToken: (id: string) => void;
  onRemoveInput: (id: string) => void;
  onAddInput: () => void;
  canAddInput: boolean;

  outputs: MultiOutputLeg[];
  onOutputAllocationChange: (id: string, pct: number) => void;
  onSelectOutputChain: (id: string) => void;
  onSelectOutputToken: (id: string) => void;
  onRemoveOutput: (id: string) => void;
  onAddOutput: () => void;
  canAddOutput: boolean;
  onToggleGasTopUp: (id: string) => void;

  /** Liquidator only — replaces the inputs section entirely. */
  scanRows: MultiScanRow[];
  onToggleScanRow: (id: string) => void;
  onRescan: () => void;
  scanning?: boolean;

  totalFeeUSD?: number;
  feeBps?: number;
  estimatedTime?: string;
  etaNote?: string;
  /** Set when the basket cannot proceed — becomes the CTA's stated reason. */
  blockedReason?: string;

  walletConnected?: boolean;
  onConnect?: () => void;
  onReview: () => void;
}

const MODE_TABS: { value: MultiMode; label: string }[] = [
  { value: "multi-to-one", label: "Multiswap" },
  { value: "one-to-many", label: "Split" },
  { value: "wallet-liquidator", label: "Liquidator" },
  { value: "many-to-many", label: "Rebalance" },
];

export default function EmpxMultiWidget({
  mode, onModeChange, modeSubtitle, modeBlurb, modeExample,
  legCount, maxLegs,
  inputs, onInputAmountChange, onSelectInputChain, onSelectInputToken, onRemoveInput, onAddInput, canAddInput,
  outputs, onOutputAllocationChange, onSelectOutputChain, onSelectOutputToken, onRemoveOutput, onAddOutput, canAddOutput, onToggleGasTopUp,
  scanRows, onToggleScanRow, onRescan, scanning,
  totalFeeUSD, feeBps, estimatedTime, etaNote, blockedReason,
  walletConnected = true, onConnect, onReview,
}: EmpxMultiWidgetProps) {
  const isLiquidator = mode === "wallet-liquidator";
  const usesAllocation = mode === "one-to-many" || mode === "many-to-many";

  const anyAmount = isLiquidator
    ? scanRows.some((r) => r.selected)
    : inputs.some((i) => Number((i.amount || "0").replace(/,/g, "")) > 0);

  const ctaState: CtaState = !walletConnected ? "connect"
    : !anyAmount ? "idle"
    : blockedReason ? "blocked"
    : "ready";

  const ctaLabel = {
    connect: "Connect wallet",
    idle: isLiquidator ? "Select tokens to sweep" : "Enter an amount",
    blocked: blockedReason ?? "Unavailable",
    ready: `Review basket · ${legCount} leg${legCount === 1 ? "" : "s"}`,
    working: "Working",
    done: "Done",
  }[ctaState];

  return (
    <WidgetShell edge>
      {/* Header — eyebrow + live leg count against the real cap */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={eyebrow}>Multi</span>
        <span style={{ fontSize: 10, color: legCount > maxLegs ? wk.bad : wk.t3, fontVariantNumeric: "tabular-nums" }}>
          {legCount} of {maxLegs} legs
        </span>
      </div>

      <WidgetTabs options={MODE_TABS} active={mode} onChange={onModeChange} dense />
      <p style={{ margin: "12px 0 0", fontSize: 10.5, color: wk.t3 }}>{modeSubtitle}</p>

      <Disclosure label="How this works">
        <p style={{ margin: "0 0 8px", fontSize: 10.5, color: wk.t3, lineHeight: 1.65 }}>{modeBlurb}</p>
        {modeExample.map((line, i) => (
          <p key={i} style={{ margin: "0 0 8px", fontSize: 10.5, color: wk.t3, lineHeight: 1.65 }}>
            <b style={{ color: wk.t2, fontWeight: 500 }}>{i + 1}.</b> {line}
          </p>
        ))}
      </Disclosure>

      <div style={rule} />

      {/* ── Inputs, or the liquidator scan that replaces them ── */}
      {isLiquidator ? (
        <>
          <SectionHead
            label={`Wallet scan · ${scanRows.length} found`}
            action={<QuietButton onClick={onRescan} disabled={scanning}>{scanning ? "Scanning…" : "Re-scan"}</QuietButton>}
          />
          <p style={{ margin: "2px 0 10px", fontSize: 10, color: wk.t3, lineHeight: 1.6 }}>
            Tap to include or preserve. Only included tokens get swept — anything you leave out stays in your wallet.
          </p>
          {scanRows.map((r) => (
            <ScanRow key={r.id} row={r} onToggle={() => onToggleScanRow(r.id)} />
          ))}
        </>
      ) : (
        <>
          <SectionHead
            label={inputs.length === 1 ? "Input" : `Inputs · ${inputs.length}`}
            action={<QuietButton onClick={onAddInput} disabled={!canAddInput}>+ Add input</QuietButton>}
          />
          {inputs.map((leg, i) => (
            <div key={leg.id} style={{ padding: "13px 0" }}>
              <LegHead
                index={`In · ${i + 1}`}
                chain={leg.chain}
                onSelectChain={() => onSelectInputChain(leg.id)}
                onRemove={inputs.length > 1 ? () => onRemoveInput(leg.id) : undefined}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <TokenIdentityRow
                  compact
                  logo={leg.token.logoUrl}
                  name={leg.token.ticker}
                  onClick={() => onSelectInputToken(leg.id)}
                />
                <input
                  value={leg.amount}
                  onChange={(e) => onInputAmountChange(leg.id, e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  aria-label={`Input ${i + 1} amount`}
                  style={{
                    ...numeral(28), background: "transparent", border: "none", outline: "none",
                    flex: 1, minWidth: 0, padding: 0, textAlign: "right",
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: wk.t3, textAlign: "right", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                ≈ ${leg.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={rule} />

      {/* ── Outputs ── */}
      <SectionHead
        label={usesAllocation ? `Outputs · allocation` : "Output"}
        action={<QuietButton onClick={onAddOutput} disabled={!canAddOutput}>+ Add output</QuietButton>}
      />
      {outputs.map((leg, i) => (
        <div key={leg.id} style={{ padding: "13px 0" }}>
          <LegHead
            index={`Out · ${i + 1}`}
            chain={leg.chain}
            onSelectChain={() => onSelectOutputChain(leg.id)}
            onRemove={outputs.length > 1 ? () => onRemoveOutput(leg.id) : undefined}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <TokenIdentityRow
              compact
              logo={leg.token.logoUrl}
              name={leg.token.ticker}
              onClick={() => onSelectOutputToken(leg.id)}
            />
            {usesAllocation ? (
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3, justifyContent: "flex-end", flex: 1 }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={leg.allocationBps != null ? leg.allocationBps / 100 : 0}
                  onChange={(e) => onOutputAllocationChange(leg.id, Number(e.target.value))}
                  aria-label={`Output ${i + 1} allocation percent`}
                  style={{
                    ...numeral(28, true), background: "transparent", border: "none", outline: "none",
                    width: 88, padding: 0, textAlign: "right",
                  }}
                />
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300, fontSize: 19, color: wk.t3 }}>%</span>
              </span>
            ) : (
              <span style={{ ...numeral(28, true), flex: 1, textAlign: "right" }}>
                {leg.convergedAmount ?? "0"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: wk.t3, textAlign: "right", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {usesAllocation
              ? `${((leg.allocationBps ?? 0) / 100).toFixed(2)}% allocation`
              : leg.convergedUsd != null
                ? `≈ $${leg.convergedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} · converged`
                : " "}
          </div>
          <ToggleRow
            title="Gas top-up on arrival"
            hint={`Deliver a little native ${leg.chain.name} gas alongside the swap, via the Gas.zip side-leg.`}
            enabled={!!leg.gasTopUpEnabled}
            onToggle={() => onToggleGasTopUp(leg.id)}
          />
        </div>
      ))}

      <div style={rule} />

      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Total cost</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {totalFeeUSD != null ? `$${totalFeeUSD.toFixed(2)}` : "—"}
          </div>
          {feeBps != null && (
            <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>
              {feeBps} bps avg · {legCount} leg{legCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
        <div>
          <MicroLabel>Arrives in</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {estimatedTime ?? "—"}
          </div>
          {etaNote && <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{etaNote}</div>}
        </div>
      </div>

      <WidgetCTA
        state={ctaState}
        label={ctaLabel}
        onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onReview : undefined}
      />

      <p style={{ margin: "11px 0 0", fontSize: 9.5, color: wk.t3, lineHeight: 1.6, textAlign: "center" }}>
        Each leg settles through the same pipeline as a standalone swap.
      </p>
    </WidgetShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionHead({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <MicroLabel>{label}</MicroLabel>
      {action}
    </div>
  );
}

/** Quiet utility button — geometry matches QuoteStatusRow's refresh control. */
function QuietButton({
  children, onClick, disabled,
}: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 3, background: "transparent",
        border: `1px solid ${wk.borderStrong}`, color: wk.t3,
        fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1, transition: ".2s",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.color = wk.t1; e.currentTarget.style.borderColor = "rgba(255,138,0,.4)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.color = wk.t3; e.currentTarget.style.borderColor = wk.borderStrong; }}
    >
      {children}
    </button>
  );
}

function LegHead({
  index, chain, onSelectChain, onRemove,
}: { index: string; chain: MultiChain; onSelectChain: () => void; onRemove?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
      <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: wk.t4 }}>
        {index}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <ChainPill logo={chain.logoUrl} name={chain.name} onClick={onSelectChain} />
        {onRemove && (
          <TouchTooltip content={`Remove ${index}`}>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${index}`}
              style={{
                width: 26, height: 26, border: "none", background: "transparent", borderRadius: 4,
                color: wk.t4, cursor: "pointer", fontSize: 14, lineHeight: 1,
                display: "grid", placeItems: "center", transition: ".16s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FCA5A5"; e.currentTarget.style.background = "rgba(239,68,68,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = wk.t4; e.currentTarget.style.background = "transparent"; }}
            >
              ×
            </button>
          </TouchTooltip>
        )}
      </span>
    </div>
  );
}

/** Selection reads from a background wash — no per-row checkbox outline. */
function ScanRow({ row, onToggle }: { row: MultiScanRow; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 11, width: "calc(100% + 16px)",
        padding: "9px 8px", marginLeft: -8, borderRadius: 4, border: "none",
        background: row.selected ? "rgba(255,138,0,.055)" : "transparent",
        cursor: "pointer", textAlign: "left", transition: "background .16s",
        fontFamily: "Inter, sans-serif",
      }}
      onMouseEnter={(e) => { if (!row.selected) e.currentTarget.style.background = "rgba(255,255,255,.035)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = row.selected ? "rgba(255,138,0,.055)" : "transparent"; }}
    >
      <LogoFrame src={row.token.logoUrl} size={30} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: row.selected ? wk.t1 : wk.t2, lineHeight: 1.15 }}>
          {row.token.ticker}
        </span>
        <span style={{ fontSize: 10, color: wk.t3, lineHeight: 1.15 }}>
          {row.chainName}{row.selected ? "" : " · preserved"}
        </span>
      </span>
      <span style={{ textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300, fontSize: 14, color: row.selected ? wk.t1 : wk.t2 }}>
          {row.amount}
        </span>
        <span style={{ display: "block", fontSize: 9.5, color: wk.t3, marginTop: 2 }}>
          ${row.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </span>
      <span style={{ width: 14, flexShrink: 0, fontSize: 11, color: wk.orange, textAlign: "center" }}>
        {row.selected ? "✓" : ""}
      </span>
    </button>
  );
}
