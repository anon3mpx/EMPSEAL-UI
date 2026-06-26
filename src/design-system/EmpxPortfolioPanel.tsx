// ─── EmpxPortfolioPanel — full dashboard (hero · chart · assets · markets) ─
//
// Inspired by the existing portfolio page structure (value + 24h change +
// chart + sortable token list + market cards), rebuilt with the new design
// system primitives.

import { ReactNode, useMemo, useState } from "react";
import { Card, ChainBadge, Collapsible, LogoTile, Pill } from "./components";
import { useIsMobile } from "./breakpoints";

// Logic constants — tunable, sourced from chain registry / SDK config
const MAX_VISIBLE_CHAIN_CHIPS = 5;          // top-N chains shown as buttons; rest collapse into "More"
const CHAIN_BAR_OTHER_THRESHOLD_PCT = 3;    // chains with < 3% allocation roll into "Other" segment
const DUST_USD_THRESHOLD = 1;                // assets with < $1 hidden when dust filter is on

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioAsset {
  ticker: string;
  name?: string;
  logo?: ReactNode;
  chainName: string;
  chainColor?: string;
  balance: string;
  balanceUSD: number;
  /** 24h price change % */
  change24h?: number;
  /** 7d price change % */
  change7d?: number;
  /** % of total portfolio */
  allocation?: number;
  /** Recent price series for inline sparkline (last N data points) */
  spark?: number[];
}

export interface MarketCard {
  ticker: string;
  name?: string;
  price: number;
  change24h: number;
  /** Series of recent price points for the sparkline */
  spark: number[];
  chainColor?: string;
}

interface EmpxPortfolioPanelProps {
  /** Total portfolio value in USD */
  totalUSD: number;
  /** 24h change as % */
  change24hPct?: number;
  /** 24h change as $ */
  change24hUSD?: number;
  /** 7d change as % */
  change7dPct?: number;
  /** Portfolio chart values (recent N data points) */
  chart?: number[];
  /** Asset list */
  assets: PortfolioAsset[];
  /** Market trending cards */
  marketCards?: MarketCard[];
  /** Wallet address (truncated already) */
  walletAddress?: string;
  onCopyAddress?: () => void;
  /** Optional refresh callback. */
  onRefresh?: () => void;
}

type SortKey = "value" | "change24h" | "change7d" | "allocation";
type GroupMode = "chain" | "flat";

function getAssetSortValue(asset: PortfolioAsset, key: SortKey): number {
  if (key === "value") return asset.balanceUSD;
  return asset[key] ?? -Infinity;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function EmpxPortfolioPanel({
  totalUSD,
  change24hPct,
  change24hUSD,
  change7dPct,
  chart,
  assets,
  marketCards,
  walletAddress,
  onCopyAddress,
  onRefresh,
}: EmpxPortfolioPanelProps) {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [groupBy, setGroupBy] = useState<GroupMode>("chain");
  const [filterChain, setFilterChain] = useState<string>("ALL");
  const [hideDust, setHideDust] = useState(true);
  const [showMoreChains, setShowMoreChains] = useState(false);

  // Build chain list with aggregate USD per chain — used for sorting + chip ordering
  const chainsWithValue = useMemo(() => {
    const map = new Map<string, { name: string; color?: string; totalUSD: number }>();
    assets.forEach((a) => {
      const existing = map.get(a.chainName);
      if (existing) {
        existing.totalUSD += a.balanceUSD;
      } else {
        map.set(a.chainName, { name: a.chainName, color: a.chainColor, totalUSD: a.balanceUSD });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [assets]);

  // Top N visible chains; rest collapse to a "More" dropdown
  const visibleChains = chainsWithValue.slice(0, MAX_VISIBLE_CHAIN_CHIPS);
  const overflowChains = chainsWithValue.slice(MAX_VISIBLE_CHAIN_CHIPS);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (filterChain !== "ALL" && a.chainName !== filterChain) return false;
      if (hideDust && a.balanceUSD < DUST_USD_THRESHOLD) return false;
      return true;
    });
  }, [assets, filterChain, hideDust]);

  const hiddenDustCount = useMemo(
    () => assets.filter((a) => a.balanceUSD < DUST_USD_THRESHOLD).length,
    [assets]
  );
  const hiddenDustValue = useMemo(
    () => assets.filter((a) => a.balanceUSD < DUST_USD_THRESHOLD).reduce((s, a) => s + a.balanceUSD, 0),
    [assets]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = getAssetSortValue(a, sortBy);
      const bv = getAssetSortValue(b, sortBy);
      return sortDir * (av - bv);
    });
  }, [filtered, sortBy, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "flat") return [{ name: "All assets", color: undefined, list: sorted }];
    const map = new Map<string, { name: string; color?: string; list: PortfolioAsset[] }>();
    sorted.forEach((a) => {
      if (!map.has(a.chainName)) {
        map.set(a.chainName, { name: a.chainName, color: a.chainColor, list: [] });
      }
      map.get(a.chainName)!.list.push(a);
    });
    return Array.from(map.values());
  }, [sorted, groupBy]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortBy(key);
      setSortDir(-1);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
      {/* ─── Hero summary ──────────────────────────────────────────────── */}
      <Card style={{ padding: isMobile ? 20 : 28, marginBottom: 18, position: "relative", overflow: "hidden" }}>
        {/* Ambient glow */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            right: -120,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,138,0,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "stretch",
            position: "relative",
          }}
        >
          {/* Left: value + delta */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.40em",
                  color: "rgba(255,255,255,0.40)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Portfolio value
              </p>
              {walletAddress && (
                <button
                  type="button"
                  onClick={onCopyAddress}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                    padding: "3px 8px",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.65)",
                    cursor: "pointer",
                    transition: "border-color 160ms ease, color 160ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
                    e.currentTarget.style.color = "#FF8A00";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                  }}
                >
                  {walletAddress}
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="1" y="3" width="5" height="5" stroke="currentColor" strokeWidth="1" />
                    <path d="M3 3V1H8V6H6" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 300,
                  fontSize: 68,
                  lineHeight: 0.95,
                  letterSpacing: "-0.035em",
                  color: "#fff",
                }}
              >
                ${totalUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Delta chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
              {change24hPct !== undefined && (
                <DeltaChip label="24h" pct={change24hPct} usd={change24hUSD} />
              )}
              {change7dPct !== undefined && <DeltaChip label="7d" pct={change7dPct} />}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 3,
                    padding: "4px 9px",
                    color: "rgba(255,255,255,0.55)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.30em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 160ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
                    e.currentTarget.style.color = "#FF8A00";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }}
                >
                  ↻ Refresh
                </button>
              )}
            </div>
          </div>

          {/* Right: chart */}
          {chart && chart.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 140 }}>
              <PortfolioMiniChart values={chart} positive={(change7dPct ?? 0) >= 0} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  fontSize: 9,
                  letterSpacing: "0.30em",
                  color: "rgba(255,255,255,0.30)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <span>7d ago</span>
                <span>now</span>
              </div>
            </div>
          )}
        </div>

        {/* Chain breakdown bar */}
        {assets.length > 0 && <ChainBreakdownBar assets={assets} totalUSD={totalUSD} />}
      </Card>

      {/* ─── Asset list ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            margin: 0,
            color: "#fff",
          }}
        >
          Assets <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 300 }}>· {assets.length}</span>
        </h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Chain filter — top N visible, rest collapse into dropdown */}
          <FilterChip
            label={isMobile ? "All" : `All · ${chainsWithValue.length}`}
            active={filterChain === "ALL"}
            onClick={() => setFilterChain("ALL")}
          />
          {visibleChains.map((c) => (
            <FilterChip
              key={c.name}
              label={c.name}
              color={c.color}
              active={filterChain === c.name}
              onClick={() => setFilterChain(c.name)}
            />
          ))}
          {overflowChains.length > 0 && (
            <MoreChainsDropdown
              chains={overflowChains}
              activeName={filterChain}
              onSelect={(name) => setFilterChain(name)}
              open={showMoreChains}
              onToggle={() => setShowMoreChains((v) => !v)}
              onClose={() => setShowMoreChains(false)}
            />
          )}

          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.10)", margin: "0 2px" }} />

          {/* Dust toggle */}
          <FilterChip
            label={hideDust ? "Dust hidden" : "Dust shown"}
            active={hideDust}
            onClick={() => setHideDust((v) => !v)}
          />

          {/* Group toggle */}
          <FilterChip
            label={isMobile ? (groupBy === "chain" ? "By chain" : "Flat") : `Group: ${groupBy === "chain" ? "by chain" : "flat"}`}
            active={groupBy === "chain"}
            onClick={() => setGroupBy(groupBy === "chain" ? "flat" : "chain")}
          />
        </div>
      </div>

      {hideDust && hiddenDustCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.10)",
            borderRadius: 4,
            marginBottom: 10,
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>
            <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              {hiddenDustCount} small {hiddenDustCount === 1 ? "balance" : "balances"} hidden
            </span>{" "}
            <span style={{ color: "rgba(255,255,255,0.40)" }}>
              (under ${DUST_USD_THRESHOLD} · totals ${hiddenDustValue.toFixed(2)})
            </span>
          </span>
          <button
            type="button"
            onClick={() => setHideDust(false)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#FF8A00",
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Show all
          </button>
        </div>
      )}

      {grouped.map((g) => (
        <div key={g.name} style={{ marginBottom: 18 }}>
          {groupBy === "chain" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 4px 8px",
              }}
            >
              <ChainBadge name={g.name} color={g.color} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>
                ${g.list.reduce((s, a) => s + a.balanceUSD, 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {/* Sort header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "minmax(0, 1.5fr) minmax(0, 0.9fr) minmax(0, 1.1fr)"
                  : "minmax(0, 1.5fr) minmax(80px, 0.6fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)",
                gap: isMobile ? 10 : 14,
                padding: isMobile ? "9px 12px" : "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.015)",
                fontSize: 9,
                letterSpacing: "0.35em",
                fontWeight: 700,
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
              }}
            >
              <span>Asset</span>
              {!isMobile && <span>7d Trend</span>}
              <SortHeader label="24h" active={sortBy === "change24h"} dir={sortDir} onClick={() => toggleSort("change24h")} align="right" />
              {!isMobile && <SortHeader label="7d" active={sortBy === "change7d"} dir={sortDir} onClick={() => toggleSort("change7d")} align="right" />}
              <SortHeader label="Value" active={sortBy === "value"} dir={sortDir} onClick={() => toggleSort("value")} align="right" />
            </div>
            {g.list.map((a, i) => (
              <AssetRow key={`${a.chainName}-${a.ticker}-${i}`} asset={a} last={i === g.list.length - 1} hideChain={groupBy === "chain"} isMobile={isMobile} />
            ))}
          </Card>
        </div>
      ))}

      {/* ─── Market cards ──────────────────────────────────────────────── */}
      {marketCards && marketCards.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
              color: "#fff",
            }}
          >
            Markets <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 300 }}>· Trending</span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {marketCards.map((m) => (
              <MarketCardItem key={m.ticker} data={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function DeltaChip({ label, pct, usd }: { label: string; pct: number; usd?: number }) {
  const positive = pct >= 0;
  const color = positive ? "#34D399" : "#FCA5A5";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        background: positive ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
        borderRadius: 3,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.35em",
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span style={{ color, fontWeight: 700, fontSize: 13 }}>
        {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
      </span>
      {usd !== undefined && (
        <span style={{ color: "rgba(255,255,255,0.40)", fontSize: 11 }}>
          {positive ? "+" : ""}${Math.abs(usd).toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      )}
    </span>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: active ? "rgba(255,138,0,0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(255,138,0,0.40)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 3,
        color: active ? "#FF8A00" : "rgba(255,255,255,0.65)",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 160ms ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "rgba(255,255,255,0.65)";
      }}
    >
      {color && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      )}
      {label}
    </button>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
  align: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        gap: 4,
        background: "transparent",
        border: "none",
        padding: 0,
        color: active ? "#FF8A00" : "rgba(255,255,255,0.40)",
        fontFamily: "Inter, sans-serif",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        cursor: "pointer",
        textAlign: align,
      }}
    >
      {label}
      {active && <span style={{ fontSize: 8, marginTop: -2 }}>{dir === -1 ? "▼" : "▲"}</span>}
    </button>
  );
}

function AssetRow({ asset, last, hideChain, isMobile }: { asset: PortfolioAsset; last: boolean; hideChain: boolean; isMobile?: boolean }) {
  const change24hColor = ChangeColor(asset.change24h);
  const sparkColor =
    asset.change24h === undefined
      ? "rgba(255,255,255,0.40)"
      : asset.change24h >= 0
      ? "#34D399"
      : "#FCA5A5";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "minmax(0, 1.5fr) minmax(0, 0.9fr) minmax(0, 1.1fr)"
          : "minmax(0, 1.5fr) minmax(80px, 0.6fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)",
        alignItems: "center",
        gap: isMobile ? 10 : 14,
        padding: isMobile ? "12px" : "14px 16px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
        fontFamily: "Inter, sans-serif",
        transition: "background 160ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Asset col — LogoTile + ticker + name + allocation bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <LogoTile
          fallback={asset.logo || asset.ticker.slice(0, 2).toUpperCase()}
          size={34}
          radius={4}
          chainDot={asset.chainColor}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{asset.ticker}</span>
            {!hideChain && <ChainBadge name={asset.chainName} color={asset.chainColor} />}
          </div>
          {asset.name && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {asset.name}
            </p>
          )}
          {asset.allocation !== undefined && (
            <div
              style={{
                marginTop: 6,
                position: "relative",
                width: "100%",
                maxWidth: 140,
                height: 3,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${asset.allocation}%`,
                  background:
                    asset.chainColor ||
                    "linear-gradient(90deg, #FF8A00 0%, rgba(255,138,0,0.40) 100%)",
                  borderRadius: 2,
                  boxShadow: asset.chainColor ? `0 0 6px ${asset.chainColor}66` : "0 0 6px rgba(255,138,0,0.4)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sparkline col — desktop only */}
      {!isMobile && (
        <div style={{ minWidth: 0 }}>
          {asset.spark && asset.spark.length > 1 ? (
            <InlineSparkline values={asset.spark} color={sparkColor} />
          ) : (
            <span style={{ color: "rgba(255,255,255,0.20)", fontSize: 10 }}>—</span>
          )}
        </div>
      )}

      {/* 24h */}
      <span
        style={{
          textAlign: "right",
          color: change24hColor,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        {asset.change24h !== undefined
          ? `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%`
          : "—"}
      </span>
      {/* 7d — desktop only */}
      {!isMobile && (
        <span
          style={{
            textAlign: "right",
            color: ChangeColor(asset.change7d),
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {asset.change7d !== undefined
            ? `${asset.change7d >= 0 ? "+" : ""}${asset.change7d.toFixed(2)}%`
            : "—"}
        </span>
      )}
      {/* Value */}
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16,
            fontWeight: 400,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          ${asset.balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
          {asset.balance}
          {asset.allocation !== undefined && (
            <span style={{ color: "rgba(255,255,255,0.30)" }}> · {asset.allocation.toFixed(1)}%</span>
          )}
        </p>
      </div>
    </div>
  );
}

function InlineSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 90 - 5}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 28 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ChangeColor(pct?: number): string {
  if (pct === undefined) return "rgba(255,255,255,0.55)";
  if (pct > 0) return "#34D399";
  if (pct < 0) return "#FCA5A5";
  return "rgba(255,255,255,0.55)";
}

function MarketCardItem({ data }: { data: MarketCard }) {
  const positive = data.change24h >= 0;
  const color = positive ? "#34D399" : "#FCA5A5";
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: data.chainColor
                ? `linear-gradient(135deg, ${data.chainColor}40 0%, transparent 100%)`
                : "rgba(255,255,255,0.06)",
              border: data.chainColor ? `1px solid ${data.chainColor}50` : "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: data.chainColor || "#fff",
            }}
          >
            {data.ticker.slice(0, 2)}
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#fff" }}>{data.ticker}</p>
            {data.name && (
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.40)" }}>
                {data.name}
              </p>
            )}
          </div>
        </div>
        <Pill variant={positive ? "success" : "danger"}>
          {positive ? "▲" : "▼"} {Math.abs(data.change24h).toFixed(2)}%
        </Pill>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 400,
          fontSize: 20,
          letterSpacing: "-0.02em",
          color: "#fff",
        }}
      >
        ${data.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </p>
      <Sparkline values={data.spark} color={color} />
    </Card>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(" ");
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 40, marginTop: 8 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PortfolioMiniChart({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const color = positive ? "#34D399" : "#FCA5A5";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 95}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 130 }}>
      <defs>
        <linearGradient id="portfolio-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill="url(#portfolio-chart-grad)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ChainBreakdownBar({ assets, totalUSD }: { assets: PortfolioAsset[]; totalUSD: number }) {
  const [showAll, setShowAll] = useState(false);

  const byChain: Record<string, { value: number; color?: string }> = {};
  assets.forEach((a) => {
    if (!byChain[a.chainName]) byChain[a.chainName] = { value: 0, color: a.chainColor };
    byChain[a.chainName].value += a.balanceUSD;
  });
  const allChains = Object.entries(byChain)
    .map(([name, v]) => ({ name, ...v, pct: (v.value / totalUSD) * 100 }))
    .sort((a, b) => b.value - a.value);

  // Split into significant chains (≥ threshold) and "Other" (sub-threshold dust chains)
  const significant = allChains.filter((c) => c.pct >= CHAIN_BAR_OTHER_THRESHOLD_PCT);
  const tinyChains = allChains.filter((c) => c.pct < CHAIN_BAR_OTHER_THRESHOLD_PCT);
  const otherValue = tinyChains.reduce((s, c) => s + c.value, 0);
  const otherPct = (otherValue / totalUSD) * 100;

  const barSegments = [
    ...significant.map((c) => ({ name: c.name, color: c.color, pct: c.pct, isOther: false })),
    ...(tinyChains.length > 0
      ? [{ name: `Other (${tinyChains.length})`, color: "rgba(255,255,255,0.32)", pct: otherPct, isOther: true }]
      : []),
  ];

  const legendChains = showAll ? allChains : significant;

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 4,
          background: "rgba(255,255,255,0.05)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {barSegments.map((s) => (
          <span
            key={s.name}
            title={`${s.name} — ${s.pct.toFixed(1)}%`}
            style={{
              width: `${s.pct}%`,
              background: s.color || "rgba(255,255,255,0.30)",
              transition: "width 360ms cubic-bezier(0.22,1,0.36,1)",
              opacity: s.isOther ? 0.55 : 1,
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        {legendChains.map((c) => (
          <span
            key={c.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: c.color || "rgba(255,255,255,0.50)",
                boxShadow: `0 0 6px ${c.color || "rgba(255,255,255,0.40)"}`,
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase" }}>
              {c.name}
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>{c.pct.toFixed(1)}%</span>
          </span>
        ))}
        {tinyChains.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.65)",
              padding: "3px 8px",
              borderRadius: 3,
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
              e.currentTarget.style.color = "#FF8A00";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
            }}
          >
            {showAll
              ? `Hide ${tinyChains.length} small`
              : `+ ${tinyChains.length} chain${tinyChains.length === 1 ? "" : "s"} · ${otherPct.toFixed(1)}%`}
          </button>
        )}
      </div>
    </div>
  );
}

function MoreChainsDropdown({
  chains,
  activeName,
  onSelect,
  open,
  onToggle,
  onClose,
}: {
  chains: { name: string; color?: string; totalUSD: number }[];
  activeName: string;
  onSelect: (name: string) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <span style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 3,
          color: "rgba(255,255,255,0.65)",
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 160ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
          e.currentTarget.style.color = "#FF8A00";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.65)";
        }}
      >
        + {chains.length} more
        <svg
          width="7"
          height="5"
          viewBox="0 0 7 5"
          fill="none"
          style={{
            transition: "transform 220ms ease",
            transform: open ? "rotate(180deg)" : "none",
            opacity: 0.7,
          }}
        >
          <path d="M1 1L3.5 4L6 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          onMouseLeave={onClose}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 6,
            minWidth: 200,
            maxHeight: 280,
            overflowY: "auto",
            background: "#0A0A14",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 4,
            padding: 4,
            boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
          }}
        >
          {chains.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                onSelect(c.name);
                onClose();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "7px 10px",
                background: activeName === c.name ? "rgba(255,138,0,0.10)" : "transparent",
                border: "none",
                borderRadius: 3,
                color: activeName === c.name ? "#FF8A00" : "rgba(255,255,255,0.85)",
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (activeName !== c.name)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (activeName !== c.name) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {c.color && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 2,
                      background: c.color,
                      boxShadow: `0 0 4px ${c.color}`,
                    }}
                  />
                )}
                <span style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>
                  {c.name}
                </span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                ${c.totalUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
