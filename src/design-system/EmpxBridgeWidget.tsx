import { ReactNode } from "react";
import { RouteVisualization, type RouteHop } from "./components";
import {
  ChainPill,
  Disclosure,
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

export interface BridgeToken {
  ticker: string;
  logo?: ReactNode;
  address?: string;
}
export interface BridgeChain {
  id: number;
  name: string;
  color?: string;
}

export interface EmpxBridgeWidgetProps {
  fromChain: BridgeChain;
  fromToken: BridgeToken | null;
  fromAmount: string;
  fromBalance?: string;
  fromUsdValue?: number | null;
  onFromAmountChange: (v: string) => void;
  onSelectFromToken: () => void;
  onSelectFromChain: () => void;
  onPercentClick?: (pct: number) => void;

  toChain: BridgeChain;
  toToken: BridgeToken | null;
  toAmount: string;
  toUsdValue?: number | null;
  onSelectToToken: () => void;
  onSelectToChain: () => void;

  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bridgeFeeUSD?: number;
  estimatedTime?: string;
  minimumReceived?: string;
  slippageBps?: number;
  routeHops?: RouteHop[];

  swapDisabled?: boolean;
  swapLabel?: string;
  comingSoonHint?: string;
  onSwap: () => void;
  onFlip?: () => void;

  walletConnected?: boolean;
  onConnect?: () => void;
}

function usdLine(value?: number | null) {
  return value != null ? `≈ $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " ";
}

export default function EmpxBridgeWidget(props: EmpxBridgeWidgetProps) {
  const {
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
    protocolFeeBps,
    protocolFeeUSD,
    bridgeFeeUSD,
    estimatedTime,
    minimumReceived,
    slippageBps,
    routeHops,
    swapDisabled,
    swapLabel = "Bridge",
    comingSoonHint,
    onSwap,
    onFlip,
    walletConnected = true,
    onConnect,
  } = props;

  const ctaState: CtaState = !walletConnected ? "connect" : swapDisabled ? "idle" : "ready";
  const ctaLabel = ctaState === "connect" ? "Connect wallet" : swapLabel;
  const totalFeeUSD =
    protocolFeeUSD != null || bridgeFeeUSD != null
      ? (protocolFeeUSD ?? 0) + (bridgeFeeUSD ?? 0)
      : undefined;

  return (
    <WidgetShell edge>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={eyebrow}>Bridge</span>
          <span style={{ fontSize: 9.5, color: wk.t3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Lock & mint
          </span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChainPill name={fromChain.name} onClick={onSelectFromChain} />
          <span style={{ fontSize: 11, color: wk.t4 }}>→</span>
          <ChainPill name={toChain.name} onClick={onSelectToChain} />
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
      />

      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
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
      </div>

      <div style={{ marginBottom: 10 }}>
        <MicroLabel>You receive on {toChain.name}</MicroLabel>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={numeral(40, true)}>{toAmount || "0"}</span>
        <span style={unit}>{toToken?.ticker ?? ""}</span>
      </div>
      <div style={amountUsd}>{usdLine(toUsdValue)}</div>
      <TokenIdentityRow logo={toToken?.logo} name={toToken?.ticker ?? "Select a token"} onClick={onSelectToToken} />

      <div style={rule} />

      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Total cost</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {totalFeeUSD != null ? (totalFeeUSD <= 0.005 ? "FREE" : `$${totalFeeUSD.toFixed(2)}`) : "—"}
          </div>
          {protocolFeeBps != null && (
            <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{protocolFeeBps} bps · via Via Labs</div>
          )}
        </div>
        <div>
          <MicroLabel>Arrives in</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {estimatedTime ?? "—"}
          </div>
          <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>on {toChain.name}</div>
        </div>
      </div>

      {routeHops && routeHops.length > 1 && (
        <Disclosure label="Routing" defaultOpen>
          <RouteVisualization hops={routeHops} animated compact />
        </Disclosure>
      )}

      {(minimumReceived || slippageBps != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 11 }}>
          {minimumReceived && <span style={{ fontSize: 9.5, color: wk.t3 }}>Min. received {minimumReceived}</span>}
          {slippageBps != null && <span style={{ fontSize: 9.5, color: wk.t3 }}>Slippage {(slippageBps / 100).toFixed(2)}%</span>}
        </div>
      )}

      <WidgetCTA
        state={ctaState}
        label={ctaLabel}
        onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSwap : undefined}
      />

      {comingSoonHint && (
        <p style={{ margin: "11px 2px 0", fontSize: 10, color: wk.t3, lineHeight: 1.6, textAlign: "center" }}>
          {comingSoonHint}
        </p>
      )}
    </WidgetShell>
  );
}
