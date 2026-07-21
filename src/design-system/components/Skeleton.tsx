// ─── Skeleton — loading shimmer placeholders ───────────────────────────────
//
// Three shapes: text (line), rect (block), circle (avatar).  Shimmer
// animation uses a subtle gradient that traverses left-to-right.

import { CSSProperties } from "react";

interface SkeletonProps {
  variant?: "text" | "rect" | "circle";
  /** Width — number (px) or CSS string */
  width?: number | string;
  /** Height — number (px) or CSS string */
  height?: number | string;
  /** Border radius override */
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Skeleton({
  variant = "rect",
  width,
  height,
  radius,
  className = "",
  style = {},
}: SkeletonProps) {
  const w =
    width !== undefined
      ? typeof width === "number"
        ? `${width}px`
        : width
      : variant === "circle"
      ? 32
      : "100%";
  const h =
    height !== undefined
      ? typeof height === "number"
        ? `${height}px`
        : height
      : variant === "text"
      ? 12
      : variant === "circle"
      ? w
      : 16;

  const r =
    radius !== undefined
      ? radius
      : variant === "circle"
      ? 999
      : variant === "text"
      ? 3
      : 4;

  return (
    <span
      aria-hidden
      className={`empx-skeleton ${className}`}
      style={{
        display: "inline-block",
        width: w,
        height: h,
        borderRadius: r,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)",
        backgroundSize: "200% 100%",
        animation: "empxSkeletonShimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    >
      <style>{`
        @keyframes empxSkeletonShimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </span>
  );
}
