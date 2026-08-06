// ─── TokenPicker — creative token selection modal ──────────────────────────
//
// Adds chain filter tabs (All / per-chain), recent/frequent quick-picks with
// logo+ticker chip, refined list rows with category badges.

import { ReactNode, useMemo, useState } from "react";
import Modal from "./Modal";
import Pill from "./Pill";
import LogoTile from "./LogoTile";
import TokenLogo from "./TokenLogo";

export interface PickerToken {
  tokenKey?: string;
  address?: string;
  ticker: string;
  name?: string;
  logo?: ReactNode;
  balance?: string;
  balanceUSD?: number;
  chainName?: string;
  chainColor?: string;
  /** Chain ID — when present, TokenLogo resolves the TrustWallet image. */
  chainId?: number;
  badge?: "TRENDING" | "VERIFIED" | "NEW" | "LP" | "WARNING";
}

interface TokenPickerProps {
  open: boolean;
  onClose: () => void;
  tokens: PickerToken[];
  selected?: string;
  onSelect: (token: PickerToken) => void;
  /** Recent tokens shown as chips above the list */
  recent?: PickerToken[];
  /** Chains the user can filter on. If omitted, no tabs are shown. */
  chains?: { name: string; color?: string }[];
  title?: string;
  /** When the list is filtered by rail capability, show this banner explaining why. */
  restrictedReason?: string;
  showBalances?: boolean;
  showBadges?: boolean;
}

export default function TokenPicker({
  open,
  onClose,
  tokens,
  selected,
  onSelect,
  recent,
  chains,
  title = "Select a token",
  restrictedReason,
  showBalances = true,
  showBadges = true,
}: TokenPickerProps) {
  const [query, setQuery] = useState("");
  const [activeChain, setActiveChain] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokens.filter((t) => {
      if (activeChain !== "ALL" && t.chainName !== activeChain) return false;
      if (!q) return true;
      return (
        t.ticker.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.address?.toLowerCase().includes(q)
      );
    });
  }, [tokens, query, activeChain]);

  // Sort: balance-holders first, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!showBalances) return 0;
      const aHas = (a.balanceUSD ?? 0) > 0 ? 1 : 0;
      const bHas = (b.balanceUSD ?? 0) > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return (b.balanceUSD ?? 0) - (a.balanceUSD ?? 0);
    });
  }, [filtered, showBalances]);

  return (
    <Modal open={open} onClose={onClose} title={title} eyebrow="TOKEN" maxWidth={500}>
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
          placeholder="Search ticker, name, or paste address"
          style={{
            width: "100%",
            padding: "11px 14px 11px 38px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 5,
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

      {/* Restriction banner — explains why the list is rail-limited */}
      {restrictedReason && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "9px 11px",
            marginBottom: 12,
            background: "rgba(96,165,250,0.06)",
            border: "1px solid rgba(96,165,250,0.20)",
            borderRadius: 4,
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "#93C5FD", flexShrink: 0, marginTop: 1, fontWeight: 700 }}>i</span>
          <span>{restrictedReason}</span>
        </div>
      )}

      {/* Chain filter tabs */}
      {chains && chains.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 14,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <ChainTab name="ALL" active={activeChain === "ALL"} onClick={() => setActiveChain("ALL")} />
          {chains.map((c) => (
            <ChainTab
              key={c.name}
              name={c.name}
              color={c.color}
              active={activeChain === c.name}
              onClick={() => setActiveChain(c.name)}
            />
          ))}
        </div>
      )}

      {/* Recent chips */}
      {recent && recent.length > 0 && (
        <>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.40)",
              textTransform: "uppercase",
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            Recent
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
            {recent.map((t) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => onSelect(t)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px 5px 7px",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  transition: "all 160ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,138,0,0.10)";
                  e.currentTarget.style.borderColor = "rgba(255,138,0,0.35)";
                  e.currentTarget.style.color = "#FF8A00";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.045)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                }}
              >
                {/* Compact tile for the recents row — TokenLogo tries TrustWallet image first. */}
                <TokenLogo ticker={t.ticker} chainId={t.chainId} size={18} />
                {t.ticker}
              </button>
            ))}
          </div>
        </>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", marginRight: -8, paddingRight: 8 }}>
        {sorted.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "rgba(255,255,255,0.40)",
              fontSize: 13,
            }}
          >
            <p style={{ margin: "0 0 4px" }}>No tokens match "{query}"</p>
            <p style={{ margin: 0, fontSize: 11 }}>
              Try a different search or paste a token address.
            </p>
          </div>
        ) : (
          sorted.map((token) => {
            const isSelected = selected === (token.address || token.ticker);
            return (
              <button
                key={(token.address || "") + token.ticker + (token.chainName || "")}
                type="button"
                onClick={() => onSelect(token)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 10px",
                  background: isSelected ? "rgba(255,138,0,0.06)" : "transparent",
                  border: "none",
                  borderLeft: isSelected ? "2px solid #FF8A00" : "2px solid transparent",
                  width: "100%",
                  cursor: "pointer",
                  color: "#fff",
                  transition: "background 140ms ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Main row — TokenLogo (image + ticker fallback) plus optional chain dot overlay. */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <TokenLogo ticker={token.ticker} chainId={token.chainId} size={34} />
                  {token.chainColor && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        right: -2,
                        bottom: -2,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: token.chainColor,
                        border: "2px solid #05050c",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{token.ticker}</span>
                    {showBadges && token.badge && (
                      <Pill
                        variant={
                          token.badge === "VERIFIED"
                            ? "success"
                            : token.badge === "TRENDING"
                            ? "accent"
                            : token.badge === "LP"
                            ? "info"
                            : "default"
                        }
                      >
                        {token.badge}
                      </Pill>
                    )}
                  </div>
                  {(token.name || token.chainName) && (
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
                      {token.name}
                      {token.chainName && (
                        <span style={{ color: "rgba(255,255,255,0.30)" }}> · {token.chainName}</span>
                      )}
                    </p>
                  )}
                </div>

                {showBalances && token.balance && (
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {token.balance}
                    </p>
                    {token.balanceUSD !== undefined && token.balanceUSD > 0 && (
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.40)",
                        }}
                      >
                        ${token.balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}

function ChainTab({
  name,
  color,
  active,
  onClick,
}: {
  name: string;
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
        padding: "6px 11px",
        background: active ? "rgba(255,138,0,0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(255,138,0,0.45)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 3,
        color: active ? "#FF8A00" : "rgba(255,255,255,0.65)",
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
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}
      {name}
    </button>
  );
}
