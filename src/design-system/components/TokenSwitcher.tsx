// ─── TokenSwitcher — borderless clickable token selector ────────────────────
//
// Replaces TokenButton's boxed look.  Bold ticker, optional small logo,
// subtle chevron — appears in the screenshot style as just text on the
// surface.

import { CSSProperties, ReactNode } from "react";

interface TokenSwitcherProps {
  ticker: string;
  logo?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  accent?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}

export default function TokenSwitcher({
  ticker,
  logo,
  onClick,
  ariaLabel,
  accent = false,
  disabled = false,
  size = "md",
  className = "",
  style = {},
}: TokenSwitcherProps) {
  const fontSize = size === "sm" ? 13 : 15;
  const logoSize = size === "sm" ? 16 : 20;

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Select ${ticker} token`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick?.();
      }}
      disabled={disabled}
      className={`empx-token-switcher ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "transparent",
        border: "none",
        minWidth: size === "sm" ? 44 : 56,
        minHeight: size === "sm" ? 30 : 36,
        padding: "4px 2px",
        justifyContent: "flex-end",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: accent ? "#FF8A00" : "#FFFFFF",
        fontFamily: "Inter, sans-serif",
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "opacity 160ms ease, color 160ms ease",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.opacity = "0.78";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.opacity = "1";
      }}
    >
      {logo && (
        <span
          style={{
            width: logoSize,
            height: logoSize,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 3,
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {logo}
        </span>
      )}
      <span style={{ whiteSpace: "nowrap" }}>{ticker}</span>
      {!disabled && (
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ opacity: 0.55, transform: "translateY(1px)" }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
