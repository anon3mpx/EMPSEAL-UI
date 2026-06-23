// ─── Bitcoin family validators: BTC, DOGE, LTC ───────────────────────────────
//
// All three chains use the same two address-encoding families:
//   1. Base58check legacy (P2PKH + P2SH) — chain-specific version bytes
//   2. Bech32 native segwit — chain-specific HRP
//
// BCH is in its own commit (T2d) because it uses CashAddr — a different
// bech32 variant with its own polynomial.
//
// Version bytes per chain:
//                  P2PKH   P2SH
//   Bitcoin        0x00    0x05
//   Litecoin       0x30    0x32 (or legacy 0x05 — both accepted historically)
//   Dogecoin       0x1e    0x16
//
// Bech32 HRPs:
//   Bitcoin   "bc"
//   Litecoin  "ltc"
//   Dogecoin  "doge"
//
// Bech32m (BIP350) is mandatory for taproot (witness version 1+).  We
// accept either encoding — the decoder reports which one verified.

import type { AddressValidator, ValidationResult } from "../types";
import { base58CheckDecode } from "../codec/base58check";
import { bech32Decode } from "../codec/bech32";

interface BtcFamilySpec {
  kind: AddressValidator["kind"];
  hrp: string;
  p2pkhVersions: number[]; // accept multiple legacy versions
  p2shVersions: number[];
  legacyPrefixes: string; // hint for placeholder (first-letter clues)
  bech32Prefix: string;
}

function makeValidator(spec: BtcFamilySpec): AddressValidator {
  return {
    kind: spec.kind,
    validate(input: string): ValidationResult {
      const trimmed = input.trim();
      if (!trimmed) return { valid: false, reason: "Address is empty" };

      // ── Bech32 path (native segwit / taproot)
      if (trimmed.toLowerCase().startsWith(`${spec.hrp}1`)) {
        const decoded = bech32Decode(trimmed);
        if (!decoded) {
          return {
            valid: false,
            reason: `Invalid bech32 checksum for ${spec.bech32Prefix} address`,
          };
        }
        if (decoded.hrp !== spec.hrp) {
          return {
            valid: false,
            reason: `Bech32 HRP "${decoded.hrp}" does not match expected "${spec.hrp}"`,
          };
        }
        return { valid: true, format: decoded.encoding === 1 ? "bech32" : "bech32m" };
      }

      // ── Base58check path (legacy P2PKH / P2SH)
      const decoded = base58CheckDecode(trimmed);
      if (!decoded) {
        return {
          valid: false,
          reason: `Address didn't match ${spec.bech32Prefix} bech32 OR base58check formats`,
        };
      }

      if (spec.p2pkhVersions.includes(decoded.version)) {
        if (decoded.payload.length !== 20) {
          return {
            valid: false,
            reason: `P2PKH payload must be 20 bytes (got ${decoded.payload.length})`,
          };
        }
        return { valid: true, format: "legacy" };
      }

      if (spec.p2shVersions.includes(decoded.version)) {
        if (decoded.payload.length !== 20) {
          return {
            valid: false,
            reason: `P2SH payload must be 20 bytes (got ${decoded.payload.length})`,
          };
        }
        return { valid: true, format: "p2sh" };
      }

      return {
        valid: false,
        reason: `Unrecognised version byte 0x${decoded.version.toString(16).padStart(2, "0")} for ${spec.bech32Prefix}`,
      };
    },
    placeholder: () => `${spec.legacyPrefixes}... or ${spec.bech32Prefix}1...`,
    formatHint: () =>
      `Legacy (${spec.legacyPrefixes}...) or Bech32 (${spec.bech32Prefix}1...)`,
    isAdapterAvailable: () => false, // Unisat/Xverse adapter lands in T5
  };
}

export const bitcoinValidator = makeValidator({
  kind: "bitcoin",
  hrp: "bc",
  p2pkhVersions: [0x00],
  p2shVersions: [0x05],
  legacyPrefixes: "1 or 3",
  bech32Prefix: "bc",
});

export const dogeValidator = makeValidator({
  kind: "doge",
  hrp: "doge",
  p2pkhVersions: [0x1e],
  p2shVersions: [0x16],
  legacyPrefixes: "D",
  bech32Prefix: "doge",
});

export const ltcValidator = makeValidator({
  kind: "ltc",
  hrp: "ltc",
  // Litecoin P2SH historically used 0x05 (same as BTC), now 0x32. Accept both.
  p2pkhVersions: [0x30],
  p2shVersions: [0x32, 0x05],
  legacyPrefixes: "L or M",
  bech32Prefix: "ltc",
});
