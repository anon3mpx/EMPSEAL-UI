// ─── EmpxSwapWidget — same-chain swap ───────────────────────────────────────
//
// Scope: SAME-CHAIN only.  Shows the current chain badge once at the top.
// Does NOT show cross-chain destination, bridge fees, or routing through
// rails — that's the EmpxCrossWidget's job.
//
// Style: flat typographic layout matching the user reference screenshot.
// No inner boxes around amounts; FROM and TO read as adjacent text rows.

import { ReactNode } from "react";
import {
  AmountInput,
  Card,
  ChainBadge,
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

  // Same-chain quote info
  pairType?: "V/V" | "V/S" | "S/S";
  protocolFeeBps?: number;
  protocolFeeUSD?: number;
  bestRoute?: string;
  minimumReceived?: string;
  slippageBps?: number;
  priceImpactBps?: number;

  // Routing
  routeHops?: RouteHop[];

  // CTA
  swapDisabled?: boolean;
  swapLoading?: boolean;
  swapLabel?: string;
  onSwap: () => void;
  onFlip?: () => void;

  // Wallet
  walletConnected?: boolean;
  onConnect?: () => void;
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

  swapDisabled,
  swapLoading,
  swapLabel = "Swap",
  onSwap,
  onFlip,

  walletConnected = true,
  onConnect,
}: EmpxSwapWidgetProps) {
  // Build top-level fee rows (always visible)
  const feeRows: FeeRow[] = [];
  if (pairType) feeRows.push({ label: "Pair type", value: pairType.replace("/", " / ") });
  if (protocolFeeBps !== undefined && protocolFeeUSD !== undefined) {
    feeRows.push({
      label: "Protocol fee",
      value: `${protocolFeeBps} bps`,
      sub: `· $${protocolFeeUSD.toFixed(2)}`,
      accent: true,
    });
  }
  if (bestRoute && !routeHops) feeRows.push({ label: "Best route", value: bestRoute });

  // Collapsed advanced rows
  const advancedRows: FeeRow[] = [];
  if (minimumReceived) advancedRows.push({ label: "Min. received", value: minimumReceived, muted: true });
  if (slippageBps !== undefined)
    advancedRows.push({ label: "Slippage", value: `${(slippageBps / 100).toFixed(2)}%`, muted: true });
  if (priceImpactBps !== undefined)
    advancedRows.push({
      label: "Price impact",
      value: `${(priceImpactBps / 100).toFixed(3)}%`,
      muted: true,
      accent: priceImpactBps > 100,
    });

  return (
    <Card style={{ width: "100%", maxWidth: 460, padding: 22 }}>
      {/* Top: SWAP label + Chain badge */}
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
            Swap
          </span>
          {pairType && <Pill variant="ghost">{pairType.replace("/", " / ")}</Pill>}
        </div>
        <ChainBadge name={chain.name} color={chain.color} />
      </div>

      {/* FROM amount (flat row, no inner box) */}
      <AmountInput
        label="From"
        value={fromAmount}
        onChange={onFromAmountChange}
        ticker={fromToken?.ticker || "Select"}
        tokenLogo={fromToken?.logo}
        onSelectToken={onSelectFromToken}
        tokenSelectLabel={`Select from token${fromToken?.ticker ? `, current ${fromToken.ticker}` : ""}`}
        usdValue={fromUsdValue}
        meta={
          fromBalance && onPercentClick ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {fromBalance}
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
                  letterSpacing: "0.25em",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                MAX
              </button>
            </span>
          ) : (
            fromBalance
          )
        }
      />

      <SwapDivider onSwap={onFlip} />

      {/* TO amount (flat row, accent color) */}
      <AmountInput
        label="To"
        value={toAmount}
        ticker={toToken?.ticker || "Select"}
        tokenLogo={toToken?.logo}
        onSelectToken={onSelectToToken}
        tokenSelectLabel={`Select to token${toToken?.ticker ? `, current ${toToken.ticker}` : ""}`}
        usdValue={toUsdValue}
        accent
      />

      {/* Always-visible fee rows */}
      {feeRows.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <FeeBreakdown rows={feeRows} bordered />
        </div>
      )}

      {/* Routing (collapsible) */}
      {routeHops && routeHops.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Collapsible
            title="Routing"
            subtitle={`${routeHops.length} hops`}
            defaultOpen
          >
            <RouteVisualization hops={routeHops} animated compact />
          </Collapsible>
        </div>
      )}

      {/* Advanced details (collapsed by default) */}
      {advancedRows.length > 0 && (
        <Collapsible title="Trade details" subtitle="Slippage · Min received">
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
