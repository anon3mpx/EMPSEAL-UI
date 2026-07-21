// ─── Chains — animated showcase ──────────────────────────────────────────────
//
// Three rows of animated chain glyphs, each row scrolls in opposite direction
// at different speeds.  Center column floats a "X chains" big stat.
// The visual: a sea of supported networks moving in parallax — depth + breadth.

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ChainLogo } from "../../../design-system/components";

interface Chain {
  symbol: string;
  name: string;
  type: "EVM" | "BTC" | "SOL" | "OTHER";
  bg: string;
  fg: string;
}

const EVM_CHAINS: Chain[] = [
  { symbol: "ETH",   name: "Ethereum",  type: "EVM",   bg: "#627EEA", fg: "#FFFFFF" },
  { symbol: "ARB",   name: "Arbitrum",  type: "EVM",   bg: "#28A0F0", fg: "#FFFFFF" },
  { symbol: "BASE",  name: "Base",      type: "EVM",   bg: "#0052FF", fg: "#FFFFFF" },
  { symbol: "OP",    name: "Optimism",  type: "EVM",   bg: "#FF0420", fg: "#FFFFFF" },
  { symbol: "POL",   name: "Polygon",   type: "EVM",   bg: "#7B3FE4", fg: "#FFFFFF" },
  { symbol: "BSC",   name: "BSC",       type: "EVM",   bg: "#F0B90B", fg: "#000000" },
  { symbol: "AVAX",  name: "Avalanche", type: "EVM",   bg: "#E84142", fg: "#FFFFFF" },
  { symbol: "RSK",   name: "Rootstock", type: "EVM",   bg: "#FF9900", fg: "#FFFFFF" },
  { symbol: "SEI",   name: "Sei",       type: "EVM",   bg: "#9D1F1F", fg: "#FFFFFF" },
  { symbol: "SONIC", name: "Sonic",     type: "EVM",   bg: "#FE9A4D", fg: "#000000" },
  { symbol: "BERA",  name: "Berachain", type: "EVM",   bg: "#814625", fg: "#FFFFFF" },
  { symbol: "MON",   name: "Monad",     type: "EVM",   bg: "#7C5CFC", fg: "#FFFFFF" },
  { symbol: "HYPE",  name: "HyperEVM",  type: "EVM",   bg: "#97FBE5", fg: "#000000" },
  { symbol: "PLS",   name: "PulseChain",type: "EVM",   bg: "#FF008F", fg: "#FFFFFF" },
  { symbol: "ETHW",  name: "EthereumPoW", type: "EVM", bg: "#3C3C3D", fg: "#FFFFFF" },
];

const NATIVE_CHAINS: Chain[] = [
  { symbol: "BTC",  name: "Bitcoin",  type: "BTC",   bg: "#F7931A", fg: "#FFFFFF" },
  { symbol: "SOL",  name: "Solana",   type: "SOL",   bg: "#9945FF", fg: "#FFFFFF" },
  { symbol: "DOGE", name: "Dogecoin", type: "OTHER", bg: "#C2A633", fg: "#FFFFFF" },
  { symbol: "LTC",  name: "Litecoin", type: "OTHER", bg: "#345D9D", fg: "#FFFFFF" },
  { symbol: "BCH",  name: "Bitcoin Cash", type: "OTHER", bg: "#0AC18E", fg: "#FFFFFF" },
  { symbol: "TRX",  name: "Tron",     type: "OTHER", bg: "#FF060A", fg: "#FFFFFF" },
  { symbol: "ATOM", name: "Cosmos",   type: "OTHER", bg: "#2E3148", fg: "#FFFFFF" },
  { symbol: "ADA",  name: "Cardano",  type: "OTHER", bg: "#0033AD", fg: "#FFFFFF" },
  { symbol: "XRP",  name: "Ripple",   type: "OTHER", bg: "#23292F", fg: "#FFFFFF" },
  { symbol: "TON",  name: "TON",      type: "OTHER", bg: "#0098EA", fg: "#FFFFFF" },
  { symbol: "APT",  name: "Aptos",    type: "OTHER", bg: "#06D7AA", fg: "#000000" },
  { symbol: "SUI",  name: "Sui",      type: "OTHER", bg: "#4DA2FF", fg: "#FFFFFF" },
  { symbol: "NEAR", name: "NEAR",     type: "OTHER", bg: "#000000", fg: "#FFFFFF" },
  { symbol: "XMR",  name: "Monero",   type: "OTHER", bg: "#FF6600", fg: "#FFFFFF" },
];

const ALL_ROW_TOP = [...EVM_CHAINS, ...NATIVE_CHAINS.slice(0, 5)];
const ALL_ROW_MID = [...EVM_CHAINS.slice(5), ...NATIVE_CHAINS, ...EVM_CHAINS.slice(0, 3)];
const ALL_ROW_BOT = [...NATIVE_CHAINS.slice(5), ...EVM_CHAINS.slice(0, 8)];

export default function ChainsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const xTop = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const xMid = useTransform(scrollYProgress, [0, 1], ["-10%", "5%"]);
  const xBot = useTransform(scrollYProgress, [0, 1], ["5%", "-10%"]);
  const labelY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section
      ref={ref}
      className="relative w-full py-32 md:py-48 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,138,0,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Floating headline — center stage */}
      <motion.div
        style={{ y: labelY }}
        className="relative z-20 max-w-7xl mx-auto px-6 md:px-12 text-center mb-16 md:mb-20"
      >
        <p
          className="text-[11px] md:text-[12px] uppercase mb-6"
          style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
        >
          SUPPORTED ACROSS
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-7">
          <p
            className="text-white font-light leading-none"
            style={{
              fontSize: "clamp(56px, 10vw, 170px)",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.04em",
              textShadow: "0 0 100px rgba(255,138,0,0.4), 0 0 200px rgba(255,138,0,0.15)",
            }}
          >
            24
          </p>
          <p
            className="italic leading-[1.0] text-white/90"
            style={{
              fontSize: "clamp(28px, 4.5vw, 64px)",
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.02em",
            }}
          >
            networks<br/>and counting.
          </p>
        </div>
        <p
          className="text-white/55 text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Fifteen EVM chains + nine non-EVM chain kinds.  Native Bitcoin, Solana, and beyond.
        </p>

        {/* What "15 chains" means + what EmpX does on each tier — short explainer */}
        <div className="mt-10 md:mt-14 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 text-left">
          <div>
            <p
              className="text-[10px] uppercase mb-3"
              style={{ letterSpacing: "0.35em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              ON THE 15 EVM CHAINS
            </p>
            <p
              className="text-white/65 text-[13px] md:text-[14px] leading-[1.6]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              The EmpsealRouter contract is deployed and frozen on each one.  Same-chain swaps route through every major DEX on the chain — pair-type fees price stables at 9 bps, mixed at 15, volatile at 28.  Cross-chain swaps use these chains as both sources and destinations across all twelve rails.
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase mb-3"
              style={{ letterSpacing: "0.35em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              ON THE NON-EVM CHAINS
            </p>
            <p
              className="text-white/65 text-[13px] md:text-[14px] leading-[1.6]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Bitcoin, Solana, Dogecoin, Litecoin and other native L1s are reachable through Mode B rails — THORChain, Chainflip, Maya, TeleSwap.  EmpX routes intent through the rail's own validator network; on the source side, users sign with a native wallet or follow deposit instructions.  EVM destinations settle automatically.
            </p>
          </div>
        </div>

        {/* Wallet adapter row — honest about what's wired today */}
        <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 max-w-2xl mx-auto">
          <p
            className="text-[9px] uppercase text-white/40 w-full md:w-auto"
            style={{ letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
          >
            CONNECT WITH
          </p>
          {[
            { brand: "MetaMask",  kind: "EVM" },
            { brand: "Rabby",     kind: "EVM" },
            { brand: "Phantom",   kind: "SOL" },
            { brand: "Unisat",    kind: "BTC" },
            { brand: "TronLink",  kind: "TRX" },
            { brand: "Keplr",     kind: "COSMOS" },
          ].map((w) => (
            <div key={w.brand} className="flex items-baseline gap-1.5">
              <span
                className="text-white/70 text-[12px] md:text-[13px] font-medium"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.005em" }}
              >
                {w.brand}
              </span>
              <span
                className="text-[8.5px] uppercase text-white/30"
                style={{ letterSpacing: "0.20em", fontFamily: "Inter, sans-serif" }}
              >
                {w.kind}
              </span>
            </div>
          ))}
        </div>
        <p
          className="text-[10.5px] text-white/35 mt-3 md:mt-4 max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          One wallet at a time, any chain family.  Connect MetaMask for EVM, Phantom for Solana, Unisat for Bitcoin — the connected address drives portfolio tracking and deposit-instruction flows for non-EVM source chains.
        </p>
      </motion.div>

      {/* Chain rows — parallax horizontal motion */}
      <div className="relative z-10 space-y-4 md:space-y-6">
        <motion.div style={{ x: xTop }} className="flex gap-3 md:gap-5 will-change-transform">
          {[...ALL_ROW_TOP, ...ALL_ROW_TOP].map((chain, i) => (
            <ChainBadge key={`top-${i}`} chain={chain} size="md" />
          ))}
        </motion.div>
        <motion.div style={{ x: xMid }} className="flex gap-3 md:gap-5 will-change-transform">
          {[...ALL_ROW_MID, ...ALL_ROW_MID].map((chain, i) => (
            <ChainBadge key={`mid-${i}`} chain={chain} size="lg" />
          ))}
        </motion.div>
        <motion.div style={{ x: xBot }} className="flex gap-3 md:gap-5 will-change-transform">
          {[...ALL_ROW_BOT, ...ALL_ROW_BOT].map((chain, i) => (
            <ChainBadge key={`bot-${i}`} chain={chain} size="md" />
          ))}
        </motion.div>
      </div>

      {/* Bottom row stats */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 md:px-12 mt-16 md:mt-24 grid grid-cols-3 gap-6 md:gap-12 border-t border-white/8 pt-10 md:pt-14">
        {[
          { v: "15", l: "EVM CHAINS" },
          { v: "9",  l: "NON-EVM KINDS" },
          { v: "12", l: "RAILS LIVE" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p
              className="text-white font-light leading-none mb-3"
              style={{
                fontSize: "clamp(36px, 4.5vw, 68px)",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.03em",
                color: "#FF8A00",
                textShadow: "0 0 40px rgba(255,138,0,0.4)",
              }}
            >
              {s.v}
            </p>
            <p
              className="text-[10px] md:text-[11px] uppercase text-white/40"
              style={{ letterSpacing: "0.4em", fontFamily: "Inter, sans-serif" }}
            >
              {s.l}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChainBadge({ chain, size }: { chain: Chain; size: "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "min-w-[140px] md:min-w-[200px] h-[110px] md:h-[160px]"
      : "min-w-[120px] md:min-w-[170px] h-[90px] md:h-[140px]";
  return (
    <div
      className={`flex-shrink-0 ${dim} flex flex-col justify-between p-4 md:p-6 border border-white/8 transition-all duration-500 hover:scale-105 hover:border-[#FF8A00]/40`}
      style={{
        background: `linear-gradient(135deg, ${chain.bg}15 0%, transparent 80%)`,
        borderRadius: 4,
      }}
    >
      {/* ChainLogo tries DefiLlama CDN first, falls back to coloured letter pill. */}
      <ChainLogo
        symbol={chain.symbol}
        bg={chain.bg}
        fg={chain.fg}
        size={size === "lg" ? 56 : 44}
      />
      <div>
        <p
          className="text-white text-sm md:text-base font-medium leading-tight"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {chain.name}
        </p>
        <p
          className="text-[9px] md:text-[10px] uppercase text-white/35 mt-1"
          style={{ letterSpacing: "0.25em" }}
        >
          {chain.type}
        </p>
      </div>
    </div>
  );
}
