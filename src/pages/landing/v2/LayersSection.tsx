// ─── Layers — typographic three-tier architecture ──────────────────────────
//
// Replaces the SVG flow-diagram approach with a typographic stack of
// three labeled cards.  Each card represents one architectural layer
// (Contracts / SDKs / UI) with rich descriptive copy.  Visual hierarchy
// communicates "layered" without abstract bezier curves.
//
// SEO + LLM purpose: this section ranks for queries like
// "DeFi trading layer architecture", "immutable contracts patchable SDK
// deployable UI", "three-layer DeFi stack" — descriptive copy carries weight.

import { motion } from "framer-motion";

interface Layer {
  number: string;
  label: string;
  qualifier: string;
  title: string;
  italic: string;
  description: string;
  includes: string[];
  metric: { value: string; label: string };
}

const LAYERS: Layer[] = [
  {
    number: "03",
    label: "USER-FACING SURFACE",
    qualifier: "Continuously deployable",
    title: "The interface",
    italic: "ships daily.",
    description:
      "The web UI and embeddable widget — built in React, Tailwind, and wagmi v2. Theme-overridable, white-labelable, and forkable. Every interaction your user has with EmpX lives here, on a layer that updates without touching the SDK or contracts.",
    includes: ["empx.network", "@empx/widget React component", "iframe embed", "self-hosted UI fork", "wallet connectors"],
    metric: { value: "Daily", label: "RELEASE CADENCE" },
  },
  {
    number: "02",
    label: "PROGRAMMABLE SURFACE",
    qualifier: "Semver-versioned · additive",
    title: "The router",
    italic: "patches in place.",
    description:
      "Two TypeScript SDKs — empx-swap-sdk for same-chain aggregation, empx-cross-bridge for cross-chain routing. Wallet-agnostic, AI-agent ready, with tool schemas exported for OpenAI, Anthropic, and LangChain. Bug fixes ship as minor releases; integrators upgrade on their cadence.",
    includes: ["createRouter() · pair-type fees", "AsyncIterable intent lifecycle", "x402 RPC adapter", "burner wallet helpers", "AI-agent tool schemas"],
    metric: { value: "TS", label: "WALLET-AGNOSTIC SDK" },
  },
  {
    number: "01",
    label: "SETTLEMENT SURFACE",
    qualifier: "Immutable · audit-clean",
    title: "The contracts",
    italic: "never change.",
    description:
      "EmpsealRouter and per-chain rail plugins deployed once and frozen. The adapter registry is on-chain; adding a new DEX integration doesn't require a contract redeploy. Once you've audited a deployment, the assumptions hold for years. Trust comes from frozen, verifiable code.",
    includes: ["EmpsealRouter on 14 chains", "Mode A rail plugins", "DEX adapter registry on-chain", "MIN_FEE floor enforced", "no proxy upgrade pattern"],
    metric: { value: "0", label: "UPGRADES SHIPPED" },
  },
];

export default function LayersSection() {
  return (
    <section
      className="relative w-full py-28 md:py-40 px-6 md:px-16 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,138,0,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto z-10">
        {/* Header */}
        <div className="mb-14 md:mb-20 max-w-4xl">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-5 md:mb-7"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            ARCHITECTURE · BUILT TO LAST
          </p>
          <h2
            className="text-white font-light leading-[0.98]"
            style={{
              fontSize: "clamp(34px, 5.5vw, 84px)",
              letterSpacing: "-0.025em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Three layers.{" "}
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 50px rgba(255,138,0,0.3)",
              }}
            >
              Different lifetimes.
            </span>
          </h2>
          <p
            className="mt-6 md:mt-8 text-white/55 text-base md:text-lg leading-relaxed max-w-3xl"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            EmpX is built as three architectural surfaces that move at
            different speeds.  Contracts are immutable on-chain
            infrastructure.  SDKs are versioned npm packages.  The UI
            ships continuously.  Each layer can be audited, forked, or
            self-hosted independently — that&apos;s the trust trade-off
            we made on day one, and it&apos;s why integrators can build
            on EmpX without worrying about vendor lock.
          </p>
        </div>

        {/* Layered stack — top to bottom mirrors top-to-bottom of architecture */}
        <div className="flex flex-col gap-3 md:gap-4">
          {LAYERS.map((layer, i) => (
            <LayerCard key={layer.number} layer={layer} index={i} />
          ))}
        </div>

        {/* Trust callout strip */}
        <div className="mt-14 md:mt-20 grid md:grid-cols-3 gap-6 md:gap-10 border-t border-white/10 pt-10 md:pt-14">
          {[
            {
              tag: "VERIFIABLE",
              title: "Audit any layer independently",
              body: "Contracts are on-chain and bytecode-verified. SDKs are open-source on npm. UI source is on GitHub. Nothing hidden, nothing custodial.",
            },
            {
              tag: "FORKABLE",
              title: "Self-host the whole stack",
              body: "Clone the SDK, theme the UI, point at your own RPC. EmpX has no centralised dependency you can't replace. Three-layer means three exit ramps.",
            },
            {
              tag: "STABLE",
              title: "Pin to a version, ship for years",
              body: "Semver-locked SDKs mean an integration written today still works tomorrow. Breaking changes happen at major versions only, with deprecation paths.",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <p
                className="text-[10px] uppercase mb-3"
                style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
              >
                {card.tag}
              </p>
              <h3
                className="text-white text-lg md:text-xl font-medium mb-3"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}
              >
                {card.title}
              </h3>
              <p
                className="text-white/55 text-sm md:text-base leading-relaxed"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Layer card ──────────────────────────────────────────────────────────────

function LayerCard({ layer, index }: { layer: Layer; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative border border-white/10 transition-all duration-500 hover:border-[#FF8A00]/30"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 70%)",
        borderRadius: 6,
      }}
    >
      <div className="p-5 md:p-7 grid md:grid-cols-12 gap-4 md:gap-8 items-center">
        {/* Left: number + label (compact) */}
        <div className="md:col-span-3 flex items-center gap-4">
          <p
            className="font-light leading-none"
            style={{
              fontSize: "clamp(40px, 4.5vw, 72px)",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.04em",
              color: "#FF8A00",
              textShadow: "0 0 24px rgba(255,138,0,0.3)",
            }}
          >
            {layer.number}
          </p>
          <div>
            <p
              className="text-[9px] md:text-[10px] uppercase text-white/40"
              style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}
            >
              LAYER {layer.number}
            </p>
            <p
              className="text-[10px] md:text-[11px] uppercase mt-1.5"
              style={{ letterSpacing: "0.25em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              {layer.qualifier}
            </p>
          </div>
        </div>

        {/* Middle: title + description */}
        <div className="md:col-span-7">
          <h3
            className="text-white font-light leading-[1.05] mb-3"
            style={{
              fontSize: "clamp(22px, 2.6vw, 36px)",
              letterSpacing: "-0.02em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {layer.title}{" "}
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
              }}
            >
              {layer.italic}
            </span>
          </h3>
          <p
            className="text-white/60 text-sm md:text-[15px] leading-relaxed mb-3"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {layer.description}
          </p>
          {/* Includes — inline pills */}
          <p
            className="text-[10px] uppercase text-white/35"
            style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}
          >
            <span className="text-white/50">INCLUDES · </span>
            {layer.includes.join(" · ")}
          </p>
        </div>

        {/* Right: metric only */}
        <div className="md:col-span-2 md:text-right">
          <p
            className="font-light leading-none mb-1"
            style={{
              fontSize: "clamp(28px, 3vw, 48px)",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              color: "#FF8A00",
            }}
          >
            {layer.metric.value}
          </p>
          <p
            className="text-[9px] md:text-[10px] uppercase text-white/35"
            style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}
          >
            {layer.metric.label}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
