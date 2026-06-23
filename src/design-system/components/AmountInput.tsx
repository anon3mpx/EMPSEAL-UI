// ─── AmountInput — flat row with separated meta zones ──────────────────────
//
// THREE optional meta zones (no collisions when balance scales):
//   topMeta   — right of LABEL (use for: chain switcher / context tag)
//   bottomMeta — right of USD VALUE (use for: balance + MAX)
//   meta      — alias for topMeta (backwards-compat)

import { CSSProperties, ReactNode } from "react";
import TokenSwitcher from "./TokenSwitcher";

interface AmountInputProps {
  label?: string;
  value: string;
  onChange?: (v: string) => void;
  ticker: string;
  tokenLogo?: ReactNode;
  onSelectToken?: () => void;
  accent?: boolean;
  /** Meta rendered next to the LABEL row (top-right of the input). */
  topMeta?: ReactNode;
  /** Meta rendered next to the USD VALUE row (bottom-right of the input). */
  bottomMeta?: ReactNode;
  /** @deprecated — alias for topMeta */
  meta?: ReactNode;
  usdValue?: string | number | null;
  maxFontSize?: number;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

function formatAmount(v: string): string {
  if (!v) return "";
  const cleaned = v.replace(/,/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return v;
  if (cleaned.endsWith(".")) return num.toLocaleString("en-US") + ".";
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = Number(intPart || "0").toLocaleString("en-US");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function autoScaleFontSize(text: string, max: number): number {
  const len = (text || "0").length;
  if (len <= 7) return max;
  if (len <= 10) return max - 6;
  if (len <= 14) return max - 14;
  if (len <= 18) return max - 22;
  return Math.max(24, max - 30);
}

export default function AmountInput({
  label,
  value,
  onChange,
  ticker,
  tokenLogo,
  onSelectToken,
  accent = false,
  topMeta,
  bottomMeta,
  meta,
  usdValue,
  maxFontSize = 46,
  compact = false,
  className = "",
  style = {},
}: AmountInputProps) {
  const isReadOnly = !onChange;
  const displayValue = isReadOnly ? formatAmount(value) : value;
  const fontSize = autoScaleFontSize(displayValue, compact ? maxFontSize - 6 : maxFontSize);
  const valueColor = accent ? "#FF8A00" : "#FFFFFF";
  const effectiveTopMeta = topMeta ?? meta;

  return (
    <div
      className={`empx-amount-input ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: `${compact ? 8 : 12}px 0`,
        ...style,
      }}
    >
      {/* Top row: label + topMeta */}
      {(label || effectiveTopMeta) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 16,
            gap: 12,
          }}
        >
          {label ? (
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 10,
                letterSpacing: "0.35em",
                color: accent ? "#FF8A00" : "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          ) : (
            <span />
          )}
          {effectiveTopMeta && (
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {effectiveTopMeta}
            </span>
          )}
        </div>
      )}

      {/* Number row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          minWidth: 0,
        }}
      >
        {isReadOnly ? (
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 300,
              fontSize,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: valueColor,
              textShadow: accent ? "0 0 32px rgba(255,138,0,0.32)" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {displayValue || "0"}
          </span>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="0"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 300,
              fontSize,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: valueColor,
              textShadow: accent ? "0 0 32px rgba(255,138,0,0.32)" : "none",
              cursor: "text",
            }}
          />
        )}
        <TokenSwitcher
          ticker={ticker}
          logo={tokenLogo}
          onClick={onSelectToken}
          accent={accent}
        />
      </div>

      {/* Bottom row: USD value + bottomMeta */}
      {(usdValue !== undefined || bottomMeta) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            minHeight: 16,
          }}
        >
          {usdValue !== undefined && usdValue !== null ? (
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.40)",
                margin: 0,
                letterSpacing: "0.02em",
              }}
            >
              {typeof usdValue === "number"
                ? `≈ $${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                : `≈ ${usdValue}`}
            </p>
          ) : (
            <span />
          )}
          {bottomMeta && (
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {bottomMeta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
