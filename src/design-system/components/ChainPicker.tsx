// ─── ChainPicker — searchable list with mode support ───────────────────────
//
// MODES:
//   "swap"  → simple list, switches the app's active network
//   "cross" → list with extra context (kind label) for source/dest selection
//
// Both modes use a list layout (scrollable, searchable) — much faster than a
// grid when the user knows what they want.

import { ReactNode, useMemo, useState } from "react";
import Modal from "./Modal";
import LogoTile from "./LogoTile";
import ChainLogo from "./ChainLogo";

export interface PickerChain {
  id: number;
  name: string;
  ticker?: string;
  color?: string;
  logo?: ReactNode;
  /** Network kind — used for grouping headers in cross mode */
  kind?: "EVM" | "BTC" | "SOL" | "OTHER";
  /** Optional: chain has user balance (for sorting / display) */
  hasBalance?: boolean;
  /** Optional: USD balance on this chain (helps prioritise) */
  balanceUSD?: number;
  /** Tier — drives the small badge shown on the row (1 agg / 2 rail-only / 3 native L1) */
  tier?: 1 | 2 | 3;
  /** Short tier label ("Aggregator" / "Rail-only" / "Native L1") */
  tierLabel?: string;
}

interface ChainPickerProps {
  open: boolean;
  onClose: () => void;
  chains: PickerChain[];
  selectedId?: number;
  onSelect: (chain: PickerChain) => void;
  /** "swap" → simple network switcher; "cross" → source/dest selector */
  mode?: "swap" | "cross";
  /** Override title (defaults adapt to mode) */
  title?: string;
  /** Override eyebrow */
  eyebrow?: string;
}

const KIND_LABEL: Record<NonNullable<PickerChain["kind"]>, string> = {
  EVM: "EVM Chains",
  BTC: "Bitcoin",
  SOL: "Solana",
  OTHER: "Other Networks",
};

export default function ChainPicker({
  open,
  onClose,
  chains,
  selectedId,
  onSelect,
  mode = "swap",
  title,
  eyebrow,
}: ChainPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chains;
    return chains.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ticker?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
  }, [chains, query]);

  // Sort: chains with balance first (highest USD first), then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aBal = a.balanceUSD ?? 0;
      const bBal = b.balanceUSD ?? 0;
      if (aBal !== bBal) return bBal - aBal;
      if (a.hasBalance !== b.hasBalance) return (b.hasBalance ? 1 : 0) - (a.hasBalance ? 1 : 0);
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  // Cross mode: group by kind; Swap mode: flat list
  const grouped = useMemo(() => {
    if (mode === "swap") return [{ kind: undefined as PickerChain["kind"], label: "", list: sorted }];
    const map = new Map<string, PickerChain[]>();
    sorted.forEach((c) => {
      const k = c.kind || "EVM";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    const order: PickerChain["kind"][] = ["EVM", "BTC", "SOL", "OTHER"];
    return order
      .filter((k) => map.has(k!))
      .map((k) => ({ kind: k, label: KIND_LABEL[k!], list: map.get(k!)! }));
  }, [sorted, mode]);

  const resolvedTitle = title ?? (mode === "swap" ? "Switch network" : "Select chain");
  const resolvedEyebrow = eyebrow ?? (mode === "swap" ? "NETWORK" : "CHAIN");

  return (
    <Modal open={open} onClose={onClose} title={resolvedTitle} eyebrow={resolvedEyebrow} maxWidth={460}>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.40)",
          }}
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chains"
          style={{
            width: "100%",
            padding: "11px 14px 11px 38px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 4,
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            outline: "none",
            transition: "border-color 160ms ease, background 160ms ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        />
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: "32px 12px", textAlign: "center", color: "rgba(255,255,255,0.40)", fontSize: 12 }}>
          No chains match "{query}"
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.map((group) => (
            <div key={group.kind || "default"}>
              {/* Group header (cross mode only) */}
              {mode === "cross" && group.label && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "0 2px" }}>
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.35em",
                      color: "rgba(255,255,255,0.40)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "linear-gradient(90deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>
                    {group.list.length}
                  </span>
                </div>
              )}

              {/* Chain rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {group.list.map((c) => {
                  const selected = selectedId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 10px",
                        background: selected ? "rgba(255,138,0,0.06)" : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${selected ? "#FF8A00" : "transparent"}`,
                        width: "100%",
                        cursor: "pointer",
                        color: "#fff",
                        transition: "background 140ms ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* ChainLogo tries DefiLlama CDN; falls back to coloured tile/pill.
                           Pass the chain ticker as the lookup key (matches CHAIN_SLUGS). */}
                      <ChainLogo
                        symbol={c.ticker || c.name.slice(0, 3).toUpperCase()}
                        bg={c.color || "#888"}
                        size={32}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: "#fff" }}>
                            {c.name}
                          </p>
                          {c.tier !== undefined && (
                            <span
                              title={c.tierLabel}
                              style={{
                                fontSize: 8.5,
                                fontWeight: 700,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                padding: "1px 5px",
                                borderRadius: 2,
                                color: c.tier === 1 ? "#FFB347" : c.tier === 2 ? "#93C5FD" : "#A78BFA",
                                background:
                                  c.tier === 1
                                    ? "rgba(255,138,0,0.10)"
                                    : c.tier === 2
                                    ? "rgba(96,165,250,0.10)"
                                    : "rgba(139,92,246,0.10)",
                                border:
                                  "1px solid " +
                                  (c.tier === 1
                                    ? "rgba(255,138,0,0.25)"
                                    : c.tier === 2
                                    ? "rgba(96,165,250,0.25)"
                                    : "rgba(139,92,246,0.25)"),
                              }}
                            >
                              T{c.tier}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.40)",
                          }}
                        >
                          {c.tierLabel ? `${c.tierLabel} · ` : c.ticker ? `${c.ticker} · ` : ""}
                          Chain ID {c.id}
                        </p>
                      </div>
                      {c.balanceUSD !== undefined && c.balanceUSD > 0 && (
                        <span
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.85)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          ${c.balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
                      )}
                      {selected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          style={{ color: "#FF8A00", flexShrink: 0 }}
                        >
                          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" />
                          <path
                            d="M3.5 6L5.5 8L8.5 4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
