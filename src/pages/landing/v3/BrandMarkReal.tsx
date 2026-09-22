// ─── BrandMarkReal — the actual approved EmpX mark ──────────────────────────
//
// Source: D:\empx\media kit\Vector.png (the only approved vector asset).
// Do NOT recreate this shape with primitives — the real mark has sharp,
// stepped-notch strokes that a generic 3-rounded-bar approximation does not
// reproduce (see src/design-system/components/BrandMark.tsx, which is such
// an approximation and should not be used where brand accuracy matters).
//
// Two ways to render it:
//   - <BrandMarkReal />        the full flattened mark, one <img>
//   - <BrandMarkSlabs />       the same mark as 3 separately-mountable
//                              <img> layers (pixel-cropped from the source
//                              via connected-component extraction, not
//                              hand-traced), for staggered/independent
//                              animation. Composited, they reproduce the
//                              full mark exactly.

interface BrandMarkRealProps {
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function BrandMarkReal({ height = 28, className = "", style = {} }: BrandMarkRealProps) {
  // Source aspect ratio 1910x1710
  const width = height * (1910 / 1710);
  return (
    <img
      src="/brand/empx-mark-full.png"
      alt="EmpX"
      width={width}
      height={height}
      className={className}
      style={{ display: "block", objectFit: "contain", ...style }}
      draggable={false}
    />
  );
}

// Precise bounding boxes of each stroke within the 1910x1710 source,
// expressed as % — measured by connected-component pixel labeling, not
// eyeballed. Used to position the 3 slab crops so they recompose into
// the exact full mark when stacked.
export const SLAB_LAYOUT = [
  { src: "/brand/empx-mark-slab-1.png", leftPct: 0.0,   topPct: 0.0,    widthPct: 93.82, heightPct: 50.88 },
  { src: "/brand/empx-mark-slab-2.png", leftPct: 9.27,  topPct: 36.08,  widthPct: 87.64, heightPct: 50.88 },
  { src: "/brand/empx-mark-slab-3.png", leftPct: 29.32, topPct: 71.75,  widthPct: 70.63, heightPct: 28.19 },
] as const;

interface BrandMarkSlabsProps {
  /** aspect-ratio-preserving width of the whole composed mark, in px */
  width?: number;
  className?: string;
  /** per-slab className, e.g. for stagger animation classes — index 0/1/2 */
  slabClassName?: (i: number) => string;
  slabStyle?: (i: number) => React.CSSProperties;
}

export function BrandMarkSlabs({
  width = 320,
  className = "",
  slabClassName,
  slabStyle,
}: BrandMarkSlabsProps) {
  const height = width * (1710 / 1910);
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {SLAB_LAYOUT.map((slab, i) => (
        <img
          key={slab.src}
          src={slab.src}
          alt=""
          aria-hidden
          draggable={false}
          className={slabClassName?.(i)}
          style={{
            position: "absolute",
            left: `${slab.leftPct}%`,
            top: `${slab.topPct}%`,
            width: `${slab.widthPct}%`,
            height: `${slab.heightPct}%`,
            objectFit: "contain",
            ...slabStyle?.(i),
          }}
        />
      ))}
    </div>
  );
}
