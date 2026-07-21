// ─── Token trust evaluation ───────────────────────────────────────────────────
//
// Industry-standard DeFi safety pattern: classify every token the user might
// swap by trust level so the UI can:
//   • Show a 'Verified' badge on featured/curated tokens
//   • Show an 'Unverified' badge on tokens in the wider list but not featured
//   • Show a 'Custom' badge with explicit warning on pasted contract addresses
//
// Trust classification feeds the FirstTimeTokenWarning modal — users must
// explicitly acknowledge risk before swapping to/from a non-verified token.
//
// Mirrors the pattern used by 1inch, Matcha, Uniswap, CowSwap — proven
// reduction in scam-token loss events.

export type TokenTrustLevel =
  | "verified"     // In the curated/featured list (e.g. featureTokens)
  | "listed"       // In the full token list but not featured — moderate trust
  | "custom"       // Pasted contract address; not in any list — highest risk
  | "unknown";     // Insufficient data to classify

export interface TrustEvaluationInputs {
  /** Token contract address (lowercase or checksummed — normalised internally). */
  tokenAddress: string;
  /** Curated list of featured tokens (e.g. featureTokens prop). */
  featuredTokens?: readonly { address?: string }[] | null;
  /** Full token list for the chain (whitelisted + community-listed). */
  tokenList?: readonly { address?: string }[] | null;
}

/** Native sentinel — never needs a warning; treated as fully trusted. */
const NATIVE_SENTINELS = new Set([
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "0x0000000000000000000000000000000000000000",
]);

/**
 * Classify a token's trust level for safety UI purposes.
 *
 * Native gas tokens are always 'verified' — the user can't be tricked by a
 * lookalike since native is a singleton per chain.
 *
 * @example
 *   const trust = evaluateTokenTrust({
 *     tokenAddress: "0x...",
 *     featuredTokens,
 *     tokenList,
 *   });
 *   if (trust === "custom") showFirstTimeWarning();
 */
export function evaluateTokenTrust(inputs: TrustEvaluationInputs): TokenTrustLevel {
  const { tokenAddress, featuredTokens, tokenList } = inputs;

  if (!tokenAddress || typeof tokenAddress !== "string") return "unknown";
  const norm = tokenAddress.toLowerCase().trim();

  if (NATIVE_SENTINELS.has(norm)) return "verified";

  if (Array.isArray(featuredTokens)) {
    const inFeatured = featuredTokens.some(
      (t) => typeof t?.address === "string" && t.address.toLowerCase() === norm,
    );
    if (inFeatured) return "verified";
  }

  if (Array.isArray(tokenList)) {
    const inList = tokenList.some(
      (t) => typeof t?.address === "string" && t.address.toLowerCase() === norm,
    );
    if (inList) return "listed";
  }

  // Pasted address that doesn't appear anywhere — highest-risk path.
  return "custom";
}

/**
 * True when the trust level warrants a user-acknowledged warning before swap.
 * 'verified' tokens never warn.  'listed' tokens get a soft warning the
 * first time per user.  'custom' tokens get a hard warning every time until
 * the user adds them to a trusted list (future enhancement).
 */
export function needsTokenWarning(trust: TokenTrustLevel): boolean {
  return trust === "listed" || trust === "custom" || trust === "unknown";
}

/** Human-readable label for badges + tooltips. */
export function trustLabel(trust: TokenTrustLevel): string {
  switch (trust) {
    case "verified": return "Verified";
    case "listed":   return "Community";
    case "custom":   return "Unverified";
    case "unknown":  return "Unknown";
  }
}

/** Short helper text for the warning modal copy. */
export function trustExplainer(trust: TokenTrustLevel): string {
  switch (trust) {
    case "verified":
      return "This token is in our curated list and has been vetted.";
    case "listed":
      return "This token is in the chain's broader token list but isn't on our curated list.  Anyone can list a token — verify the contract address matches the project's official site before swapping.";
    case "custom":
      return "This is a custom contract address not found in any token list.  Custom addresses are the most common scam vector — verify the address matches the official project source before swapping.";
    case "unknown":
      return "We couldn't determine the trust level for this token.  Proceed with caution and verify the contract address independently.";
  }
}
