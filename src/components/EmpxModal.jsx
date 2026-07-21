// ─── <EmpxModal> ──────────────────────────────────────────────────────────────
//
// EMPX-themed wrapper around Radix Dialog primitives.  Closes UI-UX-AUDIT-v2
// C3: every modal in the app should give users
//
//   • Escape-to-close                  (keyboard accessibility)
//   • Outside-click to close           (mouse expectation)
//   • Body-scroll lock when open       (prevents background scroll-bleed)
//   • Focus trap                       (tab cycles within modal)
//   • Focus restoration on close       (returns to trigger element)
//   • Proper ARIA: role="dialog", aria-modal, labelled-by
//
// Radix gives ALL of those for free; the hand-rolled `<div className="fixed
// inset-0">` modals in the codebase had ZERO of them.
//
// Aesthetic: matches the existing orange/black terminal style — uses the
// project's `clip-bg` utility (defined in App.css/index.css) for the panel
// background, NOT shadcn's bg-background/bg-accent tokens.
//
// Usage:
//
//   const [open, setOpen] = useState(false);
//
//   <EmpxModal
//     open={open}
//     onOpenChange={setOpen}
//     title="Connect Wallet"
//     icon={<img src={logo} className="w-8 h-8" />}
//     maxWidth="560"            // px; or "full" for max-w-full
//   >
//     {/* modal content */}
//   </EmpxModal>
//
// Triggers: use Radix-controlled open state — `open={state} onOpenChange={fn}`.
// No DialogTrigger needed; this matches the existing hand-rolled pattern.

import * as DialogPrimitive from "@radix-ui/react-dialog";

const MAX_WIDTH_MAP = {
  "320": "md:max-w-[320px]",
  "400": "md:max-w-[400px]",
  "480": "md:max-w-[480px]",
  "560": "md:max-w-[560px]",
  "640": "md:max-w-[640px]",
  "720": "md:max-w-[720px]",
  full: "max-w-full",
};

export default function EmpxModal({
  open,
  onOpenChange,
  title,
  icon = null,
  children,
  maxWidth = "560",
  /** Hide the close (X) button when true.  Use for confirmation modals
   *  where the user MUST pick a button (rare; default is to show it). */
  hideClose = false,
  /** Extra classes for the content panel. */
  className = "",
}) {
  const widthClass = MAX_WIDTH_MAP[maxWidth] ?? MAX_WIDTH_MAP["560"];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-[10000] w-full ${widthClass}
                      -translate-x-1/2 -translate-y-1/2 px-4
                      data-[state=open]:animate-in data-[state=closed]:animate-out
                      data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
                      data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
                      focus:outline-none ${className}`}
          aria-describedby={undefined}
        >
          <div className="relative text-white p-4 rounded-2xl clip-bg">
            {(title || icon || !hideClose) && (
              <div className="flex justify-between gap-2 items-center px-4 pb-2">
                <DialogPrimitive.Title asChild>
                  <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-2 items-center">
                    {icon}
                    {title}
                  </h2>
                </DialogPrimitive.Title>
                {!hideClose && (
                  <DialogPrimitive.Close
                    className="close-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] focus-visible:outline-offset-2"
                    aria-label="Close"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </DialogPrimitive.Close>
                )}
              </div>
            )}
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
