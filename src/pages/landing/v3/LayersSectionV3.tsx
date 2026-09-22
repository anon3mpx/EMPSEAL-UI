// ─── Layers v3 (idea 04 — Motion UI-style section upgrade) ─────────────────
//
// Same content as v2's LayersSection (imported, not duplicated), restyled:
//   - a real connecting spine between the 3 cards — the "stack" is drawn,
//     not just implied by stacking divs
//   - mouse-tracked glare per card (same CSS-mask spotlight technique as
//     CursorReveal, applied at card scale) instead of a flat hover border
// This is the "upgrade the library you already ship" idea: same Framer
// Motion primitives already in package.json, no new dependency — the
// improvement is entirely in craft, not new tooling.

import { motion } from "framer-motion";
import { useRef } from "react";
import { LAYERS, type Layer } from "../v2/LayersSection";

export default function LayersSectionV3() {
  return (
    <section className="relative w-full py-28 md:py-40 px-6 md:px-16 overflow-hidden" style={{ background: "#05050c" }}>
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,138,0,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-[1400px] mx-auto z-10">
        <div className="mb-14 md:mb-20 max-w-4xl">
          <div className="flex items-center gap-2 mb-5">
            <span className="shear-chip" />
            <p className="text-[11px] uppercase text-[#FFB347]" style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}>
              04 — Architecture
            </p>
          </div>
          <h2
            className="text-white font-light leading-[0.98]"
            style={{ fontSize: "clamp(34px, 5.5vw, 84px)", letterSpacing: "-0.025em", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Three layers.{" "}
            <span className="italic" style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00", textShadow: "0 0 50px rgba(255,138,0,0.3)" }}>
              Different lifetimes.
            </span>
          </h2>
          <p className="mt-6 md:mt-8 text-white/55 text-base md:text-lg leading-relaxed max-w-3xl" style={{ fontFamily: "Inter, sans-serif" }}>
            Contracts are immutable on-chain infrastructure. SDKs are versioned npm packages. The
            UI ships continuously. Each layer can be audited, forked, or self-hosted independently.
          </p>
        </div>

        {/* Spine + cards */}
        <div className="relative">
          <div
            className="hidden lg:block absolute left-[38px] top-[52px] bottom-[52px] w-px"
            style={{ background: "linear-gradient(180deg, rgba(255,138,0,0.5), rgba(255,138,0,0.08))" }}
            aria-hidden
          />
          <div className="flex flex-col gap-4 md:gap-5">
            {LAYERS.map((layer, i) => (
              <LayerCardV3 key={layer.number} layer={layer} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-14 md:mt-20 grid md:grid-cols-3 gap-6 md:gap-10 border-t border-white/10 pt-10 md:pt-14">
          {[
            { tag: "VERIFIABLE", title: "Audit any layer independently", body: "Contracts are on-chain and bytecode-verified. SDKs are open-source on npm. UI source is on GitHub. Nothing hidden, nothing custodial." },
            { tag: "FORKABLE", title: "Self-host the whole stack", body: "Clone the SDK, theme the UI, point at your own RPC. EmpX has no centralised dependency you can't replace. Three-layer means three exit ramps." },
            { tag: "STABLE", title: "Pin to a version, ship for years", body: "Semver-locked SDKs mean an integration written today still works tomorrow. Breaking changes happen at major versions only, with deprecation paths." },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <p className="text-[10px] uppercase mb-3" style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}>{card.tag}</p>
              <h3 className="text-white text-lg md:text-xl font-medium mb-3" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>{card.title}</h3>
              <p className="text-white/55 text-sm md:text-base leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LayerCardV3({ layer, index }: { layer: Layer; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glare-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--glare-y", `${e.clientY - rect.top}px`);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-start md:items-center gap-5 md:gap-8"
    >
      {/* spine node */}
      <div className="hidden lg:flex flex-shrink-0 w-[76px] items-center justify-center relative z-10">
        <div
          className="w-4 h-4"
          style={{
            background: "#05050c",
            border: "1.5px solid #FF8A00",
            clipPath: "polygon(32% 0,100% 0,68% 100%,0 100%)",
            boxShadow: "0 0 16px rgba(255,138,0,0.5)",
          }}
        />
      </div>

      <div
        ref={cardRef}
        onMouseMove={handleMove}
        className="group relative flex-1 border border-white/10 rounded-md transition-colors duration-500 hover:border-[#FF8A00]/35 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 70%)" }}
      >
        {/* mouse-tracked glare */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "radial-gradient(360px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,138,0,0.09), transparent 60%)",
          }}
        />

        <div className="relative p-5 md:p-7 grid md:grid-cols-12 gap-4 md:gap-8 items-center">
          <div className="md:col-span-4 lg:col-span-3 min-w-0 flex items-center gap-4">
            <p
              className="font-light leading-none flex-shrink-0"
              style={{ fontSize: "clamp(36px, 4vw, 72px)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.04em", color: "#FF8A00", textShadow: "0 0 24px rgba(255,138,0,0.3)" }}
            >
              {layer.number}
            </p>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] uppercase text-white/40" style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}>LAYER {layer.number}</p>
              <p className="text-[10px] md:text-[11px] uppercase mt-1.5" style={{ letterSpacing: "0.25em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}>{layer.qualifier}</p>
            </div>
          </div>

          <div className="md:col-span-6 lg:col-span-7 min-w-0">
            <h3
              className="text-white font-light leading-[1.05] mb-3"
              style={{ fontSize: "clamp(22px, 2.6vw, 36px)", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {layer.title}{" "}
              <span className="italic" style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00", letterSpacing: "-0.02em" }}>
                {layer.italic}
              </span>
            </h3>
            <p className="text-white/60 text-sm md:text-[15px] leading-relaxed mb-3" style={{ fontFamily: "Inter, sans-serif" }}>{layer.description}</p>
            <p className="text-[10px] uppercase text-white/35" style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}>
              <span className="text-white/50">INCLUDES · </span>
              {layer.includes.join(" · ")}
            </p>
          </div>

          <div className="md:col-span-2 min-w-0 md:text-right">
            <p className="font-light leading-none mb-1" style={{ fontSize: "clamp(28px, 3vw, 48px)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", color: "#FF8A00" }}>
              {layer.metric.value}
            </p>
            <p className="text-[9px] md:text-[10px] uppercase text-white/35" style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}>{layer.metric.label}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
