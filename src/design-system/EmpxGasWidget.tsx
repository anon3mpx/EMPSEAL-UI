// ─── EmpxGasWidget — single-destination native gas top-up ─────────────────
//
// Built on the EXACT same widget anatomy as EmpxSwapWidget / EmpxCrossWidget:
//   • Card width: 100%, maxWidth: 480, padding: 22
//   • Header row: GAS label + Pill (right)
//   • AmountInput "From" with ChainSwitcher topMeta + Bal/MAX bottomMeta
//   • SwapDivider between source and destination
//   • Destination AmountInput with ChainSwitcher topMeta
//   • FeeBreakdown (visible) + PrimaryButton

import {
  AmountInput,
  ChainSwitcher,
  Card,
  FeeBreakdown,
  Pill,
  PrimaryButton,
  SwapDivider,
  type FeeRow,
} from "./components";

export interface GasChain {
  id: number;
  name: string;
  color?: string;
  ticker: string;
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
    sourceChain, sourceAmount, sourceUsdValue, sourceBalance, onSelectSourceChain,
    onSwitchChains, canSwitchChains = true, onMaxClick,
    destination, onSelectDestinationChain, onSetDestinationUsd, presets,
    bridgeFeeUSD, estimatedTime,
    useDifferentRecipient, onToggleRecipient, recipient, onSetRecipient, recipientValid,
    canSubmit, swapLabel, onSubmit, walletConnected, onConnect,
  } = props;

  const feeRows: FeeRow[] = [
    { label: "Destination", value: destination.chain.name },
    { label: "Delivering",  value: `$${destination.usd.toFixed(2)}` },
    {
      label: "Bridge fee",
      value: bridgeFeeUSD <= 0.005 ? "FREE" : `$${bridgeFeeUSD.toFixed(2)}`,
      accent: bridgeFeeUSD <= 0.005,
    },
  ];
  if (estimatedTime) feeRows.push({ label: "Est. time", value: estimatedTime });

  return (
    <Card style={{ width: "100%", maxWidth: 480, padding: 22 }}>
      {/* Header */}
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
            Gas
          </span>
          <Pill variant="ghost">Single destination</Pill>
        </div>
        <Pill variant="info">Gas.zip</Pill>
      </div>

      {/* FROM — read-only derived amount */}
      <AmountInput
        label="From"
        value={sourceAmount}
        ticker={sourceChain.ticker}
        onSelectToken={onSelectSourceChain}
        usdValue={sourceUsdValue || null}
        topMeta={
          <ChainSwitcher
            name={sourceChain.name}
            color={sourceChain.color}
            onClick={onSelectSourceChain}
            size="md"
          />
        }
        bottomMeta={
          (sourceBalance || onMaxClick) && (
            <>
              {sourceBalance && (
                <span style={{ color: "rgba(255,255,255,0.40)" }}>Bal {sourceBalance}</span>
              )}
              {onMaxClick && (
                <button type="button" onClick={onMaxClick} style={maxBtnStyle}>MAX</button>
              )}
            </>
          )
        }
      />

      <SwapDivider
        onSwap={onSwitchChains}
        disabled={!canSwitchChains}
        ariaLabel="Switch source and destination chains"
      />

      {/* DESTINATION */}
      <DestinationLeg
        dest={destination}
        onSelectChain={onSelectDestinationChain}
        onSetUsd={onSetDestinationUsd}
        presets={presets}
      />

      {/* Action buttons row */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onToggleRecipient}
          style={recipientBtnStyle(useDifferentRecipient)}
        >
          {useDifferentRecipient ? "Recipient: custom" : "Send to another wallet"}
        </button>
      </div>

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

      {/* Visible fees */}
      <div style={{ marginTop: 18 }}>
        <FeeBreakdown rows={feeRows} bordered />
      </div>

      {/* CTA */}
      <div style={{ marginTop: 18 }}>
        {!walletConnected ? (
          <PrimaryButton onClick={onConnect}>Connect wallet</PrimaryButton>
        ) : (
          <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>{swapLabel}</PrimaryButton>
        )}
      </div>
    </Card>
  );
}

// ─── Destination leg — mirrors AmountInput "To" layout ────────────────────

function DestinationLeg({
  dest, onSelectChain, onSetUsd, presets,
}: {
  dest: GasDestination;
  onSelectChain: () => void;
  onSetUsd: (usd: number) => void;
  presets: number[];
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderTop: "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Top row — "To" label + ChainSwitcher (matches AmountInput's topMeta) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.30em",
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          To
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChainSwitcher
            name={dest.chain.name}
            color={dest.chain.color}
            onClick={onSelectChain}
            size="md"
          />
        </div>
      </div>

      {/* Amount row — analogous to AmountInput's big number + USD value */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 32, color: "rgba(255,255,255,0.40)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, lineHeight: 1 }}>$</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={dest.usd || ""}
            onChange={(e) => onSetUsd(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            style={{
              width: "100%",
              maxWidth: 180,
              padding: 0,
              background: "transparent",
              border: "none",
              color: "#FF8A00",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              outline: "none",
              lineHeight: 1,
            }}
          />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, paddingBottom: 2 }}>
          <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {dest.nativeOut > 0
              ? `${dest.nativeOut < 0.01 ? dest.nativeOut.toFixed(6) : dest.nativeOut.toFixed(4)} ${dest.chain.ticker}`
              : `0 ${dest.chain.ticker}`}
          </p>
        </div>
      </div>

      {/* Preset chips */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {presets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSetUsd(v)}
            style={presetChipStyle(dest.usd === v)}
          >
            ${v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const maxBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#FF8A00",
  fontFamily: "Inter, sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.30em",
  cursor: "pointer",
  padding: 0,
};

function recipientBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    background: active ? "rgba(96,165,250,0.10)" : "transparent",
    border: `1px solid ${active ? "rgba(96,165,250,0.30)" : "rgba(255,255,255,0.10)"}`,
    borderRadius: 4,
    color: active ? "#93C5FD" : "rgba(255,255,255,0.65)",
    fontFamily: "Inter, sans-serif",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}

function presetChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    background: active ? "rgba(255,138,0,0.12)" : "transparent",
    border: `1px solid ${active ? "rgba(255,138,0,0.45)" : "rgba(255,255,255,0.10)"}`,
    borderRadius: 4,
    color: active ? "#FF8A00" : "rgba(255,255,255,0.65)",
    fontFamily: "Inter, sans-serif",
    fontSize: 10.5,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
  };
}
