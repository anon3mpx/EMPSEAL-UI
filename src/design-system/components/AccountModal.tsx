// ─── AccountModal — comprehensive wallet account panel ────────────────────
//
// Sections:
//   - Identity row (provider + address + copy + explorer)
//   - Two-up: Total balance + Connected network
//   - Quick actions strip (Receive · Buy · Bridge · Disconnect)
//   - Tab-switched body (Activity / Tokens / Networks)
//   - Footer: Switch wallet + Disconnect

import { ReactNode, useState } from "react";
import Modal from "./Modal";
import LogoTile from "./LogoTile";
import Pill from "./Pill";

export interface RecentActivityItem {
  id: string | number;
  kind: string;
  summary: string;
  status: "pending" | "confirmed" | "failed";
  timeLabel?: string;
  txHashShort?: string;
  onClick?: () => void;
}

export interface AccountTokenBalance {
  ticker: string;
  logo?: ReactNode;
  chainName: string;
  chainColor?: string;
  balance: string;
  balanceUSD?: number;
}

export interface AccountNetworkBalance {
  chainName: string;
  chainColor?: string;
  /** USD value held on this chain */
  balanceUSD: number;
  /** Gas token balance (e.g. "0.42 ETH") */
  nativeBalance?: string;
  /** Optional: low-gas warning */
  lowGas?: boolean;
}

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  address: string;
  providerName?: string;
  providerLogo?: ReactNode;
  chainName?: string;
  chainColor?: string;
  balanceUSD?: number;
  nativeBalance?: string;
  nativeTicker?: string;
  activity?: RecentActivityItem[];
  tokens?: AccountTokenBalance[];
  networks?: AccountNetworkBalance[];
  explorerUrl?: string;
  onCopy?: () => void;
  onDisconnect?: () => void;
  onSwitchWallet?: () => void;
  onViewPortfolio?: () => void;
  /** Quick actions */
  onReceive?: () => void;
  onBuy?: () => void;
  onBridge?: () => void;
  onSwitchNetwork?: () => void;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const STATUS_VARIANT: Record<RecentActivityItem["status"], "success" | "danger" | "accent"> = {
  confirmed: "success",
  failed: "danger",
  pending: "accent",
};

const STATUS_LABEL: Record<RecentActivityItem["status"], string> = {
  confirmed: "Done",
  failed: "Failed",
  pending: "Pending",
};

type Tab = "activity" | "tokens" | "networks";

export default function AccountModal({
  open,
  onClose,
  address,
  providerName = "Wallet",
  providerLogo,
  chainName,
  chainColor,
  balanceUSD,
  nativeBalance,
  nativeTicker,
  activity,
  tokens,
  networks,
  explorerUrl,
  onCopy,
  onDisconnect,
  onSwitchWallet,
  onViewPortfolio,
  onReceive,
  onBuy,
  onBridge,
  onSwitchNetwork,
}: AccountModalProps) {
  const [tab, setTab] = useState<Tab>("activity");

  const counts = {
    activity: activity?.length ?? 0,
    tokens: tokens?.length ?? 0,
    networks: networks?.length ?? 0,
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="ACCOUNT" title="Wallet" maxWidth={520}>
      {/* Identity */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px",
          background:
            "linear-gradient(135deg, rgba(255,138,0,0.04) 0%, transparent 75%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 5,
          marginBottom: 14,
        }}
      >
        <LogoTile
          fallback={providerLogo || providerName.slice(0, 2).toUpperCase()}
          size={40}
          radius={5}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.32em",
              color: "rgba(255,255,255,0.50)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {providerName}
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 14,
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {shortenAddress(address)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn aria-label="Copy" onClick={onCopy} title="Copy address" icon={
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="3.5" width="6" height="7" stroke="currentColor" strokeWidth="1" />
              <path d="M4 3.5V1.5H10V8.5H7.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          } />
          {explorerUrl && (
            <IconBtn aria-label="View on explorer" onClick={() => window.open(explorerUrl, "_blank")} title="View on explorer" icon={
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 6V9.5H9.5V6" stroke="currentColor" strokeWidth="1" />
                <path d="M6 1.5H9.5V5" stroke="currentColor" strokeWidth="1" />
                <path d="M9.5 1.5L5 6" stroke="currentColor" strokeWidth="1" />
              </svg>
            } />
          )}
        </div>
      </div>

      {/* Balance + network */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, marginBottom: 14 }}>
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.40)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Total balance
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 30,
              fontWeight: 300,
              letterSpacing: "-0.025em",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {balanceUSD !== undefined
              ? `$${balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              : "—"}
          </p>
          {nativeBalance && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.50)" }}>
              {nativeBalance} {nativeTicker || ""}
              {chainName && (
                <span style={{ color: "rgba(255,255,255,0.30)" }}> on {chainName}</span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSwitchNetwork}
          style={{
            padding: "14px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
            cursor: onSwitchNetwork ? "pointer" : "default",
            textAlign: "left",
            color: "#fff",
            transition: "border-color 160ms ease, background 160ms ease",
          }}
          onMouseEnter={(e) => {
            if (!onSwitchNetwork) return;
            e.currentTarget.style.borderColor = "rgba(255,138,0,0.35)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.40)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Connected to
          </p>
          {chainName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              {chainColor && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: chainColor,
                    boxShadow: `0 0 8px ${chainColor}`,
                  }}
                />
              )}
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: "#fff",
                  letterSpacing: "-0.015em",
                }}
              >
                {chainName}
              </p>
            </div>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34D399",
                marginRight: 6,
                boxShadow: "0 0 5px #34D399",
              }}
            />
            Active {onSwitchNetwork && <span style={{ color: "#FF8A00", marginLeft: 4 }}>· Switch ↕</span>}
          </p>
        </button>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
        <QuickAction
          label="Receive"
          onClick={onReceive}
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V11M7 11L3 7M7 11L11 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 13H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <QuickAction
          label="Buy"
          onClick={onBuy}
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 4.5V9.5M4.5 7H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <QuickAction
          label="Bridge"
          onClick={onBridge}
          icon={
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path d="M1.5 5L4 5L4 9L1.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.5 5L12 5L12 9L14.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 7H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 1.5" />
            </svg>
          }
        />
        <QuickAction
          label="Activity"
          onClick={() => setTab("activity")}
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 7L4 7L6 3L8 11L10 7L12.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: 2,
        }}
      >
        <TabButton label="Activity" count={counts.activity} active={tab === "activity"} onClick={() => setTab("activity")} />
        <TabButton label="Tokens"   count={counts.tokens}   active={tab === "tokens"}   onClick={() => setTab("tokens")} />
        <TabButton label="Networks" count={counts.networks} active={tab === "networks"} onClick={() => setTab("networks")} />
      </div>

      {/* Tab content */}
      <div style={{ minHeight: 180 }}>
        {tab === "activity" && (
          activity && activity.length > 0 ? (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 5,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {activity.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={a.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 12px",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    textAlign: "left",
                    cursor: a.onClick ? "pointer" : "default",
                    color: "#fff",
                    transition: "background 140ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (a.onClick) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.25em",
                      color: "rgba(255,255,255,0.55)",
                      minWidth: 58,
                    }}
                  >
                    {a.kind}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.92)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.summary}
                    {a.txHashShort && (
                      <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10 }}>
                        {a.txHashShort}
                      </span>
                    )}
                  </span>
                  <Pill variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Pill>
                  {a.timeLabel && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", whiteSpace: "nowrap" }}>
                      {a.timeLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyTab message="No recent activity from this address" />
          )
        )}

        {tab === "tokens" && (
          tokens && tokens.length > 0 ? (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 5,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {tokens.map((t, i) => (
                <div
                  key={`${t.chainName}-${t.ticker}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderBottom: i < tokens.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <LogoTile
                    fallback={t.logo || t.ticker.slice(0, 2).toUpperCase()}
                    size={28}
                    radius={4}
                    chainDot={t.chainColor}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t.ticker}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>
                      on {t.chainName}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {t.balance}
                    </p>
                    {t.balanceUSD !== undefined && (
                      <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)" }}>
                        ${t.balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTab message="No token balances detected on connected wallet" />
          )
        )}

        {tab === "networks" && (
          networks && networks.length > 0 ? (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 5,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {networks.map((n, i) => (
                <div
                  key={n.chainName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderBottom: i < networks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: n.chainColor
                        ? `linear-gradient(135deg, ${n.chainColor}40 0%, ${n.chainColor}10 100%)`
                        : "rgba(255,255,255,0.05)",
                      border: n.chainColor ? `1px solid ${n.chainColor}40` : "1px solid rgba(255,255,255,0.10)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      color: n.chainColor || "rgba(255,255,255,0.85)",
                    }}
                  >
                    {n.chainName.slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{n.chainName}</p>
                      {n.lowGas && <Pill variant="danger">Low gas</Pill>}
                    </div>
                    {n.nativeBalance && (
                      <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>
                        Gas: {n.nativeBalance}
                      </p>
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13.5,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    ${n.balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTab message="No network balances detected" />
          )
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {onViewPortfolio && (
          <ActionButton onClick={onViewPortfolio}>View portfolio</ActionButton>
        )}
        {onSwitchWallet && (
          <ActionButton onClick={onSwitchWallet}>Switch wallet</ActionButton>
        )}
        {onDisconnect && (
          <ActionButton onClick={onDisconnect} danger>
            Disconnect
          </ActionButton>
        )}
      </div>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function IconBtn({ onClick, icon, ...rest }: { onClick?: () => void; icon: ReactNode; title?: string; "aria-label"?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4,
        color: "rgba(255,255,255,0.65)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 160ms ease, border-color 160ms ease, background 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#FF8A00";
        e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
        e.currentTarget.style.background = "rgba(255,138,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255,255,255,0.65)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "12px 4px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 5,
        color: onClick ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)",
        cursor: onClick ? "pointer" : "not-allowed",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        transition: "all 160ms ease",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
        e.currentTarget.style.color = "#FF8A00";
        e.currentTarget.style.background = "rgba(255,138,0,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      {label}
    </button>
  );
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "#FF8A00" : "transparent"}`,
        color: active ? "#FF8A00" : "rgba(255,255,255,0.55)",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "color 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.color = "rgba(255,255,255,0.55)";
      }}
    >
      {label}
      <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.30)", fontWeight: 500, letterSpacing: "0.08em" }}>
        {count}
      </span>
    </button>
  );
}

function ActionButton({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 14px",
        background: danger ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${danger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 4,
        color: danger ? "#FCA5A5" : "rgba(255,255,255,0.85)",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "background 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = danger ? "rgba(239,68,68,0.50)" : "rgba(255,138,0,0.40)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = danger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.10)";
      }}
    >
      {children}
    </button>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "28px 16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.10)",
        borderRadius: 5,
        textAlign: "center",
        color: "rgba(255,255,255,0.40)",
        fontSize: 12,
      }}
    >
      {message}
    </div>
  );
}
