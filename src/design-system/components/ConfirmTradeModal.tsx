// ─── ConfirmTradeModal — review with route ribbon + quote countdown ────────

import Modal from "./Modal";
import FeeBreakdown, { FeeRow } from "./FeeBreakdown";
import PrimaryButton from "./PrimaryButton";
import QuoteCountdown from "./QuoteCountdown";
import RouteVisualization, { RouteHop } from "./RouteVisualization";

interface ConfirmTradeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  /** Eyebrow text (e.g. "REVIEW · CROSS-CHAIN") */
  eyebrow?: string;
  title?: string;

  fromTicker: string;
  fromAmount: string;
  fromUsdValue?: number;
  fromChainName?: string;

  toTicker: string;
  toAmount: string;
  toUsdValue?: number;
  toChainName?: string;

  /** Route hops for visualization. Pass undefined to omit. */
  routeHops?: RouteHop[];

  /** Fee breakdown rows. */
  feeRows: FeeRow[];

  /** Quote validity for the countdown ring. */
  quoteIssuedAt?: number;
  quoteValidMs?: number;
  onRefreshQuote?: () => void;

  /** Warning banner content. */
  warning?: string;
  /** Confirm button label. */
  confirmLabel?: string;
}

export default function ConfirmTradeModal({
  open,
  onClose,
  onConfirm,
  confirming,
  eyebrow = "REVIEW",
  title = "Confirm trade",
  fromTicker,
  fromAmount,
  fromUsdValue,
  fromChainName,
  toTicker,
  toAmount,
  toUsdValue,
  toChainName,
  routeHops,
  feeRows,
  quoteIssuedAt,
  quoteValidMs = 30000,
  onRefreshQuote,
  warning,
  confirmLabel = "Confirm trade",
}: ConfirmTradeModalProps) {
  return (
    <Modal
      open={open}
      onClose={confirming ? () => {} : onClose}
      title={title}
      eyebrow={eyebrow}
      hideClose={confirming}
      maxWidth={520}
      headerExtra={
        quoteIssuedAt !== undefined && (
          <QuoteCountdown
            totalMs={quoteValidMs}
            issuedAt={quoteIssuedAt}
            onRefresh={onRefreshQuote}
            compact
          />
        )
      }
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <PrimaryButton variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={onConfirm} loading={confirming} fullWidth>
            {confirmLabel}
          </PrimaryButton>
        </div>
      }
    >
      {/* Big swap summary block */}
      <div
        style={{
          padding: "18px 20px",
          background:
            "linear-gradient(135deg, rgba(255,138,0,0.04) 0%, transparent 60%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        {/* FROM */}
        <SwapSummaryRow
          label="FROM"
          chainName={fromChainName}
          ticker={fromTicker}
          amount={fromAmount}
          usdValue={fromUsdValue}
        />

        {/* Arrow */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 28,
            position: "relative",
          }}
        >
          <span
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,138,0,0.40) 50%, transparent 100%)",
            }}
          />
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#0A0A14",
              border: "1px solid rgba(255,138,0,0.40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FF8A00",
              boxShadow: "0 0 16px rgba(255,138,0,0.25)",
              margin: "0 10px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 1V9M5 9L1 5M5 9L9 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,138,0,0.40) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* TO */}
        <SwapSummaryRow
          label="TO"
          chainName={toChainName}
          ticker={toTicker}
          amount={toAmount}
          usdValue={toUsdValue}
          accent
        />
      </div>

      {/* Route visualization */}
      {routeHops && routeHops.length > 1 && (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 10,
              letterSpacing: "0.40em",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            ROUTING · {routeHops.length - 1} HOP{routeHops.length - 1 > 1 ? "S" : ""}
          </p>
          <RouteVisualization hops={routeHops} animated compact />
        </div>
      )}

      {/* Fees */}
      <FeeBreakdown rows={feeRows} bordered />

      {warning && (
        <div
          style={{
            marginTop: 14,
            padding: "11px 14px",
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.04) 100%)",
            border: "1px solid rgba(251,191,36,0.35)",
            borderRadius: 4,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(251,191,36,0.20)",
              color: "#FBBF24",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            !
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
            }}
          >
            {warning}
          </p>
        </div>
      )}
    </Modal>
  );
}

function SwapSummaryRow({
  label,
  chainName,
  ticker,
  amount,
  usdValue,
  accent = false,
}: {
  label: string;
  chainName?: string;
  ticker: string;
  amount: string;
  usdValue?: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.40em",
            color: accent ? "#FF8A00" : "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {label}
          {chainName && (
            <span style={{ opacity: 0.5, marginLeft: 8 }}>· {chainName.toUpperCase()}</span>
          )}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 300,
            fontSize: 34,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: accent ? "#FF8A00" : "#fff",
            textShadow: accent ? "0 0 28px rgba(255,138,0,0.32)" : "none",
          }}
        >
          {amount}
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: accent ? "#FF8A00" : "rgba(255,255,255,0.65)",
          }}
        >
          {ticker}
        </span>
      </div>
      {usdValue !== undefined && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "rgba(255,255,255,0.40)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          ≈ ${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}
