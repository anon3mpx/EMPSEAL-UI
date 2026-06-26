// ─── NFTPanel — NFT holdings grid for the portfolio ────────────────────────
//
// Image tiles in a responsive grid.  Hover shows collection + floor price.
// Empty state explains that EmpX doesn't run a private indexer (matching the
// existing portfolio's design philosophy + RPC-cost rationale).

import { ReactNode } from "react";
import Card from "./Card";
import Pill from "./Pill";

export interface NFTItem {
  id: string;
  /** Collection name (e.g. "Pudgy Penguins") */
  collection: string;
  /** Token name / number (e.g. "#1234" or "Cyber Cat") */
  name: string;
  /** Image URL or placeholder node */
  image?: string;
  placeholder?: ReactNode;
  /** Chain where the NFT lives */
  chainName: string;
  chainColor?: string;
  /** Floor price in ETH */
  floorETH?: number;
  /** Floor price in USD */
  floorUSD?: number;
  /** Optional rarity / rank */
  rarityRank?: number;
  /** Optional traits count or special badge */
  badge?: string;
  /** Click handler — typically opens NFT detail or marketplace */
  onClick?: () => void;
}

interface NFTPanelProps {
  items?: NFTItem[];
  /** When wallet not connected, render the prompt */
  walletConnected?: boolean;
  /** Distinguishes a real empty NFT result from a missing metadata provider. */
  providerAvailable?: boolean;
  /** Total count to render in the header */
  totalCount?: number;
  /** Trigger to expand to NFT marketplace */
  onViewAll?: () => void;
}

export default function NFTPanel({
  items,
  walletConnected = true,
  providerAvailable = true,
  totalCount,
  onViewAll,
}: NFTPanelProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 10,
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
          NFTs{" "}
          <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 300 }}>
            · {totalCount ?? items?.length ?? 0}
          </span>
        </h2>
        {items && items.length > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.65)",
              padding: "6px 12px",
              borderRadius: 3,
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FF8A00";
              e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            }}
          >
            View all →
          </button>
        )}
      </div>

      {!walletConnected ? (
        <EmptyNFTState
          headline="Connect a wallet to view your NFTs"
          body="Once connected, EmpX pulls NFT metadata from your wallet provider's indexer."
        />
      ) : !providerAvailable ? (
        <EmptyNFTState
          headline="NFT provider not connected"
          body="NFT metadata requires a configured indexer. V2 does not render fallback collections, rarity ranks, or mock floor prices."
        />
      ) : !items || items.length === 0 ? (
        <EmptyNFTState
          headline="No NFTs detected"
          body="EmpX doesn't run a private NFT indexer to keep RPC costs lean. Connect a wallet that provides NFT metadata (Rabby, MetaMask Portfolio) to populate this panel."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          {items.map((nft) => (
            <NFTTile key={nft.id} item={nft} />
          ))}
        </div>
      )}
    </div>
  );
}

function NFTTile({ item }: { item: NFTItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 4,
        overflow: "hidden",
        cursor: item.onClick ? "pointer" : "default",
        padding: 0,
        textAlign: "left",
        color: "#fff",
        transition: "border-color 200ms ease, transform 280ms ease, box-shadow 280ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 14px 30px rgba(0,0,0,0.45), 0 0 22px ${item.chainColor || "rgba(255,138,0,0.3)"}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image area */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          background:
            "linear-gradient(135deg, rgba(255,138,0,0.06) 0%, rgba(255,138,0,0.02) 100%)",
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
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,138,0,0.50)",
              fontSize: 36,
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              letterSpacing: "-0.04em",
            }}
          >
            {item.placeholder || item.name.slice(0, 2)}
          </div>
        )}

        {/* Top-right chain badge */}
        {item.chainColor && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 10,
              height: 10,
              borderRadius: 2,
              background: item.chainColor,
              boxShadow: `0 0 6px ${item.chainColor}99`,
              border: "1.5px solid rgba(0,0,0,0.40)",
            }}
          />
        )}

        {/* Bottom-left rarity rank */}
        {item.rarityRank !== undefined && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              padding: "2px 6px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: 2,
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#FF8A00",
              textTransform: "uppercase",
            }}
          >
            #{item.rarityRank}
          </span>
        )}

        {/* Top-left badge */}
        {item.badge && (
          <span
            style={{
              position: "absolute",
              top: 6,
              left: 6,
            }}
          >
            <Pill variant="accent">{item.badge}</Pill>
          </span>
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: "10px 12px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 600,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}
        >
          {item.name}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 10.5,
            color: "rgba(255,255,255,0.45)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.collection}
        </p>
        {item.floorETH !== undefined && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 9,
                letterSpacing: "0.25em",
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Floor
            </span>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.floorETH.toFixed(3)} ETH
              </p>
              {item.floorUSD !== undefined && (
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.40)",
                  }}
                >
                  ${item.floorUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyNFTState({ headline, body }: { headline: string; body: string }) {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "32px 20px",
          textAlign: "center",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.40 }}>
          <rect x="4" y="4" width="32" height="32" stroke="#FF8A00" strokeWidth="1.4" />
          <path d="M4 28L12 22L18 26L26 18L36 26" stroke="#FF8A00" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="14" cy="13" r="2" fill="#FF8A00" />
        </svg>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>{headline}</p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.50)",
            maxWidth: 480,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
      </div>
    </Card>
  );
}
