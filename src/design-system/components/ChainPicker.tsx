// ─── ChainPicker — grid picker, slab theme ─────────────────────────────────
//
// Chrome and tiles follow the locked drafts (public/cross-drafts.html chain
// picker + public/swap-experience.html): slab modal, inset search with a left
// accent bar, a 4-column grid of square tiles with a corner tier badge.
//
// MODES:
//   "swap"  → one flat grid, switches the app's active network
//   "cross" → grids grouped by kind / groupLabel for source/dest selection
//             (CrossPage orders swap-leg chains first via groupOrder)

import { ReactNode, useMemo, useState } from "react";
import Modal from "./Modal";
import ChainLogo from "./ChainLogo";

export interface PickerChain {
  id: number;
  name: string;
  ticker?: string;
  color?: string;
  logo?: ReactNode;
  logoUrl?: string;
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
  /** Optional cross-mode grouping label. */
  groupLabel?: string;
  /** Optional cross-mode grouping sort order. Lower renders first. */
  groupOrder?: number;
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
  /**
   * Show the All / Aggregator / Rail-only / Native L1 tier tabs. Defaults to
   * on in cross mode when the chains carry a tier; false also hides the
   * per-tile tier badge and footer legend.
   */
  showTiers?: boolean;
}

type TierFilter = 1 | 2 | 3 | "all";

const TIER_TABS: { tier: TierFilter; label: string }[] = [
  { tier: "all", label: "All" },
  { tier: 1, label: "Aggregator" },
  { tier: 2, label: "Rail-only" },
  { tier: 3, label: "Native L1" },
];

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
  showTiers,
}: ChainPickerProps) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const hasTiers = chains.some((c) => c.tier !== undefined);
  // Tier badges + legend follow the data; the filter tabs default to cross
  // mode, where all three tiers actually coexist.
  const tiersVisible = showTiers ?? hasTiers;
  const tierTabsVisible = showTiers ?? (mode === "cross" && hasTiers);
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: chains.length };
    chains.forEach((c) => {
      if (c.tier !== undefined) counts[c.tier] = (counts[c.tier] ?? 0) + 1;
    });
    return counts;
  }, [chains]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chains.filter((c) => {
      if (tierTabsVisible && tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ticker?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    });
  }, [chains, query, tierFilter, tierTabsVisible]);

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
    const map = new Map<string, { kind: PickerChain["kind"]; label: string; order: number; list: PickerChain[] }>();
    sorted.forEach((c) => {
      const k = c.kind || "EVM";
      const label = c.groupLabel ?? KIND_LABEL[k];
      const key = `${c.groupOrder ?? 100}:${label}`;
      if (!map.has(key)) {
        map.set(key, {
          kind: k,
          label,
          order: c.groupOrder ?? 100,
          list: [],
        });
      }
      map.get(key)!.list.push(c);
    });
    const kindOrder: Record<NonNullable<PickerChain["kind"]>, number> = {
      EVM: 0,
      BTC: 1,
      SOL: 2,
      OTHER: 3,
    };
    return [...map.values()].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const kindDelta = kindOrder[a.kind ?? "EVM"] - kindOrder[b.kind ?? "EVM"];
      if (kindDelta !== 0) return kindDelta;
      return a.label.localeCompare(b.label);
    });
  }, [sorted, mode]);

  const resolvedTitle = title ?? (mode === "swap" ? "Switch network" : "Select chain");
  const resolvedEyebrow = eyebrow ?? (mode === "swap" ? "NETWORK" : "CHAIN");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      eyebrow={resolvedEyebrow}
      maxWidth={460}
      theme="slab"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "rgba(255,255,255,0.36)" }}>
          <span>
            {sorted.length} chain{sorted.length === 1 ? "" : "s"}
          </span>
          {tiersVisible && <span>T1 aggregator · T2 rail-only · T3 native L1</span>}
        </div>
      }
    >
      {/* Search — left accent bar inset, matching the draft's .search::before */}
      <div style={{ position: "relative", marginBottom: 13, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
        <span aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "var(--widget-primary, #FF8A00)", opacity: 0.5 }} />
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          style={{
            position: "absolute",
            left: 13,
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.36)",
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
            padding: "11px 12px 11px 34px",
            background: "transparent",
            border: "none",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            fontSize: 12.5,
            outline: "none",
          }}
        />
      </div>

      {/* Tier tabs */}
      {tierTabsVisible && (
        <div style={{ display: "flex", gap: 20, marginBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}>
          {TIER_TABS.filter((t) => t.tier === "all" || tierCounts[t.tier]).map((t) => {
            const active = tierFilter === t.tier;
            return (
              <button
                key={String(t.tier)}
                type="button"
                onClick={() => setTierFilter(t.tier)}
                aria-pressed={active}
                style={{
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  padding: "9px 0",
                  margin: "0 0 -1px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  color: active ? "var(--widget-primary, #FF8A00)" : "rgba(255,255,255,0.36)",
                  cursor: "pointer",
                  transition: "color 160ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.36)";
                }}
              >
                {t.label}
                {active && (
                  <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1.5, background: "var(--widget-primary, #FF8A00)" }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ padding: "32px 12px", textAlign: "center", color: "rgba(255,255,255,0.40)", fontSize: 12 }}>
          {query.trim() ? `No chains match "${query}"` : "No chains in this tier"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grouped.map((group) => (
            <div key={`${group.kind || "default"}:${group.label}`}>
              {/* Group header (cross mode only) */}
              {mode === "cross" && group.label && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 2px 2px" }}>
                  <span
                    style={{
                      fontSize: 8.5,
                      letterSpacing: "0.22em",
                      color: "rgba(255,255,255,0.30)",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.label}
                  </span>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                  <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>
                    {group.list.length}
                  </span>
                </div>
              )}

              {/* Chain tiles — 4-column grid, ported from the draft's .grid4/.gcell */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 7,
                  padding: "10px 0 4px",
                }}
              >
                {group.list.map((c) => {
                  const selected = selectedId === c.id;
                  const hasBalance = c.balanceUSD !== undefined && c.balanceUSD > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect(c)}
                      title={[c.name, c.tierLabel, `Chain ID ${c.id}`].filter(Boolean).join(" · ")}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                        padding: "12px 6px",
                        borderRadius: 4,
                        background: selected
                          ? "linear-gradient(180deg, rgba(var(--widget-primary-rgb, 255, 138, 0), 0.13), rgba(var(--widget-primary-rgb, 255, 138, 0), 0.03))"
                          : "transparent",
                        border: "none",
                        cursor: "pointer",
                        minWidth: 0,
                        transition: "background 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.045)";
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {tiersVisible && c.tier !== undefined && (
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            fontSize: 7,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            color: selected ? "var(--widget-primary, #FF8A00)" : "rgba(255,255,255,0.22)",
                          }}
                        >
                          T{c.tier}
                        </span>
                      )}
                      <ChainLogo
                        chainId={c.id}
                        symbol={
                          c.ticker && c.ticker !== "ETH"
                            ? c.ticker
                            : c.name.slice(0, 3).toUpperCase()
                        }
                        bg={c.color || "#888"}
                        size={34}
                      />
                      <span
                        style={{
                          fontSize: 9.5,
                          color: selected ? "var(--widget-primary, #FF8A00)" : "rgba(255,255,255,0.58)",
                          fontWeight: selected ? 600 : 400,
                          textAlign: "center",
                          lineHeight: 1.2,
                          maxWidth: "100%",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {c.name}
                      </span>
                      {hasBalance && (
                        <span
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 9,
                            color: "rgba(255,255,255,0.45)",
                            fontVariantNumeric: "tabular-nums",
                            marginTop: -3,
                          }}
                        >
                          ${c.balanceUSD!.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
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
