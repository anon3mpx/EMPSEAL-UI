// ─── SwapDivider — vertical arrow between swap input/output ─────────────────

interface SwapDividerProps {
  onSwap?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function SwapDivider({ onSwap, disabled, ariaLabel = "Swap tokens" }: SwapDividerProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        margin: "-6px 0",
        zIndex: 2,
      }}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onSwap}
        disabled={disabled}
        aria-label={ariaLabel}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#0A0A14",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#FF8A00",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition:
            "background 220ms ease, border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease",
        }}
        onMouseEnter={(e) => {
          if (disabled) return;
          e.currentTarget.style.background = "#0F0F18";
          e.currentTarget.style.borderColor = "rgba(255,138,0,0.50)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255,138,0,0.25)";
        }}
        onMouseLeave={(e) => {
          if (disabled) return;
          e.currentTarget.style.background = "#0A0A14";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1V13M7 13L2 8M7 13L12 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
