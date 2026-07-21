// ─── ChainBadge — passive chain identifier ──────────────────────────────────
//
// NOT clickable.  Read-only visual identifier — paired with text so user knows
// what chain the data refers to.  For interactive chain change, use
// ChainSwitcher instead.

import { CSSProperties } from "react";

interface ChainBadgeProps {
  name: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export default function ChainBadge({ name, color, className = "", style = {} }: ChainBadgeProps) {
  return (
    <span
      className={`empx-chain-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.30em",
        color: "rgba(255,255,255,0.55)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
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
    </span>
  );
}
