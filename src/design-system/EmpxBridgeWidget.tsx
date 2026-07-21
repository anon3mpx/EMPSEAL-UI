// ─── EmpxBridgeWidget — Via Labs lock-and-mint bridge ─────────────────────
//
// EXACT same anatomy as EmpxSwapWidget / EmpxCrossWidget:
//   Card maxWidth 480, padding 22
//   Header label + Pill row
//   AmountInput "From" with ChainSwitcher topMeta + Bal/MAX bottomMeta
//   SwapDivider with flip
//   AmountInput "To" (read-only, accent) with ChainSwitcher topMeta
//   FeeBreakdown (visible) + Collapsible Routing + Collapsible Trade details
//   PrimaryButton
//
// When the Via Labs rebuild lands, the page swaps the data props for live
// SDK calls — widget itself does not change.

import { ReactNode } from "react";
import {
  AmountInput,
  ChainSwitcher,
  Collapsible,
  Card,
  FeeBreakdown,
  Pill,
  PrimaryButton,
  RouteVisualization,
  SwapDivider,
  type FeeRow,
  type RouteHop,
} from "./components";

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

export default function EmpxBridgeWidget(props: EmpxBridgeWidgetProps) {
  const {
    fromChain, fromToken, fromAmount, fromBalance, fromUsdValue,
    onFromAmountChange, onSelectFromToken, onSelectFromChain, onPercentClick,
    toChain, toToken, toAmount, toUsdValue,
    onSelectToToken, onSelectToChain,
    protocolFeeBps, protocolFeeUSD, bridgeFeeUSD, estimatedTime,
    minimumReceived, slippageBps, routeHops,
    swapDisabled, swapLabel = "Bridge", comingSoonHint,
    onSwap, onFlip,
    walletConnected = true, onConnect,
  } = props;

  const feeRows: FeeRow[] = [];
  feeRows.push({ label: "Bridge model", value: "Lock & mint" });
  if (protocolFeeBps !== undefined && protocolFeeUSD !== undefined) {
    feeRows.push({
      label: "Protocol fee",
      value: `${protocolFeeBps} bps`,
      sub: `· $${protocolFeeUSD.toFixed(2)}`,
      accent: true,
    });
  }
  if (bridgeFeeUSD !== undefined) {
    feeRows.push({
      label: "Rail fee",
      value: bridgeFeeUSD <= 0.005 ? "FREE" : `$${bridgeFeeUSD.toFixed(2)}`,
      accent: bridgeFeeUSD <= 0.005,
    });
  }
  if (estimatedTime) feeRows.push({ label: "Est. time", value: estimatedTime });

  const advancedRows: FeeRow[] = [];
  if (minimumReceived) advancedRows.push({ label: "Min. received", value: minimumReceived, muted: true });
  if (slippageBps !== undefined)
    advancedRows.push({ label: "Slippage", value: `${(slippageBps / 100).toFixed(2)}%`, muted: true });

  return (
    <Card style={{ width: "100%", maxWidth: 480, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.40em",
              color: "rgba(255,255,255,0.92)",
              textTransform: "uppercase",
            }}
          >
            Bridge
          </span>
          <Pill variant="info">Lock &amp; mint</Pill>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: fromChain.color || "rgba(255,255,255,0.5)", boxShadow: `0 0 8px ${fromChain.color || "rgba(255,255,255,0.4)"}` }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>→</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: toChain.color || "rgba(255,255,255,0.5)", boxShadow: `0 0 8px ${toChain.color || "rgba(255,255,255,0.4)"}` }} />
        </div>
      </div>

      <AmountInput
        label="From"
        value={fromAmount}
        onChange={onFromAmountChange}
        ticker={fromToken?.ticker || "Select"}
        tokenLogo={fromToken?.logo}
        onSelectToken={onSelectFromToken}
        usdValue={fromUsdValue}
        topMeta={<ChainSwitcher name={fromChain.name} color={fromChain.color} onClick={onSelectFromChain} size="md" />}
        bottomMeta={
          (fromBalance || onPercentClick) && (
            <>
              {fromBalance && <span style={{ color: "rgba(255,255,255,0.40)" }}>Bal {fromBalance}</span>}
              {onPercentClick && (
                <button
                  type="button"
                  onClick={() => onPercentClick(100)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FF8A00",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.30em",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  MAX
                </button>
              )}
            </>
          )
        }
      />

      <SwapDivider onSwap={onFlip} />

      <AmountInput
        label="To"
        value={toAmount}
        ticker={toToken?.ticker || "Select"}
        tokenLogo={toToken?.logo}
        onSelectToken={onSelectToToken}
        usdValue={toUsdValue}
        accent
        topMeta={<ChainSwitcher name={toChain.name} color={toChain.color} onClick={onSelectToChain} size="md" />}
      />

      <div style={{ marginTop: 18 }}>
        <FeeBreakdown rows={feeRows} bordered />
      </div>

      {routeHops && routeHops.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Collapsible title="Routing" subtitle={`${routeHops.length - 1} hop${routeHops.length - 1 === 1 ? "" : "s"}`} defaultOpen>
            <RouteVisualization hops={routeHops} animated compact />
          </Collapsible>
        </div>
      )}

      {advancedRows.length > 0 && (
        <Collapsible title="Trade details" subtitle="Min received · Slippage">
          <FeeBreakdown rows={advancedRows} bordered={false} compact />
        </Collapsible>
      )}

      <div style={{ marginTop: 18 }}>
        {!walletConnected && onConnect ? (
          <PrimaryButton onClick={onConnect}>Connect wallet</PrimaryButton>
        ) : (
          <PrimaryButton onClick={onSwap} disabled={swapDisabled}>{swapLabel}</PrimaryButton>
        )}
        {comingSoonHint && (
          <p style={{ margin: "8px 2px 0", fontSize: 10.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, textAlign: "center" }}>
            {comingSoonHint}
          </p>
        )}
      </div>
    </Card>
  );
}
