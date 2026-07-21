// ─── QuoteCountdown — quote validity ring + state transitions ──────────────
//
// Replaces the ugly "quote expires in 30s" warning with a circular countdown
// ring that pulses orange when fresh, transitions to red as expiry approaches,
// and displays a clear EXPIRED + refresh state when stale.

import { useEffect, useState } from "react";

interface QuoteCountdownProps {
  /** Total quote validity in ms (e.g. 30_000) */
  totalMs: number;
  /** Timestamp the quote was issued (ms epoch). Reset when new quote arrives. */
  issuedAt: number;
  /** Called when user clicks the refresh affordance after expiry. */
  onRefresh?: () => void;
  /** Compact variant — tighter sizing for inline placement. */
  compact?: boolean;
  /** Optional label override (default: "Quote valid"). */
  label?: string;
}

export default function QuoteCountdown({
  totalMs,
  issuedAt,
  onRefresh,
  compact = false,
  label = "Quote valid",
}: QuoteCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, totalMs - (now - issuedAt));
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const expired = remainingMs <= 0;
  const critical = !expired && remainingMs <= totalMs * 0.20;

  const size = compact ? 26 : 34;
  const stroke = compact ? 2.4 : 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  // Color transitions: orange → yellow → red as time runs out
  const color = expired
    ? "#FCA5A5"
    : critical
    ? "#FBBF24"
    : "#FF8A00";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 8 : 10,
        padding: compact ? "4px 10px 4px 4px" : "5px 12px 5px 5px",
        background: expired
          ? "rgba(239,68,68,0.06)"
          : critical
          ? "rgba(251,191,36,0.06)"
          : "rgba(255,138,0,0.05)",
        borderRadius: 999,
      }}
    >
      <span style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 320ms cubic-bezier(0.22,1,0.36,1), stroke 320ms ease",
              filter: critical || expired
                ? "drop-shadow(0 0 4px currentColor)"
                : "none",
            }}
          />
        </svg>
        {/* Centered seconds remaining OR expired glyph */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            fontSize: compact ? 9 : 10,
            fontWeight: 700,
            color,
            letterSpacing: "-0.02em",
            animation: critical && !expired ? "empxQuotePulse 1.4s ease-in-out infinite" : undefined,
          }}
        >
          {expired ? (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            remainingSec
          )}
        </span>
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: compact ? 9 : 10,
            fontWeight: 700,
            letterSpacing: "0.30em",
            color: expired ? "#FCA5A5" : critical ? "#FBBF24" : "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          {expired ? "Expired" : label}
        </span>
        {expired ? (
          onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "#FF8A00",
                fontFamily: "Inter, sans-serif",
                fontSize: compact ? 10 : 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                cursor: "pointer",
                textAlign: "left",
                transition: "opacity 160ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Refresh quote ↻
            </button>
          ) : (
            <span style={{ fontSize: compact ? 10 : 11, color: "rgba(255,255,255,0.55)" }}>
              Click to refresh
            </span>
          )
        ) : (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: compact ? 10 : 11,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {remainingSec}s remaining
          </span>
        )}
      </div>

      <style>{`
        @keyframes empxQuotePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
