// ─── TradeSuccessModal — post-confirm celebration + timeline ──────────────

import { ReactNode } from "react";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import Pill from "./Pill";

export interface TradeTimelineStep {
  /** Label of this stage (e.g. "Source confirmation", "Bridge", "Destination delivery") */
  label: string;
  /** Sub-description shown beneath */
  description?: string;
  /** State of this stage */
  state: "complete" | "active" | "pending";
  /** Optional: time at which this step completed */
  timeLabel?: string;
}

export interface TxHashLink {
  label: string;
  hashShort: string;
  url?: string;
  chainName?: string;
  chainColor?: string;
}

interface TradeSuccessModalProps {
  open: boolean;
  onClose: () => void;
  /** "SWAP" / "CROSS-CHAIN" / "BRIDGE" / "REFUEL" */
  kind?: string;

  fromTicker: string;
  fromAmount: string;
  fromChainName?: string;

  toTicker: string;
  toAmount: string;
  toChainName?: string;

  /** Tx hashes — typically src + dest for cross-chain. */
  txHashes?: TxHashLink[];

  /** Cross-chain lifecycle timeline */
  timeline?: TradeTimelineStep[];

  /** Tagline shown beneath the headline (e.g. "USDT arrived on Base") */
  message?: string;

  onNewTrade?: () => void;
  onViewPortfolio?: () => void;
}

export default function TradeSuccessModal({
  open,
  onClose,
  kind = "SWAP",
  fromTicker,
  fromAmount,
  fromChainName,
  toTicker,
  toAmount,
  toChainName,
  txHashes,
  timeline,
  message,
  onNewTrade,
  onViewPortfolio,
}: TradeSuccessModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={`${kind} · COMPLETE`}
      title="Trade successful"
      maxWidth={500}
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          {onViewPortfolio && (
            <PrimaryButton variant="secondary" onClick={onViewPortfolio} fullWidth>
              View portfolio
            </PrimaryButton>
          )}
          {onNewTrade && (
            <PrimaryButton onClick={onNewTrade} fullWidth>
              New trade
            </PrimaryButton>
          )}
        </div>
      }
    >
      {/* Success badge — animated check */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 0 16px",
          position: "relative",
        }}
      >
        <SuccessBadge />
        <p
          style={{
            margin: "16px 0 4px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "#fff",
            textAlign: "center",
          }}
        >
          {message || "Confirmed on-chain"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.50)",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 380,
          }}
        >
          Your trade settled successfully. Funds are now available in the
          destination wallet.
        </p>
      </div>

      {/* Trade summary */}
      <div
        style={{
          padding: "14px 16px",
          background:
            "linear-gradient(135deg, rgba(255,138,0,0.04) 0%, transparent 60%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 5,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <SwapEnd
            label="Sent"
            chainName={fromChainName}
            amount={fromAmount}
            ticker={fromTicker}
          />
          <ArrowIcon />
          <SwapEnd
            label="Received"
            chainName={toChainName}
            amount={toAmount}
            ticker={toTicker}
            accent
          />
        </div>
      </div>

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 9,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Lifecycle
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {timeline.map((step, i) => (
              <TimelineStep
                key={i}
                step={step}
                isLast={i === timeline.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tx hashes */}
      {txHashes && txHashes.length > 0 && (
        <div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 9,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Transactions
          </p>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            {txHashes.map((tx, i) => (
              <a
                key={i}
                href={tx.url || "#"}
                target={tx.url ? "_blank" : undefined}
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom:
                    i < txHashes.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  textDecoration: "none",
                  color: "#fff",
                  transition: "background 140ms ease",
                }}
                onMouseEnter={(e) => {
                  if (tx.url) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {tx.chainColor && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: tx.chainColor,
                      boxShadow: `0 0 6px ${tx.chainColor}`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      letterSpacing: "0.30em",
                      color: "rgba(255,255,255,0.50)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {tx.label}
                    {tx.chainName && (
                      <span style={{ color: "rgba(255,255,255,0.30)" }}> · {tx.chainName.toUpperCase()}</span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: 12,
                      color: "#fff",
                      fontWeight: 500,
                    }}
                  >
                    {tx.hashShort}
                  </p>
                </div>
                {tx.url && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: "#FF8A00", opacity: 0.7 }}>
                    <path d="M1.5 6V9.5H9.5V6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 1.5H9.5V5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M9.5 1.5L5 6" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SuccessBadge() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: 64,
        height: 64,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulsing ring */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(52,211,153,0.10)",
          animation: "empxSuccessPulse 2.4s cubic-bezier(0.22,1,0.36,1) infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(52,211,153,0.05) 100%)",
          border: "1px solid rgba(52,211,153,0.45)",
          boxShadow:
            "0 0 24px rgba(52,211,153,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      />
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        style={{ position: "relative", zIndex: 2 }}
      >
        <path
          d="M5 11.5L9 15.5L17 7"
          stroke="#34D399"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "empxSuccessCheck 480ms cubic-bezier(0.22,1,0.36,1) forwards" }}
        />
      </svg>

      <style>{`
        @keyframes empxSuccessPulse {
          0%   { transform: scale(0.85); opacity: 0.8; }
          70%  { transform: scale(1.20); opacity: 0; }
          100% { transform: scale(1.20); opacity: 0; }
        }
        @keyframes empxSuccessCheck {
          from { stroke-dasharray: 30; stroke-dashoffset: 30; }
          to   { stroke-dasharray: 30; stroke-dashoffset: 0; }
        }
      `}</style>
    </span>
  );
}

function SwapEnd({
  label,
  chainName,
  amount,
  ticker,
  accent,
}: {
  label: string;
  chainName?: string;
  amount: string;
  ticker: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 9,
          letterSpacing: "0.35em",
          color: accent ? "#FF8A00" : "rgba(255,255,255,0.40)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
        {chainName && (
          <span style={{ opacity: 0.55, marginLeft: 6 }}>· {chainName.toUpperCase()}</span>
        )}
      </p>
      <p
        style={{
          margin: "5px 0 0",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 300,
          fontSize: 22,
          lineHeight: 1,
          letterSpacing: "-0.025em",
          color: accent ? "#FF8A00" : "#fff",
          textShadow: accent ? "0 0 18px rgba(255,138,0,0.28)" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {amount}
      </p>
      <p
        style={{
          margin: "3px 0 0",
          fontSize: 11,
          fontWeight: 600,
          color: accent ? "#FF8A00" : "rgba(255,255,255,0.55)",
        }}
      >
        {ticker}
      </p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#0A0A14",
        border: "1px solid rgba(255,138,0,0.40)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FF8A00",
        boxShadow: "0 0 16px rgba(255,138,0,0.25)",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5H8M8 5L5 2M8 5L5 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function TimelineStep({ step, isLast }: { step: TradeTimelineStep; isLast: boolean }) {
  const palette =
    step.state === "complete"
      ? { dot: "#34D399", track: "#34D399" }
      : step.state === "active"
      ? { dot: "#FF8A00", track: "rgba(255,138,0,0.45)" }
      : { dot: "rgba(255,255,255,0.20)", track: "rgba(255,255,255,0.08)" };
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 14 }}>
      <div style={{ position: "relative", width: 14, flexShrink: 0 }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            left: 5,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: palette.dot,
            boxShadow: step.state !== "pending" ? `0 0 6px ${palette.dot}` : "none",
            zIndex: 1,
          }}
        />
        {!isLast && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 10,
              left: 6.5,
              bottom: -14,
              width: 1,
              background: palette.track,
              animation:
                step.state === "active"
                  ? "empxTimelineFlow 1.6s cubic-bezier(0.22,1,0.36,1) infinite"
                  : "none",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, paddingTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: step.state === "pending" ? "rgba(255,255,255,0.45)" : "#fff" }}>
            {step.label}
          </p>
          {step.timeLabel && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)" }}>{step.timeLabel}</span>
          )}
        </div>
        {step.description && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.5,
            }}
          >
            {step.description}
          </p>
        )}
        {step.state === "active" && (
          <div style={{ marginTop: 4 }}>
            <Pill variant="accent">In progress</Pill>
          </div>
        )}
      </div>
      <style>{`
        @keyframes empxTimelineFlow {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
