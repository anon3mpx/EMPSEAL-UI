// ─── Pill — borderless inline labels ────────────────────────────────────────
//
// Updated per design feedback: NO outlines.  Distinguished by background tint
// + color + uppercase tracking.  Cleaner, more typographic.

import { CSSProperties, ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  variant?: "default" | "accent" | "ghost" | "success" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}

export default function Pill({
  children,
  variant = "default",
  size = "sm",
  className = "",
  style = {},
}: PillProps) {
  const palette = {
    default: {
      bg: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.78)",
    },
    accent: {
      bg: "rgba(255,138,0,0.10)",
      color: "#FF8A00",
    },
    ghost: {
      bg: "transparent",
      color: "rgba(255,255,255,0.50)",
    },
    success: {
      bg: "rgba(16,185,129,0.10)",
      color: "#34D399",
    },
    danger: {
      bg: "rgba(239,68,68,0.10)",
      color: "#FCA5A5",
    },
    info: {
      bg: "rgba(96,165,250,0.10)",
      color: "#93C5FD",
    },
  }[variant];

  return (
    <span
      className={`empx-pill ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: size === "sm" ? "3px 8px" : "4px 10px",
        background: palette.bg,
        border: "none",
        borderRadius: 2,
        fontFamily: "Inter, sans-serif",
        fontSize: size === "sm" ? 9 : 10,
        fontWeight: 700,
        letterSpacing: "0.30em",
        color: palette.color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
