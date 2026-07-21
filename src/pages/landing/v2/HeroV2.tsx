// ─── Hero v2.1 — editorial typography mix ────────────────────────────────────
//
// Asymmetric, magazine-style layout mixing:
//   - Display serif italic (Instrument Serif) for hero word
//   - Compressed bold sans (Space Grotesk) for emphasis
//   - Wide-tracked uppercase labels (Inter) for eyebrows
//   - Mid-size caption type for the supporting voice
//
// Layout: stacks at mobile, asymmetric grid at md+.
// Cursor-reveal centered around the giant hero word.

import { motion } from "framer-motion";
import CursorReveal from "./CursorReveal";
import MagneticButton from "./MagneticButton";

const RAIL_NAMES = [
  "CCTP", "CCTP FAST", "AXELAR", "LAYERZERO", "WORMHOLE", "VIA LABS",
  "GAS.ZIP", "THORCHAIN", "CHAINFLIP", "MAYA", "TELESWAP", "HYPERLANE NEXUS",
];

export default function HeroV2() {
  // Editorial copy lines shared by both layers — single source of truth.
  // Asymmetric magazine layout, but with consistent grid + baseline rules.
  const HERO_META = [
    { eyebrow: "PRICING",     line: "Pair-type fees · 9 bps stables" },
    { eyebrow: "ROUTING",     line: "12 rails · single quote surface" },
    { eyebrow: "CONTRACTS",   line: "Immutable · 15 chains live" },
    { eyebrow: "SDK",         line: "TypeScript · AI-agent native" },
    { eyebrow: "REVENUE",     line: "10 · 25 · 50% affiliate share" },
    { eyebrow: "INTEGRATION", line: "Free · only cost is your RPC" },
  ];

  // Display-text sizing.  ALL three display rows share one scale so vertical
  // rhythm is predictable.  Italic accents = ~38% of display size.
  const DISPLAY_FS = "clamp(56px, 9vw, 152px)";
  const ACCENT_FS  = "clamp(22px, 3.4vw, 58px)";

  const makeContent = (accent: boolean) => {
    const muted   = accent ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)";
    const accentC = accent ? "#FF8A00" : "rgba(255,255,255,0.15)";
    const eyebrow = accent ? "#FF8A00" : "rgba(255,255,255,0.25)";
    const shadow  = accent ? "0 0 80px rgba(255,138,0,0.45), 0 0 160px rgba(255,138,0,0.12)" : "none";

    return (
      <div className="relative w-full min-h-[100vh] min-h-[100svh] flex flex-col justify-center px-6 sm:px-10 md:px-16 py-28 select-none">
        <div className="max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-x-6 md:gap-x-8 items-start">

          {/* Eyebrow row — single line, both sides share the SAME baseline */}
          <div className="col-span-12 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 sm:gap-6 mb-10 md:mb-16">
            <p
              className="text-[10px] md:text-[11px] font-medium uppercase"
              style={{ letterSpacing: "0.40em", color: eyebrow, fontFamily: "Inter, sans-serif" }}
            >
              EMPX · MULTI-CHAIN DEFI
            </p>
            <p
              className="text-[9px] md:text-[10px] font-medium uppercase sm:text-right"
              style={{ letterSpacing: "0.35em", color: eyebrow, fontFamily: "Inter, sans-serif" }}
            >
              THE TRADING FRAMEWORK LAYER
            </p>
          </div>

          {/* Display block — three lines, each on a baseline-aligned flex row.
              No negative margins; gap-y controls vertical rhythm. */}
          <div className="col-span-12 flex flex-col gap-y-2 md:gap-y-3">
            {/* Row 1: Twelve · cross-chain rails */}
            <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-8">
              <p
                className="font-light"
                style={{
                  fontSize: DISPLAY_FS,
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: muted,
                  textShadow: shadow,
                }}
              >
                Twelve
              </p>
              <p
                className="italic"
                style={{
                  fontSize: ACCENT_FS,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  fontFamily: "'Instrument Serif', serif",
                  color: accentC,
                }}
              >
                cross-chain rails,
              </p>
            </div>

            {/* Row 2: fifteen chains (italic serif + sans companion, baseline-aligned) */}
            <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-6">
              <p
                className="italic"
                style={{
                  fontSize: DISPLAY_FS,
                  lineHeight: 0.95,
                  letterSpacing: "-0.025em",
                  fontFamily: "'Instrument Serif', serif",
                  color: accentC,
                  textShadow: shadow,
                }}
              >
                fifteen
              </p>
              <p
                className="font-light"
                style={{
                  fontSize: ACCENT_FS,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: muted,
                }}
              >
                chains,
              </p>
            </div>

            {/* Row 3: One · settlement layer */}
            <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-8">
              <p
                className="font-light"
                style={{
                  fontSize: DISPLAY_FS,
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: muted,
                  textShadow: shadow,
                }}
              >
                One
              </p>
              <p
                className="italic"
                style={{
                  fontSize: ACCENT_FS,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  fontFamily: "'Instrument Serif', serif",
                  color: accentC,
                }}
              >
                settlement layer.
              </p>
            </div>
          </div>

          {/* CTAs — placed in normal flow so they don't overlap meta grid */}
          <div className="col-span-12 mt-10 md:mt-14 flex flex-col sm:flex-row gap-3 sm:gap-5 items-start sm:items-center">
            <MagneticButton href="/portfolio-v2" variant="primary" size="large">
              Launch app →
            </MagneticButton>
            <MagneticButton href="https://docs.empx.network" variant="secondary" size="large">
              Read the docs
            </MagneticButton>
          </div>

          {/* Footer block — meta accents (left, 7 cols) + italic tagline (right, 5 cols).
              Both share the same top margin so the row visually starts on one line. */}
          <div className="col-span-12 md:col-span-7 mt-10 md:mt-14 grid grid-cols-2 gap-y-4 gap-x-6">
            {HERO_META.map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p
                  className="text-[8.5px] md:text-[9px] uppercase"
                  style={{ letterSpacing: "0.35em", color: eyebrow, fontFamily: "Inter, sans-serif" }}
                >
                  {m.eyebrow}
                </p>
                <p
                  className="text-[11px] md:text-[12px] font-light"
                  style={{
                    color: accent ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {m.line}
                </p>
              </div>
            ))}
          </div>

          <div className="col-span-12 md:col-span-5 mt-6 md:mt-14 md:text-right md:pl-6">
            <p
              className="italic leading-[1.35] max-w-md md:ml-auto"
              style={{
                fontSize: "clamp(15px, 1.4vw, 20px)",
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: "-0.005em",
                color: accent ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.30)",
              }}
            >
              Built for the protocols, agents, and treasuries that route capital — not the wallets that hold it.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const baseLayer   = makeContent(false);
  const revealLayer = makeContent(true);

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Ambient lights — bigger, more dramatic */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 120%, rgba(255,138,0,0.18) 0%, transparent 60%), radial-gradient(ellipse 100% 50% at 50% -20%, rgba(255,138,0,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Grid texture — finer + more visible */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      {/* Cursor reveal */}
      <CursorReveal
        baseLayer={baseLayer}
        revealLayer={revealLayer}
        radius={300}
        feather={140}
      />

      {/* Rail marquee — bigger, more present */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none border-t border-white/8"
      >
        <div className="overflow-hidden h-14 md:h-16 flex items-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="flex animate-marquee whitespace-nowrap">
            {[...RAIL_NAMES, ...RAIL_NAMES, ...RAIL_NAMES].map((name, i) => (
              <span
                key={i}
                className="text-[11px] md:text-[12px] uppercase mx-10 md:mx-14"
                style={{
                  letterSpacing: "0.4em",
                  fontFamily: "Inter, sans-serif",
                  color: i % 12 === 0 ? "#FF8A00" : "rgba(255,255,255,0.35)",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
