// ─── Tabs — horizontal segmented tab bar ───────────────────────────────────

import { CSSProperties, ReactNode } from "react";

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional count badge (e.g. activity tab "5") */
  count?: number;
  icon?: ReactNode;
}

interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  active: T;
  onChange: (value: T) => void;
  /** Layout: underline (default) or pill */
  variant?: "underline" | "pill";
  className?: string;
  style?: CSSProperties;
}

export default function Tabs<T extends string = string>({
  options,
  active,
  onChange,
  variant = "underline",
  className = "",
  style = {},
}: TabsProps<T>) {
  return (
    <div
      className={`empx-tabs empx-tabs-${variant} ${className}`}
      style={{
        display: "flex",
        gap: variant === "pill" ? 4 : 2,
        borderBottom:
          variant === "underline" ? "1px solid rgba(255,255,255,0.06)" : "none",
        paddingBottom: variant === "underline" ? 2 : 0,
        ...style,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: variant === "pill" ? "7px 14px" : "9px 14px",
              background:
                variant === "pill"
                  ? isActive
                    ? "rgba(255,138,0,0.10)"
                    : "rgba(255,255,255,0.025)"
                  : "transparent",
              border:
                variant === "pill"
                  ? `1px solid ${isActive ? "rgba(255,138,0,0.40)" : "rgba(255,255,255,0.06)"}`
                  : "none",
              borderBottom:
                variant === "underline"
                  ? `2px solid ${isActive ? "#FF8A00" : "transparent"}`
                  : undefined,
              borderRadius: variant === "pill" ? 3 : 0,
              color: isActive ? "#FF8A00" : "rgba(255,255,255,0.55)",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 160ms ease, border-color 160ms ease, background 160ms ease",
            }}
            onMouseEnter={(e) => {
              if (isActive) return;
              e.currentTarget.style.color = "#fff";
              if (variant === "pill")
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
            }}
            onMouseLeave={(e) => {
              if (isActive) return;
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              if (variant === "pill")
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            {opt.icon && <span style={{ display: "inline-flex" }}>{opt.icon}</span>}
            {opt.label}
            {opt.count !== undefined && (
              <span
                style={{
                  color: "rgba(255,255,255,0.30)",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  fontSize: 10,
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
