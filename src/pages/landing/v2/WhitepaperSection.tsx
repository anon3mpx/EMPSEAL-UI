// ─── Whitepaper teaser ───────────────────────────────────────────────────────

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import MagneticButton from "./MagneticButton";

const CHAPTERS = [
  "I.   Why DeFi needs a framework layer",
  "II.  The RailSolver abstraction",
  "III. Pair-type fee classification",
  "IV.  The intent lifecycle",
  "V.   Integrator economics",
  "VI.  AI-agent integration",
  "VII. Three-layer architecture",
  "VIII.Roadmap",
];

export default function WhitepaperSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section
      ref={ref}
      className="relative w-full py-32 md:py-48 px-6 md:px-12 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Parallax orange wash background */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          y: bgY,
          background:
            "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(255,138,0,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto z-10 grid md:grid-cols-12 gap-8 items-center">
        {/* Header — editorial */}
        <div className="md:col-span-7">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-6 md:mb-10"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            READ THE THESIS
          </p>
          <h2
            className="text-white leading-[1.0] mb-10 max-w-3xl"
            style={{
              fontSize: "clamp(36px, 5.8vw, 92px)",
              letterSpacing: "-0.025em",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 300,
            }}
          >
            The framework
            <br />
            layer{" "}
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 60px rgba(255,138,0,0.4)",
              }}
            >
              for multi-chain DeFi.
            </span>
          </h2>
          <p
            className="text-white/60 text-base md:text-lg leading-relaxed max-w-xl mb-10"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Twelve rails. Pair-type pricing. AI-agent native. Read the case
            for why this stack wins the next decade of cross-chain
            settlement.
          </p>
          <MagneticButton href="#whitepaper" variant="primary" size="large">
            Download whitepaper ↓
          </MagneticButton>
        </div>

        {/* Table of contents — right */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-5 border-l border-white/10 pl-8 md:pl-10 py-2"
        >
          <p
            className="text-[10px] uppercase text-white/40 mb-6"
            style={{ letterSpacing: "0.35em" }}
          >
            CHAPTERS
          </p>
          <ul className="space-y-3">
            {CHAPTERS.map((c, i) => (
              <li
                key={i}
                className="text-white/70 text-sm md:text-base"
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {c}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
