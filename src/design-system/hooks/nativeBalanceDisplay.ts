/** Preserve small nonzero native balances without rounding them to zero. */
export function formatNativeAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  if (amount >= 1) return amount.toFixed(4);
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4, useGrouping: false }).format(amount);
}
