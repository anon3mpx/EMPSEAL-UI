// ─── Zcash (ZEC) validator ───────────────────────────────────────────────────
// Transparent addresses only, the forms THORChain and Maya pay and take (checked live 2026-11-26):
//   t1...   P2PKH, base58check with the 2-byte version 0x1cb8
//   t3...   P2SH,  base58check with the 2-byte version 0x1cbd
//   tex1... ZIP-320 TEX, bech32m with the "tex" HRP and a 20-byte P2PKH hash
// Shielded (zs1...) and unified (u1...) addresses are refused: neither network delivers to them.
import type { AddressValidator, ValidationResult } from "../types";
import { base58CheckDecode } from "../codec/base58check";
import { Bech32Encoding, bech32Decode, convertBits } from "../codec/bech32";

export const zecValidator: AddressValidator = {
  kind: "zec",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };
    if (/^(zs1|u1|zc)/i.test(trimmed)) return { valid: false, reason: "Shielded and unified Zcash addresses can't receive this transfer. Use a transparent t1... address." };
    if (/^tex1/.test(trimmed)) {
      const d = bech32Decode(trimmed);
      const bytes = d && d.hrp === "tex" && d.encoding === Bech32Encoding.Bech32m ? convertBits(d.data, 5, 8, false) : null;
      return bytes && bytes.length === 20 ? { valid: true, format: "bech32m" } : { valid: false, reason: "Address is not a valid TEX (tex1...) address" };
    }
    const t = base58CheckDecode(trimmed);
    if (t && t.version === 0x1c && t.payload.length === 21 && (t.payload[0] === 0xb8 || t.payload[0] === 0xbd))
      return { valid: true, format: t.payload[0] === 0xb8 ? "base58check" : "p2sh" };
    return { valid: false, reason: "Address is not a valid transparent Zcash (t1.../t3...) address" };
  },
  placeholder: () => "t1...",
  formatHint: () => "Transparent Zcash address (t1..., t3... or tex1...)",
  isAdapterAvailable: () => false,
};
