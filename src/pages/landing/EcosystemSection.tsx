
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const PILLARS = [
  {
    number: "01",
    tag: "DEX AGGREGATOR",
    title: "Instant Swaps",
    description:
      "EMPX DEX Aggregator scans multiple liquidity sources in real-time to deliver the absolute best swap rates with minimal gas and zero hidden fees. Best rates + low fees + full decentralization.",
  },
  {
    number: "02",
    tag: "SMART ORDERS",
    title: "Smart Limit Orders",
    description:
      "Set and forget precise limit orders that execute automatically when prices hit your target. An advanced DeFi tool for better control and strategy execution across all supported chains.",
  },
  {
    number: "03",
    tag: "CROSS-CHAIN BRIDGE",
    title: "Cross-Chain Bridge",
    description:
      "Securely transfer assets between multiple chains with trusted and secure infrastructure. Fast, affordable bridging with full transparency across PulseChain, Base, Monad, BSC, Avalanche, and Arbitrum.",
  },
  {
    number: "04",
    tag: "SWAP API",
    title: "EMPX Swap API",
    description:
      "Build with EMPX and reach out for integrations. Our documentation covers User guide and Developer guide with in-depth descriptions on how EMPX works and safety and efficiency practices.",
  },
];

export default function EcosystemSection() {
  return (
    <section
      id="ecosystem"
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: "#03030a" }}
    >
      <div className="divider mb-1" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 80% 30%, rgba(255,138,0,0.04) 0%, transparent 55%), radial-gradient(ellipse 45% 55% at 10% 80%, rgba(255,138,0,0.03) 0%, transparent 55%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[8px] font-black tracking-[0.4em] mb-5"
            style={{ color: "var(--empx-orange)" }}
          >
            WHAT WE DO
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(2rem,4.5vw,4rem)] font-black leading-[1.0] tracking-tight"
          >
            <span className="text-white">Buy, sell, and manage<br />digital assets securely on</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #FF8A00, #FFB347)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              the most efficient blockchain platform.
            </span>
          </motion.h2>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {PILLARS.map((p, i) => (
            <PillarCard key={p.number} pillar={p} index={i} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-10 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,138,0,0.14)",
          }}
        >
          <div
            className="absolute -right-20 -top-20 w-80 h-80  pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,138,0,0.1) 0%, transparent 70%)", filter: "blur(50px)" }}
          />

          <div className="relative z-10 max-w-lg">
            <p className="text-[8px] font-black tracking-[0.4em] mb-4" style={{ color: "var(--empx-orange)" }}>
              COME JOIN US AT EMPX
            </p>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.8rem)] font-black leading-[1.05] tracking-tight">
              <span className="text-white">One platform to swap, bridge,<br />and explore the Web3</span>
              <br />
              <span style={{
                background: "linear-gradient(135deg, #FF8A00, #FFB347)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                with speed.
              </span>
            </h3>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4 shrink-0">
            <a
              href="/swap"
              className="px-8 py-4 font-black text-[11px] tracking-[0.2em] transition-all duration-300 text-center"
              style={{
                background: "linear-gradient(135deg, #FF8A00, #FF6B00)",
                color: "#03030a",
                boxShadow: "0 0 40px rgba(255,138,0,0.35)",
              }}
            >
              ENTER DAPP
            </a>
            <a
              href="/swap"
              className="px-8 py-4 font-bold text-[11px] tracking-[0.2em] text-white/60 hover:text-white transition-all duration-300 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              ENTER DOCS
            </a>
          </div>
        </motion.div>

        {/* Contact row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-white/30"
        >
          <a href="https://twitter.com/empx" className="hover:text-white transition-colors tracking-wider">
            Twitter / X
          </a>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          <a href="mailto:support@empx.io" className="hover:text-white transition-colors tracking-wider">
            Support@EMPX.io
          </a>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          <a href="/swap" className="hover:text-white transition-colors tracking-wider">
            Documentation
          </a>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          <a href="https://t.me/empx" className="hover:text-white transition-colors tracking-wider">
            Telegram
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, index }: { pillar: (typeof PILLARS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="p-7 flex flex-col gap-4 group hover:border-[rgba(255,138,0,0.2)] transition-colors duration-400"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[7px] font-black tracking-[0.3em]" style={{ color: "var(--empx-orange)" }}>
          {pillar.tag}
        </p>
        <span className="text-3xl font-black" style={{ color: "rgba(255,138,0,0.1)" }}>{pillar.number}</span>
      </div>
      <h3 className="text-lg font-black text-white tracking-tight">{pillar.title}</h3>
      <p className="text-sm text-white/38 leading-relaxed">{pillar.description}</p>
      <a
        href="/swap"
        className="text-[9px] font-black tracking-[0.2em] self-start px-4 py-2 transition-all duration-300"
        style={{ background: "rgba(255,138,0,0.08)", color: "var(--empx-orange)", border: "1px solid rgba(255,138,0,0.2)" }}
      >
        EXPLORE →
      </a>
    </motion.div>
  );
}
