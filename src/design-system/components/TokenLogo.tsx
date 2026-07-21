// ─── TokenLogo — image-first token identifier with ticker-pill fallback ──
//
// Tries TrustWallet's repo image first via tokenLogoUrl(chainId, ticker).
// Caches first-load result (ok/fail) in localStorage via logoRegistry.
// Falls back to a squarish ticker tile (matches the EmpX design system —
// no round capsules on token containers).

import { useEffect, useState, CSSProperties } from "react";
import { tokenLogoUrl, getCachedLogo, setCachedLogo } from "../data/logoRegistry";

interface TokenLogoProps {
  ticker: string;
  /** Chain ID — required for resolving the TrustWallet repo path. */
  chainId?: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function TokenLogo({
  ticker,
  chainId,
  size = 28,
  className = "",
  style = {},
}: TokenLogoProps) {
  const url = chainId != null ? tokenLogoUrl(chainId, ticker) : null;
  const cacheKey = `token:${chainId ?? "?"}:${ticker.toUpperCase()}`;
  const cached = url ? getCachedLogo(cacheKey) : null;

  const [status, setStatus] = useState<"trying" | "ok" | "fail">(
    !url || cached?.ok === false ? "fail" : cached?.ok ? "ok" : "trying"
  );

  useEffect(() => {
    if (status !== "trying" || !url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setCachedLogo(cacheKey, url, true);
      setStatus("ok");
    };
    img.onerror = () => {
      if (cancelled) return;
      setCachedLogo(cacheKey, url, false);
      setStatus("fail");
    };
    img.src = url;
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [url, cacheKey, status]);

  const dim = { width: size, height: size };

  if (status === "ok" && url) {
    return (
      <img
        src={url}
        alt={`${ticker} logo`}
        loading="lazy"
        className={className}
        style={{
          ...dim,
          borderRadius: 4, // squarish — matches EmpX brand rule
          objectFit: "cover",
          background: "rgba(255,255,255,0.05)",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // Ticker-tile fallback — uses the existing accent-orange + squarish look.
  return (
    <span
      className={className}
      aria-label={`${ticker} token`}
      style={{
        ...dim,
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
        flexShrink: 0,
        ...style,
      }}
    >
      {ticker.slice(0, 4)}
    </span>
  );
}
