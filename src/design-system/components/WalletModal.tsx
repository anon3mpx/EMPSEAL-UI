// ─── WalletModal — wallet connection picker ────────────────────────────────
//
// Backwards-compatible: callers passing a flat WalletOption[] (no `kind`)
// still render a single ungrouped list (legacy behaviour).
//
// New: pass entries with `kind` (evm / solana / bitcoin / tron / cosmos)
// and the modal groups them into sections.  Per chain-kind disclosure
// covers the "address-only retrieval" caveat for non-EVM adapters per
// src/lib/wallet/adapters/types.ts ("Signing flows deferred to Phase B").

import { ReactNode } from "react";
import Modal from "./Modal";

export type WalletKind = "evm" | "solana" | "bitcoin" | "tron" | "cosmos";

export interface WalletOption {
  id: string;
  name: string;
  description?: string;
  logo?: ReactNode;
  recommended?: boolean;
  installed?: boolean;
  /** Chain-kind family. Omit → renders in the ungrouped/default section. */
  kind?: WalletKind;
}

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  wallets: WalletOption[];
  onSelect: (wallet: WalletOption) => void;
  /**
   * Restrict the modal to a single kind family (e.g. cross-chain page
   * opens the modal scoped to "bitcoin" when source is BTC).  When set,
   * only entries whose `kind` matches show.
   */
  kindFilter?: WalletKind;
  /** Heading override; defaults to "Connect wallet". */
  title?: string;
}

const KIND_HEADER: Record<WalletKind, { label: string; hint: string }> = {
  evm:     { label: "EVM",     hint: "MetaMask / Rabby / WalletConnect / Privy" },
  solana:  { label: "Solana",  hint: "Read-only address connection" },
  bitcoin: { label: "Bitcoin", hint: "Read-only address connection" },
  tron:    { label: "Tron",    hint: "Read-only address connection" },
  cosmos:  { label: "Cosmos",  hint: "Read-only address connection" },
};

const KIND_ORDER: WalletKind[] = ["evm", "solana", "bitcoin", "tron", "cosmos"];

export default function WalletModal({ open, onClose, wallets, onSelect, kindFilter, title }: WalletModalProps) {
  // Filter
  const filtered = kindFilter ? wallets.filter((w) => w.kind === kindFilter) : wallets;

  // Group by kind. Entries with no kind go into a leading "default" bucket
  // so legacy callers (flat lists) work unchanged.
  const grouped: { kind: WalletKind | null; entries: WalletOption[] }[] = [];
  const defaultBucket = filtered.filter((w) => !w.kind);
  if (defaultBucket.length > 0) grouped.push({ kind: null, entries: defaultBucket });
  for (const k of KIND_ORDER) {
    const entries = filtered.filter((w) => w.kind === k);
    if (entries.length > 0) grouped.push({ kind: k, entries });
  }

  // When kindFilter narrows to a single section, suppress the intro
  // ("Choose how you want to connect…") to avoid noise — the section
  // header carries the context.
  const scoped = !!kindFilter;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (scoped && kindFilter ? `Connect ${KIND_HEADER[kindFilter].label} wallet` : "Connect wallet")}
      eyebrow="WALLET"
      maxWidth={420}
    >
      {!scoped && (
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          Choose how you want to connect.  Your wallet stays in your control — EmpX
          never holds custody of funds.  Connect one or more — EVM + non-EVM coexist.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {grouped.map((section, sIdx) => (
          <div key={section.kind ?? `default-${sIdx}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.kind && (
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: sIdx === 0 ? 0 : 2 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.30em",
                    color: "rgba(255,255,255,0.55)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {KIND_HEADER[section.kind].label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.20em",
                    color: "rgba(255,255,255,0.30)",
                    textTransform: "uppercase",
                  }}
                >
                  {KIND_HEADER[section.kind].hint}
                </span>
              </div>
            )}
            {section.entries.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelect(w)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 5,
              color: "#fff",
              cursor: "pointer",
              transition: "border-color 160ms ease, background 160ms ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
              e.currentTarget.style.background = "rgba(255,255,255,0.045)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.background = "rgba(255,255,255,0.025)";
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 5,
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {w.logo || w.name.slice(0, 2).toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</span>
                {w.installed && (
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      color: "#34D399",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Installed
                  </span>
                )}
                {w.recommended && !w.installed && (
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      color: "#FF8A00",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Recommended
                  </span>
                )}
              </div>
              {w.description && (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {w.description}
                </p>
              )}
            </div>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              <path d="M1 1L9 1L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        ))}
          </div>
        ))}
      </div>
      <p
        style={{
          marginTop: 18,
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          textAlign: "center",
          letterSpacing: "0.02em",
          lineHeight: 1.5,
        }}
      >
        Don't have a wallet? <span style={{ color: "#FF8A00", textDecoration: "underline", cursor: "pointer" }}>Learn how to set one up</span>
      </p>
    </Modal>
  );
}
