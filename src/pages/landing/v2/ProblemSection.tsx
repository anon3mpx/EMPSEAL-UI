// ─── Problem / 3-panel horizontal pitch ──────────────────────────────────────
//
// Reframed from "fragmentation tax" → three superpowers across one layer.
// GSAP ScrollTrigger pinned, vertical scroll converts to horizontal travel
// through three big editorial panels: SWAP · CROSS · AUTOMATE.
//
// Each panel is full-viewport-ish wide with big display type as the backdrop
// + a content card stacked over it.  Mobile: native horizontal snap-scroll.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ProblemSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const totalScroll = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -totalScroll(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, section);
    return () => ctx.revert();
  }, [isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ background: "#05050c", minHeight: "100vh" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(255,138,0,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Sticky section header — visible while horizontal track scrolls */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-14 md:pt-20 px-6 md:px-16 pointer-events-none">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-12">
          <div>
            <p
              className="text-[11px] md:text-[12px] uppercase mb-4 md:mb-6"
              style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
            >
              ONE LAYER · THREE SUPERPOWERS
            </p>
            <h2
              className="text-white font-light leading-[0.95] max-w-5xl"
              style={{
                fontSize: "clamp(34px, 5.5vw, 88px)",
                letterSpacing: "-0.025em",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Swap.{" "}
              <span
                className="italic"
                style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00", letterSpacing: "-0.01em" }}
              >
                Cross.
              </span>{" "}
              Automate.
            </h2>
          </div>
          <p
            className="text-[10px] md:text-[11px] uppercase text-white/35 md:text-right"
            style={{ letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
          >
            {isMobile ? "SWIPE →" : "SCROLL TO TRAVERSE →"}
          </p>
        </div>
      </div>

      {/* Horizontal track */}
      <div
        className={`relative w-full ${
          isMobile ? "overflow-x-auto" : "h-screen overflow-hidden"
        } pt-40 md:pt-52 pb-8`}
        style={isMobile ? { WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" } : undefined}
      >
        <div
          ref={trackRef}
          className={`flex ${isMobile ? "" : "will-change-transform"} gap-6 md:gap-14`}
          style={{ paddingLeft: "1.5rem", paddingRight: "20vw" }}
        >
          <PitchPanel
            tag="01 · SWAP"
            label="SAME-CHAIN AGGREGATION"
            backdrop="Swap."
            heading={
              <>
                Other people swap.{" "}
                <span style={{ color: "#FF8A00", fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                  You arrive.
                </span>
              </>
            }
            body="Best price across every DEX on 15+ chains.  Pair-type pricing  — cheapest stable-pair fees in DeFi."
            stats={[
              { v: "9", l: "BPS · STABLE / STABLE" },
              { v: "15", l: "BPS · STABLE / VOLATILE" },
              { v: "28", l: "BPS · VOLATILE / VOLATILE" },
            ]}
            accent={
              <FeeMockup />
            }
          />

          <PitchPanel
            tag="02 · CROSS"
            label="TWELVE-RAIL CROSS-CHAIN"
            backdrop="Cross."
            heading={
              <>
                Other people bridge.{" "}
                <span style={{ color: "#FF8A00", fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                  You arrive.
                </span>
              </>
            }
            body="From native BTC to USDC on Base in one transaction.  Twelve rails behind one interface, sorted by output."
            stats={[
              { v: "16×", l: "FEWER STEPS" },
              { v: "75%", l: "LESS COST" },
              { v: "3–6×", l: "FASTER" },
            ]}
            accent={
              <CrossMockup />
            }
          />

          <PitchPanel
            tag="03 · AUTOMATE"
            label="AGENT-READY SDK"
            backdrop="Automate."
            heading={
              <>
                Agents trade.{" "}
                <span style={{ color: "#FF8A00", fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                  We ship the rails.
                </span>
              </>
            }
            body="Tool schemas for OpenAI, Claude, LangChain.  Pay-per-call x402 RPC — no API keys.  Burner wallets in the box."
            stats={[
              { v: "10", l: "LINES TO A SWAP" },
              { v: "0", l: "API KEYS" },
              { v: "3", l: "AGENT FRAMEWORKS" },
            ]}
            accent={
              <CodeMockup />
            }
          />
        </div>
      </div>
    </section>
  );
}

// ─── Pitch Panel ────────────────────────────────────────────────────────────

interface PanelProps {
  tag: string;
  label: string;
  backdrop: string;
  heading: React.ReactNode;
  body: string;
  stats: { v: string; l: string }[];
  accent: React.ReactNode;
}

function PitchPanel({ tag, label, backdrop, heading, body, stats, accent }: PanelProps) {
  return (
    <div
      className="relative flex-shrink-0 flex flex-col justify-between overflow-hidden"
      style={{
        width: "min(92vw, 1000px)",
        minHeight: "62vh",
        scrollSnapAlign: "start",
      }}
    >
      {/* Massive backdrop word — bleeds behind content (clipped to panel) */}
      <p
        aria-hidden
        className="absolute top-0 left-0 right-0 pointer-events-none select-none italic leading-[0.85] text-white/[0.04] whitespace-nowrap"
        style={{
          fontSize: "clamp(120px, 22vw, 340px)",
          fontFamily: "'Instrument Serif', serif",
          letterSpacing: "-0.04em",
        }}
      >
        {backdrop}
      </p>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col gap-3 md:gap-4 pt-4 md:pt-6">
        <p
          className="text-[10px] md:text-[11px] uppercase"
          style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
        >
          {tag}
        </p>

        <p
          className="text-[10px] md:text-[11px] uppercase text-white/35"
          style={{ letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </p>

        <h3
          className="text-white font-light leading-[0.98] max-w-4xl"
          style={{
            fontSize: "clamp(34px, 5vw, 76px)",
            letterSpacing: "-0.02em",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {heading}
        </h3>

        <p
          className="text-white/55 text-sm md:text-base lg:text-lg leading-relaxed max-w-2xl"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {body}
        </p>
      </div>

      {/* Bottom row: accent visual + stats */}
      <div className="relative z-10 grid md:grid-cols-12 gap-4 md:gap-6 mt-6 md:mt-8 items-end">
        <div className="md:col-span-7">{accent}</div>
        <div className="md:col-span-5 grid grid-cols-3 gap-3 md:gap-4 border-t border-white/10 pt-6 md:pt-8">
          {stats.map((s, i) => (
            <div key={i}>
              <p
                className="text-white font-light leading-none mb-2"
                style={{
                  fontSize: "clamp(22px, 2.8vw, 42px)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#FF8A00",
                  letterSpacing: "-0.02em",
                  textShadow: "0 0 30px rgba(255,138,0,0.3)",
                }}
              >
                {s.v}
              </p>
              <p
                className="text-[9px] uppercase text-white/40"
                style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}
              >
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mockups ────────────────────────────────────────────────────────────────

function FeeMockup() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
      className="p-5 md:p-7 border border-white/10 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.025)", borderRadius: 6 }}
    >
      <p className="text-[10px] uppercase text-white/40 mb-4" style={{ letterSpacing: "0.3em" }}>
        ETH → USDC · ARBITRUM
      </p>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-white text-2xl md:text-3xl font-light">1,000.0</p>
        <p className="text-white/50 text-sm md:text-base">ETH</p>
      </div>
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-white text-2xl md:text-3xl font-light">3,184,200.00</p>
        <p style={{ color: "#FF8A00" }} className="text-sm md:text-base font-medium">USDC</p>
      </div>
      <div className="border-t border-white/10 pt-3 space-y-1 text-xs text-white/50">
        <div className="flex justify-between"><span>Pair type</span><span className="text-white/70">V / S</span></div>
        <div className="flex justify-between"><span>Protocol fee</span><span style={{ color: "#FF8A00" }}>15 bps · $4.78</span></div>
        <div className="flex justify-between"><span>Best route</span><span className="text-white/70">Uniswap V3</span></div>
      </div>
    </motion.div>
  );
}

function CrossMockup() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-2 gap-3"
    >
      <div className="p-4 border border-white/8" style={{ background: "rgba(255,255,255,0.015)", borderRadius: 4 }}>
        <p className="text-[9px] uppercase text-white/35 mb-2" style={{ letterSpacing: "0.3em" }}>LEGACY · 4 STEPS</p>
        <p className="text-white/60 text-sm leading-snug">DEX → Bridge → DEX → CEX off-ramp</p>
        <p className="text-white/40 text-xs mt-2">~80 bps · 30–60 min · KYC</p>
      </div>
      <div
        className="p-4 border border-[#FF8A00]/30"
        style={{
          background: "linear-gradient(135deg, rgba(255,138,0,0.06) 0%, transparent 100%)",
          borderRadius: 4,
          boxShadow: "0 0 40px rgba(255,138,0,0.1)",
        }}
      >
        <p className="text-[9px] uppercase mb-2" style={{ letterSpacing: "0.3em", color: "#FF8A00" }}>EMPX · 1 STEP</p>
        <p className="text-white text-sm leading-snug">EmpX cross-chain via THORChain</p>
        <p style={{ color: "#FF8A00" }} className="text-xs mt-2">5 bps · 10 min · no KYC</p>
      </div>
    </motion.div>
  );
}

function CodeMockup() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
      className="border border-white/10 relative"
      style={{ background: "#0A0A12", borderRadius: 6 }}
    >
      <span
        className="absolute top-2 right-3 text-[9px] uppercase font-medium z-10"
        style={{ color: "#FF8A00", letterSpacing: "0.25em" }}
      >
        NO KEYS
      </span>
      <pre
        className="p-3 md:p-4 text-[10px] md:text-[11px] leading-[1.5]"
        style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
      >
        <span style={{ color: "#FF8A00" }}>import</span>
        <span className="text-white/70">{" { createRouter, getClaudeTools };"}</span>
        <br />
        <span style={{ color: "#FF8A00" }}>const</span>
        <span className="text-white/70">{" tools = "}</span>
        <span style={{ color: "#FFB347" }}>getClaudeTools</span>
        <span className="text-white/70">();</span>
        <br />
        <span style={{ color: "#FF8A00" }}>await</span>
        <span className="text-white/70">{" router."}</span>
        <span style={{ color: "#FFB347" }}>swap</span>
        <span className="text-white/70">{"(amountIn, ...);"}</span>
      </pre>
    </motion.div>
  );
}
