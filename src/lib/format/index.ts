// ─── lib/format — canonical formatting helpers ─────────────────────────────
//
// Single source of truth for currency, percent, token-amount, and address
// formatting across the UI.  Replaces 100+ inline .toFixed() / .toLocaleString
// patterns that drifted across files.
//
// Use these instead of inline math — drift across pages produces inconsistent
// number rendering (same value showing 1.234 in one panel and 1.23 in another)
// which is a #1 trust-loss signal for DeFi users.

export {
  formatUsd,
  formatSignedUsd,
  abbreviateNumber,
} from "./currency";
export type { FormatUsdOptions } from "./currency";

export {
  formatPercent,
  getChangeColor,
} from "./percent";
export type { FormatPercentOptions } from "./percent";

export {
  formatTokenAmount,
} from "./token";
export type { FormatTokenAmountOptions } from "./token";

export {
  truncateAddress,
  truncateAddressCompact,
} from "./address";
export type { TruncateOptions } from "./address";
