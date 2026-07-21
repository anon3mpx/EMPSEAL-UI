// ─── ChainSwitcher — borderless clickable chain selector ────────────────────
//
// Distinct from ChainBadge (passive visual ID).  This is interactive — used
// when the user can change the current chain.  Renders as borderless
// uppercase text with subtle color dot + chevron.

import { CSSProperties } from "react";

interface ChainSwitcherProps {
  name: string;
  color?: string;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}

export default function ChainSwitcher({
  name,
  color,
  onClick,
  size = "sm",
  className = "",
  style = {},
}: ChainSwitcherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`empx-chain-switcher ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "rgba(255,255,255,0.88)",
        fontFamily: "Inter, sans-serif",
        fontSize: size === "sm" ? 10 : 12,
        fontWeight: 700,
        letterSpacing: "0.30em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        transition: "color 160ms ease",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8A00")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.88)")}
    >
      {color && (
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
            flexShrink: 0,
          }}
        />
      )}
      {name}
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.6, marginLeft: 2 }}>
        <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
