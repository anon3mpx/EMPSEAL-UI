// ─── RouteVisualization — typographic route flow ────────────────────────────
//
// Shows a swap's routing path as a horizontal sequence of token states
// connected by labeled segments.  Each segment names the venue (DEX, bridge,
// rail) that performs the conversion.  A live "pulse" dot travels along the
// route to communicate motion.
//
// Example render (for a 3-hop cross-chain route):
//
//   ●─────[Uniswap V3]─────●─────[CCTP Fast]─────●─────[Aerodrome]─────●
//   ETH                    USDC                  USDC                  USDT
//   on Arbitrum            on Arbitrum           on Base               on Base

import { CSSProperties, ReactNode } from "react";

export interface RouteHop {
  /** Token ticker at this point in the route. */
  ticker: string;
  /** Optional token logo node. */
  logo?: ReactNode;
  /** Chain context for this hop. */
  chainName?: string;
  /** Optional chain accent color (drives dot color). */
  chainColor?: string;
  /** Label for the segment going OUT of this hop (DEX / bridge / etc).
   *  Omit on the last hop. */
  via?: string;
  /** Optional venue type for tighter visual hierarchy. */
  venueType?: "DEX" | "BRIDGE" | "RAIL" | "AMM";
}

interface RouteVisualizationProps {
  hops: RouteHop[];
  /** Add the moving pulse animation along the route. */
  animated?: boolean;
  /** Compact rendering — smaller type, tighter spacing. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function RouteVisualization({
  hops,
  animated = true,
  compact = false,
  className = "",
  style = {},
}: RouteVisualizationProps) {
  if (hops.length === 0) return null;

  return (
    <div
      className={`empx-route-viz ${className}`}
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      {/* Track row — dots + horizontal lines + segment labels */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${hops.length}, 1fr)`,
          alignItems: "center",
          marginBottom: compact ? 8 : 12,
        }}
      >
        {hops.map((hop, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: compact ? 12 : 14,
            }}
          >
            {/* Hop dot */}
            <span
              style={{
                position: "relative",
                zIndex: 2,
                width: compact ? 10 : 12,
                height: compact ? 10 : 12,
                borderRadius: "50%",
                background: hop.chainColor || "#FF8A00",
                boxShadow: `0 0 12px ${hop.chainColor || "#FF8A00"}88`,
                border: "2px solid #05050c",
              }}
            />

            {/* Connecting line LEFT (except first dot) */}
            {i > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: "50%",
                  top: "50%",
                  height: 1,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,138,0,0.45) 100%)",
                  zIndex: 1,
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {/* Connecting line RIGHT (except last dot) */}
            {i < hops.length - 1 && (
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  right: 0,
                  top: "50%",
                  height: 1,
                  background:
                    "linear-gradient(90deg, rgba(255,138,0,0.45) 0%, rgba(255,255,255,0.06) 100%)",
                  zIndex: 1,
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {/* Segment label rendered BELOW the line, anchored to the right
               half of the current hop + left half of the next hop */}
            {hop.via && i < hops.length - 1 && (
              <span
                style={{
                  position: "absolute",
                  top: compact ? 16 : 20,
                  left: "50%",
                  width: "200%",
                  transform: "translateX(0)",
                  textAlign: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: compact ? 9 : 10,
                  letterSpacing: "0.20em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  pointerEvents: "none",
                }}
                title={hop.via}
              >
                <span style={{ color: "#FF8A00", marginRight: 6 }}>via</span>
                {hop.via}
              </span>
            )}
          </div>
        ))}

        {/* Animated pulse dot traveling along the route */}
        {animated && hops.length >= 2 && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#FF8A00",
              boxShadow: "0 0 16px #FF8A00, 0 0 32px rgba(255,138,0,0.5)",
              transform: "translate(-50%, -50%)",
              animation: "empxRoutePulse 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
              zIndex: 3,
            }}
          />
        )}
      </div>

      {/* Hop info row — labels below dots */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${hops.length}, 1fr)`,
          gap: 8,
          paddingTop: compact ? 12 : 18,
        }}
      >
        {hops.map((hop, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              minWidth: 0,
            }}
          >
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize: compact ? 13 : 15,
                color: "#FFFFFF",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {hop.ticker}
            </p>
            {hop.chainName && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 9,
                  color: hop.chainColor || "rgba(255,255,255,0.45)",
                  margin: "3px 0 0",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                }}
              >
                on {hop.chainName}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Inline keyframes for the route pulse */}
      <style>{`
        @keyframes empxRoutePulse {
          0%   { left: 8%; opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { left: 92%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
