// ─── Breakpoints — 12 device target widths ─────────────────────────────────
//
// Covers every consumer device shape from small phones to 4K monitors. Used
// by:
//   • useBreakpoint() hook for JS-level responsive logic
//   • CSS media queries injected via styled spans
//   • Tailwind arbitrary-value classes
//
// Naming follows the user's request for "at least 10 different breakpoints".

import { useEffect, useState } from "react";

export const breakpoints = {
  xxs:   320,  // smallest phones (iPhone SE 1st gen)
  xs:    380,  // standard small phones
  sm:    480,  // large phones portrait
  md:    640,  // phones landscape / very small tablets
  lg:    768,  // tablets portrait
  xl:    900,  // tablets landscape / small laptops
  "2xl": 1024, // laptops
  "3xl": 1200, // standard desktops
  "4xl": 1440, // large desktops
  "5xl": 1600, // extra-large desktops
  "6xl": 1920, // full HD+
  "7xl": 2560, // 4K monitors
} as const;

export type BreakpointKey = keyof typeof breakpoints;

// ─── Media query strings ─────────────────────────────────────────────────

export const mq = {
  up: (k: BreakpointKey) => `@media (min-width: ${breakpoints[k]}px)`,
  down: (k: BreakpointKey) => `@media (max-width: ${breakpoints[k] - 1}px)`,
  between: (a: BreakpointKey, b: BreakpointKey) =>
    `@media (min-width: ${breakpoints[a]}px) and (max-width: ${breakpoints[b] - 1}px)`,
} as const;

// ─── useBreakpoint hook ──────────────────────────────────────────────────

/**
 * Returns the current breakpoint key based on window.innerWidth.
 * Server-safe: returns "lg" when window is undefined.
 * Re-renders only when the breakpoint changes (not on every resize).
 */
export function useBreakpoint(): BreakpointKey {
  const [bp, setBp] = useState<BreakpointKey>(() => getBreakpointFor(typeof window === "undefined" ? 768 : window.innerWidth));

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame: number | null = null;
    const handler = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const next = getBreakpointFor(window.innerWidth);
        setBp((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("resize", handler, { passive: true });
    handler();
    return () => {
      window.removeEventListener("resize", handler);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return bp;
}

function getBreakpointFor(width: number): BreakpointKey {
  const keys = Object.entries(breakpoints) as Array<[BreakpointKey, number]>;
  // Iterate descending — return the largest key whose threshold <= width
  for (let i = keys.length - 1; i >= 0; i--) {
    if (width >= keys[i][1]) return keys[i][0];
  }
  return "xxs";
}

/** Convenience: returns true at or above the given breakpoint. */
export function useMediaQuery(min: BreakpointKey): boolean {
  const current = useBreakpoint();
  return breakpoints[current] >= breakpoints[min];
}

/** Truthy when the viewport is at or below md (i.e. phones/small tablets). */
export function useIsMobile(): boolean {
  return !useMediaQuery("lg");
}
