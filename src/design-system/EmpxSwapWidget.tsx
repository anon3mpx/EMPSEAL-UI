import { ReactNode } from "react";
import TouchTooltip from "../components/TouchTooltip";
import { RouteVisualization, type RouteHop, type SplitBranch } from "./components";
import {
  ChainPill,
  Disclosure,
  ImpactMeter,
  LogoFrame,
  MicroLabel,
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

export interface EmpxSwapWidgetProps {
  chain: SwapChain;

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

  pairType?: "V/V" | "V/S" | "S/S";
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bestRoute?: string;
  minimumReceived?: string;
  slippageBps?: number;
  priceImpactBps?: number;

  routeHops?: RouteHop[];
  routeLabel?: string;
  splitBranches?: SplitBranch[];

  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  walletConnected?: boolean;
  onConnect?: () => void;
}

function usdLine(value?: number | null) {
  return value != null ? `≈ $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "\u00a0";
}

export default function EmpxSwapWidget({
  chain,
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
  pairType,
  protocolFeeBps,
  protocolFeeUSD,
  bestRoute,
  minimumReceived,
  slippageBps,
  priceImpactBps,
  routeHops,
  routeLabel,
  splitBranches,
  swapDisabled,
  swapLoading,
  swapLabel = "Swap",
  onSwap,
  onFlip,
  walletConnected = true,
  onConnect,
}: EmpxSwapWidgetProps) {
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
      : ctaState === "working"
        ? swapLabel
        : ctaState === "idle"
          ? amountEntered
            ? swapLabel
            : "Enter an amount"
          : swapLabel;

  const feeSub = [pairType?.replace("/", " / "), protocolFeeUSD != null ? `$${protocolFeeUSD.toFixed(2)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <WidgetShell edge>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <span style={eyebrow}>Swap</span>
        <ChainPill logo={chain.logo} name={chain.name} fallbackLabel={chain.name.slice(0, 3).toUpperCase()} />
      </div>

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
        onClick={onSelectToToken}
        ariaLabel={`Select to token${toToken?.ticker ? `, current ${toToken.ticker}` : ""}`}
      />

      <div style={rule} />

      {(routeLabel || bestRoute || (splitBranches && splitBranches.length > 1) || (routeHops && routeHops.length > 1)) && (
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

      {(minimumReceived || slippageBps != null) && (
        <Disclosure label="Trade details">
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            {minimumReceived && <span style={{ fontSize: 9.5, color: wk.t3 }}>Min. received {minimumReceived}</span>}
            {slippageBps != null && <span style={{ fontSize: 9.5, color: wk.t3 }}>Slippage {(slippageBps / 100).toFixed(2)}%</span>}
          </div>
        </Disclosure>
      )}

      <WidgetCTA
        state={ctaState}
        label={ctaLabel}
        onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSwap : undefined}
      />
    </WidgetShell>
  );
}
