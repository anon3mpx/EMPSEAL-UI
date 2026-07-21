// ─── Swap widget display config ──────────────────────────────────────────────
//
// Default appearance + behaviour flags consumed by the <Emp> swap page when
// it runs in either the full dApp or in embedded widget mode.  Callers may
// override any subset; missing keys fall back to these defaults.
//
// Extracted from Emp.jsx as part of M7.

export type SwapDisplayConfig = {
  /** When true, renders the swap in widget-embed mode (compact + themable). */
  isWidgetMode: boolean;
  /** Currently only "dark" is implemented; reserved for future theming. */
  theme: "dark" | "light";
  /** Hex string (with leading `#`) used for primary accent + button fills. */
  primaryColor: string;
  /** Page background hex (with `#`). */
  background: string;
  /** Border colour for the widget frame. */
  borderColor: string;
  /** Hide the dark frame background when embedded into a light host. */
  showBackground: boolean;
  /** Allow the user to tweak slippage tolerance in widget mode. */
  showSlippage: boolean;
  /** Show the "powered by EmpX" attribution.  Defaults off in widget. */
  showPoweredBy: boolean;
};

export const defaultDisplayConfig: SwapDisplayConfig = {
  isWidgetMode: false,
  theme: "dark",
  primaryColor: "#FF8A00",
  background: "#000000",
  borderColor: "#FF8A00",
  showBackground: true,
  showSlippage: true,
  showPoweredBy: true,
};
