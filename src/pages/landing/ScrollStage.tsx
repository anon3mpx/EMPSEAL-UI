/**
 * ScrollStage — 1400vh sticky canvas, all text driven by ONE GSAP timeline.
 *
 * Canvas is constrained to a centred box (~80vmin) so the cube is NEVER
 * stretched. The cube's dark background blends into #03030a via a radial
 * gradient that only covers the box edges.
 *
 * Scroll map (0 → 1):
 *  0.00–0.12  Hero
 *  0.14–0.34  Layer 01 — SWAP (left)
 *  0.36–0.56  Layer 02 — BRIDGE (right)
 *  0.58–0.76  Layer 03 — SDK / exploded (top-centre)
 *  0.78–0.94  Features panel (right)
 *  0.94–1.00  Stats strip (bottom)
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

import FrameCanvas from "./FrameCanvas";

const SCROLL_VH = 1400;

const LAYERS = [
  {
    tag: "DEX AGGREGATOR",
    title: "Best Rates.\nEvery Time.",
    body: "Smart routing scans 100+ DEXs in real-time for the lowest fees and minimal slippage on every trade.",
    side: "left" as const,
    label: "LAYER 01 · SWAP ENGINE",
  },
  {
    tag: "BRIDGE LAYER",
    title: "Cross-Chain.\nNative.",
    body: "Swap, bridge, and explore 20+ networks from one unified interface. Zero friction, full transparency.",
    side: "right" as const,
    label: "LAYER 02 · BRIDGE",
  },
];

const STATS = [
  { value: "100+", label: "DEXs Aggregated" },
  { value: "20+", label: "Networks" },
  { value: "99%", label: "Uptime" },
  { value: "$0", label: "Hidden Fees" },
];

const SDK_PILLS = [
  "Instant Swaps",
  "Cross-Chain Bridge",
  "Limit Orders",
  "Swap API",
];

export default function ScrollStage() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef<HTMLDivElement>(null);
  const p2Ref = useRef<HTMLDivElement>(null);
  const p3Ref = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    gsap.set(
      [
        p1Ref.current,
        p2Ref.current,
        p3Ref.current,
        featRef.current,
        statRef.current,
      ],
      { opacity: 0, pointerEvents: "none" },
    );
    gsap.set(heroRef.current, { opacity: 1 });

    gsap.set(canvasRef.current, { opacity: 0.9 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: zone,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
      },
    });
    tl.to(
      canvasRef.current,
      {
        opacity: 0.4,
        ease: "power2.out",
        duration: 0.15,
      },
      0.12,
    );

    tl.to(
      heroRef.current,
      { opacity: 0, y: -20, ease: "none", duration: 0.05 },
      0.07,
    );
    tl.to(p1Ref.current, { opacity: 1, ease: "none", duration: 0.06 }, 0.14);
    tl.to(p1Ref.current, { opacity: 0, ease: "none", duration: 0.06 }, 0.28);
    tl.to(p2Ref.current, { opacity: 1, ease: "none", duration: 0.06 }, 0.36);
    tl.to(p2Ref.current, { opacity: 0, ease: "none", duration: 0.06 }, 0.5);
    tl.to(p3Ref.current, { opacity: 1, ease: "none", duration: 0.06 }, 0.58);
    tl.to(p3Ref.current, { opacity: 0, ease: "none", duration: 0.06 }, 0.7);
    tl.to(featRef.current, { opacity: 1, ease: "none", duration: 0.07 }, 0.78);
    tl.to(featRef.current, { opacity: 0, ease: "none", duration: 0.03 }, 0.91);
    tl.to(statRef.current, { opacity: 1, ease: "none", duration: 0.04 }, 0.94);
    tl.to({}, { duration: 0.03 }, 0.97);

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={zoneRef}
      id="frame-scroll-zone"
      style={{ height: `${SCROLL_VH}vh` }}
      className="relative"
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ background: "#03030a" }}
      >
        {/* ── Subtle warm floor glow ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255,138,0,0.07) 0%, transparent 55%)",
          }}
        />

        {/* ── EMPX watermark — faint background brand presence ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center select-none"
          aria-hidden="true"
        >
          <span
            className="font-black tracking-[-0.03em]"
            style={{
              fontSize: "clamp(8rem, 22vw, 22rem)",
              color: "rgba(255,138,0,0.025)",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            EMPX
          </span>
        </div>

        {/* ── Full-viewport canvas — vignette drawn inside canvas for pixel-perfect blend ── */}
        <div ref={canvasRef} className="absolute inset-0 md:-ml-16 mt-12 z-10">
          <FrameCanvas />
        </div>

        {/* ── HERO — centred in viewport, below cube centre ── */}
        <div
          ref={heroRef}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          // style={{ paddingBottom: "clamp(2.5rem, 0vh, 6rem)" }}
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="text-[9px] sm:text-base font-black tracking-[0.45em] mb-4 text-center px-4"
            style={{ color: "var(--empx-orange)" }}
          >
            THE ULTIMATE MULTI-CHAIN DEX AGGREGATOR
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="font-black leading-[0.90] tracking-[-0.02em] text-center px-4"
            style={{ fontSize: "clamp(2.8rem, 8.5vw, 7.5rem)" }}
          >
            <span
              style={{
                background:
                  "linear-gradient(160deg, #FF8A00 0%, #FFB347 40%, #FF6000 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 48px rgba(255,138,0,0.4))",
              }}
            >
              TRADE SMARTER
            </span>
            <br />
            <span
              className="text-white/70"
              style={{
                fontSize: "0.44em",
                letterSpacing: "0.06em",
                fontWeight: 500,
              }}
            >
              ACROSS EVERY CHAIN WITH EMPX
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="mt-7 flex flex-col sm:flex-row items-center gap-3 pointer-events-auto"
          >
            <a
              href="https://empx.io"
              className="px-8 py-3.5 font-black text-[12px] tracking-[0.2em] transition-all duration-300 hover:scale-105 text-center"
              style={{
                background: "linear-gradient(135deg, #FF8A00, #FF6B00)",
                color: "#03030a",
                boxShadow: "0 0 40px rgba(255,138,0,0.4)",
              }}
            >
              ENTER DAPP
            </a>
            <a
              href="https://empx.io"
              className="px-8 py-3.5 font-bold text-[12px] tracking-[0.18em] text-white/55 hover:text-white transition-all duration-300 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,138,0,0.22)",
              }}
            >
              ENTER DOCS
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 }}
            className="mt-6 flex flex-col items-center gap-2 pointer-events-none"
          >
            <p className="text-[12px] text-white/70 tracking-[0.35em]">
              SCROLL TO EXPLORE
            </p>
            <div className="w-px h-8 bg-gradient-to-b from-[rgba(255,138,0,0.5)] to-transparent" />
          </motion.div>
        </div>

        {/* ── LAYER 01 — left ── */}
        <div
          ref={p1Ref}
          className="absolute top-1/2 left-4 sm:left-8 md:left-12 lg:left-20 -translate-y-1/2 z-30 pointer-events-none"
          style={{ maxWidth: "clamp(160px, 18vw, 260px)" }}
        >
          <p
            className="text-[10px] font-black tracking-[0.35em] mb-1"
            style={{ color: "rgba(255,138,0,0.5)" }}
          >
            LAYER 01
          </p>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/55 mb-4">
            SWAP ENGINE
          </p>
          <h2
            className="font-black leading-[1.0] tracking-tight mb-4"
            style={{
              fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)",
              background: "linear-gradient(135deg, #FF8A00, #FFB347)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Best Rates.
            <br />
            Every Time.
          </h2>
          <p className="text-[14px] text-white/85 leading-relaxed">
            Smart routing scans 100+ DEXs for lowest fees and minimal slippage
            on every trade.
          </p>
          {/* E logo accent */}
          <div
            className="mt-5 w-7 h-7 flex items-center justify-center"
            style={{
              background: "rgba(255,138,0,0.1)",
              border: "1px solid rgba(255,138,0,0.2)",
            }}
          >
            <img src="/emp-logo.png" alt="EMP LOGO" />
          </div>
        </div>

        {/* ── LAYER 02 — right ── */}
        <div
          ref={p2Ref}
          className="absolute top-1/2 right-4 sm:right-8 md:right-12 lg:right-20 -translate-y-1/2 z-30 pointer-events-none text-right"
          style={{ maxWidth: "clamp(160px, 18vw, 260px)" }}
        >
          <p
            className="text-[10px] font-black tracking-[0.35em] mb-1 text-right"
            style={{ color: "rgba(255,138,0,0.5)" }}
          >
            LAYER 02
          </p>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/55 mb-4">
            BRIDGE LAYER
          </p>
          <h2
            className="font-black leading-[1.0] tracking-tight mb-4"
            style={{
              fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)",
              background: "linear-gradient(135deg, #FF8A00, #FFB347)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Cross-Chain.
            <br />
            Native.
          </h2>
          <p className="text-[14px] text-white/85 leading-relaxed">
            Swap, bridge, and explore 20+ networks from one unified interface.
            Zero friction.
          </p>
          <div className="mt-5 flex justify-end">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{
                background: "rgba(255,138,0,0.1)",
                border: "1px solid rgba(255,138,0,0.2)",
              }}
            >
              <img src="/emp-logo.png" alt="EMP LOGO" />
            </div>
          </div>
        </div>

        {/* ── LAYER 03 — top-centre, SDK / exploded ── */}
        <div
          ref={p3Ref}
          className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none px-4"
          style={{ paddingTop: "clamp(4rem, 8vh, 7rem)" }}
        >
          <p
            className="text-[10px] font-black tracking-[0.4em] mb-1"
            style={{ color: "rgba(255,138,0,0.5)" }}
          >
            LAYER 03
          </p>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/55 mb-4">
            AI NATIVE SDK
          </p>
          <h2
            className="font-black leading-[1.0] tracking-tight text-center"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              background:
                "linear-gradient(135deg, #FF8A00 0%, #FFB347 60%, #FF6000 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            One stack.
            <br />
            Every chain.
          </h2>
          <p className="mt-4 text-[14px] text-white/85 text-center max-w-xs sm:max-w-sm leading-relaxed">
            Any protocol or AI agent integrates EMPX&apos;s multi-chain swap
            layer in minutes via our npm SDK.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SDK_PILLS.map((label) => (
              <span
                key={label}
                className="text-xs font-bold tracking-[0.15em] px-3 py-1.5"
                style={{
                  background: "rgba(255,138,0,0.09)",
                  border: "1px solid rgba(255,138,0,0.25)",
                  color: "var(--empx-orange)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── FEATURES — right panel ── */}
        <div
          ref={featRef}
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-end pr-4 sm:pr-8 md:pr-10 lg:pr-16"
        >
          <div style={{ width: "clamp(250px, 28vw, 340px)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(255,138,0,0.12)",
                  border: "1px solid rgba(255,138,0,0.2)",
                }}
              >
                <img src="/emp-logo.png" alt="EMP LOGO" />
              </div>
              <p
                className="text-[10px] font-black tracking-[0.4em]"
                style={{ color: "var(--empx-orange)" }}
              >
                WHAT WE DO
              </p>
            </div>
            <h2
              className="font-black leading-[1.05] tracking-tight text-white mb-5"
              style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)" }}
            >
              Trade smarter.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FF8A00, #FFB347)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Pay less.
              </span>
            </h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  tag: "DEX AGGREGATOR",
                  title: "Instant Swaps",
                  body: "100+ DEXs scanned in real-time. Best rates, minimal gas, zero hidden fees.",
                },
                {
                  tag: "SMART ORDERS",
                  title: "Limit Orders",
                  body: "Set and forget limit orders that execute automatically across all supported chains.",
                },
                {
                  tag: "BRIDGE",
                  title: "Cross-Chain Bridge",
                  body: "Transfer assets across 20+ chains. Fast, affordable, fully transparent.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-4"
                  style={{
                    background: "rgba(3,3,10,0.75)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,138,0,0.16)",
                  }}
                >
                  <p
                    className="text-[10px] font-black tracking-[0.25em] mb-1.5"
                    style={{ color: "var(--empx-orange)" }}
                  >
                    {f.tag}
                  </p>
                  <p className="text-[13px] font-bold text-white mb-1.5 leading-tight">
                    {f.title}
                  </p>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STATS — bottom strip ── */}
        <div
          ref={statRef}
          className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
        >
          <div
            className="mx-3 sm:mx-6 md:mx-10 mb-5"
            style={{
              background: "rgba(3,3,10,0.82)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255,138,0,0.12)",
            }}
          >
            <div className="grid grid-cols-4 divide-x divide-white/5">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center py-4 px-2"
                >
                  <p
                    className="text-2xl sm:text-3xl md:text-4xl font-black leading-none mb-1.5"
                    style={{
                      background:
                        i % 2 === 0
                          ? "linear-gradient(135deg, #FF8A00, #FFB347)"
                          : "linear-gradient(135deg, #FFB347, #FF6B00)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] sm:text-[9px] text-white/30 tracking-[0.15em] font-medium text-center">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Corner EMPX badge ── */}
        <div
          className="absolute bottom-6 right-5 z-30 pointer-events-none flex items-center gap-1.5"
          aria-hidden="true"
        >
          <span
            className="text-[7px] font-black tracking-[0.35em]"
            style={{ color: "rgba(255,138,0,0.25)" }}
          >
            POWERED BY EMPX
          </span>
        </div>
      </div>
    </div>
  );
}
