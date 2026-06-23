// ─── Validator registry + dispatch ───────────────────────────────────────────
//
// Single entry point for the rest of the codebase.  Map a ChainKind to its
// AddressValidator implementation.  Used by:
//   • <DestinationAddressInput> to pick the right validator at render time
//   • The cross-format detection helper (T2-final) to run all-validators
//     against an input and surface 'looks like {other-kind}' warnings
//
// Note: validators for kinds not yet implemented map to `null`.  Callers
// must handle the null case — most likely by either:
//   (a) hiding the destination input until validator is ready, or
//   (b) showing a 'Format check pending' notice and accepting raw input.

import type { AddressValidator, ChainKind, ValidationResult } from "../types";
import { evmValidator } from "./evm";
import { aptosValidator, suiValidator } from "./hex32";
import { nearValidator } from "./near";
import { solanaValidator } from "./solana";
import { bitcoinValidator, dogeValidator, ltcValidator } from "./bitcoinFamily";
import { tronValidator } from "./tron";
import { cosmosValidator } from "./cosmos";
import { adaValidator } from "./ada";
import { bchValidator } from "./bch";
import { xrpValidator } from "./xrp";
import { tonValidator } from "./ton";
import { xmrValidator } from "./xmr";

const REGISTRY: Partial<Record<ChainKind, AddressValidator>> = {
  evm:     evmValidator,
  aptos:   aptosValidator,
  sui:     suiValidator,
  near:    nearValidator,
  solana:  solanaValidator,
  bitcoin: bitcoinValidator,
  doge:    dogeValidator,
  ltc:     ltcValidator,
  tron:    tronValidator,
  cosmos:  cosmosValidator,
  ada:     adaValidator,
  bch:     bchValidator,
  xrp:     xrpValidator,
  ton:     tonValidator,
  xmr:     xmrValidator,
};

/**
 * Get the validator for a chainKind, or null if not yet implemented.
 */
export function validatorFor(kind: ChainKind): AddressValidator | null {
  return REGISTRY[kind] ?? null;
}

/**
 * Convenience: validate an input against a kind.  Returns a ValidationResult
 * with `valid: false` and `reason: "Validator not yet implemented for {kind}"`
 * when the kind has no registered validator (graceful fallback).
 *
 * When primary validation FAILS and the validator didn't itself populate
 * looksLikeKind, this function runs cross-format detection: scans every
 * OTHER registered kind's validator; if any accepts the input, augments
 * the result with `looksLikeKind` so the UI can show "looks like X" warning.
 */
export function validateForKind(kind: ChainKind, input: string): ValidationResult {
  const v = validatorFor(kind);
  if (!v) {
    return {
      valid: false,
      reason: `Format check not yet available for "${kind}" — verify the address carefully before submitting`,
    };
  }

  const result = v.validate(input);
  if (result.valid) return result;

  // If validator already pinpointed a hint kind, respect it.
  if (result.looksLikeKind) return result;

  // Cross-format scan: only worth running when input is non-trivial (>4 chars).
  // Avoids "this empty string looks like Bitcoin" nonsense.
  if (input.trim().length < 4) return result;

  const hintKind = detectAddressFormat(input, kind);
  if (hintKind) {
    return { ...result, looksLikeKind: hintKind };
  }
  return result;
}

/**
 * Scan ALL registered validators against an input.  Returns the kind whose
 * validator accepts it, or null if none do.  Skips `excludeKind` (the one
 * the user already selected — no point re-running it).
 *
 * Used by the cross-format detection in validateForKind, and exposed as a
 * standalone API so callers can build "detect chain from pasted address"
 * UX (e.g. a "Paste address → we'll auto-pick the chain" affordance).
 *
 * Priority handling: if multiple kinds claim to validate the same input
 * (rare but possible — e.g. BTC legacy and BCH legacy share base58check
 * shape pre-BCH-fork), we resolve by KIND_DETECTION_PRIORITY.  Bitcoin
 * wins over BCH for ambiguous 1.../3... addresses since that's the
 * overwhelmingly common interpretation in 2026.
 */
// Most-specific / least-ambiguous validators are checked first; loosest
// validators (NEAR's named-account regex would otherwise match many
// other chains' addresses just by virtue of being lowercase alphanumeric)
// are at the end.  This is what makes the cross-format hint reliable:
// when a user pastes a bc1... bech32 into a Solana field, we want
// "looks like bitcoin", not "looks like near".
const KIND_DETECTION_PRIORITY: ChainKind[] = [
  // ── Strong structural constraints (prefix + format + checksum) ─────────
  "evm",       // 0x + 40 hex
  "sui",       // 0x + exactly 64 hex
  "aptos",     // 0x + 1-64 hex
  "tron",      // T-prefix + base58check + version 0x41 + 20 byte payload
  "xrp",       // r-prefix + xrplBase58check
  "ton",       // 48-char base64url + CRC16, or workchain:hex64
  "bch",       // CashAddr with HRP + 40-bit checksum
  "ada",       // bech32 with addr1/stake1 HRP (specific HRPs)
  // Bitcoin family checked BEFORE cosmos: bitcoin/doge/ltc bech32
  // addresses have HRPs ("bc", "doge", "ltc") that cosmos's loose
  // unknown-HRP-accept logic would otherwise claim.  Specific HRPs win.
  "bitcoin",   // base58check (versions 0x00/0x05) or bech32 'bc' HRP
  "doge",      // base58check (versions 0x1e/0x16) or bech32 'doge' HRP
  "ltc",       // base58check (versions 0x30/0x32/0x05) or bech32 'ltc' HRP
  "cosmos",    // bech32 with chain-family HRP (catch-all for Cosmos zones)

  // ── Moderate constraint (length + alphabet) ──────────────────────────
  "solana",    // base58 32-44 chars decoding to exactly 32 bytes
  "xmr",       // 95/106 chars base58 starting with '4' or '8'

  // ── Weakest constraint (any lowercase alphanumeric within length range)
  // NEAR's named-account regex is intentionally permissive (the protocol
  // allows almost-any-string accounts).  Keeping NEAR at the END prevents
  // it from claiming addresses that more-specific kinds should match.
  "near",
];

export function detectAddressFormat(
  input: string,
  excludeKind?: ChainKind,
): ChainKind | null {
  for (const kind of KIND_DETECTION_PRIORITY) {
    if (kind === excludeKind) continue;
    const v = REGISTRY[kind];
    if (!v) continue;
    if (v.validate(input).valid) return kind;
  }
  return null;
}

/**
 * List of kinds that currently have a validator registered.
 */
export function registeredKinds(): ChainKind[] {
  return Object.keys(REGISTRY) as ChainKind[];
}
