// ─── Foundation (00, rewritten) ──────────────────────────────────────────
//
// v2 of this section still centered its copy on the logo itself ("the mark
// draws the architecture") — a cute idea nobody visiting the page actually
// cares about. The mark stays as the visual (it's genuinely strong), but
// the copy now leads with what EmpX actually is. The 3-layer architecture
// facts are demoted to a smaller supporting strip, not the headline.

import { useInView } from "framer-motion";
import { useRef } from "react";
import { BrandMarkSlabs } from "./BrandMarkReal";

const LAYERS = [
  { word: "Contracts", accent: "never change.", body: "Immutable settlement base, deployed once per chain." },
  { word: "Rails",      accent: "quote and settle.", body: "The VPS engine — routes across 31 chains, live." },
  { word: "SDK",        accent: "ships daily.", body: "What agents and users actually touch." },
];

export default function BrandSystemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section id="foundation" ref={ref} className="relative w-full py-32 md:py-48 px-6 md:px-12 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="shear-chip" />
          <p className="text-[11px] uppercase text-[#FFB347]" style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}>
            00 — What EmpX is
          </p>
        </div>

        {/* The mark — big, unboxed, glowing directly on the Aurora field */}
        <div className="relative flex items-center justify-center mb-4" style={{ minHeight: 320 }}>
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(closest-side, rgba(255,138,0,0.22), transparent 70%)", filter: "blur(40px)" }}
            aria-hidden
          />
          <BrandMarkSlabs
            width={420}
            className="relative drop-shadow-[0_0_60px_rgba(255,138,0,0.35)]"
            slabClassName={() => (inView ? "slab-anim" : "")}
            slabStyle={(i) => ({ animationDelay: `${0.15 + i * 0.22}s` })}
          />
        </div>

        <h2
          className="text-white font-light leading-[1.02] mb-8"
          style={{ fontSize: "clamp(30px, 4.2vw, 56px)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
        >
          One integration.{" "}
          <span className="italic" style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00", textShadow: "0 0 60px rgba(255,138,0,0.4)" }}>
            Every chain, every rail.
          </span>
        </h2>
        <p
          className="text-white/55 text-[15px] md:text-lg leading-relaxed max-w-2xl mx-auto mb-16"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          EmpX is cross-chain intent-settlement infrastructure — swap, bridge, and automate
          across 31 chains through one SDK. Say what you want moved and where; EmpX picks the
          rail, settles it, and never touches custody in between. The same stack runs underneath
          wallets, protocols, AI agents, and treasuries that don't want to build chain-specific
          plumbing themselves.
        </p>

        {/* Architecture, as supporting detail — not the headline */}
        <p
          className="text-[10px] uppercase text-white/35 mb-6"
          style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}
        >
          Built as three independent layers
        </p>
        <div className="grid md:grid-cols-3 gap-10 md:gap-8 text-left max-w-5xl mx-auto">
          {LAYERS.map((l) => (
            <div key={l.word}>
              <p
                className="font-light leading-[1.05] mb-3"
                style={{ fontSize: "clamp(26px, 3vw, 38px)", fontFamily: "'Space Grotesk', sans-serif", color: "#fff", letterSpacing: "-0.02em" }}
              >
                {l.word}{" "}
                <span className="italic" style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00" }}>
                  {l.accent}
                </span>
              </p>
              <p className="text-white/50 text-[14px] leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                {l.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
