// ─── NetworkSelector — Navbar control: current chain button ───────────────

interface NetworkSelectorProps {
  /** Name of the currently-connected chain */
  name: string;
  /** Chain accent color */
  color?: string;
  onClick: () => void;
}

export default function NetworkSelector({ name, color, onClick }: NetworkSelectorProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 4,
        color: "rgba(255,255,255,0.88)",
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
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
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.6 }}>
        <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
