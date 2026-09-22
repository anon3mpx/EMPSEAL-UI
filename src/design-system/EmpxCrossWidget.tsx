import { ReactNode } from "react";
import TouchTooltip from "../components/TouchTooltip";
import { RouteVisualization, type RouteHop } from "./components";
import {
  ChainPill,
  Disclosure,
  ImpactMeter,
  MicroLabel,
  RailCardStrip,
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

  railName?: string;
  railBadge?: "JIT" | "FREE" | "BTC" | "MAYA" | "BTC AMM" | string;
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bridgeFeeUSD?: number;
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

  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  walletConnected?: boolean;
  onConnect?: () => void;
}

function usdLine(value?: number | null) {
  return value != null ? `≈ $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " ";
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
  railName,
  railBadge,
  protocolFeeBps,
  protocolFeeUSD,
  bridgeFeeUSD,
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
  swapDisabled,
  swapLoading,
  swapLabel = "Cross-chain swap",
  onSwap,
  onFlip,
  walletConnected = true,
  onConnect,
}: EmpxCrossWidgetProps) {
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

  return (
    <WidgetShell edge>
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

      {rails && rails.length > 0 && onSelectRail && <RailCardStrip rails={rails} onSelect={onSelectRail} />}

      <div style={rule} />

      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Total cost</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {hasFee ? (totalFeeUSD <= 0.005 ? "FREE" : `$${totalFeeUSD.toFixed(2)}`) : "—"}
          </div>
          {(protocolFeeBps != null || railName) && (
            <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>
              {[protocolFeeBps != null ? `${protocolFeeBps} bps` : null, railName ? `via ${railName}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
        {priceImpactBps != null ? (
          <ImpactMeter bps={priceImpactBps} />
        ) : (
          <div>
            <MicroLabel>Arrives in</MicroLabel>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {estimatedTime ?? "—"}
            </div>
            <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>Live from rail quote</div>
          </div>
        )}
      </div>

      {routeHops && routeHops.length > 1 && (
        <Disclosure label="Routing" defaultOpen>
          <RouteVisualization hops={routeHops} animated compact />
        </Disclosure>
      )}

      {(minimumReceived || slippageBps != null || outboundFeeUSD || sourceGasUSD || destinationGasUSD) && (
        <Disclosure label="Trade details">
          {outboundFeeUSD != null && outboundFeeUSD > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 10.5 }}>
              <span style={{ color: wk.t3 }}>Outbound fee</span>
              <span style={{ color: wk.t2, fontVariantNumeric: "tabular-nums" }}>${outboundFeeUSD.toFixed(2)}</span>
            </div>
          )}
          {sourceGasUSD != null && sourceGasUSD > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 10.5 }}>
              <span style={{ color: wk.t3 }}>Source gas (est.)</span>
              <span style={{ color: wk.t2, fontVariantNumeric: "tabular-nums" }}>${sourceGasUSD.toFixed(2)}</span>
            </div>
          )}
          {destinationGasUSD != null && destinationGasUSD > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 10.5 }}>
              <span style={{ color: wk.t3 }}>Destination gas (est.)</span>
              <span style={{ color: wk.t2, fontVariantNumeric: "tabular-nums" }}>${destinationGasUSD.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {minimumReceived && <span style={{ fontSize: 9.5, color: wk.t3 }}>Min. received {minimumReceived}</span>}
            {slippageBps != null && <span style={{ fontSize: 9.5, color: wk.t3 }}>Slippage {(slippageBps / 100).toFixed(2)}%</span>}
          </div>
        </Disclosure>
      )}

      <div style={{ marginTop: 20 }}>
        <WidgetCTA
          state={ctaState}
          label={ctaLabel}
          onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSwap : undefined}
        />
      </div>
    </WidgetShell>
  );
}
