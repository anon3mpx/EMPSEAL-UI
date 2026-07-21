// ─── EmpX dApp Design Tokens ─────────────────────────────────────────────────
//
// Single source of truth for all dApp surface design tokens.  Reuses the
// existing CSS variables from src/styles/global.scss where applicable.
//
// Aesthetic principle: minimal sleek dark surfaces with a single saturated
// brand orange.  Big readable numbers.  Subtle hierarchy.  Glass on
// glass, never noise on noise.

export const tokens = {
  // ─── Colors ────────────────────────────────────────────────────────────────
  color: {
    bg: "#05050c",
    bgRaised: "#0A0A14",
    bgSurface: "#0D0D17",
    bgGlass: "rgba(255,255,255,0.025)",
    bgGlassStrong: "rgba(255,255,255,0.045)",

    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",
    borderAccent: "rgba(255,138,0,0.30)",
    borderAccentStrong: "rgba(255,138,0,0.50)",

    text: "#FFFFFF",
    textPrimary: "rgba(255,255,255,0.92)",
    textSecondary: "rgba(255,255,255,0.62)",
    textMuted: "rgba(255,255,255,0.40)",
    textFaint: "rgba(255,255,255,0.28)",
    textGhost: "rgba(255,255,255,0.15)",

    orange: "#FF8A00",
    orangeBright: "#FFB347",
    orangeDim: "#994F00",
    orangeFaint: "rgba(255,138,0,0.12)",

    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#60A5FA",
  },

  // ─── Shadows / Glows ───────────────────────────────────────────────────────
  shadow: {
    none: "none",
    soft: "0 6px 24px rgba(0,0,0,0.30)",
    raised: "0 18px 60px rgba(0,0,0,0.45)",
    glow: "0 0 40px rgba(255,138,0,0.30), 0 0 80px rgba(255,138,0,0.10)",
    glowStrong: "0 0 60px rgba(255,138,0,0.45), 0 0 120px rgba(255,138,0,0.15)",
    inset: "inset 0 1px 0 rgba(255,255,255,0.05)",
  },

  // ─── Radius ────────────────────────────────────────────────────────────────
  radius: {
    xs: "3px",
    sm: "4px",
    md: "6px",
    lg: "10px",
    xl: "14px",
    pill: "999px",
  },

  // ─── Spacing scale (rem) ──────────────────────────────────────────────────
  space: {
    px: "1px",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
  },

  // ─── Typography ────────────────────────────────────────────────────────────
  font: {
    display: "'Space Grotesk', sans-serif",
    serif: "'Instrument Serif', serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  // Size scale tuned for dApp readability
  fontSize: {
    micro: "10px",       // labels, eyebrows
    tiny: "11px",        // captions
    xs: "12px",          // metadata
    sm: "13px",          // dense info
    base: "14px",        // body
    md: "16px",          // emphasis body
    lg: "18px",          // small headers
    xl: "22px",          // section header
    "2xl": "28px",       // small display
    "3xl": "36px",       // mid display
    "4xl": "48px",       // big display
    "5xl": "64px",       // hero display
    "6xl": "84px",       // monumental
  },

  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  letterSpacing: {
    tight: "-0.04em",
    tighter: "-0.02em",
    normal: "0em",
    wide: "0.18em",
    wider: "0.28em",
    widest: "0.40em",
  },

  // ─── Motion ────────────────────────────────────────────────────────────────
  duration: {
    instant: "120ms",
    quick: "180ms",
    smooth: "260ms",
    slow: "420ms",
    cinema: "680ms",
  },

  easing: {
    out: "cubic-bezier(0.22, 1, 0.36, 1)",
    inOut: "cubic-bezier(0.42, 0, 0.58, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  // ─── Common composed values ────────────────────────────────────────────────
  surface: {
    card: {
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "6px",
      backdropFilter: "blur(20px)",
    },
    cardHover: {
      background: "rgba(255,255,255,0.045)",
      border: "1px solid rgba(255,138,0,0.30)",
    },
    cardActive: {
      background: "linear-gradient(135deg, rgba(255,138,0,0.06) 0%, transparent 100%)",
      border: "1px solid rgba(255,138,0,0.50)",
      boxShadow: "0 0 40px rgba(255,138,0,0.15)",
    },
  },
} as const;

// Type-safe color access helper
export type EmpxColor = keyof typeof tokens.color;
export type EmpxFontSize = keyof typeof tokens.fontSize;
