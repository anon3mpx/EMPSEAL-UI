// ─── <SwapWarningBanner> ─────────────────────────────────────────────────────
//
// Inline warning banner displayed above the swap action.  Covers the four
// most common safety scenarios that industry-leading DEXes warn about:
//
//   1. High slippage tolerance set      (user explicitly set > 5% tolerance)
//   2. High price impact predicted      (route impact > 5%)
//   3. Quote stale                       (price data hasn't updated recently)
//   4. Network congested                 (gas spike — informational)
//
// Caller passes the conditions; this component renders a stack of the
// active warnings, each with appropriate severity styling.

import { AlertTriangle, Clock, TrendingDown, Zap } from "lucide-react";

const SEVERITY = {
  info: {
    bg: "bg-white/5",
    border: "border-white/20",
    text: "text-white/80",
    iconColor: "text-white/60",
  },
  warning: {
    bg: "bg-[#FF8A00]/10",
    border: "border-[#FF8A00]/40",
    text: "text-white",
    iconColor: "text-[#FF8A00]",
  },
  danger: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-white",
    iconColor: "text-red-400",
  },
};

function Banner({ Icon, severity, title, description, testId }) {
  const s = SEVERITY[severity] ?? SEVERITY.warning;
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 ${s.bg} border ${s.border} ${s.text} px-3 py-2`}
      data-testid={testId}
    >
      <Icon
        className={`w-4 h-4 ${s.iconColor} mt-0.5 flex-shrink-0`}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em]">
          {title}
        </div>
        {description && (
          <div className="text-[10px] text-white/70 mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {number} [props.slippageBps]        - user's chosen slippage tolerance (basis points)
 * @param {number} [props.priceImpactPct]     - predicted price impact (negative = output loss)
 * @param {boolean} [props.isQuoteStale]
 * @param {boolean} [props.isHighGasNetwork]
 * @param {number}  [props.highSlippageThresholdBps]  - default 500 (5%)
 * @param {number}  [props.veryHighSlippageThresholdBps] - default 1000 (10%)
 * @param {number}  [props.highImpactThresholdPct]  - default 5
 * @param {number}  [props.dangerImpactThresholdPct] - default 10
 * @param {string} [props.className]
 */
export default function SwapWarningBanner({
  slippageBps,
  priceImpactPct,
  isQuoteStale,
  isHighGasNetwork,
  highSlippageThresholdBps = 500,
  veryHighSlippageThresholdBps = 1000,
  highImpactThresholdPct = 5,
  dangerImpactThresholdPct = 10,
  className = "",
}) {
  const banners = [];

  // 1. Slippage tolerance warnings — only when user set it themselves above default
  if (typeof slippageBps === "number") {
    if (slippageBps >= veryHighSlippageThresholdBps) {
      banners.push({
        key: "slippage-danger",
        Icon: AlertTriangle,
        severity: "danger",
        title: `Very high slippage: ${(slippageBps / 100).toFixed(2)}%`,
        description:
          "You may lose a significant portion of your trade to slippage or MEV sandwich attacks.  Consider lowering tolerance.",
        testId: "warning-slippage-danger",
      });
    } else if (slippageBps >= highSlippageThresholdBps) {
      banners.push({
        key: "slippage-warning",
        Icon: AlertTriangle,
        severity: "warning",
        title: `High slippage: ${(slippageBps / 100).toFixed(2)}%`,
        description:
          "Your trade may execute at a worse rate than displayed.  Lower the tolerance if you're not in a hurry.",
        testId: "warning-slippage",
      });
    }
  }

  // 2. Price impact warnings — based on predicted route impact
  if (typeof priceImpactPct === "number") {
    const absImpact = Math.abs(priceImpactPct);
    if (absImpact >= dangerImpactThresholdPct) {
      banners.push({
        key: "impact-danger",
        Icon: TrendingDown,
        severity: "danger",
        title: `Severe price impact: ${absImpact.toFixed(2)}%`,
        description:
          "This trade moves the market significantly against you.  Consider trading a smaller amount or splitting across multiple swaps.",
        testId: "warning-impact-danger",
      });
    } else if (absImpact >= highImpactThresholdPct) {
      banners.push({
        key: "impact-warning",
        Icon: TrendingDown,
        severity: "warning",
        title: `High price impact: ${absImpact.toFixed(2)}%`,
        description:
          "The output amount is materially worse than the spot price.  Review the route before swapping.",
        testId: "warning-impact",
      });
    }
  }

  // 3. Stale quote
  if (isQuoteStale) {
    banners.push({
      key: "stale",
      Icon: Clock,
      severity: "warning",
      title: "Quote may be stale",
      description:
        "The price hasn't refreshed recently.  Refresh the quote before submitting to avoid an unexpected rate.",
      testId: "warning-stale",
    });
  }

  // 4. High network gas
  if (isHighGasNetwork) {
    banners.push({
      key: "gas",
      Icon: Zap,
      severity: "info",
      title: "Network gas is elevated",
      description:
        "Transaction fees on this chain are higher than usual right now.  Consider waiting for congestion to ease.",
      testId: "warning-gas",
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="swap-warnings">
      {banners.map((b) => (
        <Banner
          key={b.key}
          Icon={b.Icon}
          severity={b.severity}
          title={b.title}
          description={b.description}
          testId={b.testId}
        />
      ))}
    </div>
  );
}
