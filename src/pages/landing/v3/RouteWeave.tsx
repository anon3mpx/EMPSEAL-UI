// ─── RouteWeave — ambient route-drawing background (anime.js) ──────────────
//
// Chain nodes connected by stroke-drawn paths that draw in, hold, then
// redraw — a literal, decorative rendering of "one route, drawn in real
// time." Sits low-opacity behind the hero text; purely ambient, no data
// binding (positions are an aesthetic composition, not live routing data —
// see MechanicalEngineSection for the version wired to real chains).

import { useEffect, useRef } from "react";
import { animate, createDrawable, stagger } from "animejs";

const NODES = [
  { x: 90,  y: 90 },
  { x: 340, y: 60 },
  { x: 520, y: 200 },
  { x: 260, y: 280 },
  { x: 60,  y: 260 },
  { x: 470, y: 340 },
];

const ROUTES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 3], [2, 5], [3, 5],
];

function pathFor(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - 26;
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
}

export default function RouteWeave({ className = "" }: { className?: string }) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];
    const nodes = nodeRefs.current.filter(Boolean) as SVGCircleElement[];
    if (!paths.length) return;

    const drawables = createDrawable(paths);
    const anim = animate(drawables, {
      draw: ["0 0", "0 1", "1 1"],
      duration: 3200,
      delay: stagger(420, { start: 200 }),
      ease: "inOutQuad",
      loop: true,
      loopDelay: 600,
    });

    const pulse = animate(nodes, {
      scale: [1, 1.35, 1],
      opacity: [0.55, 1, 0.55],
      duration: 1600,
      delay: stagger(260),
      ease: "inOutSine",
      loop: true,
    });

    return () => {
      anim.pause();
      pulse.pause();
    };
  }, []);

  return (
    <svg
      viewBox="0 0 580 400"
      className={className}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      {ROUTES.map(([a, b], i) => (
        <path
          key={i}
          ref={(el) => { pathRefs.current[i] = el; }}
          d={pathFor(NODES[a], NODES[b])}
          fill="none"
          stroke="#FF8A00"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.8"
        />
      ))}
      {NODES.map((n, i) => (
        <circle
          key={i}
          ref={(el) => { nodeRefs.current[i] = el; }}
          cx={n.x}
          cy={n.y}
          r={i === 0 || i === 2 ? 5 : 3.5}
          fill="#FFB347"
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
    </svg>
  );
}
