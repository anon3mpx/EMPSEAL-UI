// ─── Address formatting ───────────────────────────────────────────────────────
//
// Single canonical helper for displaying EVM addresses in the UI.  Replaces
// inline `truncateAddress` definitions that drifted across files.
//
// Use the chars option to control the truncation aggressiveness:
//   • Default (6/4)  — 0xabcdef...1234   industry standard, fits in chips
//   • Compact (4/3)  — 0xabcd...123      narrow buttons / dense tables
//   • Wide   (10/8)  — 0xabcdef0123...09876543  developer tools / debug surfaces

const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export interface TruncateOptions {
  /** Characters to show from the START (after 0x). Default 6. */
  start?: number;
  /** Characters to show from the END. Default 4. */
  end?: number;
}

/**
 * Truncate an EVM address for display: `0xabcdef...1234`.
 *
 * Returns the original input verbatim if it doesn't match the EVM address
 * shape — non-EVM destinations (BTC, SOL, etc.) typically have their own
 * formatting and shouldn't be silently mangled.
 */
export function truncateAddress(
  address: string | null | undefined,
  options: TruncateOptions = {},
): string {
  if (!address) return "";
  const start = options.start ?? 6;
  const end = options.end ?? 4;

  // EVM address shape — preserve 0x prefix in the start chars.
  if (HEX_ADDRESS.test(address)) {
    return `${address.slice(0, start + 2)}...${address.slice(-end)}`;
  }

  // Non-EVM (BTC bc1..., SOL base58, TRON T..., COSMOS cosmos1...).
  // Use a simpler symmetric truncation since these have no 0x prefix.
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/** Compact variant for narrow contexts (4/3). */
export function truncateAddressCompact(address: string | null | undefined): string {
  return truncateAddress(address, { start: 4, end: 3 });
}
