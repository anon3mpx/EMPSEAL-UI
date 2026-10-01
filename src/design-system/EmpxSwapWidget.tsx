// ─── EmpxSwapWidget — same-chain swap, the pattern-setting surface ────────
//
// Layout ported from public/swap-experience.html (design-locked 2026-08-19):
// frameless, "You pay" input → "You receive" orange outcome numeral, route,
// cost + impact, then ONE CTA with the quote countdown as a 2px bar on its
// bottom edge, the quote row, and the min-received / slippage line.
//
// Data contract is the local one (ReactNode logos, SDK route hops / split
// branches, page-computed CTA state). Everything the locked layout added on
// top — quote lifecycle, slippage settings, chain switching, rate, notice —
// is optional, so /widget/swap (SwapEmbed) renders unchanged when it doesn't
// opt in.
//
// Quote lifecycle rule (owner decision): auto-refresh when the quote expires
// (60s for SDK quotes), manual refresh from 30s, and the swap stays enabled
// while the quote ages — blocking it would punish hesitation. The window
// comes from the quote itself, so a 30s local-fallback quote scales down
// rather than outliving useSwapExecution's expiry guard.

import { ReactNode, useState } from "react";
import TouchTooltip from "../components/TouchTooltip";
import { RouteVisualization, type RouteHop, type SplitBranch } from "./components";
import { useQuoteLifecycle } from "./hooks/useQuoteLifecycle";
import {
  ChainPill,
  ImpactMeter,
  LogoFrame,
  MicroLabel,
  QuoteStatusRow,
  TokenIdentityRow,
  WidgetCTA,
  WidgetShell,
  amountUsd,
  eyebrow,
  grid2,
  numeral,
  rule,
  unit,
  wk,
  type CtaState,
} from "./widgetKit";

export interface SwapToken {
  ticker: string;
  logo?: ReactNode;
  decimals?: number;
  address?: string;
}

export interface SwapChain {
  id: number;
  name: string;
  color?: string;
  logo?: ReactNode;
}

export interface SwapQuoteTiming {
  issuedAt?: number | null;
  validMs?: number | null;
  onRefresh: () => void;
  /** Hold auto-refresh — e.g. while the review modal is open. */
  paused?: boolean;
}

export interface SwapNotice {
  tone: "info" | "error";
  text: string;
}

export interface EmpxSwapWidgetProps {
  chain: SwapChain;
  /** Makes the chain pill a network switcher. */
  onSelectChain?: () => void;

  fromToken: SwapToken | null;
  fromAmount: string;
  fromBalance?: string;
  fromUsdValue?: number | null;
  onFromAmountChange: (v: string) => void;
  onSelectFromToken: () => void;
  onPercentClick?: (pct: number) => void;

  toToken: SwapToken | null;
  toAmount: string;
  toUsdValue?: number | null;
  onSelectToToken: () => void;
  /** e.g. "1 ETH = 3,184.2 USDC" — shown on the receive identity row. */
  rate?: string;

  pairType?: "V/V" | "V/S" | "S/S";
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bestRoute?: string;
  minimumReceived?: string;
  slippageBps?: number;
  /** When set, a settings toggle in the header lets the user edit slippage. */
  onSlippageChange?: (bps: number) => void;
  priceImpactBps?: number;

  routeHops?: RouteHop[];
  routeLabel?: string;
  splitBranches?: SplitBranch[];

  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  /** Quote age + refresh. Omit to hide the quote row and timer bar. */
  quote?: SwapQuoteTiming;
  /** One status line under the quote row (quote source, errors). */
  notice?: SwapNotice;

  walletConnected?: boolean;
  onConnect?: () => void;
}

const MANUAL_UNLOCK_MS = 30_000;
const SLIPPAGE_PRESETS_BPS = [10, 25, 50, 100];

function usdLine(value?: number | null) {
  return value != null ? `≈ $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " ";
}

export default function EmpxSwapWidget({
  chain,
  onSelectChain,
  fromToken,
  fromAmount,
  fromBalance,
  fromUsdValue,
  onFromAmountChange,
  onSelectFromToken,
  onPercentClick,
  toToken,
  toAmount,
  toUsdValue,
  onSelectToToken,
  rate,
  pairType,
  protocolFeeBps,
  protocolFeeUSD,
  bestRoute,
  minimumReceived,
  slippageBps,
  onSlippageChange,
  priceImpactBps,
  routeHops,
  routeLabel,
  splitBranches,
  swapDisabled,
  swapLoading,
  swapLabel = "Swap",
  onSwap,
  onFlip,
  quote,
  notice,
  walletConnected = true,
  onConnect,
}: EmpxSwapWidgetProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lifecycle = useQuoteLifecycle({
    issuedAt: quote?.issuedAt,
    validMs: quote?.validMs,
    onRefresh: quote?.onRefresh,
    autoRefresh: true,
    manualUnlockMs: quote?.validMs ? Math.min(MANUAL_UNLOCK_MS, quote.validMs / 2) : undefined,
    paused: quote?.paused,
  });

  const amountEntered = Number((fromAmount || "0").replace(/,/g, "")) > 0;
  const ctaState: CtaState = !walletConnected
    ? "connect"
    : swapLoading
      ? "working"
      : swapDisabled || !amountEntered
        ? "idle"
        : "ready";
  const ctaLabel =
    ctaState === "connect"
      ? "Connect wallet"
      : ctaState === "idle" && !amountEntered
        ? "Enter an amount"
        : swapLabel;

  const feeSub = [pairType?.replace("/", " / "), protocolFeeUSD != null ? `$${protocolFeeUSD.toFixed(2)}` : null]
    .filter(Boolean)
    .join(" · ");

  const hasRoute =
    !!routeLabel || !!bestRoute || (splitBranches?.length ?? 0) > 1 || (routeHops?.length ?? 0) > 1;

  return (
    <WidgetShell edge>
      {/* Header — eyebrow, the chain stated once, settings toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: settingsOpen ? 12 : 22 }}>
        <span style={eyebrow}>Swap</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <ChainPill
            logo={chain.logo}
            name={chain.name}
            fallbackLabel={chain.name.slice(0, 3).toUpperCase()}
            onClick={onSelectChain}
          />
          {onSlippageChange && (
            <SettingsToggle open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
          )}
        </span>
      </div>

      {settingsOpen && onSlippageChange && (
        <SlippageSettings valueBps={slippageBps ?? 50} onChange={onSlippageChange} />
      )}

      {/* ── You pay ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <MicroLabel>You pay</MicroLabel>
        {fromBalance && (
          <span style={{ fontSize: 10, color: wk.t3 }}>
            Balance {fromBalance}
            {onPercentClick && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => onPercentClick(100)}
                  style={{
                    background: "none",
                    border: "none",
                    color: wk.orange,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 10,
                    fontFamily: "inherit",
                  }}
                >
                  MAX
                </button>
              </>
            )}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <input
          value={fromAmount}
          onChange={(e) => onFromAmountChange(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.0"
          aria-label="Amount to pay"
          style={{ ...numeral(40), background: "transparent", border: "none", outline: "none", width: "100%", padding: 0 }}
        />
        <span style={unit}>{fromToken?.ticker ?? ""}</span>
      </div>
      <div style={amountUsd}>{usdLine(fromUsdValue)}</div>
      <TokenIdentityRow
        logo={fromToken?.logo}
        name={fromToken?.ticker ?? "Select a token"}
        sub={fromBalance ? `${fromBalance} available` : undefined}
        onClick={onSelectFromToken}
        ariaLabel={`Select from token${fromToken?.ticker ? `, current ${fromToken.ticker}` : ""}`}
      />

      {/* ── flip ── */}
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
        <TouchTooltip content="Flip tokens">
          <button
            type="button"
            onClick={onFlip}
            aria-label="Flip tokens"
            style={{
              width: 44,
              height: 44,
              border: "none",
              background: "transparent",
              borderRadius: 4,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: wk.t2,
              fontSize: 15,
              transition: ".2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = wk.orange;
              e.currentTarget.style.background = "rgba(255,255,255,.035)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = wk.t2;
              e.currentTarget.style.background = "transparent";
            }}
          >
            ↓
          </button>
        </TouchTooltip>
      </div>

      {/* ── You receive — the OUTCOME, one of orange's four roles ── */}
      <div style={{ marginBottom: 10 }}>
        <MicroLabel>You receive</MicroLabel>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={numeral(40, true)}>{toAmount || "0.0"}</span>
        <span style={unit}>{toToken?.ticker ?? ""}</span>
      </div>
      <div style={amountUsd}>{usdLine(toUsdValue)}</div>
      <TokenIdentityRow
        logo={toToken?.logo}
        name={toToken?.ticker ?? "Select a token"}
        sub={rate}
        onClick={onSelectToToken}
        ariaLabel={`Select to token${toToken?.ticker ? `, current ${toToken.ticker}` : ""}`}
      />

      <div style={rule} />

      {/* ── Route ── */}
      {hasRoute && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <MicroLabel>Route</MicroLabel>
            {routeLabel && <span style={{ fontSize: 9, color: wk.t3 }}>{routeLabel}</span>}
          </div>
          {splitBranches && splitBranches.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
              <LogoFrame size={22}>{fromToken?.logo}</LogoFrame>
              {splitBranches.map((branch) => (
                <span key={branch.via} style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.13)", margin: "0 9px" }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 10, color: wk.orange }}>{branch.via}</span>
                    <span style={{ fontSize: 9, color: wk.t3, fontVariantNumeric: "tabular-nums" }}>{branch.pct}%</span>
                  </span>
                </span>
              ))}
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.13)", margin: "0 9px" }} />
              <LogoFrame size={22}>{toToken?.logo}</LogoFrame>
            </div>
          ) : routeHops && routeHops.length > 1 ? (
            <div style={{ marginBottom: 24 }}>
              <RouteVisualization hops={routeHops} animated compact />
            </div>
          ) : bestRoute ? (
            <div style={{ fontSize: 10.5, color: wk.t2, marginBottom: 24 }}>{bestRoute}</div>
          ) : (
            <div style={{ marginBottom: 24 }} />
          )}
        </>
      )}

      {/* ── Cost + impact ── */}
      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Protocol fee</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {protocolFeeBps != null ? `${protocolFeeBps} bps` : "—"}
          </div>
          {feeSub && <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{feeSub}</div>}
        </div>
        {priceImpactBps != null && <ImpactMeter bps={priceImpactBps} />}
      </div>

      {/* ── CTA + quote lifecycle ── */}
      <WidgetCTA
        state={ctaState}
        label={ctaLabel}
        onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSwap : undefined}
        timerPct={lifecycle.active ? lifecycle.remainingPct : undefined}
      />

      {lifecycle.active && (
        <QuoteStatusRow
          ageSeconds={lifecycle.ageSeconds}
          totalSeconds={lifecycle.totalSeconds}
          canRefresh={lifecycle.canRefresh}
          refreshing={lifecycle.refreshing}
          onRefresh={lifecycle.refresh}
        />
      )}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          style={{
            margin: "11px 0 0",
            fontSize: 10,
            lineHeight: 1.55,
            color: notice.tone === "error" ? "#FCA5A5" : wk.t3,
          }}
        >
          {notice.text}
        </p>
      )}

      {(minimumReceived || slippageBps != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 11 }}>
          {minimumReceived && <span style={{ fontSize: 9.5, color: wk.t3 }}>Min. received {minimumReceived}</span>}
          {slippageBps != null && (
            <span style={{ fontSize: 9.5, color: wk.t3, whiteSpace: "nowrap" }}>Slippage {(slippageBps / 100).toFixed(2)}%</span>
          )}
        </div>
      )}
    </WidgetShell>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────

function SettingsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <TouchTooltip content="Trade settings">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Trade settings"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          border: "none",
          borderRadius: 3,
          background: open ? "rgba(255,255,255,.05)" : "transparent",
          color: open ? wk.orange : wk.t3,
          cursor: "pointer",
          transition: "color .2s, background .2s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.color = wk.t1;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.color = wk.t3;
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      </button>
    </TouchTooltip>
  );
}

function SlippageSettings({ valueBps, onChange }: { valueBps: number; onChange: (bps: number) => void }) {
  const [custom, setCustom] = useState("");
  const isPreset = SLIPPAGE_PRESETS_BPS.includes(valueBps);

  const commitCustom = () => {
    const v = Number(custom);
    if (Number.isFinite(v) && v > 0) onChange(Math.round(v * 100));
  };

  return (
    <div style={{ borderTop: `1px solid ${wk.border}`, borderBottom: `1px solid ${wk.border}`, padding: "12px 0 13px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <MicroLabel>Max slippage</MicroLabel>
        <span style={{ fontSize: 10, color: wk.t2, fontVariantNumeric: "tabular-nums" }}>{(valueBps / 100).toFixed(2)}%</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {SLIPPAGE_PRESETS_BPS.map((bps) => {
          const active = valueBps === bps;
          return (
            <button
              key={bps}
              type="button"
              onClick={() => onChange(bps)}
              aria-pressed={active}
              style={{
                padding: "6px 10px",
                background: active ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .12)" : "rgba(255,255,255,.035)",
                border: "none",
                borderRadius: 3,
                color: active ? wk.orange : wk.t2,
                fontFamily: "Inter, sans-serif",
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(bps / 100).toFixed(2)}%
            </button>
          );
        })}
        <span style={{ position: "relative", display: "inline-flex" }}>
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            placeholder={isPreset ? "Custom" : (valueBps / 100).toFixed(2)}
            aria-label="Custom slippage percent"
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={commitCustom}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCustom();
            }}
            style={{
              width: 76,
              padding: "6px 20px 6px 9px",
              background: !isPreset ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .12)" : "rgba(255,255,255,.035)",
              border: "none",
              borderRadius: 3,
              color: wk.t1,
              fontFamily: "Inter, sans-serif",
              fontSize: 10.5,
              fontWeight: 600,
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: wk.t3 }}>%</span>
        </span>
      </div>
      <p style={{ margin: "9px 0 0", fontSize: 9.5, color: wk.t3, lineHeight: 1.5 }}>
        Higher slippage tolerates volatile pools; lower protects price.
      </p>
    </div>
  );
}
