// ─── Integrations — vertical flow, 3-column grid ────────────────────────────
//
// Replaces the previous pinned/horizontal disaster.  Now a clean vertical
// section with three columns: Rails / Wallets / DEXes — each a tall list
// card with stagger fade-in.  Blends with the surrounding sections (no
// disruptive pin, no horizontal scroll).
//
// Mobile: 3 columns stack vertically.

import { motion } from "framer-motion";

interface Item {
  name: string;
  meta: string;
  tag?: string;
}

interface Column {
  count: string;
  title: string;
  italic: string;
  subtitle: string;
  description: string;
  items: Item[];
}

const COLUMNS: Column[] = [
  {
    count: "12",
    title: "rails",
    italic: "rails",
    subtitle: "CROSS-CHAIN",
    description:
      "Every cross-chain protocol that matters, behind one interface. Mode A in-path or Mode B passthrough — surfaced together, sorted by output.",
    items: [
      { name: "CCTP",            meta: "Native USDC · ~15 min finality" },
      { name: "CCTP Fast",       meta: "JIT USDC · < 1 min",       tag: "JIT" },
      // { name: "Axelar",          meta: "Multi-asset · 2 – 8 min" },
      { name: "LayerZero",       meta: "OFT + messaging · 1 – 5 min" },
      // { name: "Wormhole",        meta: "SOL ↔ EVM · 5 – 15 min" },
      // { name: "Via Labs",        meta: "Validator messaging · 1 – 5 min" },
      { name: "Gas.zip",         meta: "Destination gas · 30s – 2 min" },
      { name: "THORChain",       meta: "Native BTC / DOGE / LTC", tag: "BTC" },
      { name: "Chainflip",       meta: "JIT · BTC + SOL",         tag: "JIT" },
      { name: "Maya",            meta: "Unique chains",            tag: "MAYA" },
      { name: "TeleSwap",        meta: "Bitcoin AMM",              tag: "BTC AMM" },
      { name: "Hyperlane Nexus", meta: "Warp-route stables",       tag: "FREE" },
    ],
  },
  {
    count: "8",
    title: "wallets",
    italic: "wallets",
    subtitle: "ANY SIGNER",
    description:
      "Wallet-agnostic by design. Browser, embedded, or backend — anything that signs. Burner wallets ship in the box for AI agents.",
    items: [
      { name: "MetaMask",       meta: "Most popular EVM wallet" },
      { name: "Rabby",          meta: "Multi-chain native" },
      { name: "WalletConnect",  meta: "Universal protocol" },
      { name: "wagmi v2",       meta: "React hooks · any provider" },
      { name: "Privy",          meta: "Email + social login",     tag: "EMBED" },
      { name: "Burner wallet",  meta: "Programmatic · no UI",     tag: "AGENT" },
      { name: "From private key", meta: "Server-side signing" },
      { name: "From mnemonic",  meta: "Multi-account derivation" },
    ],
  },
  {
    count: "15+",
    title: "DEXes",
    italic: "DEXes",
    subtitle: "ROUTED LIQUIDITY",
    description:
      "Adapters across every major venue and chain-native AMM. Add a new DEX without redeploying contracts — adapter registry lives on-chain.",
    items: [
      { name: "Uniswap V3",  meta: "Concentrated liquidity" },
      { name: "Uniswap V2",  meta: "Constant product AMM" },
      { name: "Curve",       meta: "Stable-pair specialised" },
      { name: "Velodrome",   meta: "Optimism native" },
      { name: "Aerodrome",   meta: "Base native" },
      { name: "PancakeSwap", meta: "BSC + multi-chain" },
      { name: "PulseX",      meta: "PulseChain native" },
      { name: "Trader Joe",  meta: "Avalanche + Arbitrum" },
      { name: "Beethoven",   meta: "Sonic native" },
      { name: "Camelot",     meta: "Arbitrum native" },
      { name: "Ramses",      meta: "Arbitrum stables" },
      { name: "+ many more", meta: "Adapter registry on-chain" },
    ],
  },
];

export default function IntegrationsSection() {
  return (
    <section
      id="integrations"
      className="relative w-full py-32 md:py-48 px-6 md:px-16 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,138,0,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-[1600px] mx-auto z-10">
        {/* Header — editorial */}
        <div className="mb-16 md:mb-24 max-w-5xl">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-6 md:mb-10"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            INTEGRATIONS · RAILS · WALLETS · DEXES
          </p>
          <h2
            className="text-white font-light leading-[0.95]"
            style={{
              fontSize: "clamp(36px, 6vw, 96px)",
              letterSpacing: "-0.03em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Everything{" "}
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 60px rgba(255,138,0,0.3)",
              }}
            >
              that matters
            </span>
            <br />
            connects.
          </h2>
          <p
            className="mt-8 md:mt-12 text-white/55 text-lg md:text-2xl max-w-3xl leading-relaxed"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Twelve rails, eight wallet adapters, fifteen DEXes — already in
            the SDK. Adding a new one doesn&apos;t require a redeploy.
          </p>
        </div>

        {/* 3 columns — items-start prevents middle column stretching when shorter */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 items-start">
          {COLUMNS.map((col, i) => (
            <IntegrationColumn key={i} column={col} delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Column component ───────────────────────────────────────────────────────

function IntegrationColumn({ column, delay }: { column: Column; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6 md:gap-8 border-t border-white/10 pt-6 md:pt-8"
    >
      {/* Header — count + italic title */}
      <div>
        <p
          className="text-[10px] md:text-[11px] uppercase text-white/40 mb-4 md:mb-6"
          style={{ letterSpacing: "0.4em", fontFamily: "Inter, sans-serif" }}
        >
          {column.subtitle}
        </p>
        <div className="flex items-baseline gap-3 md:gap-5">
          <p
            className="font-light leading-none"
            style={{
              fontSize: "clamp(44px, 6vw, 90px)",
              letterSpacing: "-0.04em",
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#FF8A00",
              textShadow: "0 0 40px rgba(255,138,0,0.3)",
            }}
          >
            {column.count}
          </p>
          <p
            className="text-white italic"
            style={{
              fontSize: "clamp(22px, 3vw, 40px)",
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.01em",
            }}
          >
            {column.italic}
          </p>
        </div>

        <p
          className="mt-4 md:mt-6 text-white/50 text-sm md:text-base leading-relaxed"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {column.description}
        </p>
      </div>

      {/* Item list */}
      <ul className="flex flex-col">
        {column.items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: delay + i * 0.04 }}
            className="group flex items-center justify-between py-3 md:py-4 border-b border-white/8 transition-colors duration-300 hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] uppercase text-white/30 group-hover:text-[#FF8A00] transition-colors"
                style={{ letterSpacing: "0.2em", fontFamily: "Inter, sans-serif", minWidth: 24 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="text-white text-base md:text-lg font-medium"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}
              >
                {item.name}
              </span>
              {item.tag && (
                <span
                  className="text-[9px] uppercase px-2 py-0.5 border border-[#FF8A00]/40"
                  style={{
                    color: "#FF8A00",
                    letterSpacing: "0.2em",
                    fontFamily: "Inter, sans-serif",
                    borderRadius: 3,
                  }}
                >
                  {item.tag}
                </span>
              )}
            </div>
            <span
              className="text-xs md:text-sm text-white/40 text-right ml-3"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {item.meta}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
