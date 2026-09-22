// ─── ChainLogo — image-first chain identifier with graceful fallback ──────
//
// Resolves artwork by chain ID, never by native ticker. ETH-native L2s
// therefore keep distinct logos. Unknown chains fall back to a coloured
// letter-pill using the supplied symbol.

import { CSSProperties } from "react";
import { chainLogoCandidates } from "../data/logoRegistry";
import ResolvedLogo from "./ResolvedLogo";

interface ChainLogoProps {
  chainId?: number;
  symbol: string;
  bg: string;
  fg?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function ChainLogo({
  chainId,
  symbol,
  bg,
  fg = "#FFFFFF",
  size = 40,
  className = "",
  style = {},
}: ChainLogoProps) {
  const label = symbol.trim() || "?";
  const candidates = chainLogoCandidates(chainId, symbol);

  return (
    <ResolvedLogo
      candidates={candidates}
      alt={`${label} logo`}
      size={size}
      radius="50%"
      className={className}
      style={{ background: bg, ...style }}
      fallback={
        <span
          aria-label={`${label} chain`}
          style={{
            width: "100%",
            height: "100%",
            background: bg,
            color: fg,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: size <= 32 ? 10 : size <= 48 ? 12 : 14,
            letterSpacing: label.length > 3 ? "-0.05em" : "0em",
          }}
        >
          {label}
        </span>
      }
    />
  );
}
