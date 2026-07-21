// ─── Percent formatting ──────────────────────────────────────────────────────
//
// Canonical % helper.  Always signed (+/-) for delta display.

const NBSP_DASH = "—";

export interface FormatPercentOptions {
  /** Decimal places.  Default 2 ("12.34%"). */
  precision?: number;
  /** Show + sign for positive values.  Default true (delta semantics). */
  showSign?: boolean;
}

/** Format a percent value.  Input is a number where 12.34 = "12.34%". */
export function formatPercent(
  value: number | null | undefined,
  options: FormatPercentOptions = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NBSP_DASH;
  }

  const { precision = 2, showSign = true } = options;
  const sign = showSign && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(precision)}%`;
}

/** Tailwind class hint for change-coloring.  Use as:
 *    <span className={getChangeColor(token.change24h)}>...</span>
 *  Returns:
 *    >= 0    →  text-green-400
 *    < 0     →  text-red-400
 *    null    →  text-white/50
 */
export function getChangeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "text-white/50";
  }
  return value >= 0 ? "text-green-400" : "text-red-400";
}
