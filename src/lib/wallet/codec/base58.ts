// ─── Base58 codec (Bitcoin alphabet) ─────────────────────────────────────────
//
// Pure-JS base58 encoder/decoder using the Bitcoin alphabet:
//   123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
//   (no 0, no O, no I, no l — visual disambiguation)
//
// Used by:
//   • Solana validator (base58 of 32-byte ed25519 pubkey)
//   • Bitcoin family base58check (T2c)
//   • Tron base58check (T2c)
//   • Cardano Byron-era addresses (T2d)
//   • Monero address validation (T2e — format check only)
//
// NOT used by:
//   • XRP (different alphabet — see xrplBase58 in T2e)
//
// Zero deps.  ~50 LOC for both directions.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Build reverse lookup once at module-load time.
const ALPHABET_INDEX: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_INDEX[ALPHABET[i]] = i;
}

/**
 * Decode a base58 string into bytes.  Returns null when the input contains
 * characters not in the alphabet.
 */
export function base58Decode(input: string): Uint8Array | null {
  if (!input) return new Uint8Array(0);

  // Count leading '1's — each represents a leading 0x00 byte.
  let leadingOnes = 0;
  for (const ch of input) {
    if (ch === "1") leadingOnes++;
    else break;
  }

  // Big-integer accumulation.  Use BigInt so we handle arbitrary-length
  // base58 strings without precision loss.
  let acc = 0n;
  for (const ch of input) {
    const idx = ALPHABET_INDEX[ch];
    if (idx === undefined) return null; // Non-alphabet character
    acc = acc * 58n + BigInt(idx);
  }

  // Convert acc → big-endian byte array.
  const bytes: number[] = [];
  while (acc > 0n) {
    bytes.unshift(Number(acc & 0xffn));
    acc >>= 8n;
  }

  // Prepend the leading zero bytes that the leading '1's represent.
  for (let i = 0; i < leadingOnes; i++) bytes.unshift(0);

  return new Uint8Array(bytes);
}

/**
 * Encode a Uint8Array into a base58 string using the Bitcoin alphabet.
 * Mostly here for completeness + future use (e.g. building expected
 * addresses for test fixtures); the UI's validation path uses Decode only.
 */
export function base58Encode(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return "";

  // Count leading 0x00 bytes — each becomes a leading '1'.
  let leadingZeros = 0;
  for (const b of bytes) {
    if (b === 0) leadingZeros++;
    else break;
  }

  // Convert big-endian bytes → BigInt
  let acc = 0n;
  for (const b of bytes) acc = (acc << 8n) | BigInt(b);

  // Encode by repeated %58
  let out = "";
  while (acc > 0n) {
    const rem = Number(acc % 58n);
    out = ALPHABET[rem] + out;
    acc /= 58n;
  }

  // Prepend leading '1's
  return "1".repeat(leadingZeros) + out;
}

/** True iff the input contains only base58 alphabet characters. */
export function isBase58String(input: string): boolean {
  if (!input) return false;
  for (const ch of input) {
    if (ALPHABET_INDEX[ch] === undefined) return false;
  }
  return true;
}
