// ─── FeeBreakdown — structured fee/route info block ─────────────────────────
//
// The signature visual from the landing page mockup:
//
//   ───────────────────────────────────
//   Pair type                     V / S
//   Protocol fee       15 bps · $4.78  (orange)
//   Best route              Uniswap V3
//
// Accepts an array of rows; each row can be:
//   { label, value, accent?, sub? }
//
// Used for swap fee breakdown, route info, slippage details, and any other
// "row of key + value" structured display.

import { CSSProperties } from "react";

export interface FeeRow {
  label: string;
  value: React.ReactNode;
  /** Render value in brand orange + glow. */
  accent?: boolean;
  /** Optional secondary value (rendered next to value, dimmer). */
  sub?: string;
  /** Render a dim "muted" row. */
  muted?: boolean;
  /** Render row as a divider rule (no label/value). */
  divider?: boolean;
  /** Optional tooltip hint. */
  hint?: string;
}

interface FeeBreakdownProps {
  rows: FeeRow[];
  /** Top separator (default true). */
  bordered?: boolean;
  /** Compact mode (smaller spacing). */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function FeeBreakdown({
  rows,
  bordered = true,
  compact = false,
  className = "",
  style = {},
}: FeeBreakdownProps) {
  return (
    <div
      className={`empx-fee-breakdown ${className}`}
      style={{
        borderTop: bordered ? "1px solid rgba(255,255,255,0.10)" : "none",
        paddingTop: bordered ? (compact ? 10 : 14) : 0,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 6,
        fontFamily: "Inter, sans-serif",
        ...style,
      }}
    >
      {rows.map((row, i) => {
        if (row.divider) {
          return (
            <div
              key={i}
              style={{
                borderTop: "1px dashed rgba(255,255,255,0.10)",
                margin: compact ? "4px 0" : "6px 0",
              }}
            />
          );
        }
        return (
          <div
            key={i}
            className="empx-fee-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: compact ? 12 : 13,
              gap: 12,
              opacity: row.muted ? 0.7 : 1,
            }}
            title={row.hint}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                flexShrink: 0,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                color: row.accent ? "#FF8A00" : "rgba(255,255,255,0.92)",
                textAlign: "right",
                fontFeatureSettings: '"tnum"',
                textShadow: row.accent ? "0 0 16px rgba(255,138,0,0.25)" : "none",
                fontWeight: row.accent ? 500 : 400,
              }}
            >
              {row.value}
              {row.sub && (
                <span
                  style={{
                    color: "rgba(255,255,255,0.40)",
                    fontWeight: 400,
                    marginLeft: 6,
                    textShadow: "none",
                  }}
                >
                  {row.sub}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
