// ─── EmpxCrossWidget — cross-chain swap ─────────────────────────────────────
//
// Distinct from EmpxSwapWidget — handles cross-chain routes with TWO chain
// contexts (source + destination), rail badge, bridge fees, and lifecycle
// status hints.  Each chain has its own clickable ChainSwitcher.

import { ReactNode } from "react";
import {
  AmountInput,
  Card,
  ChainSwitcher,
  Collapsible,
  FeeBreakdown,
  Pill,
  PrimaryButton,
  RouteVisualization,
  SwapDivider,
  type FeeRow,
  type RouteHop,
} from "./components";

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
}

export interface EmpxCrossWidgetProps {
  // Source
  fromChain: SwapChain;
  fromToken: SwapToken | null;
  fromAmount: string;
  fromBalance?: string;
  fromUsdValue?: number | null;
  onFromAmountChange: (v: string) => void;
  onSelectFromToken: () => void;
  onSelectFromChain: () => void;
  onPercentClick?: (pct: number) => void;

  // Destination
  toChain: SwapChain;
  toToken: SwapToken | null;
  toAmount: string;
  toUsdValue?: number | null;
  onSelectToToken: () => void;
  onSelectToChain: () => void;

  // Rail / route
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
  routeHops?: RouteHop[];

  // CTA
  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  walletConnected?: boolean;
  onConnect?: () => void;
}

const BADGE_VARIANT: Record<string, "accent" | "info" | "success" | "danger" | "default"> = {
  JIT: "info",
  FREE: "success",
  BTC: "accent",
  MAYA: "info",
  "BTC AMM": "accent",
};

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
  routeHops,

  swapDisabled,
  swapLoading,
  swapLabel = "Cross-chain swap",
  onSwap,
  onFlip,

  walletConnected = true,
  onConnect,
}: EmpxCrossWidgetProps) {
  // Always-visible rows
  const feeRows: FeeRow[] = [];
  if (railName) feeRows.push({ label: "Via rail", value: railName });
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
      label: "Bridge fee",
      value: bridgeFeeUSD <= 0.005 ? "FREE" : `$${bridgeFeeUSD.toFixed(2)}`,
      accent: bridgeFeeUSD <= 0.005,
    });
  }
  if (estimatedTime) feeRows.push({ label: "Est. time", value: estimatedTime });

  // Collapsed details
  const advancedRows: FeeRow[] = [];
  if (outboundFeeUSD !== undefined && outboundFeeUSD > 0)
    advancedRows.push({ label: "Outbound fee", value: `$${outboundFeeUSD.toFixed(2)}`, muted: true });
  if (sourceGasUSD !== undefined && sourceGasUSD > 0)
    advancedRows.push({ label: "Source gas (est.)", value: `$${sourceGasUSD.toFixed(2)}`, muted: true });
  if (destinationGasUSD !== undefined && destinationGasUSD > 0)
    advancedRows.push({ label: "Destination gas (est.)", value: `$${destinationGasUSD.toFixed(2)}`, muted: true });
  if (minimumReceived) advancedRows.push({ label: "Min. received", value: minimumReceived, muted: true });
  if (slippageBps !== undefined) advancedRows.push({ label: "Slippage", value: `${(slippageBps / 100).toFixed(2)}%`, muted: true });

  return (
    <Card style={{ width: "100%", maxWidth: 480, padding: 22 }}>
      {/* Top: CROSS-CHAIN label + Rail badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
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
            Cross-chain
          </span>
          {railBadge && (
            <Pill variant={BADGE_VARIANT[railBadge] || "accent"}>
              {railBadge}
            </Pill>
          )}
        </div>
        {/* Chain pair indicator (read-only, distinct from clickable switchers below) */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: fromChain.color || "rgba(255,255,255,0.5)",
              boxShadow: `0 0 8px ${fromChain.color || "rgba(255,255,255,0.4)"}`,
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>→</span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: toChain.color || "rgba(255,255,255,0.5)",
              boxShadow: `0 0 8px ${toChain.color || "rgba(255,255,255,0.4)"}`,
            }}
          />
        </div>
      </div>

      {/* FROM amount — chain TOP, balance + MAX BOTTOM */}
      <AmountInput
        label="From"
        value={fromAmount}
        onChange={onFromAmountChange}
        ticker={fromToken?.ticker || "Select"}
        tokenLogo={fromToken?.logo}
        onSelectToken={onSelectFromToken}
        tokenSelectLabel={`Select from token${fromToken?.ticker ? `, current ${fromToken.ticker}` : ""}`}
        usdValue={fromUsdValue}
        topMeta={
          <ChainSwitcher
            name={fromChain.name}
            color={fromChain.color}
            onClick={onSelectFromChain}
            size="md"
          />
        }
        bottomMeta={
          (fromBalance || onPercentClick) && (
            <>
              {fromBalance && (
                <span style={{ color: "rgba(255,255,255,0.40)" }}>
                  Bal {fromBalance}
                </span>
              )}
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

      {/* TO amount — chain on TOP only (no balance/MAX) */}
      <AmountInput
        label="To"
        value={toAmount}
        ticker={toToken?.ticker || "Select"}
        tokenLogo={toToken?.logo}
        onSelectToken={onSelectToToken}
        tokenSelectLabel={`Select to token${toToken?.ticker ? `, current ${toToken.ticker}` : ""}`}
        usdValue={toUsdValue}
        accent
        topMeta={
          <ChainSwitcher
            name={toChain.name}
            color={toChain.color}
            onClick={onSelectToChain}
            size="md"
          />
        }
      />

      {/* Always-visible fees */}
      {feeRows.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <FeeBreakdown rows={feeRows} bordered />
        </div>
      )}

      {/* Routing flow */}
      {routeHops && routeHops.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Collapsible title="Routing" subtitle={`${routeHops.length - 1} hops`} defaultOpen>
            <RouteVisualization hops={routeHops} animated compact />
          </Collapsible>
        </div>
      )}

      {/* Advanced details */}
      {advancedRows.length > 0 && (
        <Collapsible title="Trade details" subtitle="Gas · Slippage · Min received">
          <FeeBreakdown rows={advancedRows} bordered={false} compact />
        </Collapsible>
      )}

      {/* CTA */}
      <div style={{ marginTop: 18 }}>
        {!walletConnected && onConnect ? (
          <PrimaryButton onClick={onConnect}>Connect wallet</PrimaryButton>
        ) : (
          <PrimaryButton onClick={onSwap} disabled={swapDisabled} loading={swapLoading}>
            {swapLabel}
          </PrimaryButton>
        )}
      </div>
    </Card>
  );
}
