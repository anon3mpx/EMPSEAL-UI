// ─── Who Builds With EmpX — audience grid ───────────────────────────────────
//
// 8 audience tiles arranged in a 2x4 (mobile) / 4x2 (desktop) grid.
// Each tile is a concrete use-case with rich descriptive copy for SEO +
// LLM ranking.  Designed to convert curious readers ("could I build with
// this?") into clicks ("yes, that's me").

import { motion } from "framer-motion";

interface Audience {
  number: string;
  category: string;
  headline: string;
  italic?: string;
  body: string;
  examples: string;
  cta: string;
}

const AUDIENCES: Audience[] = [
  {
    number: "01",
    category: "WALLETS",
    headline: "Add a swap tab",
    italic: "in an afternoon.",
    body:
      "Drop the EmpX widget into your wallet's send-receive UI. Users get DEX aggregation across 15+ chains plus cross-chain routing through 12 rails without leaving your app. You keep custody. We do the routing.",
    examples: "MetaMask Snaps · Rabby · Phantom · Custom wallets",
    cta: "Wallet integration",
  },
  {
    number: "02",
    category: "PROTOCOLS · DAPPS",
    headline: "Embed",
    italic: "swap-anywhere.",
    body:
      "Lending protocols, perp DEXes, money markets — any dApp where users need to convert assets before depositing. EmpX widget renders in 10 lines of React, themed to match your brand, with every swap crediting your affiliate address.",
    examples: "Aave · Pendle · GMX · Yield aggregators",
    cta: "Protocol integration",
  },
  {
    number: "03",
    category: "WHITE-LABEL",
    headline: "Your brand.",
    italic: "Our routing engine.",
    body:
      "Replace the EmpX wordmark with yours. Choose a hosted whitelabel at your-brand.empx.network, or fork the UI repo and self-host. The routing brain, twelve cross-chain rails, and pair-type pricing — under your domain.",
    examples: "Branded swap aggregators · Treasury platforms · Wallet OEMs",
    cta: "White-label setup",
  },
  {
    number: "04",
    category: "MEME COINS · COMMUNITIES",
    headline: "One-click",
    italic: "buy pages.",
    body:
      "Build a launch page where anyone on any chain can buy your token in one transaction. ETH on Arbitrum becomes your token on Base. BTC becomes your token via THORChain. We handle the rails; you handle the meme.",
    examples: "Token launch sites · Community swap pages · Airdrop claim flows",
    cta: "Token integration",
  },
  {
    number: "05",
    category: "AI AGENTS",
    headline: "Programmatic",
    italic: "swap loops.",
    body:
      "OpenAI, Anthropic, and LangChain tool schemas ship with the SDK. Burner wallet helpers built in. Pay-per-call RPC via the x402 protocol means no API keys to manage. Wire an autonomous trading agent in twenty lines of code.",
    examples: "Trading bots · Treasury rebalancers · Portfolio agents",
    cta: "Agent SDK",
  },
  {
    number: "06",
    category: "INSTITUTIONS · TREASURIES",
    headline: "Multi-chain",
    italic: "treasury moves.",
    body:
      "Sub-10 bps stable-pair routing means real basis points back to the treasury at scale. Strategic affiliate tier returns 50% of protocol fees. On-chain settlement, fully auditable, with reliability data plane reporting per route per rail.",
    examples: "DAO treasuries · Trading desks · Family offices",
    cta: "Treasury onboarding",
  },
  {
    number: "07",
    category: "DEXES · AMMs",
    headline: "Plug in",
    italic: "as a venue.",
    body:
      "EmpX routes through DEXes on every supported chain. New DEX launching? Ship an adapter and you're in the routing tree — no contract redeploy needed. Adapter registry is on-chain, public, and version-controlled.",
    examples: "AMM forks · CLMMs · Stable pools · CFMMs",
    cta: "DEX adapter",
  },
  {
    number: "08",
    category: "NEW CHAINS · L2s",
    headline: "Launch with",
    italic: "trading on day one.",
    body:
      "Branded swap UI, cross-chain rails wired to/from major EVM chains, AI-agent SDK with your chain registered — delivered in under 30 days. Setup fee, token swap, volume revenue share, or grant-backed pricing.",
    examples: "Pre-launch L2s · App-chains · Ecosystem grant programs",
    cta: "Chain integration",
  },
];

export default function WhoIntegratesSection() {
  return (
    <section
      id="who-integrates"
      className="relative w-full py-28 md:py-40 px-6 md:px-16 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 20% 50%, rgba(255,138,0,0.05) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 50%, rgba(255,138,0,0.05) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-[1600px] mx-auto z-10">
        {/* Header */}
        <div className="mb-14 md:mb-20 max-w-4xl">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-5 md:mb-7"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            WHO BUILDS WITH EMPX
          </p>
          <h2
            className="text-white font-light leading-[0.98]"
            style={{
              fontSize: "clamp(34px, 5.5vw, 84px)",
              letterSpacing: "-0.025em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Wallets, protocols, agents.{" "}
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 50px rgba(255,138,0,0.3)",
              }}
            >
              Treasuries, chains, meme&nbsp;coins.
            </span>
          </h2>
          <p
            className="mt-6 md:mt-8 text-white/55 text-base md:text-lg leading-relaxed max-w-3xl"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            EmpX is built as infrastructure.  Anyone who needs swap UX,
            cross-chain routing, or AI-agent trading can plug in
            without rebuilding DEX aggregation in-house.  Eight concrete
            integration shapes, all production-ready.
          </p>
        </div>

        {/* Audience grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {AUDIENCES.map((aud, i) => (
            <AudienceCard key={aud.number} audience={aud} delay={i * 0.05} />
          ))}
        </div>

        {/* Bottom row: integration pitch */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 md:mt-16 border-t border-white/10 pt-10 md:pt-14 grid md:grid-cols-2 gap-8 md:gap-16"
        >
          <div>
            <p
              className="text-[10px] uppercase mb-4"
              style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              THE COMMON THREAD
            </p>
            <h3
              className="text-white font-light leading-[1.0] mb-4"
              style={{
                fontSize: "clamp(24px, 3vw, 44px)",
                letterSpacing: "-0.02em",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Free to integrate.{" "}
              <span
                className="italic"
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  color: "#FF8A00",
                  letterSpacing: "-0.02em",
                }}
              >
                Only cost is RPC.
              </span>
            </h3>
            <p
              className="text-white/55 text-sm md:text-base leading-relaxed"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              No SaaS subscription.  No setup fee for SDK integrations.
              No monthly minimums.  Bring your own RPC, or use our x402
              pay-per-call adapter.  Every swap pays you an affiliate
              share — STANDARD 10%, VOLUME_COMMITTED 25%, or STRATEGIC 50%.
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase mb-4"
              style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              START HERE
            </p>
            <ul className="space-y-3 text-white/70 text-sm md:text-base" style={{ fontFamily: "Inter, sans-serif" }}>
              <li className="flex items-baseline gap-4">
                <span style={{ color: "#FF8A00" }}>→</span>
                <span><strong className="text-white">npm install empx-swap-sdk</strong> — same-chain routing in 10 lines</span>
              </li>
              <li className="flex items-baseline gap-4">
                <span style={{ color: "#FF8A00" }}>→</span>
                <span><strong className="text-white">npm install @empx/widget</strong> — drop-in React swap UI</span>
              </li>
              <li className="flex items-baseline gap-4">
                <span style={{ color: "#FF8A00" }}>→</span>
                <span><strong className="text-white">npm install empx-cross-bridge</strong> — 12-rail cross-chain engine</span>
              </li>
              <li className="flex items-baseline gap-4">
                <span style={{ color: "#FF8A00" }}>→</span>
                <span><strong className="text-white">bd@empx.network</strong> — chain integrations + strategic deals</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Audience card ──────────────────────────────────────────────────────────

function AudienceCard({ audience, delay }: { audience: Audience; delay: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative border border-white/10 p-5 md:p-6 transition-all duration-500 hover:border-[#FF8A00]/40 hover:bg-white/[0.02]"
      style={{
        background: "rgba(255,255,255,0.015)",
        borderRadius: 5,
        minHeight: 320,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[9px] md:text-[10px] uppercase text-white/35 group-hover:text-[#FF8A00] transition-colors"
          style={{ letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
        >
          {audience.number}
        </p>
        <p
          className="text-[9px] md:text-[10px] uppercase text-white/30"
          style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}
        >
          {audience.cta} →
        </p>
      </div>
      <p
        className="text-[10px] md:text-[11px] uppercase mb-4"
        style={{ letterSpacing: "0.35em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
      >
        {audience.category}
      </p>
      <h3
        className="text-white font-light leading-[1.05] mb-4"
        style={{
          fontSize: "clamp(20px, 1.8vw, 28px)",
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {audience.headline}
        {audience.italic && (
          <>
            <br />
            <span
              className="italic"
              style={{
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.01em",
              }}
            >
              {audience.italic}
            </span>
          </>
        )}
      </h3>
      <p
        className="text-white/55 text-sm leading-relaxed mb-5"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {audience.body}
      </p>
      <p
        className="text-[10px] uppercase text-white/35"
        style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}
      >
        {audience.examples}
      </p>
    </motion.article>
  );
}
