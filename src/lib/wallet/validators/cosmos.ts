// ─── Cosmos SDK address validator ────────────────────────────────────────────
//
// Cosmos SDK chains all use bech32 with a chain-specific HRP.  Examples:
//   cosmos1...  Cosmos Hub
//   osmo1...    Osmosis
//   celestia1... Celestia
//   juno1...    Juno
//   stars1...   Stargaze
//   akash1...   Akash
//   inj1...     Injective
//   noble1...   Noble
//   kuji1...    Kujira
//   stride1...  Stride
//   evmos1...   Evmos (also accepts EVM-style 0x... but we route those
//               through evmValidator)
//
// The payload is 20 bytes (account address — RIPEMD160 of the public key
// hash, like Ethereum).  Spec:
//   https://docs.cosmos.network/main/build/spec/addresses/bech32
//
// We accept any of the known mainnet HRPs.  Unrecognised HRPs are flagged
// as "looks like a Cosmos chain we don't yet recognise" — the user can
// still submit; the bridge VPS confirms whether a settlement rail exists.

import type { AddressValidator, ValidationResult } from "../types";
import { bech32Decode } from "../codec/bech32";

/**
 * HRPs of Cosmos SDK chains we explicitly recognise.  Not exhaustive —
 * there are ~50+ Cosmos zones.  Adding a new HRP here is a one-line
 * change; unrecognised HRPs are accepted as VALID (with a soft "we
 * don't recognise this chain — verify before sending" hint).
 */
const KNOWN_COSMOS_HRPS = new Set<string>([
  "cosmos",
  "osmo",
  "celestia",
  "juno",
  "stars",
  "akash",
  "regen",
  "inj",
  "noble",
  "kuji",
  "stride",
  "evmos",
  "neutron",
  "axelar",
  "agoric",
  "dydx",
  "secret",
  "terra",
  "fetch",
  "umee",
  "persistence",
  "kava",
  "cro", // Crypto.org / Cronos
]);

export const cosmosValidator: AddressValidator = {
  kind: "cosmos",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    const decoded = bech32Decode(trimmed);
    if (!decoded) {
      return {
        valid: false,
        reason: "Address is not valid bech32 (checksum or charset error)",
      };
    }

    // Cosmos uses standard bech32, not bech32m.  Reject bech32m.
    if (decoded.encoding !== 1) {
      return {
        valid: false,
        reason: "Cosmos uses bech32 (not bech32m).  Did you paste a Bitcoin taproot address?",
      };
    }

    // Plausibility check on HRP length — Cosmos HRPs are short ASCII
    // identifiers, never longer than ~12 chars in practice.
    if (decoded.hrp.length < 2 || decoded.hrp.length > 16) {
      return {
        valid: false,
        reason: `HRP length ${decoded.hrp.length} outside Cosmos range (2-16)`,
      };
    }

    // If HRP is recognised, accept with confidence.  If not, accept with
    // a soft warning — extensible chain set.  Either way return valid.
    if (!KNOWN_COSMOS_HRPS.has(decoded.hrp)) {
      return {
        valid: true,
        format: "bech32",
        reason: `HRP "${decoded.hrp}" not in our known Cosmos registry — verify chain before sending`,
      };
    }

    return { valid: true, format: "bech32" };
  },
  placeholder: () => "cosmos1... / osmo1... / celestia1... / ...",
  formatHint: () => "Bech32 with chain HRP (cosmos1, osmo1, celestia1, ...)",
  isAdapterAvailable: () => false, // Keplr / Leap lazy-adapter lands in T5
};
