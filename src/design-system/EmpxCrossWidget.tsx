// ─── EmpxCrossWidget — cross-chain swap, the locked single-column shape ────
//
// Layout ported from public/cross-drafts.html (owner-confirmed direction):
// frameless 480px column, destination amount and its token row together,
// rails below both, cost + ETA, transfer options inline (replacing the old
// separate "Gas" tab), then ONE CTA with the quote row and details beneath.
//
// PURELY PRESENTATIONAL. CrossPage keeps every real behaviour — live offers
// (useCrossQuote), capability gating, the approval / composed-leg / native
// execution session, tracking, cancel and refund. The handoff version of this
// widget dropped the approval step and multi-step signing; this one doesn't
// model execution at all, so nothing is lost: the page renders its execution
// panels beneath the widget once a route is confirmed.
//
// Everything beyond the base swap-like props is optional, so a host that
// doesn't pass rail status / quote timing / transfer options renders the
// plain widget.

import { ReactNode } from "react";
import TouchTooltip from "../components/TouchTooltip";
import { RouteVisualization, type RouteHop } from "./components";
import { useQuoteLifecycle } from "./hooks/useQuoteLifecycle";
import {
  ChainPill,
  ImpactMeter,
  MicroLabel,
  QuoteStatusRow,
  RailCardStrip,
  RailCardStripSkeleton,
  ToggleRow,
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
  type RailCardData,
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

/**
 * Where the live-offer fetch is. "refreshing" keeps the last rails on screen,
 * dimmed, rather than yanking them for a skeleton (stale-while-revalidate).
 */
export type CrossRailsState = "idle" | "loading" | "refreshing" | "error" | "empty" | "ready";

export interface CrossQuoteTiming {
  issuedAt?: number | null;
  validMs?: number | null;
  /** Offered once the quote expires — cross quotes don't auto-refresh. */
  onRefresh: () => void;
}

export interface CrossGasDrop {
  enabled: boolean;
  available: boolean;
  hint: string;
  onToggle: () => void;
}

export interface CrossNotice {
  tone: "info" | "error";
  text: string;
}

export interface EmpxCrossWidgetProps {
  fromChain: SwapChain;
  fromToken: SwapToken | null;
  fromAmount: string;
  fromBalance?: string;
  fromUsdValue?: number | null;
  onFromAmountChange: (v: string) => void;
  onSelectFromToken: () => void;
  onSelectFromChain: () => void;
  onPercentClick?: (pct: number) => void;

  toChain: SwapChain;
  toToken: SwapToken | null;
  toAmount: string;
  toUsdValue?: number | null;
  onSelectToToken: () => void;
  onSelectToChain: () => void;
  /** Destination-address input(s), rendered under the receive row. */
  destinationSlot?: ReactNode;

  railName?: string;
  railBadge?: "JIT" | "FREE" | "BTC" | "MAYA" | "BTC AMM" | string;
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bridgeFeeUSD?: number;
  /** Zero provider fee that is really taken from the output (provider-direct rails). */
  feeIncludedInQuote?: boolean;
  /** Fee paid in source native units outside the USD totals, e.g. "0.00042 BNB". */
  networkFee?: string;
  outboundFeeUSD?: number;
  sourceGasUSD?: number;
  destinationGasUSD?: number;
  estimatedTime?: string;
  minimumReceived?: string;
  slippageBps?: number;
  priceImpactBps?: number;
  routeHops?: RouteHop[];

  rails?: RailCardData[];
  onSelectRail?: (name: string) => void;
  /** Live-offer fetch state. Omit to just render `rails` when present. */
  railsState?: CrossRailsState;
  /** Line shown for idle / error / empty rail states. */
  railsMessage?: string;
  /** Rendered under the rail cards — e.g. the full offers list. */
  railsFooter?: ReactNode;

  /** Destination gas drop, rendered as a transfer-option toggle. */
  gasDrop?: CrossGasDrop;

  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  /** Quote age + refresh. Omit to hide the quote row. */
  quote?: CrossQuoteTiming;
  /** One status line under the quote row. */
  notice?: CrossNotice;

  walletConnected?: boolean;
  onConnect?: () => void;
}

function usdLine(value?: number | null) {
  return value != null ? `≈ $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " ";
}

export default function EmpxCrossWidget({
  fromChain,
  fromToken,
  fromAmount,
  fromBalance,
  fromUsdValue,
  onFromAmountChange,
  onSelectFromToken,
  onSelectFromChain,
  onPercentClick,
  toChain,
  toToken,
  toAmount,
  toUsdValue,
  onSelectToToken,
  onSelectToChain,
  destinationSlot,
  railName,
  railBadge,
  protocolFeeBps,
  protocolFeeUSD,
  bridgeFeeUSD,
  feeIncludedInQuote,
  networkFee,
  outboundFeeUSD,
  sourceGasUSD,
  destinationGasUSD,
  estimatedTime,
  minimumReceived,
  slippageBps,
  priceImpactBps,
  routeHops,
  rails,
  onSelectRail,
  railsState,
  railsMessage,
  railsFooter,
  gasDrop,
  swapDisabled,
  swapLoading,
  swapLabel = "Cross-chain swap",
  onSwap,
  onFlip,
  quote,
  notice,
  walletConnected = true,
  onConnect,
}: EmpxCrossWidgetProps) {
  const lifecycle = useQuoteLifecycle({
    issuedAt: quote?.issuedAt,
    validMs: quote?.validMs,
    onRefresh: quote?.onRefresh,
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
      : ctaState === "working" || ctaState === "ready" || (ctaState === "idle" && amountEntered)
        ? swapLabel
        : "Enter an amount";

  const totalFeeUSD =
    (protocolFeeUSD ?? 0) + (bridgeFeeUSD ?? 0) + (outboundFeeUSD ?? 0) + (sourceGasUSD ?? 0) + (destinationGasUSD ?? 0);
  const hasFee = protocolFeeUSD != null || bridgeFeeUSD != null;

  const hasRails = !!rails && rails.length > 0 && !!onSelectRail;
  const effectiveRailsState: CrossRailsState = railsState ?? (hasRails ? "ready" : "idle");

  const extraFees = [
    { label: "Outbound fee", value: outboundFeeUSD },
    { label: "Source gas (est.)", value: sourceGasUSD },
    { label: "Destination gas (est.)", value: destinationGasUSD },
  ]
    .filter((f): f is { label: string; value: number } => f.value != null && f.value > 0)
    .map((f) => ({ label: f.label, value: `$${f.value.toFixed(2)}` }));
  if (networkFee) extraFees.push({ label: "Network fee", value: networkFee });

  return (
    <WidgetShell edge>
      {/* Header — eyebrow + active rail badge + the two chains, stated once */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={eyebrow}>Cross</span>
          {railBadge && (
            <span style={{ fontSize: 9.5, color: wk.orange, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {railBadge}
            </span>
          )}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChainPill logo={fromChain.logo} name={fromChain.name} fallbackLabel={fromChain.name.slice(0, 3).toUpperCase()} onClick={onSelectFromChain} />
          <span style={{ fontSize: 11, color: wk.t4 }}>→</span>
          <ChainPill logo={toChain.logo} name={toChain.name} fallbackLabel={toChain.name.slice(0, 3).toUpperCase()} onClick={onSelectToChain} />
        </span>
      </div>

      {/* ── You send ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <MicroLabel>You send</MicroLabel>
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
          aria-label="Amount to send"
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
        <TouchTooltip content="Flip source and destination">
          <button
            type="button"
            onClick={onFlip}
            aria-label="Flip source and destination"
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

      {/* ── You receive — amount, then its OWN token row directly under it;
           rails sit below both, never between them ── */}
      <div style={{ marginBottom: 10 }}>
        <MicroLabel>You receive on {toChain.name}</MicroLabel>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={numeral(40, true)}>{toAmount || "0"}</span>
        <span style={unit}>{toToken?.ticker ?? ""}</span>
      </div>
      <div style={amountUsd}>{usdLine(toUsdValue)}</div>
      <TokenIdentityRow
        logo={toToken?.logo}
        name={toToken?.ticker ?? "Select a token"}
        onClick={onSelectToToken}
        ariaLabel={`Select to token${toToken?.ticker ? `, current ${toToken.ticker}` : ""}`}
      />

      {destinationSlot && <div style={{ marginTop: 14 }}>{destinationSlot}</div>}

      {/* ── Rails ── */}
      {effectiveRailsState === "loading" ? (
        <RailCardStripSkeleton />
      ) : effectiveRailsState === "refreshing" && hasRails ? (
        <div style={{ opacity: 0.5, transition: "opacity .15s", pointerEvents: "none" }}>
          <RailCardStrip rails={rails!} onSelect={onSelectRail!} />
        </div>
      ) : effectiveRailsState === "ready" && hasRails ? (
        <RailCardStrip rails={rails!} onSelect={onSelectRail!} />
      ) : railsMessage ? (
        <p
          role={effectiveRailsState === "error" ? "alert" : undefined}
          style={{
            margin: "16px 0 0",
            fontSize: 11,
            lineHeight: 1.6,
            color: effectiveRailsState === "error" ? "#FCA5A5" : wk.t3,
          }}
        >
          {railsMessage}
        </p>
      ) : null}
      {railsFooter && <div style={{ marginTop: 6 }}>{railsFooter}</div>}

      <div style={rule} />

      {/* ── Route ── */}
      {routeHops && routeHops.length > 1 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <MicroLabel>Route</MicroLabel>
            {railName && <span style={{ fontSize: 9, color: wk.t3 }}>via {railName}</span>}
          </div>
          <div style={{ marginBottom: 24 }}>
            <RouteVisualization hops={routeHops} animated compact />
          </div>
        </>
      )}

      {/* ── Cost + ETA (+ impact) ── */}
      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Total cost</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {hasFee
              ? totalFeeUSD > 0.005
                ? `$${totalFeeUSD.toFixed(2)}`
                : feeIncludedInQuote ? "Included in quote" : "FREE"
              : "—"}
          </div>
          {(protocolFeeBps != null || railName) && (
            <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>
              {[protocolFeeBps != null ? `${protocolFeeBps} bps` : null, railName ? `via ${railName}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
        <div>
          <MicroLabel>Arrives in</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {estimatedTime ?? "—"}
          </div>
          <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>Live from rail quote</div>
        </div>
        {priceImpactBps != null && <ImpactMeter bps={priceImpactBps} />}
      </div>

      {/* ── Transfer options — inline, replaces the old separate Gas tab ── */}
      {gasDrop && (
        <div style={{ borderTop: `1px solid ${wk.border}`, paddingTop: 14 }}>
          <MicroLabel>Transfer options</MicroLabel>
          <ToggleRow
            title={`Gas drop on ${toChain.name}`}
            hint={gasDrop.hint}
            enabled={gasDrop.enabled}
            disabled={!gasDrop.available}
            onToggle={gasDrop.onToggle}
          />
        </div>
      )}

      {/* ── CTA + quote lifecycle ── */}
      <div style={{ marginTop: 20 }}>
        <WidgetCTA
          state={ctaState}
          label={ctaLabel}
          onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSwap : undefined}
        />
      </div>

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
          style={{ margin: "11px 0 0", fontSize: 10, lineHeight: 1.55, color: notice.tone === "error" ? "#FCA5A5" : wk.t3 }}
        >
          {notice.text}
        </p>
      )}

      {extraFees.length > 0 && (
        <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 4 }}>
          {extraFees.map((f) => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
              <span style={{ color: wk.t3 }}>{f.label}</span>
              <span style={{ color: wk.t2, fontVariantNumeric: "tabular-nums" }}>{f.value}</span>
            </div>
          ))}
        </div>
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
