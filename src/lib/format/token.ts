// ─── Token amount formatting ─────────────────────────────────────────────────
//
// Adaptive precision: more decimals for small amounts, fewer for large.
// Matches industry behaviour (1inch / Matcha / Uniswap):
//
//   amount          render
//   ─────────       ──────────
//   0.000001        0.000001     (preserve precision on micro-amounts)
//   0.00012345      0.000123     (6 decimals when sub-cent)
//   0.123456        0.1235       (4 decimals when sub-unit)
//   12.345678       12.3457      (4 decimals when sub-thousand)
//   1234.5678       1,234.57     (2 decimals when 4+ digits)
//   1234567.89      1.23M        (abbreviate when 7+ digits)

import { abbreviateNumber } from "./currency";

const NBSP_DASH = "—";

export interface FormatTokenAmountOptions {
  /** Abbreviate above this magnitude.  Default 1_000_000 (≥ 1M shown as 1.23M).
   *  Set to 0 to disable abbreviation entirely. */
  abbreviateAbove?: number;
  /** Optional fixed precision override.  When set, ignores adaptive rules. */
  precision?: number;
  /** Token symbol to append (e.g. "USDC").  Default no suffix. */
  symbol?: string;
}

/**
 * Format a token amount with adaptive precision.
 *
 * Pass a number (already-formatted units, e.g. 1234.56) — NOT raw wei.
 * For raw-wei conversion use viem's formatUnits first, then call this.
 */
export function formatTokenAmount(
  value: number | string | null | undefined,
  options: FormatTokenAmountOptions = {},
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return NBSP_DASH;
  }

  const { abbreviateAbove = 1_000_000, precision, symbol } = options;
  const abs = Math.abs(num);

  // Fixed precision path
  if (precision !== undefined) {
    return formatWithSymbol(num.toFixed(precision), symbol);
  }

  // Abbreviate large amounts (default ≥ 1M)
  if (abbreviateAbove > 0 && abs >= abbreviateAbove) {
    return formatWithSymbol(abbreviateNumber(num), symbol);
  }

  // Adaptive precision based on magnitude
  let decimals: number;
  if (abs === 0) decimals = 2;
  else if (abs < 0.000001) decimals = 8;  // dust amounts
  else if (abs < 0.01)     decimals = 6;
  else if (abs < 1)        decimals = 4;
  else if (abs < 1000)     decimals = 4;
  else                     decimals = 2;  // 4+ digit integers

  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return formatWithSymbol(formatted, symbol);
}

function formatWithSymbol(numberPart: string, symbol?: string): string {
  return symbol ? `${numberPart} ${symbol}` : numberPart;
}
