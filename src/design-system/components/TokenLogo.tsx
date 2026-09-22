// ─── TokenLogo — image-first token identifier with ticker-pill fallback ──
//
// Resolves ordered candidates from logoRegistry and always renders a
// squarish ticker tile when no safe image loads.

import { CSSProperties } from "react";
import { tokenLogoCandidates } from "../data/logoRegistry";
import ResolvedLogo from "./ResolvedLogo";

interface TokenLogoProps {
  ticker: string;
  chainId?: number;
  address?: string;
  logoUrl?: string;
  isNative?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function TokenLogo({
  ticker,
  chainId,
  address,
  logoUrl,
  isNative,
  size = 28,
  className = "",
  style = {},
}: TokenLogoProps) {
  const candidates = tokenLogoCandidates({
    chainId,
    ticker,
    address,
    configuredUrl: logoUrl,
    isNative,
  });

  return (
    <ResolvedLogo
      candidates={candidates}
      alt={`${ticker} logo`}
      size={size}
      radius={4}
      className={className}
      style={{ background: "rgba(255,255,255,0.05)", ...style }}
      fallback={
        <span
          aria-label={`${ticker} token`}
          style={{
            width: "100%",
            height: "100%",
            background: "rgba(255,138,0,0.10)",
            border: "1px solid rgba(255,138,0,0.30)",
            borderRadius: 4,
            color: "#FF8A00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: size <= 24 ? 9 : size <= 32 ? 10 : 11,
            letterSpacing: "-0.01em",
          }}
        >
          {ticker.slice(0, 4)}
        </span>
      }
    />
  );
}
