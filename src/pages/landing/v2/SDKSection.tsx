// ─── SDK + Agents section ────────────────────────────────────────────────────
//
// Three columns:
//   1. SDK code snippet (10 lines to working swap)
//   2. AI agent tool schemas + x402 RPC pitch
//   3. Affiliate revenue share preview
//
// Each panel uses scroll-driven stagger fade-in via Framer Motion.

import { motion } from "framer-motion";

const CODE_LINES = [
  { l: "import",           v: "{ createRouter, CHAIN_IDS,",  c: "k" },
  { l: "        enablePairTypeFees }", v: "from \"empx-swap-sdk\";",   c: "p" },
  { l: "",                 v: "",                              c: "" },
  { l: "enablePairTypeFees()",     v: ";",                              c: "f" },
  { l: "const router =",   v: " createRouter(",                  c: "k" },
  { l: "  CHAIN_IDS.ARBITRUM,", v: " signer",                    c: "p" },
  { l: ")",                v: ";",                                c: "" },
  { l: "",                 v: "",                              c: "" },
  { l: "await",            v: " router.swap(",                   c: "k" },
  { l: "  amountIn, tokenIn,", v: " tokenOut, recipient",        c: "p" },
  { l: ")",                v: ";",                                c: "" },
];

export default function SDKSection() {
  return (
    <section
      id="sdk"
      className="relative w-full py-32 md:py-48 px-6 md:px-12"
      style={{ background: "#05050c" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 80% 50%, rgba(255,138,0,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Header — editorial */}
        <div className="mb-16 md:mb-24 max-w-5xl">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-6 md:mb-10"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            TYPESCRIPT-NATIVE · AI-AGENT-READY
          </p>
          <h2
            className="font-light text-white leading-[1.0] inline-flex flex-wrap items-baseline gap-x-3 md:gap-x-5"
            style={{
              fontSize: "clamp(38px, 6.5vw, 104px)",
              letterSpacing: "-0.03em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Ten lines.
            <span
              className="italic"
              style={{
                fontSize: "clamp(44px, 8vw, 124px)",
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 60px rgba(255,138,0,0.4)",
              }}
            >
              Done.
            </span>
          </h2>
          <p
            className="mt-8 md:mt-12 text-white/60 text-base md:text-lg max-w-2xl leading-relaxed"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            The same SDK that powers empx.network. Wallet-agnostic. AI-agent
            ready out of the box.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Code window — spans 7 cols */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-7 border border-white/8 backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-white/15" />
                <span className="w-3 h-3 rounded-full bg-white/15" />
                <span className="w-3 h-3 rounded-full bg-white/15" />
              </div>
              <p
                className="text-[10px] uppercase text-white/40"
                style={{ letterSpacing: "0.3em" }}
              >
                AGENT.TS
              </p>
              <div className="w-12" />
            </div>

            {/* Code body */}
            <pre
              className="p-6 md:p-8 text-[13px] md:text-sm overflow-x-auto"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.75 }}
            >
              {CODE_LINES.map((line, i) => (
                <div key={i}>
                  <span
                    style={{
                      color:
                        line.c === "k"
                          ? "#FF8A00"
                          : line.c === "f"
                          ? "#FFB347"
                          : line.c === "p"
                          ? "#E5E7EB"
                          : "#94A3B8",
                    }}
                  >
                    {line.l}
                  </span>
                  <span className="text-white/50">{line.v}</span>
                </div>
              ))}
            </pre>
          </motion.div>

          {/* Right column — 5 cols, three sub-cards */}
          <div className="md:col-span-5 space-y-4">
            <FeatureCard
              tag="AI AGENT"
              title="OpenAI · Claude · LangChain"
              body="Tool schemas exported. 20-line autonomous swap loop documented."
            />
            <FeatureCard
              tag="X402 RPC"
              title="No API keys"
              body="EIP-3009 USDC pay-per-call. QuickNode, thirdweb, self-hosted."
            />
            <FeatureCard
              tag="AFFILIATE"
              title="10% · 25% · 50% share"
              body="STANDARD, VOLUME_COMMITTED, STRATEGIC. Set with one line."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ tag, title, body }: { tag: string; title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 border border-white/8 transition-all duration-300 hover:border-[#FF8A00]/30 hover:bg-white/[0.025]"
      style={{ background: "rgba(255, 255, 255, 0.015)", borderRadius: 4 }}
    >
      <p
        className="text-[9px] uppercase text-[#FF8A00] mb-3"
        style={{ letterSpacing: "0.35em" }}
      >
        {tag}
      </p>
      <p className="text-white text-lg font-medium mb-2" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </p>
      <p className="text-white/55 text-sm leading-relaxed">{body}</p>
    </motion.div>
  );
}
