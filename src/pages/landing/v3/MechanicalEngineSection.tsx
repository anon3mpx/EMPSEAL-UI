// ─── The Engine (idea 03, rebuilt a third time — proper mesh) ────────────
//
// Previous version had one ring of decoration and six generic spoke
// labels — motion with nothing to say. This version gives the diagram an
// actual information architecture:
//   - INNER ring = the EmpX aggregator's own reach: real chain logos,
//     the chains it settles across directly.
//   - OUTER ring = who plugs into that reach: six audience categories,
//     each with real body copy + real example integrations (reused
//     verbatim from WhoIntegratesSection's verified content, not invented).
//   - Every node connects to its ring neighbors AND to the core, plus each
//     outer category connects to its two nearest inner chains — an actual
//     mesh, not pure hub-and-spoke.
// Scroll reveals it in the order that makes sense: inner ring assembles
// first (what EmpX reaches), then outer ring assembles second (who uses
// that reach) — the stagger itself carries meaning now, not just motion.
// GSAP ScrollTrigger scrub for the staggered reveal (same pin mechanism as
// ProblemSection); anime.js for the continuous ambient rotation/pulse that
// runs independent of scroll, once assembled.

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { animate } from "animejs";
import { EVM_CHAINS, NATIVE_CHAINS, type Chain } from "../v2/ChainsSection";
import { ChainLogo } from "../../../design-system/components";

gsap.registerPlugin(ScrollTrigger);

const SIZE = 1000;
const CENTER = SIZE / 2;
const CORE_R = 42;
const INNER_R = 175;
const OUTER_R = 350;

const INNER_CHAINS: Chain[] = [...EVM_CHAINS.slice(0, 10), ...NATIVE_CHAINS.slice(0, 6)];

interface Category {
  label: string;
  body: string;
  examples: string;
}
const OUTER_CATEGORIES: Category[] = [
  { label: "Wallets", body: "Add DEX + cross-chain routing to your send/receive UI.", examples: "MetaMask Snaps · Rabby · Phantom" },
  { label: "Protocols & dApps", body: "Any dApp where users convert assets before depositing.", examples: "Aave · Pendle · GMX" },
  { label: "Meme Coins", body: "One-click buy pages that work from any chain, any asset.", examples: "Launch sites · Airdrop claims" },
  { label: "AI Agents", body: "Tool schemas for OpenAI, Claude, LangChain ship in the SDK.", examples: "Trading bots · Rebalancers" },
  { label: "Treasuries", body: "Sub-10bps multi-chain moves, fully on-chain and auditable.", examples: "DAO treasuries · Trading desks" },
  { label: "New Chains", body: "Branded swap UI + rails wired in, live in under 30 days.", examples: "Pre-launch L2s · App-chains" },
];

function pt(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}
function innerAngle(i: number) {
  return (i / INNER_CHAINS.length) * 360 - 90;
}
function outerAngle(i: number) {
  return -90 + i * 60;
}
// nearest inner-chain indices for a given outer angle, for the cross-mesh lines
function nearestInner(angle: number, count: number) {
  const idxs = INNER_CHAINS.map((_, i) => i);
  idxs.sort((a, b) => {
    const da = Math.abs(((innerAngle(a) - angle + 540) % 360) - 180);
    const db = Math.abs(((innerAngle(b) - angle + 540) % 360) - 180);
    return da - db;
  });
  return idxs.slice(0, count);
}

export default function MechanicalEngineSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const coreRef = useRef<SVGGElement | null>(null);
  const innerRingSpinRef = useRef<SVGGElement | null>(null);
  const outerRingSpinRef = useRef<SVGGElement | null>(null);

  const innerNodeRefs = useRef<(SVGGElement | null)[]>([]);
  const innerRingLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const innerCoreLineRefs = useRef<(SVGLineElement | null)[]>([]);

  const outerNodeRefs = useRef<(SVGGElement | null)[]>([]);
  const outerCoreLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const meshLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const outerLabelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Measure the header block so the diagram gets the ACTUAL remaining
  // space below it, instead of guessing an offset — this is what caused
  // the north-pole node to collide with the header once the stat row
  // made the header taller.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Continuous ambient motion — independent of scroll.
  useEffect(() => {
    const a1 = coreRef.current ? animate(coreRef.current, { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9], duration: 3400, loop: true, ease: "inOutSine" }) : null;
    const a2 = innerRingSpinRef.current ? animate(innerRingSpinRef.current, { rotate: 360, duration: 90000, loop: true, ease: "linear" }) : null;
    const a3 = outerRingSpinRef.current ? animate(outerRingSpinRef.current, { rotate: -360, duration: 150000, loop: true, ease: "linear" }) : null;
    return () => { a1?.pause(); a2?.pause(); a3?.pause(); };
  }, []);

  // Staggered scroll reveal: inner ring (what EmpX reaches) assembles first,
  // outer ring (who plugs in) assembles second. Same GSAP pin as before.
  useEffect(() => {
    if (isMobile) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const innerNodes = innerNodeRefs.current.filter(Boolean) as SVGGElement[];
      const innerRingLines = innerRingLineRefs.current.filter(Boolean) as SVGLineElement[];
      const innerCoreLines = innerCoreLineRefs.current.filter(Boolean) as SVGLineElement[];
      const outerNodes = outerNodeRefs.current.filter(Boolean) as SVGGElement[];
      const outerCoreLines = outerCoreLineRefs.current.filter(Boolean) as SVGLineElement[];
      const meshLines = meshLineRefs.current.filter(Boolean) as SVGLineElement[];
      const outerLabels = outerLabelRefs.current.filter(Boolean) as HTMLDivElement[];

      gsap.set(innerNodes, { scale: 0, opacity: 0 });
      gsap.set([...innerRingLines, ...innerCoreLines, ...outerCoreLines, ...meshLines], { opacity: 0 });
      gsap.set(outerNodes, { scale: 0, opacity: 0 });
      gsap.set(outerLabels, { opacity: 0, y: 8 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=260%",
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Stage 1 — inner ring: what EmpX reaches
      innerNodes.forEach((n, i) => tl.to(n, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, 0.02 * i));
      innerCoreLines.forEach((l, i) => tl.to(l, { opacity: 0.35, duration: 0.4 }, 0.02 * i));
      innerRingLines.forEach((l, i) => tl.to(l, { opacity: 0.5, duration: 0.4 }, 0.3 + 0.015 * i));

      // Stage 2 — outer ring: who plugs into that reach
      outerNodes.forEach((n, i) => tl.to(n, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)" }, 0.55 + 0.08 * i));
      outerCoreLines.forEach((l, i) => tl.to(l, { opacity: 0.55, duration: 0.5 }, 0.55 + 0.08 * i));
      meshLines.forEach((l, i) => tl.to(l, { opacity: 0.28, duration: 0.5 }, 0.65 + 0.04 * i));
      tl.to(outerLabels, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 }, 0.75);

      // hold
      tl.to({}, { duration: 0.7 });

      // collapse back toward the core before releasing the pin
      tl.to([...outerLabels], { opacity: 0, duration: 0.3 }, "+=0");
      tl.to([...outerNodes, ...outerCoreLines, ...meshLines], { opacity: 0, scale: 0, duration: 0.5 }, "<");
      tl.to([...innerNodes, ...innerRingLines, ...innerCoreLines], { opacity: 0, scale: 0, duration: 0.5 }, "<0.1");
    }, section);

    return () => ctx.revert();
  }, [isMobile]);

  const hoveredChain = hovered !== null ? INNER_CHAINS[hovered] : null;

  // The diagram is a true square; it must fit in whatever vertical room is
  // left after the (variably-tall) header, not in the full 100vh — that
  // mismatch is what let the north-pole node collide with the header once
  // the stat row made the header taller.
  const diagramMax = headerHeight > 0 ? `calc(100vh - ${headerHeight + 140}px)` : "70vh";

  return (
    <section
      id="chains"
      ref={sectionRef}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ minHeight: "100vh", padding: "64px 24px 40px" }}
    >
      <div ref={headerRef} className="relative mb-8 md:mb-10 px-6 md:px-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="shear-chip" />
            <p className="text-[11px] uppercase text-[#FFB347]" style={{ letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}>
              03 — The engine
            </p>
          </div>
          <h2
            className="text-white font-light leading-[1.05]"
            style={{ fontSize: "clamp(26px, 3.4vw, 46px)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            One aggregator's reach.{" "}
            <span className="italic" style={{ fontFamily: "'Instrument Serif', serif", color: "#FF8A00" }}>
              A mesh of everyone who plugs in.
            </span>
          </h2>
          <div className="flex items-center justify-center gap-8 md:gap-14 mt-6">
            <div className="text-center">
              <p className="text-white font-light leading-none" style={{ fontSize: "clamp(20px, 2.4vw, 30px)", fontFamily: "'Space Grotesk', sans-serif", color: "#FF8A00" }}>Multiple</p>
              <p className="text-[9px] uppercase text-white/40 mt-1" style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}>Same-chain aggregator, growing</p>
            </div>
            <div className="w-px h-9 bg-white/10" />
            <div className="text-center">
              <p className="text-white font-light leading-none" style={{ fontSize: "clamp(20px, 2.4vw, 30px)", fontFamily: "'Space Grotesk', sans-serif", color: "#FF8A00" }}>180+</p>
              <p className="text-[9px] uppercase text-white/40 mt-1" style={{ letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}>Chains reachable, all rails combined</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ width: `min(100%, 1180px, ${diagramMax})`, aspectRatio: "1 / 1" }}>
        <div
          className="absolute"
          style={{ width: "55%", height: "55%", background: "radial-gradient(circle, rgba(255,138,0,0.16) 0%, transparent 70%)", filter: "blur(60px)" }}
          aria-hidden
        />

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative w-full h-full" style={{ overflow: "visible" }}>
          <defs>
            <filter id="engineGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="coreFill" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#FFF4E2" />
              <stop offset="45%" stopColor="#FFB347" />
              <stop offset="100%" stopColor="#FF8A00" />
            </radialGradient>
          </defs>

          {/* ---- mesh lines (under everything) ---- */}
          {/* inner ring neighbor-to-neighbor */}
          {INNER_CHAINS.map((c, i) => {
            const a = pt(innerAngle(i), INNER_R);
            const b = pt(innerAngle((i + 1) % INNER_CHAINS.length), INNER_R);
            return <line key={`ir-${c.symbol}`} ref={(el) => { innerRingLineRefs.current[i] = el; }} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FF8A00" strokeWidth="1" />;
          })}
          {/* inner node to core */}
          {INNER_CHAINS.map((c, i) => {
            const a = pt(innerAngle(i), INNER_R);
            return <line key={`ic-${c.symbol}`} ref={(el) => { innerCoreLineRefs.current[i] = el; }} x1={CENTER} y1={CENTER} x2={a.x} y2={a.y} stroke="#FFB347" strokeWidth="0.75" />;
          })}
          {/* outer node to core */}
          {OUTER_CATEGORIES.map((cat, i) => {
            const a = pt(outerAngle(i), OUTER_R);
            return <line key={`oc-${cat.label}`} ref={(el) => { outerCoreLineRefs.current[i] = el; }} x1={CENTER} y1={CENTER} x2={a.x} y2={a.y} stroke="#FF8A00" strokeWidth="1.2" />;
          })}
          {/* cross mesh: each outer category to its 2 nearest inner chains */}
          {OUTER_CATEGORIES.flatMap((cat, i) => {
            const oAngle = outerAngle(i);
            const o = pt(oAngle, OUTER_R);
            return nearestInner(oAngle, 2).map((ci, k) => {
              const inP = pt(innerAngle(ci), INNER_R);
              const idx = i * 2 + k;
              return <line key={`mesh-${i}-${ci}`} ref={(el) => { meshLineRefs.current[idx] = el; }} x1={o.x} y1={o.y} x2={inP.x} y2={inP.y} stroke="#FFB347" strokeWidth="0.6" strokeDasharray="1 4" />;
            });
          })}

          {/* ---- core: the real mark, not a placeholder shape ---- */}
          <g ref={coreRef} style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
            <circle cx={CENTER} cy={CENTER} r={CORE_R} fill="url(#coreFill)" filter="url(#engineGlow)" />
            <foreignObject x={CENTER - CORE_R * 0.62} y={CENTER - CORE_R * 0.52} width={CORE_R * 1.24} height={CORE_R * 1.04} style={{ pointerEvents: "none" }}>
              <img src="/brand/empx-mark-full.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) saturate(100%)", opacity: 0.82 }} />
            </foreignObject>
          </g>

          {/* ---- inner ring: chains the aggregator reaches ---- */}
          <g ref={innerRingSpinRef} style={{ transformOrigin: `${CENTER}px ${CENTER}px`, opacity: 0.9 }}>
            <circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(255,179,71,0.12)" strokeWidth="1" strokeDasharray="1 6" />
          </g>
          {INNER_CHAINS.map((c, i) => {
            const p = pt(innerAngle(i), INNER_R);
            return (
              <g
                key={c.symbol}
                ref={(el) => { innerNodeRefs.current[i] = el; }}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle r={hovered === i ? 19 : 15} fill="#0a0a14" stroke={hovered === i ? "#FF8A00" : "rgba(255,179,71,0.45)"} strokeWidth="1.4" style={{ transition: "r 180ms ease, stroke 180ms ease" }} />
                <foreignObject x={-11} y={-11} width={22} height={22} style={{ pointerEvents: "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", overflow: "hidden" }}>
                    <ChainLogo symbol={c.symbol} bg={c.bg} fg={c.fg} size={22} />
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* ---- outer ring: who plugs in ---- */}
          <g ref={outerRingSpinRef} style={{ transformOrigin: `${CENTER}px ${CENTER}px`, opacity: 0.7 }}>
            <circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(255,179,71,0.08)" strokeWidth="1" strokeDasharray="1 9" />
          </g>
          {OUTER_CATEGORIES.map((cat, i) => {
            const p = pt(outerAngle(i), OUTER_R);
            return (
              <g key={cat.label} ref={(el) => { outerNodeRefs.current[i] = el; }} transform={`translate(${p.x}, ${p.y})`} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                <circle r="7" fill="#0a0a14" stroke="#FF8A00" strokeWidth="1.6" />
                <circle r="2.4" fill="#FFB347" />
              </g>
            );
          })}
        </svg>


        {/* outer labels */}
        {OUTER_CATEGORIES.map((cat, i) => {
          const angle = outerAngle(i);
          const rFrac = (OUTER_R / SIZE) * 1.2;
          const leftPct = 50 + Math.cos((angle * Math.PI) / 180) * rFrac * 100;
          const topPct = 50 + Math.sin((angle * Math.PI) / 180) * rFrac * 100;
          return (
            <div
              key={cat.label}
              ref={(el) => { outerLabelRefs.current[i] = el; }}
              className="absolute text-center pointer-events-none"
              style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%, -50%)", width: 168 }}
            >
              <p className="text-white text-[13.5px] font-medium mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{cat.label}</p>
              <p className="text-white/50 text-[10.5px] leading-snug mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{cat.body}</p>
              <p className="text-[#FFB347]/70 text-[9.5px] uppercase" style={{ letterSpacing: "0.08em", fontFamily: "Inter, sans-serif" }}>{cat.examples}</p>
            </div>
          );
        })}

        {/* hover detail for inner chain nodes */}
        <div
          className="absolute pointer-events-none transition-opacity duration-200"
          style={{
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            opacity: hoveredChain ? 1 : 0, width: 180, textAlign: "center",
          }}
        >
          {hoveredChain && (
            <>
              <p className="text-white text-[13px] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{hoveredChain.name}</p>
              <p className="text-[#FFB347] text-[9.5px] uppercase mt-0.5" style={{ letterSpacing: "0.2em" }}>{hoveredChain.type === "EVM" ? "EVM Aggregator" : "Cross-chain rail"}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
