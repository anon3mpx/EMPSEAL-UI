// ─── ChainLogo — image-first chain identifier with graceful fallback ──────
//
// Tries the DefiLlama CDN image first.  On error or when the chain isn't
// in CHAIN_SLUGS, falls back to a coloured letter-pill (the existing
// look-and-feel from ChainsSection / ChainBadge).
//
// First successful or failing load is cached in localStorage so we don't
// re-hammer the CDN with chains we know don't have a logo there.

import { useEffect, useState, CSSProperties } from "react";
import { chainLogoUrl, getCachedLogo, setCachedLogo } from "../data/logoRegistry";

interface ChainLogoProps {
  symbol: string;
  /** Hex background colour for the letter-pill fallback. */
  bg: string;
  /** Hex foreground colour for the letter-pill fallback. */
  fg?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function ChainLogo({
  symbol,
  bg,
  fg = "#FFFFFF",
  size = 40,
  className = "",
  style = {},
}: ChainLogoProps) {
  const url = chainLogoUrl(symbol);
  const cached = url ? getCachedLogo(`chain:${symbol}`) : null;

  // If cache says this URL failed before, skip the network attempt entirely.
  const [status, setStatus] = useState<"trying" | "ok" | "fail">(
    !url || cached?.ok === false ? "fail" : cached?.ok ? "ok" : "trying"
  );

  useEffect(() => {
    // If we have a cached "ok", nothing to do.  If cached "fail", we
    // already render the pill.  Only the "trying" branch may need to
    // resolve on first load.
    if (status !== "trying" || !url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setCachedLogo(`chain:${symbol}`, url, true);
      setStatus("ok");
    };
    img.onerror = () => {
      if (cancelled) return;
      setCachedLogo(`chain:${symbol}`, url, false);
      setStatus("fail");
    };
    img.src = url;
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [url, symbol, status]);

  const dim = { width: size, height: size };

  if (status === "ok" && url) {
    return (
      <img
        src={url}
        alt={`${symbol} logo`}
        loading="lazy"
        className={className}
        style={{
          ...dim,
          borderRadius: "50%",
          objectFit: "cover",
          background: bg,
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // Letter-pill fallback — matches existing ChainBadge look.
  return (
    <span
      className={className}
      aria-label={`${symbol} chain`}
      style={{
        ...dim,
        background: bg,
        color: fg,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        fontSize: size <= 32 ? 10 : size <= 48 ? 12 : 14,
        letterSpacing: symbol.length > 3 ? "-0.05em" : "0em",
        flexShrink: 0,
        ...style,
      }}
    >
      {symbol}
    </span>
  );
}
