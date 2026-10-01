// ─── TokenPicker — token selection modal, slab theme ───────────────────────
//
// Chain filter tabs (All / per-chain), recent quick-pick chips, and list rows
// split into "Your balances" / "All tokens". Chrome follows the locked
// prototype's picker (public/swap-experience.html): slab modal, inset search
// with a left accent bar, underline tabs, flat chips, square chain badge.

import { ReactNode, useMemo, useState } from "react";
import Modal from "./Modal";
import Pill from "./Pill";
import TokenLogo from "./TokenLogo";
import ChainLogo from "./ChainLogo";

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
  chainId?: number;
  logoUrl?: string;
  isNative?: boolean;
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

  // "Your balances" / "All tokens" split — ported from the draft's `.ghead`
  // grouping. Only when balances are shown; otherwise one flat list.
  const held = useMemo(
    () => (showBalances ? sorted.filter((t) => (t.balanceUSD ?? 0) > 0) : []),
    [sorted, showBalances],
  );
  const rest = useMemo(
    () => (showBalances ? sorted.filter((t) => !((t.balanceUSD ?? 0) > 0)) : sorted),
    [sorted, showBalances],
  );

  return (
    <Modal open={open} onClose={onClose} title={title} eyebrow="TOKEN" maxWidth={500} theme="slab">
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
          placeholder="Search ticker, name, or paste address"
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
            gap: 20,
            marginBottom: 14,
            overflowX: "auto",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {recent.map((t) => {
              const isSelected = selected === (t.address || t.ticker);
              return (
              <button
                key={t.ticker}
                type="button"
                onClick={() => onSelect(t)}
                style={{
                  // Flat chip from the draft's `.chip` — no border box, state
                  // reads from the background wash alone. The logo stays (the
                  // draft's chip is text-only) so identity matches the list.
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px 5px 6px",
                  background: isSelected ? "rgba(var(--widget-primary-rgb, 255, 138, 0), 0.15)" : "rgba(255,255,255,0.035)",
                  border: "none",
                  borderRadius: 3,
                  color: isSelected ? "var(--widget-primary, #FF8A00)" : "rgba(255,255,255,0.85)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(var(--widget-primary-rgb, 255, 138, 0), 0.10)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                }}
              >
                {/* Compact tile for the recents row — TokenLogo tries TrustWallet image first. */}
                <TokenLogo
                  ticker={t.ticker}
                  chainId={t.chainId}
                  address={t.address}
                  logoUrl={t.logoUrl}
                  isNative={t.isNative}
                  size={16}
                />
                {t.ticker}
              </button>
              );
            })}
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
          <>
            {held.length > 0 && <GroupHeader label="Your balances" />}
            {held.map((token) => (
              <TokenRow
                key={(token.address || "") + token.ticker + (token.chainName || "")}
                token={token}
                selected={selected}
                onSelect={onSelect}
                showBalances={showBalances}
                showBadges={showBadges}
              />
            ))}
            {showBalances && rest.length > 0 && <GroupHeader label="All tokens" />}
            {rest.map((token) => (
              <TokenRow
                key={(token.address || "") + token.ticker + (token.chainName || "")}
                token={token}
                selected={selected}
                onSelect={onSelect}
                showBalances={showBalances}
                showBadges={showBadges}
              />
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 2px 8px" }}>
      <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function TokenRow({
  token,
  selected,
  onSelect,
  showBalances,
  showBadges,
}: {
  token: PickerToken;
  selected?: string;
  onSelect: (token: PickerToken) => void;
  showBalances: boolean;
  showBadges: boolean;
}) {
  const isSelected = selected === (token.address || token.ticker);
  return (
    <button
      type="button"
      onClick={() => onSelect(token)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 10px",
        background: isSelected ? "rgba(var(--widget-primary-rgb, 255, 138, 0), 0.06)" : "transparent",
        border: "none",
        borderLeft: isSelected ? "2px solid var(--widget-primary, #FF8A00)" : "2px solid transparent",
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
      {/* Main row — TokenLogo with a real chain-logo badge overlay (not a
          flat colour dot), matching the draft's row: a 14px square chain
          icon at the token logo's bottom-right corner with a dark ring. */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <TokenLogo
          ticker={token.ticker}
          chainId={token.chainId}
          address={token.address}
          logoUrl={token.logoUrl}
          isNative={token.isNative}
          size={34}
        />
        {token.chainId !== undefined && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: -3,
              bottom: -3,
              width: 14,
              height: 14,
              borderRadius: 4,
              overflow: "hidden",
              border: "1.5px solid #0a0a12",
              display: "flex",
            }}
          >
            <ChainLogo
              symbol={token.chainName?.slice(0, 3).toUpperCase() || "?"}
              chainId={token.chainId}
              bg={token.chainColor || "#888"}
              size={14}
            />
          </span>
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
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0 0 9px",
        margin: "0 0 -1px",
        background: "transparent",
        border: "none",
        color: active ? "var(--widget-primary, #FF8A00)" : "rgba(255,255,255,0.36)",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 160ms ease",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.color = "rgba(255,255,255,0.65)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.color = "rgba(255,255,255,0.36)";
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
          }}
        />
      )}
      {name}
      {active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 1.5,
            background: "var(--widget-primary, #FF8A00)",
          }}
        />
      )}
    </button>
  );
}
