// ─── NumberDisplay — big formatted number with token suffix ─────────────────
//
// The flagship visual for trade input/output amounts.  Matches the landing
// page mockup style: huge formatted number on the left, small token ticker
// on the right, optional accent color for the value.
//
// Auto-scales font size based on character count so 1,000,000.00 doesn't
// blow out the layout.  Locale-formats numbers with commas.

import { CSSProperties } from "react";

interface NumberDisplayProps {
  value: string | number;
  token?: string;
  /** Label rendered above the number (eyebrow). */
  label?: string;
  /** Accent variant — orange highlight for outputs. */
  accent?: boolean;
  /** Override max font size (px). Default scales with char count. */
  maxFontSize?: number;
  /** USD secondary line below the value. */
  usdValue?: string | number | null;
  /** Disable number formatting (commas). Useful for input fields. */
  raw?: boolean;
  /** Visually compress for dense layouts. */
  compact?: boolean;
  className?: string;
}

function formatNumber(v: string | number, raw: boolean): string {
  if (raw) return String(v);
  const num = typeof v === "string" ? Number(v.replace(/,/g, "")) : v;
  if (!Number.isFinite(num)) return "0";
  // Preserve at most 6 decimals; locale-format the integer part
  const fixed = num.toFixed(6).replace(/\.?0+$/, "");
  const [intPart, decPart] = fixed.split(".");
  return decPart
    ? `${Number(intPart).toLocaleString("en-US")}.${decPart}`
    : Number(intPart).toLocaleString("en-US");
}

function autoScaleFontSize(text: string, max: number, compact: boolean): number {
  const len = text.length;
  const min = compact ? 20 : 24;
  if (len <= 6) return max;
  if (len <= 9) return Math.max(min, max - 4);
  if (len <= 12) return Math.max(min, max - 12);
  if (len <= 16) return Math.max(min, max - 22);
  return Math.max(min, max - 32);
}

export default function NumberDisplay({
  value,
  token,
  label,
  accent = false,
  maxFontSize = 40,
  usdValue,
  raw = false,
  compact = false,
  className = "",
}: NumberDisplayProps) {
  const formatted = formatNumber(value, raw);
  const fontSize = autoScaleFontSize(formatted, maxFontSize, compact);

  const valueStyle: CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 300,
    letterSpacing: "-0.025em",
    fontSize: `${fontSize}px`,
    lineHeight: 1,
    color: accent ? "#FF8A00" : "#FFFFFF",
    textShadow: accent ? "0 0 30px rgba(255,138,0,0.25)" : "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div className={`empx-number-display ${className}`}>
      {label && (
        <p
          className="empx-number-display-label"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            letterSpacing: "0.30em",
            color: "rgba(255,255,255,0.40)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {label}
        </p>
      )}
      <div
        className="empx-number-display-row"
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
          minWidth: 0,
        }}
      >
        <span style={valueStyle}>{formatted}</span>
        {token && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: compact ? 12 : 13,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: accent ? "#FF8A00" : "rgba(255,255,255,0.55)",
              flexShrink: 0,
            }}
          >
            {token}
          </span>
        )}
      </div>
      {usdValue !== undefined && usdValue !== null && (
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.40)",
            marginTop: 4,
          }}
        >
          {typeof usdValue === "number"
            ? `≈ $${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
            : `≈ ${usdValue}`}
        </p>
      )}
    </div>
  );
}
