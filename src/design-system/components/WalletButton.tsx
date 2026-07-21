// ─── WalletButton — Navbar control: Connect / Connected with address ──────

interface WalletButtonProps {
  connected?: boolean;
  /** When connected: short address e.g. "0x12...ab" */
  address?: string;
  /** USD value of wallet balance (optional). */
  balanceUSD?: number;
  /** Called when clicked while disconnected. */
  onConnect?: () => void;
  /** Called when clicked while connected (open account modal). */
  onClick?: () => void;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

export default function WalletButton({
  connected,
  address,
  balanceUSD,
  onConnect,
  onClick,
}: WalletButtonProps) {
  if (!connected) {
    return (
      <button
        type="button"
        onClick={onConnect}
        style={{
          padding: "9px 16px",
          background: "#FF8A00",
          color: "#05050c",
          border: "none",
          borderRadius: 4,
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(255,138,0,0.30)",
          transition: "background 180ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FFB347")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FF8A00")}
      >
        Connect
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 12px 7px 14px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 4,
        color: "#fff",
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        transition: "border-color 160ms ease, background 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
    >
      {balanceUSD !== undefined && (
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
          ${balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      )}
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#34D399",
          boxShadow: "0 0 6px #34D399",
        }}
      />
      <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}>
        {truncateAddress(address || "")}
      </span>
    </button>
  );
}
