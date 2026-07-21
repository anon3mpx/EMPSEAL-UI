// ─── Widget — white-label embed pitch ───────────────────────────────────────
//
// Left: code snippet of <EmpxSwap />.  Right: a mock widget preview.
// Below: three affiliate tier rows.

import { motion } from "framer-motion";

const TIERS = [
  { name: "STANDARD",          share: "10%", eligibility: "Any integrator · default" },
  { name: "VOLUME_COMMITTED",  share: "25%", eligibility: "$1M+/mo · 6+ months" },
  { name: "STRATEGIC",         share: "50%", eligibility: "Governance / token swap" },
];

export default function WidgetSection() {
  return (
    <section
      className="relative w-full py-32 md:py-48 px-6 md:px-12"
      style={{ background: "#05050c" }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 40% 60% at 20% 50%, rgba(255,138,0,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Header — editorial mix */}
        <div className="mb-16 md:mb-24 max-w-5xl">
          <p
            className="text-[11px] md:text-[12px] uppercase mb-6 md:mb-10"
            style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
          >
            WHITE-LABEL THE LAYER
          </p>
          <h2
            className="font-light text-white leading-[1.02]"
            style={{
              fontSize: "clamp(34px, 5.5vw, 84px)",
              letterSpacing: "-0.02em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Embed the swap.
            <br />
            <span
              className="italic"
              style={{
                fontSize: "clamp(38px, 6.5vw, 100px)",
                fontFamily: "'Instrument Serif', serif",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
                textShadow: "0 0 60px rgba(255,138,0,0.4)",
              }}
            >
              Earn the revenue.
            </span>
          </h2>
          <p
            className="mt-8 md:mt-12 text-white/60 text-base md:text-lg max-w-2xl leading-relaxed"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Drop into any React dApp in ten lines. Brand it, theme it, route
            every swap through your affiliate address.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {/* Code */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="border border-white/8"
            style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6 }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <p className="text-[10px] uppercase text-white/40" style={{ letterSpacing: "0.3em" }}>
                APP.TSX
              </p>
              <span className="text-[10px] uppercase text-[#FF8A00]/70" style={{ letterSpacing: "0.3em" }}>
                10 LINES
              </span>
            </div>
            <pre
              className="p-6 md:p-8 text-[13px] md:text-sm overflow-x-auto"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.85 }}
            >
              <span style={{ color: "#FF8A00" }}>import</span>
              <span className="text-white/70"> {`{ EmpxSwap }`} </span>
              <span style={{ color: "#FF8A00" }}>from</span>
              <span className="text-white/70"> &quot;@empx/widget&quot;;</span>{"\n\n"}
              <span style={{ color: "#94A3B8" }}>&lt;</span>
              <span style={{ color: "#FFB347" }}>EmpxSwap</span>{"\n"}
              <span className="text-white/70">  chainId=</span>
              <span style={{ color: "#94A3B8" }}>{`{`}</span>
              <span className="text-white/80">8453</span>
              <span style={{ color: "#94A3B8" }}>{`}`}</span>{"\n"}
              <span className="text-white/70">  defaultTokenOut=</span>
              <span style={{ color: "#FF8A00" }}>&quot;USDC&quot;</span>{"\n"}
              <span className="text-white/70">  affiliate=</span>
              <span style={{ color: "#94A3B8" }}>{`{`}</span>
              <span className="text-white/70">{`{ address: `}</span>
              <span style={{ color: "#FF8A00" }}>&quot;0xYourFee&quot;</span>
              <span className="text-white/70">, tier: </span>
              <span style={{ color: "#FF8A00" }}>&quot;STANDARD&quot;</span>
              <span className="text-white/70"> {`}}`}</span>{"\n"}
              <span className="text-white/70">  theme=</span>
              <span style={{ color: "#94A3B8" }}>{`{`}</span>
              <span className="text-white/70">{`{ accent: `}</span>
              <span style={{ color: "#FF8A00" }}>&quot;#FF6B35&quot;</span>
              <span className="text-white/70"> {`}}`}</span>{"\n"}
              <span style={{ color: "#94A3B8" }}>/&gt;</span>
            </pre>
          </motion.div>

          {/* Mock widget preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="border border-[#FF8A00]/25 p-6 md:p-8 flex flex-col gap-5"
            style={{
              background: "linear-gradient(135deg, rgba(255,138,0,0.04) 0%, rgba(255,138,0,0.01) 100%)",
              borderRadius: 6,
              boxShadow: "0 0 80px rgba(255, 138, 0, 0.10)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">Swap</p>
              <p className="text-[10px] uppercase text-[#FF8A00]" style={{ letterSpacing: "0.3em" }}>
                via EmpX
              </p>
            </div>

            {/* "From" field mock */}
            <div className="p-4 border border-white/10" style={{ borderRadius: 4 }}>
              <p className="text-[10px] uppercase text-white/40 mb-2" style={{ letterSpacing: "0.3em" }}>
                FROM
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white text-2xl font-light">1.000</p>
                <p className="text-white/70 text-sm font-medium">ETH ▾</p>
              </div>
            </div>

            {/* Swap arrow */}
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#FF8A00", color: "#05050c" }}
              >
                ↓
              </div>
            </div>

            {/* "To" field mock */}
            <div className="p-4 border border-[#FF8A00]/30" style={{ borderRadius: 4, background: "rgba(255,138,0,0.04)" }}>
              <p className="text-[10px] uppercase mb-2" style={{ letterSpacing: "0.3em", color: "#FF8A00" }}>
                TO
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white text-2xl font-light">3,184.20</p>
                <p className="text-white/70 text-sm font-medium">USDC ▾</p>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="space-y-1 text-xs text-white/50">
              <div className="flex justify-between">
                <span>Protocol fee (EmpX)</span>
                <span>$0.48 · 15 bps</span>
              </div>
              <div className="flex justify-between">
                <span>Bridge fee</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between font-medium text-white/80 pt-1 border-t border-white/10">
                <span>You earn (STANDARD 10%)</span>
                <span style={{ color: "#FF8A00" }}>$0.05</span>
              </div>
            </div>

            {/* CTA */}
            <button
              className="w-full py-3 text-[11px] font-medium uppercase"
              style={{ background: "#FF8A00", color: "#05050c", borderRadius: 4, letterSpacing: "0.2em" }}
            >
              Swap →
            </button>
          </motion.div>
        </div>

        {/* Affiliate tier rows */}
        <div className="border-t border-white/8 pt-12">
          <p className="text-[10px] uppercase text-white/40 mb-8" style={{ letterSpacing: "0.4em" }}>
            AFFILIATE TIERS · THREE HONEST RATES
          </p>
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
                <div className="col-span-12 md:col-span-3">
                  <p className="text-white text-base md:text-lg font-medium">{tier.name}</p>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <p
                    className="text-white font-light leading-none"
                    style={{
                      fontSize: "clamp(24px, 3vw, 38px)",
                      color: "#FF8A00",
                      textShadow: "0 0 30px rgba(255, 138, 0, 0.35)",
                    }}
                  >
                    {tier.share}
                  </p>
                </div>
                <div className="col-span-6 md:col-span-7">
                  <p className="text-white/60 text-sm md:text-base">{tier.eligibility}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
