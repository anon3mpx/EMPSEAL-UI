// ─── Agent Console (idea 05) ────────────────────────────────────────────
//
// Replaces SDKSection's static code window with a looping mock console
// dramatizing what getClaudeTools()/getOpenAITools() actually resolves —
// verified real SDK methods, not invented ones. Feature cards from
// SDKSection are kept as-is (already accurate) beside it.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Kind = "cmd" | "log" | "ok" | "muted";
interface Line { kind: Kind; text: string; }

const SCRIPT: Line[] = [
  { kind: "cmd",   text: "agent.getClaudeTools().invoke(\"swap\")" },
  { kind: "log",   text: "resolving intent → 500 USDC, Base → Solana" },
  { kind: "log",   text: "quoting across live rails..." },
  { kind: "muted", text: "  thorchain    quote ok   14.2s" },
  { kind: "muted", text: "  chainflip    quote ok    9.8s" },
  { kind: "log",   text: "best route selected, building calldata..." },
  { kind: "ok",    text: "✓ settled — no custody held mid-route" },
];

const COLORS: Record<Kind, string> = {
  cmd: "#FFB347",
  log: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.32)",
  ok: "#FF8A00",
};

export default function AgentConsoleSection() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s >= SCRIPT.length ? 0 : s + 1));
    }, 850);
    return () => clearInterval(interval);
  }, []);

  const visible = SCRIPT.slice(0, step);
  const done = step >= SCRIPT.length;

  return (
    <section id="sdk" className="relative w-full py-32 md:py-48 px-6 md:px-12" style={{ background: "#05050c" }}>
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 40% at 80% 50%, rgba(255,138,0,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="mb-16 md:mb-24 max-w-5xl">
          <div className="flex items-center gap-2 mb-6 md:mb-10">
            <span className="shear-chip" />
            <p className="text-[11px] md:text-[12px] uppercase" style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}>
              05 — TYPESCRIPT-NATIVE · AI-AGENT-READY
            </p>
          </div>
          <h2
            className="font-light text-white leading-[1.0] inline-flex flex-wrap items-baseline gap-x-3 md:gap-x-5"
            style={{ fontSize: "clamp(38px, 6.5vw, 104px)", letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Built for agents.
            <span className="italic" style={{ fontSize: "clamp(44px, 8vw, 124px)", fontFamily: "'Instrument Serif', serif", color: "#FF8A00", letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(255,138,0,0.4)" }}>
              Not just wallets.
            </span>
          </h2>
          <p className="mt-8 md:mt-12 text-white/60 text-base md:text-lg max-w-2xl leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
            The same SDK that powers empx.network — Claude and OpenAI tool schemas ship in the
            package, not bolted on after.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Console — spans 7 cols */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-7 border border-white/8 rounded-md backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-white/15" />
                <span className="w-3 h-3 rounded-full bg-white/15" />
                <span className="w-3 h-3 rounded-full bg-white/15" />
              </div>
              <p className="text-[10px] uppercase text-white/40" style={{ letterSpacing: "0.3em" }}>AGENT-SESSION.TS</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: done ? "#FF8A00" : "#4ade80", boxShadow: `0 0 8px ${done ? "#FF8A00" : "#4ade80"}` }}
                />
                <span className="text-[9px] uppercase text-white/30" style={{ letterSpacing: "0.2em" }}>
                  {done ? "settled" : "live"}
                </span>
              </div>
            </div>

            <div
              className="p-6 md:p-8 text-[13px] md:text-sm min-h-[280px] md:min-h-[320px]"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 2 }}
            >
              <AnimatePresence mode="popLayout">
                {visible.map((line, i) => (
                  <motion.div
                    key={`${step >= SCRIPT.length ? "cycle" : "s"}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    style={{ color: COLORS[line.kind] }}
                  >
                    {line.kind === "cmd" && <span style={{ color: "rgba(255,255,255,0.3)" }}>{"> "}</span>}
                    {line.text}
                    {i === visible.length - 1 && !done && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                        style={{ display: "inline-block", width: 7, height: 14, marginLeft: 6, background: "#FF8A00", verticalAlign: "-2px" }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right column — feature cards, unchanged content */}
          <div className="md:col-span-5 space-y-4">
            <FeatureCard tag="AI AGENT" title="OpenAI · Claude · LangChain" body="Tool schemas exported. 20-line autonomous swap loop documented." />
            <FeatureCard tag="X402 RPC" title="No API keys" body="EIP-3009 USDC pay-per-call. QuickNode, thirdweb, self-hosted." />
            <FeatureCard tag="AFFILIATE" title="10% · 25% · 50% share" body="STANDARD, VOLUME_COMMITTED, STRATEGIC. Set with one line." />
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
      className="p-6 border border-white/8 rounded-md transition-all duration-300 hover:border-[#FF8A00]/30 hover:bg-white/[0.025]"
      style={{ background: "rgba(255, 255, 255, 0.015)" }}
    >
      <p className="text-[9px] uppercase text-[#FF8A00] mb-3" style={{ letterSpacing: "0.35em" }}>{tag}</p>
      <p className="text-white text-lg font-medium mb-2" style={{ letterSpacing: "-0.01em" }}>{title}</p>
      <p className="text-white/55 text-sm leading-relaxed">{body}</p>
    </motion.div>
  );
}
