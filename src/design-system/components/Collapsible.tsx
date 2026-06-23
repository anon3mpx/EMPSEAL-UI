// ─── Collapsible — inline expand/collapse widget ────────────────────────────
//
// Used for settings, advanced details, routing breakdown — anywhere the user
// wants to drill in without leaving context.  Borderless trigger, smooth
// expand, optional eyebrow label.

import { CSSProperties, ReactNode, useState } from "react";

interface CollapsibleProps {
  title: string;
  /** Optional subtitle shown next to the title in muted text. */
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Optional small visual marker on the trigger (a Pill, count, etc). */
  trigger?: ReactNode;
}

export default function Collapsible({
  title,
  subtitle,
  children,
  defaultOpen = false,
  className = "",
  style = {},
  trigger,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`empx-collapsible ${className}`}
      style={{
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 0",
          background: "transparent",
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          color: "rgba(255,255,255,0.78)",
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          transition: "color 160ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8A00")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.78)")}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {title}
          {subtitle && (
            <span
              style={{
                color: "rgba(255,255,255,0.35)",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "none",
                fontSize: 11,
              }}
            >
              {subtitle}
            </span>
          )}
          {trigger}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 260ms cubic-bezier(0.22,1,0.36,1)",
            opacity: 0.65,
          }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? 1200 : 0,
          transition: open
            ? "max-height 360ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease"
            : "max-height 260ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease",
          opacity: open ? 1 : 0,
        }}
      >
        <div style={{ paddingTop: 4, paddingBottom: 12 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
