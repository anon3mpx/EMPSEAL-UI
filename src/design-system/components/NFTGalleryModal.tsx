// ─── NFTGalleryModal — full NFT browse experience ──────────────────────────
//
// Opens from NFTPanel "View all".  Bigger modal (max-width 920px) with:
//   - Header: total count + floor value summary
//   - Search bar
//   - Chain + Collection filter chips
//   - Sort dropdown (Recent / Floor / Rarity / Name)
//   - Grid of NFT tiles (more dense than the portfolio teaser)
//   - Empty state per filter

import { useMemo, useState } from "react";
import Modal from "./Modal";
import Pill from "./Pill";
import type { NFTItem } from "./NFTPanel";

interface NFTGalleryModalProps {
  open: boolean;
  onClose: () => void;
  items: NFTItem[];
  /** Optional: total floor value across the holdings (in ETH and USD) */
  totalFloorETH?: number;
  totalFloorUSD?: number;
  /** Open a single NFT detail */
  onSelect?: (item: NFTItem) => void;
}

type SortKey = "recent" | "floor" | "rarity" | "name";

export default function NFTGalleryModal({
  open,
  onClose,
  items,
  totalFloorETH,
  totalFloorUSD,
  onSelect,
}: NFTGalleryModalProps) {
  const [query, setQuery] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("ALL");
  const [collectionFilter, setCollectionFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  // Derive chain + collection lists
  const chains = useMemo(() => {
    const map = new Map<string, string | undefined>();
    items.forEach((n) => map.set(n.chainName, n.chainColor));
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [items]);

  const collections = useMemo(() => {
    const set = new Set<string>();
    items.forEach((n) => set.add(n.collection));
    return Array.from(set);
  }, [items]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((n) => {
        if (chainFilter !== "ALL" && n.chainName !== chainFilter) return false;
        if (collectionFilter !== "ALL" && n.collection !== collectionFilter) return false;
        if (!q) return true;
        return (
          n.name.toLowerCase().includes(q) ||
          n.collection.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "floor":
            return (b.floorUSD ?? 0) - (a.floorUSD ?? 0);
          case "rarity":
            return (a.rarityRank ?? Infinity) - (b.rarityRank ?? Infinity);
          case "name":
            return a.name.localeCompare(b.name);
          case "recent":
          default:
            return 0;
        }
      });
  }, [items, query, chainFilter, collectionFilter, sortBy]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={`NFT GALLERY · ${items.length} HOLDINGS`}
      title="Your collection"
      maxWidth={920}
      headerExtra={
        totalFloorETH !== undefined ? (
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: 9,
                letterSpacing: "0.30em",
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Floor value
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 400,
                fontSize: 18,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              {totalFloorETH.toFixed(3)} ETH
            </p>
            {totalFloorUSD !== undefined && (
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                ${totalFloorUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        ) : undefined
      }
    >
      {/* Filter row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {/* Search + sort */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.40)",
              }}
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or collection"
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 4,
                color: "#fff",
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                outline: "none",
                transition: "border-color 160ms ease",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>
          <SortMenu sortBy={sortBy} onChange={setSortBy} />
        </div>

        {/* Chain chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          <FilterChip label="All chains" active={chainFilter === "ALL"} onClick={() => setChainFilter("ALL")} />
          {chains.map((c) => (
            <FilterChip
              key={c.name}
              label={c.name}
              color={c.color}
              active={chainFilter === c.name}
              onClick={() => setChainFilter(c.name)}
            />
          ))}
        </div>

        {/* Collection chips */}
        {collections.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <FilterChip label="All collections" active={collectionFilter === "ALL"} onClick={() => setCollectionFilter("ALL")} />
            {collections.map((c) => (
              <FilterChip key={c} label={c} active={collectionFilter === c} onClick={() => setCollectionFilter(c)} />
            ))}
          </div>
        )}
      </div>

      {/* Count + results */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.30em",
            color: "rgba(255,255,255,0.40)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {filtered.length} {filtered.length === 1 ? "RESULT" : "RESULTS"}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {sortBy === "recent" && "Most recent first"}
          {sortBy === "floor" && "Highest floor first"}
          {sortBy === "rarity" && "Rarest first"}
          {sortBy === "name" && "A → Z"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.10)",
            borderRadius: 4,
          }}
        >
          <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600 }}>
            No NFTs match those filters
          </p>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.40)", fontSize: 11 }}>
            Try clearing the chain or collection filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
            maxHeight: 460,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {filtered.map((nft) => (
            <GalleryTile key={nft.id} item={nft} onClick={onSelect ? () => onSelect(nft) : undefined} />
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function GalleryTile({ item, onClick }: { item: NFTItem; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 4,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        textAlign: "left",
        color: "#fff",
        transition: "border-color 200ms ease, transform 260ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          background:
            "linear-gradient(135deg, rgba(255,138,0,0.07) 0%, rgba(255,138,0,0.02) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={`${item.collection} ${item.name}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: 30,
              color: "rgba(255,138,0,0.50)",
              letterSpacing: "-0.04em",
            }}
          >
            {item.placeholder || item.name.slice(0, 2)}
          </span>
        )}

        {item.chainColor && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 8,
              height: 8,
              borderRadius: 2,
              background: item.chainColor,
              boxShadow: `0 0 5px ${item.chainColor}99`,
            }}
          />
        )}
        {item.rarityRank !== undefined && (
          <span
            style={{
              position: "absolute",
              bottom: 5,
              left: 5,
              padding: "1px 5px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: 2,
              fontFamily: "Inter, sans-serif",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.10em",
              color: "#FF8A00",
              textTransform: "uppercase",
            }}
          >
            #{item.rarityRank}
          </span>
        )}
      </div>
      <div style={{ padding: "8px 10px 9px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            fontWeight: 600,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.name}
        </p>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: 10,
            color: "rgba(255,255,255,0.40)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.collection}
        </p>
        {item.floorETH !== undefined && (
          <p
            style={{
              margin: "5px 0 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 11,
              color: "#FF8A00",
              letterSpacing: "-0.01em",
              fontWeight: 500,
            }}
          >
            {item.floorETH.toFixed(3)} ETH
          </p>
        )}
      </div>
    </button>
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
        gap: 5,
        padding: "4px 10px",
        background: active ? "rgba(255,138,0,0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(255,138,0,0.40)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 3,
        color: active ? "#FF8A00" : "rgba(255,255,255,0.65)",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
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
            borderRadius: 1,
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      )}
      {label}
    </button>
  );
}

function SortMenu({ sortBy, onChange }: { sortBy: SortKey; onChange: (s: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const options: Array<{ key: SortKey; label: string }> = [
    { key: "recent", label: "Recent" },
    { key: "floor", label: "Floor price" },
    { key: "rarity", label: "Rarity" },
    { key: "name", label: "Name" },
  ];
  const current = options.find((o) => o.key === sortBy)?.label || "Sort";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 4,
          color: "rgba(255,255,255,0.85)",
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Sort · {current}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms ease" }}>
          <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 5,
            minWidth: 160,
            background: "#0A0A14",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 4,
            padding: 4,
            boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: opt.key === sortBy ? "rgba(255,138,0,0.10)" : "transparent",
                border: "none",
                color: opt.key === sortBy ? "#FF8A00" : "rgba(255,255,255,0.85)",
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                cursor: "pointer",
                borderRadius: 3,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
