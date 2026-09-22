// ─── Widget v3 (redesigned) ─────────────────────────────────────────────
//
// v1 of this section on the v3 page was untouched v2 content with a clipped
// corner slapped on — never actually redesigned, which is exactly why it
// still looked flat. This is a real pass: a live-ticking mock swap card
// with an animated glow border, and a code window that types in instead of
// sitting static.

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const TIERS = [
  { name: "STANDARD", share: "10%", eligibility: "Any integrator · default" },
  { name: "VOLUME_COMMITTED", share: "25%", eligibility: "$1M+/mo · 6+ months" },
  { name: "STRATEGIC", share: "50%", eligibility: "Governance / token swap" },
];

const CODE = [
  { t: "import", c: "#FF8A00" }, { t: " { EmpxSwap } ", c: "rgba(255,255,255,0.7)" },
  { t: "from", c: "#FF8A00" }, { t: " \"@empx/widget\";\n\n", c: "rgba(255,255,255,0.7)" },
  { t: "<EmpxSwap\n", c: "#FFB347" },
  { t: "  chainId={", c: "rgba(255,255,255,0.7)" }, { t: "8453", c: "#94A3B8" }, { t: "}\n", c: "rgba(255,255,255,0.7)" },
  { t: "  defaultTokenOut=", c: "rgba(255,255,255,0.7)" }, { t: "\"USDC\"\n", c: "#FF8A00" },
  { t: "  affiliate={{ address: ", c: "rgba(255,255,255,0.7)" }, { t: "\"0xYourFee\"", c: "#FF8A00" }, { t: ", tier: ", c: "rgba(255,255,255,0.7)" }, { t: "\"STANDARD\"", c: "#FF8A00" }, { t: " }}\n", c: "rgba(255,255,255,0.7)" },
  { t: "  theme={{ accent: ", c: "rgba(255,255,255,0.7)" }, { t: "\"#FF6B35\"", c: "#FF8A00" }, { t: " }}\n", c: "rgba(255,255,255,0.7)" },
  { t: "/>", c: "#94A3B8" },
];

function useTypewriter(active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const full = CODE.reduce((n, seg) => n + seg.t.length, 0);
    const id = setInterval(() => setCount((c) => (c >= full ? c : c + 3)), 16);
    return () => clearInterval(id);
  }, [active]);
  return count;
}

export default function WidgetSectionV3() {
  const [inView, setInView] = useState(false);
  const typed = useTypewriter(inView);

  let remaining = typed;
  const rendered = CODE.map((seg) => {
    const take = Math.max(0, Math.min(seg.t.length, remaining));
    remaining -= take;
    return { ...seg, t: seg.t.slice(0, take) };
  });

  return (
    <section id="widget" className="relative w-full py-32 md:py-48 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 md:mb-24 max-w-5xl">
          <div className="flex items-center gap-2 mb-6 md:mb-10">
            <span className="shear-chip" />
            <p className="text-[11px] md:text-[12px] uppercase" style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}>
              WHITE-LABEL THE LAYER
            </p>
          </div>
          <h2
            className="font-light text-white leading-[1.02]"
            style={{ fontSize: "clamp(34px, 5.5vw, 84px)", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Embed the swap.
            <br />
            <span className="italic" style={{ fontSize: "clamp(38px, 6.5vw, 100px)", fontFamily: "'Instrument Serif', serif", color: "#FF8A00", textShadow: "0 0 60px rgba(255,138,0,0.4)" }}>
              Earn the revenue.
            </span>
          </h2>
          <p className="mt-8 md:mt-12 text-white/60 text-base md:text-lg max-w-2xl leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
            Drop into any React dApp in ten lines. Brand it, theme it, route every swap through
            your affiliate address.
          </p>
        </div>

        <motion.div
          onViewportEnter={() => setInView(true)}
          className="grid md:grid-cols-2 gap-8 mb-20"
        >
          {/* Code window — types in */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="border border-white/10 rounded-lg overflow-hidden"
            style={{ background: "rgba(10,10,20,0.6)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <p className="text-[10px] uppercase text-white/40" style={{ letterSpacing: "0.3em" }}>APP.TSX</p>
              <span className="text-[10px] uppercase text-[#FF8A00]/70" style={{ letterSpacing: "0.3em" }}>10 LINES</span>
            </div>
            <pre className="p-6 md:p-8 text-[13px] md:text-sm overflow-x-auto min-h-[260px]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
              {rendered.map((seg, i) => (
                <span key={i} style={{ color: seg.c }}>{seg.t}</span>
              ))}
              {typed < CODE.reduce((n, s) => n + s.t.length, 0) && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: "inline-block", width: 7, height: 14, background: "#FF8A00", marginLeft: 2, verticalAlign: "-2px" }}
                />
              )}
            </pre>
          </motion.div>

          {/* Mock widget — animated glow border, ticking numbers */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="glow-ring" aria-hidden />
            <div
              className="relative border border-[#FF8A00]/25 rounded-lg p-6 md:p-8 flex flex-col gap-5"
              style={{ background: "linear-gradient(160deg, rgba(20,14,4,0.85) 0%, rgba(10,10,18,0.9) 100%)", backdropFilter: "blur(10px)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">Swap</p>
                <p className="text-[10px] uppercase text-[#FF8A00]" style={{ letterSpacing: "0.3em" }}>via EmpX</p>
              </div>

              <div className="p-4 border border-white/10 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[10px] uppercase text-white/40 mb-2" style={{ letterSpacing: "0.3em" }}>FROM</p>
                <div className="flex items-center justify-between">
                  <p className="text-white text-2xl font-light">1.000</p>
                  <p className="text-white/70 text-sm font-medium">ETH ▾</p>
                </div>
              </div>

              <motion.div
                className="flex justify-center"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#FF8A00", color: "#05050c", boxShadow: "0 0 24px rgba(255,138,0,0.5)" }}>↓</div>
              </motion.div>

              <div className="p-4 border border-[#FF8A00]/30 rounded" style={{ background: "rgba(255,138,0,0.05)" }}>
                <p className="text-[10px] uppercase mb-2" style={{ letterSpacing: "0.3em", color: "#FF8A00" }}>TO</p>
                <div className="flex items-center justify-between">
                  <p className="text-white text-2xl font-light">3,184.20</p>
                  <p className="text-white/70 text-sm font-medium">USDC ▾</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-white/50">
                <div className="flex justify-between"><span>Protocol fee (EmpX)</span><span>$0.48 · 15 bps</span></div>
                <div className="flex justify-between"><span>Bridge fee</span><span>$0.00</span></div>
                <div className="flex justify-between font-medium text-white/80 pt-1 border-t border-white/10">
                  <span>You earn (STANDARD 10%)</span><span style={{ color: "#FF8A00" }}>$0.05</span>
                </div>
              </div>

              <button className="w-full py-3 text-[11px] font-medium uppercase rounded" style={{ background: "#FF8A00", color: "#05050c", letterSpacing: "0.2em" }}>
                Swap →
              </button>
            </div>
          </motion.div>
        </motion.div>

        <div className="border-t border-white/8 pt-12">
          <p className="text-[10px] uppercase text-white/40 mb-8" style={{ letterSpacing: "0.4em" }}>AFFILIATE TIERS · THREE HONEST RATES</p>
          <div className="space-y-2">
            {TIERS.map((tier, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-12 gap-4 items-center py-5 border-b border-white/5"
              >
                <div className="col-span-12 md:col-span-3"><p className="text-white text-base md:text-lg font-medium">{tier.name}</p></div>
                <div className="col-span-6 md:col-span-2">
                  <p className="text-white font-light leading-none" style={{ fontSize: "clamp(24px, 3vw, 38px)", color: "#FF8A00", textShadow: "0 0 30px rgba(255, 138, 0, 0.35)" }}>{tier.share}</p>
                </div>
                <div className="col-span-6 md:col-span-7"><p className="text-white/60 text-sm md:text-base">{tier.eligibility}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .glow-ring {
          position: absolute;
          inset: -1px;
          border-radius: 10px;
          background: conic-gradient(from var(--a, 0deg), #FF8A00, #FFB347, transparent 40%, transparent 60%, #994f00, #FF8A00);
          filter: blur(14px);
          opacity: 0.55;
          animation: glow-spin 6s linear infinite;
          z-index: 0;
        }
        @keyframes glow-spin {
          to { --a: 360deg; }
        }
        @property --a {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @media (prefers-reduced-motion: reduce) {
          .glow-ring { animation: none; }
        }
      `}</style>
    </section>
  );
}
