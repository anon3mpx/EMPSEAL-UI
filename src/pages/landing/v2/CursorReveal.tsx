// ─────────────────────────────────────────────────────────────────────────────
// CursorReveal — hero-reveal cursor that unmasks content beneath.
//
// Two layers stack:
//   1. The "base" layer (the muted, default state — soft white type)
//   2. The "reveal" layer (the bright orange branded state)
//
// A radial gradient mask follows the mouse position on the reveal layer.
// Inside the cursor's radius, the reveal layer is visible — the brand
// color, the bright type, the glow.  Outside the radius, the base layer
// shows through.  The result: the cursor is a spotlight that illuminates
// the EmpX brand wherever it travels.
//
// Implementation:
//   - useRef + a mousemove listener (rAF-throttled)
//   - CSS variables --reveal-x, --reveal-y drive the radial-gradient
//     mask position in real time
//   - Disabled on touch devices (no cursor); falls back to fully-revealed
//
// Why CSS-mask vs canvas:
//   - 60fps without GPU pressure
//   - Reads naturally on Hi-DPI displays
//   - Works through nested elements without z-index gymnastics
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

interface CursorRevealProps {
  /** Base content (muted, default-state) — shown outside the cursor radius. */
  baseLayer: React.ReactNode;
  /** Reveal content (bright, branded) — shown inside the cursor radius. */
  revealLayer: React.ReactNode;
  /** Radius in pixels of the reveal spotlight. */
  radius?: number;
  /** Soft falloff in pixels around the spotlight edge. */
  feather?: number;
  /** Container className passthrough. */
  className?: string;
}

export default function CursorReveal({
  baseLayer,
  revealLayer,
  radius = 220,
  feather = 80,
  className = "",
}: CursorRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(false);

  // Touch device check — coarse pointer means no hover/cursor.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;
    const container = containerRef.current;
    const reveal = revealRef.current;
    if (!container || !reveal) return;

    function flush() {
      rafRef.current = null;
      if (!pending.current || !reveal) return;
      const { x, y } = pending.current;
      reveal.style.setProperty("--reveal-x", `${x}px`);
      reveal.style.setProperty("--reveal-y", `${y}px`);
      pending.current = null;
    }

    function onMove(e: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      pending.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    }

    function onEnter() {
      setActive(true);
    }
    function onLeave() {
      setActive(false);
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isTouchDevice]);

  // Touch fallback — show reveal layer fully (no cursor to track).
  if (isTouchDevice) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {revealLayer}
      </div>
    );
  }

  // Mask CSS — gradient is centered at --reveal-x/--reveal-y, transparent
  // inside radius, opaque outside.  The reveal layer is masked OUT outside
  // the radius (alpha 0 outside, alpha 1 inside).
  const maskValue = `radial-gradient(circle ${radius}px at var(--reveal-x, -9999px) var(--reveal-y, -9999px), #000 0%, #000 ${
    radius - feather
  }px, transparent ${radius}px)`;

  return (
    <div
      ref={containerRef}
      className={`relative cursor-none ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* Base layer — always visible underneath */}
      <div className="relative z-0">{baseLayer}</div>

      {/* Reveal layer — masked to only show inside cursor spotlight */}
      <div
        ref={revealRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          WebkitMask: maskValue,
          mask: maskValue,
          opacity: active ? 1 : 0,
          transition: "opacity 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {revealLayer}
      </div>

      {/* Custom cursor — orange glow blob at the spotlight center */}
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: "var(--reveal-x, -9999px)",
          top: "var(--reveal-y, -9999px)",
          transform: "translate(-50%, -50%)",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,138,0,0.95) 0%, rgba(255,138,0,0.0) 70%)",
          mixBlendMode: "screen",
          opacity: active ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
        aria-hidden
      />
    </div>
  );
}
