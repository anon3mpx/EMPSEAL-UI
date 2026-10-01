// ─── BrandMark — EmpX logo ───────────────────────────────────────────────
//
// Renders the actual approved mark (public/brand/empx-mark-full.png) — NOT a
// procedural approximation. The previous stand-in drew 3 uniform rounded
// rects; the real mark has sharp parallelogram cuts and a layered stagger
// the rects didn't reproduce, and it read as visibly wrong everywhere
// BrandMark is used (navbar, modals, empty states, watermarks).
//
// The asset is a single flat colour on transparency, so it's drawn as a CSS
// mask filled with `color` rather than as an <img>. That keeps the real shape
// while still following `--widget-primary` inside themed embeds.

import { CSSProperties } from "react";

interface BrandMarkProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
  /** No-op — the real mark has no upright/skewed variants, just the one mark. */
  upright?: boolean;
}

const MARK_URL = "url(/brand/empx-mark-full.png)";

// Source aspect ratio is 1910x1710 — not square, so the mask is contained
// within a size×size box rather than stretched.
export default function BrandMark({
  size = 28,
  color = "var(--widget-primary, #FF8A00)",
  opacity = 1,
  className = "",
  style = {},
}: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label="EmpX"
      className={`empx-brand-mark ${className}`}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        opacity,
        backgroundColor: color,
        WebkitMaskImage: MARK_URL,
        maskImage: MARK_URL,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}
