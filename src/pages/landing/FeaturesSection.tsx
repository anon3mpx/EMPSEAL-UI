
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const FEATURES = [
  {
    icon: "⬡",
    title: "Quantum-Grade Security",
    description:
      "Multi-layer cryptographic architecture with real-time threat detection and zero-knowledge proof validation at every transaction layer.",
    tag: "Security",
    accent: "gold",
  },
  {
    icon: "◈",
    title: "Hyper-Liquid Markets",
    description:
      "Institutional-grade liquidity pools with sub-millisecond settlement. Trade any asset class with surgical precision and zero slippage.",
    tag: "Trading",
    accent: "gold",
  },
  {
    icon: "⊛",
    title: "Modular DeFi Engine",
    description:
      "Composable financial primitives that snap together like building blocks. Deploy complex strategies in seconds, not months.",
    tag: "DeFi",
    accent: "gold",
  },
  {
    icon: "⬟",
    title: "Cross-Chain Omnibus",
    description:
      "Seamless interoperability across 40+ blockchain networks. One account, infinite ecosystems, unified portfolio view.",
    tag: "Interop",
    accent: "gold",
  },
  {
    icon: "◉",
    title: "AI Risk Intelligence",
    description:
      "Neural network-powered portfolio analysis running 24/7. Predictive risk scoring before the market sees the signal.",
    tag: "AI/ML",
    accent: "gold",
  },
  {
    icon: "⬡",
    title: "Institutional Custody",
    description:
      "SOC 2 Type II certified infrastructure trusted by funds managing $50B+. Air-gapped cold storage with multi-sig governance.",
    tag: "Custody",
    accent: "gold",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const isGold = feature.accent === "gold";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (index % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass p-6 relative overflow-hidden group border-glow transition-colors duration-300"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,138,0,0.12)",
      }}
    >
      {/* Ambient glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(255,138,0,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Top tag */}
      <span
        className="inline-block text-[10px] font-semibold tracking-widest px-2.5 py-1 mb-4"
        style={{
          background: "rgba(255,138,0,0.1)",
          color: "var(--empx-orange)",
          letterSpacing: "0.18em",
        }}
      >
        {feature.tag}
      </span>

      {/* Icon */}
      <div
        className="text-3xl mb-4 font-light"
        style={{ color: "var(--empx-orange)" }}
      >
        {feature.icon}
      </div>

      <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
        {feature.title}
      </h3>
      <p className="text-sm text-white/45 leading-relaxed">{feature.description}</p>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,138,0,0.35), transparent)",
        }}
      />
    </motion.div>
  );
}

export default function FeaturesSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { once: true, margin: "-100px" });

  return (
    <section id="platform" className="relative py-32 px-6">
      {/* Background radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,169,110,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div ref={titleRef} className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-xs font-medium tracking-cinematic mb-4"
            style={{ color: "var(--empx-gold)", letterSpacing: "0.3em" }}
          >
            THE PLATFORM
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl font-bold leading-tight"
          >
            <span className="gradient-gold">Built different.</span>
            <br />
            <span className="text-white">Built for what&apos;s next.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-base text-white/45 max-w-xl mx-auto leading-relaxed"
          >
            EMPX combines institutional-grade infrastructure with cutting-edge DeFi
            primitives — creating the most capable digital asset platform ever built.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
