export function calculatePriceImpactBps(
  fromUsdValue: number | null | undefined,
  toUsdValue: number | null | undefined,
): number | undefined {
  if (
    fromUsdValue == null ||
    toUsdValue == null ||
    !Number.isFinite(fromUsdValue) ||
    !Number.isFinite(toUsdValue) ||
    fromUsdValue <= 0
  ) {
    return undefined;
  }

  return Math.max(0, ((fromUsdValue - toUsdValue) / fromUsdValue) * 10_000);
}
