// ─── priceImpactColor ────────────────────────────────────────────────────────
//
// Pure tailwind-class selector for the displayed price-impact value.
// Extracted from Emp.jsx (M7 step 5).
//
//   value > 0   → green-500 (the trade yields more output than spot — rare,
//                 happens when the route discovers an arbitrage)
//   value < 0   → red-400   (the trade gives less output than spot — the
//                 normal case for any non-trivial trade size)
//   value === 0 → white     (perfect parity, e.g. native <-> wrapped)
//   non-numeric → white     (unknown, default to neutral)

export function getPriceImpactColor(impact: number | string | null | undefined): string {
  if (impact === null || impact === undefined) return "text-white";
  const value = typeof impact === "number" ? impact : parseFloat(impact);
  if (Number.isNaN(value)) return "text-white";
  if (value > 0) return "text-green-500";
  if (value < 0) return "text-red-400";
  return "text-white";
}
