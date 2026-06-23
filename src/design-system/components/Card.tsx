// ─── Card — primary glass surface ────────────────────────────────────────────
//
// The fundamental visual container for the dApp. Three variants:
//   - default: subtle glass with white border (most common)
//   - raised:  slightly darker bg + heavier shadow (for elevated modals)
//   - accent:  orange tint + glow (for active / important surfaces)
//
// Optional `interactive` adds hover state.  Optional `compact` reduces padding.

import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "raised" | "accent";
  interactive?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  as?: "div" | "article" | "button" | "section";
}

export default function Card({
  children,
  variant = "default",
  interactive = false,
  compact = false,
  className = "",
  style = {},
  onClick,
  as = "div",
}: CardProps) {
  const Tag = as as any;
  const base: CSSProperties = {
    background:
      variant === "raised"
        ? "rgba(255,255,255,0.02)"
        : variant === "accent"
        ? "linear-gradient(135deg, rgba(255,138,0,0.06) 0%, rgba(255,138,0,0.015) 100%)"
        : "rgba(255,255,255,0.025)",
    border:
      variant === "accent"
        ? "1px solid rgba(255,138,0,0.35)"
        : "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow:
      variant === "accent"
        ? "0 0 40px rgba(255,138,0,0.10), 0 6px 24px rgba(0,0,0,0.30)"
        : variant === "raised"
        ? "0 18px 60px rgba(0,0,0,0.45)"
        : "0 6px 24px rgba(0,0,0,0.20)",
    padding: compact ? "0.875rem 1rem" : "1.25rem 1.5rem",
    color: "#fff",
    cursor: interactive || onClick ? "pointer" : undefined,
    transition:
      "border-color 260ms cubic-bezier(0.22, 1, 0.36, 1), background 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    ...style,
  };

  return (
    <Tag
      onClick={onClick}
      className={`empx-card empx-card-${variant} ${interactive ? "empx-card-interactive" : ""} ${className}`}
      style={base}
    >
      {children}
    </Tag>
  );
}
