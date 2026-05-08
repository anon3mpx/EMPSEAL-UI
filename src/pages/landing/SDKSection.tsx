
import { motion } from "framer-motion";

const SDK_FEATURES = [
  {
    title: "Multi-Chain Swaps",
    body: "Route any token swap across 20+ chains with a single API call. Best rates guaranteed.",
  },
  {
    title: "Cross-Chain Bridging",
    body: "Transfer assets between networks programmatically. Low-fee, fully transparent execution.",
  },
  {
    title: "Limit Orders",
    body: "Place and manage on-chain limit orders autonomously. Perfect for strategy bots and DeFi agents.",
  },
  {
    title: "Real-Time Price Feed",
    body: "Stream live DEX prices across 100+ sources. Build pricing layers for AI models or protocols.",
  },
];

// Static code lines — orange = keywords/strings, dim = comments
const CODE_LINES: { text: string; type: "keyword" | "comment" | "normal" | "string" | "method" }[] = [
  { text: 'import { EMPX } from "@empx/sdk";', type: "keyword" },
  { text: "", type: "normal" },
  { text: "const empx = new EMPX({ apiKey: YOUR_KEY });", type: "normal" },
  { text: "", type: "normal" },
  { text: "// Find best swap route across 100+ DEXs", type: "comment" },
  { text: "const quote = await empx.swap.quote({", type: "normal" },
  { text: '  fromChain: "pulsechain",', type: "string" },
  { text: '  toChain:   "base",', type: "string" },
  { text: '  tokenIn:   "0xPLS...",', type: "string" },
  { text: '  tokenOut:  "0xUSDC...",', type: "string" },
  { text: '  amount:    "1000000000",', type: "string" },
  { text: "});", type: "normal" },
  { text: "", type: "normal" },
  { text: "// Works for AI agents or any protocol", type: "comment" },
  { text: "await empx.swap.execute(quote);", type: "method" },
];

function CodeLine({ line }: { line: (typeof CODE_LINES)[0] }) {
  if (!line.text) return <div className="h-3" />;
  const color =
    line.type === "comment"
      ? "rgba(255,255,255,0.28)"
      : line.type === "keyword" || line.type === "string"
      ? "#FF8A00"
      : line.type === "method"
      ? "#FFB347"
      : "rgba(255,255,255,0.65)";
  return (
    <div style={{ color }} className="whitespace-pre">
      {line.text}
    </div>
  );
}

export default function SDKSection() {
  return (
    <section
      id="sdk"
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: "#03030a" }}
    >
      <div className="divider mb-1" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 55% at 15% 50%, rgba(255,138,0,0.04) 0%, transparent 55%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-[8px] font-black tracking-[0.4em] mb-5"
              style={{ color: "var(--empx-orange)" }}
            >
              EMPX SWAP SDK
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-black leading-[1.0] tracking-tight mb-5"
              style={{ fontSize: "clamp(1.9rem, 4vw, 3.8rem)" }}
            >
              <span className="text-white">Built for</span>
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #FF8A00, #FFB347)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI Agents &amp; Protocols.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-sm text-white/45 leading-relaxed mb-8 max-w-md"
            >
              Our npm SDK gives any AI agent, trading bot, or on-chain protocol instant access
              to EMPX&apos;s multi-chain swap and bridge infrastructure — with a single import.
              No wallet UI required.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {SDK_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.07 }}
                  className="p-4"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,138,0,0.12)",
                  }}
                >
                  <p className="text-[11px] font-bold text-white mb-1.5 leading-tight">{f.title}</p>
                  <p className="text-[10px] text-white/38 leading-relaxed">{f.body}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a
                href="/"
                className="px-7 py-3.5 font-black text-[11px] tracking-[0.2em] transition-all duration-300 text-center"
                style={{
                  background: "linear-gradient(135deg, #FF8A00, #FF6B00)",
                  color: "#03030a",
                  boxShadow: "0 0 32px rgba(255,138,0,0.3)",
                }}
              >
                VIEW DOCUMENTATION
              </a>
              <a
                href="/"
                className="px-7 py-3.5 font-bold text-[11px] tracking-[0.18em] text-white/55 hover:text-white transition-all duration-300 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,138,0,0.18)",
                  fontFamily: "monospace",
                }}
              >
                npm install @empx/sdk
              </a>
            </motion.div>
          </div>

          {/* Right — code block */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="overflow-hidden"
              style={{
                background: "rgba(3,3,10,0.9)",
                border: "1px solid rgba(255,138,0,0.18)",
                boxShadow: "0 0 60px rgba(255,138,0,0.07)",
              }}
            >
              {/* Terminal bar */}
              <div
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={{ borderColor: "rgba(255,138,0,0.1)" }}
              >
                <span className="w-2.5 h-2.5 " style={{ background: "rgba(255,138,0,0.5)" }} />
                <span className="w-2.5 h-2.5 " style={{ background: "rgba(255,138,0,0.25)" }} />
                <span className="w-2.5 h-2.5 " style={{ background: "rgba(255,138,0,0.12)" }} />
                <span className="ml-3 text-[10px] text-white/25 tracking-wider">empx-sdk — example.ts</span>
              </div>
              <div
                className="p-5 overflow-x-auto text-[11px] sm:text-xs leading-relaxed"
                style={{ fontFamily: "monospace" }}
              >
                {CODE_LINES.map((line, i) => (
                  <CodeLine key={i} line={line} />
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              {["TypeScript Ready", "20+ Networks", "AI Agent Compatible", "Zero Hidden Fees"].map((b) => (
                <span
                  key={b}
                  className="text-[8px] font-black tracking-[0.15em] px-3 py-1.5"
                  style={{
                    background: "rgba(255,138,0,0.06)",
                    border: "1px solid rgba(255,138,0,0.18)",
                    color: "var(--empx-orange)",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
