// ─── PrimaryButton — full-width call to action ──────────────────────────────

import { CSSProperties, ReactNode } from "react";

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function PrimaryButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = true,
  className = "",
  style = {},
}: PrimaryButtonProps) {
  const palette = {
    primary: {
      bg: disabled ? "rgba(255,138,0,0.30)" : "#FF8A00",
      color: "#05050c",
      hover: "#FFB347",
      shadow: "0 0 30px rgba(255,138,0,0.35)",
    },
    secondary: {
      bg: "rgba(255,255,255,0.06)",
      color: "#fff",
      hover: "rgba(255,255,255,0.10)",
      shadow: "none",
    },
    danger: {
      bg: "rgba(239,68,68,0.20)",
      color: "#FCA5A5",
      hover: "rgba(239,68,68,0.30)",
      shadow: "none",
    },
  }[variant];

  return (
    <button
      type="button"
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={`empx-primary-button ${className}`}
      style={{
        width: fullWidth ? "100%" : "auto",
        padding: "14px 22px",
        background: palette.bg,
        color: palette.color,
        border: variant === "secondary" ? "1px solid rgba(255,255,255,0.10)" : "none",
        borderRadius: 4,
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: palette.shadow,
        transition: "background 200ms ease, box-shadow 200ms ease, transform 100ms ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        e.currentTarget.style.background = palette.hover;
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return;
        e.currentTarget.style.background = palette.bg;
      }}
    >
      {loading ? "…" : children}
    </button>
  );
}
