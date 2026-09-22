import type { CSSProperties } from "react";
import type { BasketCapabilities, BasketExecutionPlan, BasketMode, BasketQuote, BasketStatus } from "../api/contracts";
import { MODE_LABEL } from "../model/modes";
import { modeCapability } from "../hooks/useBasketCapabilities";
import { failedLegs } from "../execution/basketExecution";

export interface BasketReviewPanelProps {
  mode: BasketMode;
  capabilities: BasketCapabilities | null;
  capabilitiesError?: string | null;
  quote: BasketQuote | null;
  plan: BasketExecutionPlan | null;
  status: BasketStatus | null;
  busy: boolean;
  walletConnected: boolean;
  canQuote: boolean;
  executeLocked?: boolean;
  onQuote: () => void;
  onPlan: () => void;
  onExecute: () => void;
  onRetry: () => void;
}

export function BasketReviewPanel({
  mode,
  capabilities,
  capabilitiesError,
  quote,
  plan,
  status,
  busy,
  walletConnected,
  canQuote,
  executeLocked = false,
  onQuote,
  onPlan,
  onExecute,
  onRetry,
}: BasketReviewPanelProps) {
  const capability = modeCapability(capabilities, mode);
  const disabledReason = !walletConnected
    ? "Connect a wallet to quote and execute."
    : capabilitiesError
      ? capabilitiesError
      : !capability.enabled
        ? capability.reason
        : !canQuote
          ? "Complete a valid basket before quoting."
          : quote && !quote.capabilities.canPlan
            ? quote.capabilities.unavailableReasons[0] ?? "Planning is unavailable."
            : null;
  const retryable = status ? failedLegs(status) : [];
  const planDisabled = busy || !quote || Boolean(disabledReason);
  const executeDisabled = busy || !quote || !plan || executeLocked || Boolean(disabledReason);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
        {MODE_LABEL[mode]} uses the server quote and plan. Calldata is not reconstructed in the browser.
      </p>
      {disabledReason && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.30)",
            borderRadius: 4,
            fontSize: 11.5,
            color: "#F87171",
            lineHeight: 1.5,
          }}
        >
          {disabledReason}
        </div>
      )}
      {quote && (
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
          Quote {quote.basketId} · v{quote.quoteVersion} · {quote.legs.length} legs
          {quote.skipped.length > 0 ? ` · ${quote.skipped.length} skipped` : ""}
        </div>
      )}
      {status && (
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
          Status {status.composite} · failed {status.counts.failed} · settled {status.counts.settled}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <ReviewActionButton
          label={busy ? "Working…" : "Quote basket"}
          disabled={busy || Boolean(disabledReason)}
          variant={!quote ? "primary" : "secondary"}
          onClick={onQuote}
        />
        <ReviewActionButton
          label="Sign plan"
          disabled={planDisabled}
          variant={quote && !plan ? "primary" : "secondary"}
          onClick={onPlan}
        />
        <ReviewActionButton
          label="Execute server plan"
          disabled={executeDisabled}
          variant={quote && plan && !executeLocked ? "primary" : "secondary"}
          onClick={onExecute}
        />
        <ReviewActionButton
          label="Retry failed legs"
          disabled={busy || retryable.length === 0}
          variant="secondary"
          onClick={onRetry}
        />
      </div>
    </div>
  );
}

function ReviewActionButton({
  label,
  disabled,
  variant,
  onClick,
}: {
  label: string;
  disabled: boolean;
  variant: "primary" | "secondary";
  onClick: () => void;
}) {
  const primary = variant === "primary" && !disabled;
  const style: CSSProperties = {
    width: "100%",
    padding: "14px 22px",
    background: primary ? "#FF8A00" : disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
    color: primary ? "#05050c" : disabled ? "rgba(255,255,255,0.35)" : "#fff",
    border: primary ? "none" : "1px solid rgba(255,255,255,0.10)",
    borderRadius: 4,
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.20em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    boxShadow: primary ? "0 0 30px rgba(255,138,0,0.35)" : "none",
    transition: "background 200ms ease, box-shadow 200ms ease",
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={style}>
      {label}
    </button>
  );
}
