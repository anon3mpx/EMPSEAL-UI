// ─── LogoTile — square logo container for tokens/chains/wallets ────────────
//
// Per design system v0.5: NO round capsules.  Slightly-rounded squares with
// gradient backgrounds, optional chain-color dot overlay, consistent sizing.
// Used everywhere a logo appears: TokenPicker, TokenSwitcher, AssetRow,
// MarketCard, ChainPicker, AccountModal, WalletModal.

import { CSSProperties, ReactNode } from "react";

interface LogoTileProps {
  /** Image src OR a node (emoji, letters, etc) */
  src?: string;
  alt?: string;
  /** Fallback content rendered if `src` is missing or fails — typically initials */
  fallback?: ReactNode;
  /** Optional accent color used for fallback bg gradient + ring */
  color?: string;
  /** Chain-color dot overlay (lower-right) for token-in-chain context */
  chainDot?: string;
  /** Pixel size of the tile (square) */
  size?: number;
  /** Border radius — default 4 for "squarish" feel */
  radius?: number;
  /** Treat as raised (slight shadow). Default true. */
  raised?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function LogoTile({
  src,
  alt,
  fallback,
  color,
  chainDot,
  size = 30,
  radius = 4,
  raised = true,
  className = "",
  style = {},
}: LogoTileProps) {
  const baseStyle: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    borderRadius: radius,
    background: color
      ? `linear-gradient(135deg, ${color}30 0%, ${color}08 100%)`
      : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
    border: color
      ? `1px solid ${color}38`
      : "1px solid rgba(255,255,255,0.10)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    fontFamily: "Inter, sans-serif",
    fontSize: Math.max(8, Math.round(size * 0.34)),
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: color || "rgba(255,255,255,0.88)",
    boxShadow: raised ? "0 2px 6px rgba(0,0,0,0.30)" : "none",
    ...style,
  };

  return (
    <span className={`empx-logo-tile ${className}`} style={baseStyle}>
      {src ? (
        <img
          src={src}
          alt={alt || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        fallback
      )}
      {chainDot && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: Math.max(8, Math.round(size * 0.30)),
            height: Math.max(8, Math.round(size * 0.30)),
            borderRadius: 2,
            background: chainDot,
            border: "2px solid #0A0A14",
            boxShadow: `0 0 4px ${chainDot}99`,
          }}
        />
      )}
    </span>
  );
}
