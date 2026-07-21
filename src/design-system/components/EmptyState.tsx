// ─── EmptyState — generic empty-data placeholder ──────────────────────────

import { ReactNode } from "react";
import BrandMark from "./BrandMark";
import PrimaryButton from "./PrimaryButton";

interface EmptyStateProps {
  headline: string;
  body?: string;
  /** Optional icon shown above headline.  When omitted, faint BrandMark renders. */
  icon?: ReactNode;
  /** Optional primary action */
  action?: { label: string; onClick: () => void };
  /** Optional secondary action */
  secondaryAction?: { label: string; onClick: () => void };
  /** "card" wraps in a Card-like surface; "inline" returns just the block */
  surface?: "card" | "inline";
  /** Compact mode (reduces vertical padding) */
  compact?: boolean;
}

export default function EmptyState({
  headline,
  body,
  icon,
  action,
  secondaryAction,
  surface = "card",
  compact = false,
}: EmptyStateProps) {
  const Content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: compact ? "20px 16px" : "40px 24px",
        textAlign: "center",
      }}
    >
      <span style={{ opacity: 0.50, marginBottom: 4 }}>
        {icon || <BrandMark size={36} opacity={0.55} />}
      </span>
      <p
        style={{
          margin: 0,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16,
          fontWeight: 400,
          color: "#fff",
          letterSpacing: "-0.015em",
        }}
      >
        {headline}
      </p>
      {body && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "rgba(255,255,255,0.50)",
            maxWidth: 460,
            lineHeight: 1.55,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {body}
        </p>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {action && (
            <PrimaryButton onClick={action.onClick} fullWidth={false}>
              {action.label}
            </PrimaryButton>
          )}
          {secondaryAction && (
            <PrimaryButton variant="secondary" onClick={secondaryAction.onClick} fullWidth={false}>
              {secondaryAction.label}
            </PrimaryButton>
          )}
        </div>
      )}
    </div>
  );

  if (surface === "inline") return Content;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.10)",
        borderRadius: 6,
      }}
    >
      {Content}
    </div>
  );
}
