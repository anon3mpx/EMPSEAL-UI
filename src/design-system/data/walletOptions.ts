// ─── EMPX wallet options — single source of truth ─────────────────────────
//
// Shared across all 7 dApp pages.  Mirrors the adapters in
// src/lib/wallet/adapters/impl/:
//
//   • EVM      → MetaMask / Rabby / WalletConnect / Privy   (wagmi v2)
//   • Solana   → Phantom                                     (impl/solana.ts)
//   • Bitcoin  → Unisat + Phantom-BTC                        (impl/bitcoin.ts)
//   • Tron     → TronLink                                    (impl/tron.ts)
//   • Cosmos   → Keplr + Leap                                (impl/cosmos.ts)
//
// IMPORTANT (honesty disclosure surfaced in WalletModal):
//   Non-EVM adapters connect read-only — Portfolio reads balances from
//   the connected address; cross-chain non-EVM SOURCE falls back to
//   deposit-instructions UX (the THORChain BTC source pattern).

import type { WalletOption } from "../components/WalletModal";

export const EMPX_WALLET_OPTIONS: WalletOption[] = [
  // ── EVM ──────────────────────────────────────────────────────────
  { kind: "evm", id: "metamask",      name: "MetaMask",      description: "Most popular EVM wallet", installed: true },
  { kind: "evm", id: "rabby",         name: "Rabby",         description: "Multi-chain native, security-first", recommended: true },
  { kind: "evm", id: "walletconnect", name: "WalletConnect", description: "Connect any mobile wallet" },
  { kind: "evm", id: "privy",         name: "Privy",         description: "Sign in with email or social" },

  // ── Solana ───────────────────────────────────────────────────────
  { kind: "solana",  id: "phantom-sol", name: "Phantom",   description: "Solana · read-only address connection" },

  // ── Bitcoin ──────────────────────────────────────────────────────
  { kind: "bitcoin", id: "unisat",      name: "Unisat",    description: "Bitcoin · ordinal-aware (payment address)" },
  { kind: "bitcoin", id: "phantom-btc", name: "Phantom",   description: "Bitcoin · multichain Phantom build" },

  // ── Tron ─────────────────────────────────────────────────────────
  { kind: "tron",    id: "tronlink",    name: "TronLink",  description: "Tron · read-only address connection" },

  // ── Cosmos ───────────────────────────────────────────────────────
  { kind: "cosmos",  id: "keplr",       name: "Keplr",     description: "Cosmos · most-used Cosmos extension" },
  { kind: "cosmos",  id: "leap",        name: "Leap",      description: "Cosmos · mobile-first alternative" },
];
