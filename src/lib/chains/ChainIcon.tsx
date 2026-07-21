// ─── <ChainIcon> ──────────────────────────────────────────────────────────────
//
// Renders a chain's logo.  Resolves via lib/chains/icons.ts (local first,
// external CDN fallback) and degrades to a letter pill when no mapping
// exists OR when the image fails to load.
//
// Drop-in replacement for the inline `<img src={chainLogoMap[chain]}>`
// pattern that previously lived in Portfolio.tsx + similar pages.
//
// Usage:
//   <ChainIcon chainKey="ethereum" className="w-6 h-6" />
//   <ChainIcon chainKey={tokenRow.chain} size={32} />

import { useState } from "react";
import { getChainIconUrl, chainInitial } from "./icons";

interface ChainIconProps {
  chainKey: string | undefined | null;
  /** Tailwind sizing — applied to BOTH the <img> and the fallback pill so
   *  they're swap-equivalent.  Default: w-6 h-6. */
  className?: string;
  /** Pixel size convenience — sets style.width/height directly.  Useful for
   *  when className isn't sized.  Ignored if className already has w-/h-. */
  size?: number;
  /** Alt text override.  Defaults to the chainKey. */
  alt?: string;
  /** Force-render the letter-pill fallback (skip the image entirely).
   *  Useful for tests or when callers know the URL is broken. */
  forceFallback?: boolean;
}

export default function ChainIcon({
  chainKey,
  className = "w-6 h-6",
  size,
  alt,
  forceFallback,
}: ChainIconProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = getChainIconUrl(chainKey);
  const showFallback = forceFallback || imgFailed || !url;

  const style: React.CSSProperties = size
    ? { width: size, height: size }
    : {};

  if (showFallback) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center rounded-full bg-[#FF8A00]/15 border border-[#FF8A00]/30 text-[#FF8A00] font-bold text-[10px] uppercase`}
        style={style}
        title={chainKey ?? "unknown chain"}
        aria-label={alt ?? chainKey ?? "unknown chain"}
        data-testid="chain-icon-fallback"
      >
        {chainInitial(chainKey)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? chainKey ?? ""}
      className={className}
      style={style}
      onError={() => setImgFailed(true)}
      // Defer image load until in viewport — saves bandwidth when the
      // Portfolio list scrolls past dozens of chain rows.
      loading="lazy"
      data-testid="chain-icon-img"
    />
  );
}
