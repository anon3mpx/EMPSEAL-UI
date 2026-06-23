// ─── Currency formatting ─────────────────────────────────────────────────────
//
// Canonical USD + abbreviated number helpers.  Replaces scattered inline
// `value.toFixed(2)` / `value.toLocaleString()` / hand-rolled $X.XX patterns
// that drifted across the codebase.
//
// Industry behaviour:
//   $0.00      — sub-cent (default minimumFractionDigits = 2)
//   $1.23      — small amounts
//   $1,234.56  — locale-aware separators (en-US)
//   $1.23M     — abbreviated above $10K  (matches CoinGecko, Etherscan, etc.)
//   $1.23B     — abbreviated above $999M
//   —          — null/undefined/NaN inputs

const NBSP_DASH = "—";

export interface FormatUsdOptions {
  /** Floor for abbreviation. Below this, render full amount with commas.
   *  Default 10000 (i.e. abbreviate $10K+). */
  abbreviateAbove?: number;
  /** Min decimal places.  Default 2 ($0.00). */
  minimumFractionDigits?: number;
  /** Max decimal places.  Default 2. */
  maximumFractionDigits?: number;
  /** Prefix character.  Default "$". */
  symbol?: string;
}

/** Format a USD value with $ prefix.  Abbreviates above 10K by default. */
export function formatUsd(
  value: number | null | undefined,
  options: FormatUsdOptions = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NBSP_DASH;
  }

  const {
    abbreviateAbove = 10_000,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    symbol = "$",
  } = options;

  const abs = Math.abs(value);

  if (abbreviateAbove > 0 && abs >= abbreviateAbove) {
    return symbol + abbreviateNumber(value);
  }

  return symbol + value.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/** Format with explicit ± sign.  Useful for portfolio change deltas. */
export function formatSignedUsd(
  value: number | null | undefined,
  options: FormatUsdOptions = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NBSP_DASH;
  }
  const sign = value >= 0 ? "+" : "-";
  return sign + formatUsd(Math.abs(value), options);
}

/** Abbreviate a number using K / M / B / T suffixes.  Industry standard. */
export function abbreviateNumber(value: number): string {
  if (!Number.isFinite(value)) return NBSP_DASH;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}${trimZeros((abs / 1e12).toFixed(2))}T`;
  if (abs >= 1e9)  return `${sign}${trimZeros((abs / 1e9).toFixed(2))}B`;
  if (abs >= 1e6)  return `${sign}${trimZeros((abs / 1e6).toFixed(2))}M`;
  if (abs >= 1e3)  return `${sign}${trimZeros((abs / 1e3).toFixed(2))}K`;
  return sign + abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Drop trailing zeros from a decimal string (e.g. "1.20" → "1.2", "5.00" → "5"). */
function trimZeros(decimal: string): string {
  if (!decimal.includes(".")) return decimal;
  return decimal.replace(/\.?0+$/, "");
}
