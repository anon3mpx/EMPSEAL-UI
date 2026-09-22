import { cloneElement, isValidElement, type ReactNode } from "react";
import {
  ChainPill,
  LogoFrame,
  MicroLabel,
  ToggleRow,
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

export interface GasChain {
  id: number;
  name: string;
  color?: string;
  ticker: string;
  logo?: ReactNode;
}

export interface GasDestination {
  id: string;
  chain: GasChain;
  usd: number;
  nativeOut: number;
}

export interface EmpxGasWidgetProps {
  sourceChain: GasChain;
  sourceAmount: string;
  sourceUsdValue: number;
  sourceBalance?: string;
  onSelectSourceChain: () => void;
  onSwitchChains: () => void;
  canSwitchChains?: boolean;
  onMaxClick?: () => void;

  destination: GasDestination;
  onSelectDestinationChain: () => void;
  onSetDestinationUsd: (usd: number) => void;
  presets: number[];

  bridgeFeeUSD: number;
  estimatedTime?: string;

  useDifferentRecipient: boolean;
  onToggleRecipient: () => void;
  recipient: string;
  onSetRecipient: (value: string) => void;
  recipientValid: boolean;

  canSubmit: boolean;
  swapLabel: string;
  onSubmit: () => void;
  walletConnected: boolean;
  onConnect: () => void;
}

export default function EmpxGasWidget(props: EmpxGasWidgetProps) {
  const {
    sourceChain,
    sourceAmount,
    sourceUsdValue,
    sourceBalance,
    onSelectSourceChain,
    onSwitchChains,
    canSwitchChains = true,
    onMaxClick,
    destination,
    onSelectDestinationChain,
    onSetDestinationUsd,
    presets,
    bridgeFeeUSD,
    estimatedTime,
    useDifferentRecipient,
    onToggleRecipient,
    recipient,
    onSetRecipient,
    recipientValid,
    canSubmit,
    swapLabel,
    onSubmit,
    walletConnected,
    onConnect,
  } = props;

  const amountEntered = destination.usd > 0;
  const ctaState: CtaState = !walletConnected
    ? "connect"
    : !amountEntered
      ? "idle"
      : !recipientValid
        ? "blocked"
        : canSubmit
          ? "ready"
          : "idle";
  const ctaLabel = {
    connect: "Connect wallet",
    idle: amountEntered ? swapLabel : "Enter an amount",
    blocked: "Recipient must be a 0x… address",
    ready: swapLabel,
    working: "Working",
    done: "Done",
  }[ctaState];

  return (
    <WidgetShell edge>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={eyebrow}>Gas</span>
          <span style={{ fontSize: 9.5, color: wk.t3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Single destination
          </span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChainPill
            logo={sourceChain.logo}
            name={sourceChain.name}
            fallbackLabel={sourceChain.ticker}
            onClick={onSelectSourceChain}
          />
          <button
            type="button"
            onClick={canSwitchChains ? onSwitchChains : undefined}
            disabled={!canSwitchChains}
            aria-label="Switch source and destination chains"
            style={{
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              borderRadius: 4,
              color: wk.t3,
              cursor: canSwitchChains ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            ⇄
          </button>
          <ChainPill
            logo={destination.chain.logo}
            name={destination.chain.name}
            fallbackLabel={destination.chain.ticker}
            onClick={onSelectDestinationChain}
          />
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <MicroLabel>You send</MicroLabel>
        {(sourceBalance || onMaxClick) && (
          <span style={{ fontSize: 10, color: wk.t3 }}>
            {sourceBalance ? `Balance ${sourceBalance}` : null}
            {onMaxClick && (
              <>
                {sourceBalance ? " · " : null}
                <button
                  type="button"
                  onClick={onMaxClick}
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
        <span style={numeral(40)}>{sourceAmount || "0"}</span>
        <span style={unit}>{sourceChain.ticker}</span>
      </div>
      <div style={amountUsd}>
        {sourceUsdValue != null ? `≈ $${sourceUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " "}
      </div>

      <div style={rule} />

      <div style={{ marginBottom: 10 }}>
        <MicroLabel>Destination</MicroLabel>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <LogoFrame size={30} fallback={destination.chain.ticker}>
          {isValidElement(destination.chain.logo) ? cloneElement(destination.chain.logo) : destination.chain.logo}
        </LogoFrame>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: wk.t1, lineHeight: 1.15 }}>{destination.chain.name}</span>
          <span style={{ fontSize: 10, color: wk.t3, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
            {destination.nativeOut > 0
              ? `${destination.nativeOut < 0.01 ? destination.nativeOut.toFixed(6) : destination.nativeOut.toFixed(4)} ${destination.chain.ticker}`
              : `0 ${destination.chain.ticker}`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: wk.t3 }}>$</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={destination.usd || ""}
            onChange={(e) => onSetDestinationUsd(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            aria-label="Destination amount in USD"
            style={{
              width: 52,
              padding: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
        {presets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSetDestinationUsd(v)}
            style={{
              padding: "5px 11px",
              background: destination.usd === v ? "rgba(255,138,0,.12)" : "rgba(255,255,255,.035)",
              border: `1px solid ${destination.usd === v ? "rgba(255,138,0,.45)" : "transparent"}`,
              borderRadius: 4,
              color: destination.usd === v ? wk.orange : wk.t2,
              fontFamily: "Inter, sans-serif",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${v}
          </button>
        ))}
      </div>

      <div style={rule} />

      <div style={{ ...grid2, marginBottom: 24 }}>
        <div>
          <MicroLabel>Bridge fee</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {bridgeFeeUSD <= 0.005 ? "FREE" : `$${bridgeFeeUSD.toFixed(2)}`}
          </div>
          <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>Gas.zip</div>
        </div>
        <div>
          <MicroLabel>Est. delivery</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {estimatedTime ?? "—"}
          </div>
          <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>on {destination.chain.name}</div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${wk.border}`, paddingTop: 14 }}>
        <ToggleRow
          title="Send to another wallet"
          hint="Defaults to your connected address"
          enabled={useDifferentRecipient}
          onToggle={onToggleRecipient}
        />
        {useDifferentRecipient && (
          <input
            type="text"
            value={recipient}
            onChange={(e) => onSetRecipient(e.target.value)}
            placeholder="0x… recipient address"
            spellCheck={false}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${recipient.length === 0 || recipientValid ? "rgba(96,165,250,0.20)" : "rgba(248,113,113,0.40)"}`,
              borderRadius: 4,
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12.5,
              outline: "none",
              letterSpacing: "-0.005em",
            }}
          />
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <WidgetCTA
          state={ctaState}
          label={ctaLabel}
          onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSubmit : undefined}
        />
      </div>
    </WidgetShell>
  );
}
