// ─── <TouchTooltip> ──────────────────────────────────────────────────────────
//
// Tap-friendly tooltip wrapper around Radix Tooltip primitives.  Closes
// UI-UX-AUDIT-v2 M5: hand-rolled hover-only tooltips were useless on
// touch devices (mobile / tablet had ~50% of dApp users with NO way to
// see tooltip content).
//
// Behaviour:
//   • Desktop hover → opens on mouseenter, closes on mouseleave (Radix default)
//   • Desktop focus → opens on tab-in for keyboard nav (built-in)
//   • Mobile tap   → opens; second tap or outside-tap closes (built-in)
//   • Escape       → closes (built-in)
//   • role='tooltip' + aria-describedby wiring (built-in)
//
// Aesthetic: matches the existing orange/black terminal tooltip pattern
// in Emp.jsx + similar (bg_swap_box utility).
//
// Usage:
//
//   <TouchTooltip content="The dollar value is fetched from a 3rd-party API…">
//     <button className="info-icon-trigger">
//       <Info className="w-4 h-4" />
//     </button>
//   </TouchTooltip>
//
//   OR with custom width / placement:
//
//   <TouchTooltip
//     content={<div>Multi-line tooltip body</div>}
//     side="top"
//     align="end"
//     maxWidth={300}
//   >
//     <span>?</span>
//   </TouchTooltip>

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export default function TouchTooltip({
  children,
  content,
  side = "bottom",
  align = "center",
  maxWidth = 260,
  /** Open delay in ms.  Default 150 (snappy on desktop hover; touch unaffected). */
  delayDuration = 150,
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={12}
            className="z-[10000] bg_swap_box px-3 py-3 text-center text-[11px] text-white
                       data-[state=delayed-open]:animate-in
                       data-[state=closed]:animate-out
                       data-[state=closed]:fade-out-0
                       data-[state=delayed-open]:fade-in-0
                       data-[state=closed]:zoom-out-95
                       data-[state=delayed-open]:zoom-in-95
                       focus:outline-none whitespace-pre-wrap"
            style={{ maxWidth }}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[#FF8A00]/30" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
