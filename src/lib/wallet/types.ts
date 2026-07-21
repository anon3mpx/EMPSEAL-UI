// ─── Wallet / destination-address types ──────────────────────────────────────
//
// Shared types for the cross-chain wallet UX (per ROADMAP-cross-chain-wallets.md).
// Used by chainKind dispatch, validators, the <DestinationAddressInput>
// component, and lazy wallet adapters.
//
// "Kind" here is the *address format family*, not the chain.  Multiple
// chains share a kind (every Cosmos SDK chain is bech32-prefixed, every
// EVM chain is hex-20-bytes, every BTC-derivative uses base58check + bech32
// variants).  The validator implementation is keyed on kind, not chainId.

/**
 * Address-format families supported by the cross-chain destination UX.
 *
 * "Kind" = address-format family, NOT chain.  Many chains share a kind
 * (every Cosmos SDK chain is bech32; every EVM chain is hex-20-bytes).
 *
 * Note on bridge support: this layer is purely UI/address-format.  Adding
 * a kind here does NOT claim the cross-bridge VPS has a rail to settle to
 * that chain — the bridge returns "no route" for unrailed destinations and
 * the UI surfaces that.  Kinds are listed to future-proof the input layer
 * so adding a new rail later is a one-line bridge-side change.
 */
export type ChainKind =
  // ─── EVM family (one kind for all 14 swap-SDK chains) ──────────────────────
  | "evm"      // 0x-prefixed hex 20-byte (Ethereum, Base, Arbitrum, all 14 EVM chains)

  // ─── Bitcoin family (BTC + its forks; same parent address encoding) ────────
  | "bitcoin"  // base58check (1.../3...) + bech32 (bc1...) + bech32m (taproot)
  | "doge"     // BTC-variant: base58check with 0x1e version + bech32 with "doge" HRP
  | "ltc"      // BTC-variant: base58check with 0x30 / 0x32 (or 0x05) + bech32 with "ltc" HRP
  | "bch"      // CashAddr (bech32 variant w/ "bitcoincash" HRP) + legacy base58check

  // ─── Ed25519-pubkey families ───────────────────────────────────────────────
  | "solana"   // base58 32-44 chars, no checksum prefix (raw ed25519 pubkey)
  | "near"     // account-name (e.g. "alice.near") OR 64-char hex (implicit account)

  // ─── 32-byte hex address families ──────────────────────────────────────────
  | "aptos"    // 0x-prefixed hex, ≤32 bytes (leading zeros may be omitted)
  | "sui"      // 0x-prefixed hex, exactly 32 bytes (64 hex chars)

  // ─── Bech32-prefixed families ──────────────────────────────────────────────
  | "cosmos"   // bech32 with chain-specific HRP (cosmos1/osmo1/celestia1/...)
  | "ada"      // Cardano Shelley: bech32 addr1/stake1; Byron legacy: base58 (Ddz.../Ae...)

  // ─── Base58check variants with chain-specific prefix ───────────────────────
  | "tron"     // base58check with 0x41 version byte → T-prefix
  | "xrp"      // base58 r-prefix, XRPL's own alphabet (different from BTC)

  // ─── Other ────────────────────────────────────────────────────────────────
  | "ton"      // base64url 48 chars with CRC16 checksum, or raw hex 64 chars
  | "xmr";     // Monero: 95-char base58 (4... standard, 8... subaddress)
               //         or 106-char (4...) integrated address.
               //         Checksum verification needs Keccak-256; v1 ships
               //         format-only validation.

/**
 * Result returned by every validator.  Cross-format detection lifts the
 * `looksLikeKind` field — when validation fails but the input matches
 * ANOTHER kind's format, surface that so the UI can warn:
 *   "This looks like a Bitcoin address.  Destination is Solana."
 */
export interface ValidationResult {
  /** True iff the input is a valid address for the requested kind. */
  valid: boolean;
  /** When valid, the specific format variant detected (helpful for UX). */
  format?:
    | "bech32"
    | "bech32m"
    | "base58"
    | "base58check"
    | "legacy"
    | "p2sh"
    | "cashaddr"
    | "evm-hex";
  /** When invalid, a short human-readable explanation (UI shows this). */
  reason?: string;
  /**
   * When invalid AND the input matches ANOTHER kind's format, the kind
   * that matched.  UI surfaces this as the wrong-chain warning.
   */
  looksLikeKind?: ChainKind;
}

/**
 * The contract every kind-specific validator implements.  Lives in
 * `validators/<kind>.ts` and gets registered with the dispatcher.
 */
export interface AddressValidator {
  kind: ChainKind;
  /** Run validation against this kind's rules. */
  validate(input: string): ValidationResult;
  /** Placeholder shown in the input field (e.g. "bc1q..."). */
  placeholder(): string;
  /** Short format hint shown below the input (e.g. "Bech32 or legacy"). */
  formatHint(): string;
  /**
   * Is there a lazy-loadable wallet adapter for this kind installed
   * in the build?  Adapters land in `adapters/<kind>.lazy.ts`.
   */
  isAdapterAvailable(): boolean;
}

/** Source of a destination address — was it typed, pasted, or wallet-connected? */
export type AddressSource = "typed" | "pasted" | "wallet-connected";

/** Outcome envelope when a wallet adapter returns an address to populate the input. */
export interface DestinationWallet {
  kind: ChainKind;
  address: string;
  source: AddressSource;
  /** When source = wallet-connected, the adapter's wallet brand (e.g. "Phantom"). */
  walletBrand?: string;
}
