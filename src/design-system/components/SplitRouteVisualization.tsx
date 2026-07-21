// ─── SplitRouteVisualization — branching swap routes ──────────────────────
//
// Shows a swap that's split across N parallel routes between the same input
// and output token.  Visual: trunk → fork → branches → recombine → trunk.
//
// Each branch has its own venue label and percentage allocation.  Animated
// pulses flow along all branches simultaneously, with intensities scaled
// to allocation %.

import { CSSProperties } from "react";

export interface SplitBranch {
  /** Venue name (e.g. "Uniswap V3", "Curve", "Velodrome") */
  via: string;
  /** Percentage of input routed through this branch (0-100) */
  pct: number;
  /** Optional intermediate hops along this branch */
  intermediateTickers?: string[];
}

interface SplitRouteVisualizationProps {
  /** Token at the start (source) */
  fromTicker: string;
  fromChainName?: string;
  fromChainColor?: string;
  /** Token at the end (destination) */
  toTicker: string;
  toChainName?: string;
  toChainColor?: string;
  /** Array of parallel routes — must sum to 100 (or close to it) */
  branches: SplitBranch[];
  /** Add animated pulses traveling along the routes */
  animated?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function SplitRouteVisualization({
  fromTicker,
  fromChainName,
  fromChainColor,
  toTicker,
  toChainName,
  toChainColor,
  branches,
  animated = true,
  compact = false,
  className = "",
  style = {},
}: SplitRouteVisualizationProps) {
  const branchCount = branches.length;
  if (branchCount === 0) return null;

  // Calculate SVG geometry — bigger canvas + wider fork separation
  const VIEW_W = 100;
  const PER_BRANCH = 14;
  const VIEW_H = Math.max(40, branchCount * PER_BRANCH + 12);
  const TRUNK_LEFT = 6;
  const TRUNK_RIGHT = 94;
  const FORK_LEFT = 18;
  const FORK_RIGHT = 82;
  const CENTER_Y = VIEW_H / 2;
  const branchSpacing = (VIEW_H - 16) / Math.max(1, branchCount - 1);
  const branchYs =
    branchCount === 1 ? [CENTER_Y] : branches.map((_, i) => 8 + i * branchSpacing);

  return (
    <div
      className={`empx-split-route ${className}`}
      style={{ position: "relative", width: "100%", ...style }}
    >
      {/* SVG bezier paths */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: compact ? 130 : 180,
        }}
      >
        <defs>
          <linearGradient id="splitFlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF8A00" stopOpacity="0" />
            <stop offset="50%" stopColor="#FF8A00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF8A00" stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur="3.4s"
              repeatCount="indefinite"
            />
          </linearGradient>
          <filter id="splitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Branches */}
        {branchYs.map((y, i) => (
          <g key={i}>
            {/* Static dim path */}
            <path
              d={`M ${FORK_LEFT} ${CENTER_Y} C ${FORK_LEFT + 8} ${CENTER_Y}, ${FORK_LEFT + 8} ${y}, ${FORK_LEFT + 16} ${y} L ${FORK_RIGHT - 16} ${y} C ${FORK_RIGHT - 8} ${y}, ${FORK_RIGHT - 8} ${CENTER_Y}, ${FORK_RIGHT} ${CENTER_Y}`}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={Math.max(0.4, branches[i].pct / 100 * 0.8)}
              vectorEffect="non-scaling-stroke"
            />
            {/* Animated pulse */}
            {animated && (
              <path
                d={`M ${FORK_LEFT} ${CENTER_Y} C ${FORK_LEFT + 8} ${CENTER_Y}, ${FORK_LEFT + 8} ${y}, ${FORK_LEFT + 16} ${y} L ${FORK_RIGHT - 16} ${y} C ${FORK_RIGHT - 8} ${y}, ${FORK_RIGHT - 8} ${CENTER_Y}, ${FORK_RIGHT} ${CENTER_Y}`}
                fill="none"
                stroke="url(#splitFlow)"
                strokeWidth={Math.max(0.6, branches[i].pct / 100 * 1.2)}
                filter="url(#splitGlow)"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        ))}

        {/* Trunk in */}
        <line
          x1={TRUNK_LEFT}
          y1={CENTER_Y}
          x2={FORK_LEFT}
          y2={CENTER_Y}
          stroke="rgba(255,138,0,0.45)"
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
        />
        {/* Trunk out */}
        <line
          x1={FORK_RIGHT}
          y1={CENTER_Y}
          x2={TRUNK_RIGHT}
          y2={CENTER_Y}
          stroke="rgba(255,138,0,0.45)"
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
        />

        {/* End-cap dots */}
        <circle
          cx={TRUNK_LEFT}
          cy={CENTER_Y}
          r="1.1"
          fill={fromChainColor || "#FF8A00"}
          filter="url(#splitGlow)"
        />
        <circle cx={TRUNK_LEFT} cy={CENTER_Y} r="0.5" fill="#05050c" />
        <circle
          cx={TRUNK_RIGHT}
          cy={CENTER_Y}
          r="1.1"
          fill={toChainColor || "#FF8A00"}
          filter="url(#splitGlow)"
        />
        <circle cx={TRUNK_RIGHT} cy={CENTER_Y} r="0.5" fill="#05050c" />
      </svg>

      {/* Token labels at trunk ends */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          textAlign: "left",
          paddingLeft: 4,
          pointerEvents: "none",
        }}
      >
        <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: compact ? 13 : 15, letterSpacing: "-0.01em", color: "#fff" }}>
          {fromTicker}
        </p>
        {fromChainName && (
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              letterSpacing: "0.25em",
              color: fromChainColor || "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
            }}
          >
            on {fromChainName}
          </p>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 0,
          transform: "translateY(-50%)",
          textAlign: "right",
          paddingRight: 4,
          pointerEvents: "none",
        }}
      >
        <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: compact ? 13 : 15, letterSpacing: "-0.01em", color: "#fff" }}>
          {toTicker}
        </p>
        {toChainName && (
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              letterSpacing: "0.25em",
              color: toChainColor || "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
            }}
          >
            on {toChainName}
          </p>
        )}
      </div>

      {/* Branch labels — venue + percentage */}
      <div style={{ marginTop: compact ? 6 : 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {branches.map((b, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 10px",
              background: "rgba(255,255,255,0.025)",
              borderLeft: `3px solid rgba(255,138,0,${0.3 + (b.pct / 100) * 0.6})`,
              borderRadius: 2,
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.30em",
                  color: "#FF8A00",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                via
              </span>
              <span style={{ color: "#fff", fontWeight: 500 }}>{b.via}</span>
              {b.intermediateTickers && b.intermediateTickers.length > 0 && (
                <span style={{ color: "rgba(255,255,255,0.40)", fontSize: 10 }}>
                  · {b.intermediateTickers.join(" → ")}
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                letterSpacing: "-0.01em",
                color: "#FF8A00",
              }}
            >
              {b.pct.toFixed(b.pct < 10 ? 1 : 0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
