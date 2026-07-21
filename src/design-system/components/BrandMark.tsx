// ─── BrandMark — EmpX logo SVG ──────────────────────────────────────────────
//
// Three offset, italic-leaning rounded bars matching the official EmpX mark.
// Use anywhere we need the brand: navbar, modal watermark, loading states.

import { CSSProperties } from "react";

interface BrandMarkProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
  /** Skip skewX (for tighter spaces) */
  upright?: boolean;
}

export default function BrandMark({
  size = 28,
  color = "#FF8A00",
  opacity = 1,
  className = "",
  style = {},
  upright = false,
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="EmpX"
      className={`empx-brand-mark ${className}`}
      style={{ display: "inline-block", opacity, ...style }}
    >
      <g
        fill={color}
        transform={upright ? undefined : "skewX(-12)"}
        style={{ transformOrigin: "50% 50%" }}
      >
        <rect x="10" y="8"  width="62" height="18" rx="8" />
        <rect x="24" y="38" width="62" height="18" rx="8" />
        <rect x="12" y="68" width="62" height="18" rx="8" />
      </g>
    </svg>
  );
}
