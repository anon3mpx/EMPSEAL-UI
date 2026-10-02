// ─── LandingV4Mobile — stacked landing for viewports the stage can't fit ──
//
// The v4 scroll stage is a fixed-pixel composition (min 1180px wide) driven by
// landingV4Engine's own layout math, so it cannot reflow onto a phone. Below
// that width LandingV4 renders this plain, engine-free layout instead, reusing
// the signed-off copy so both versions say the same thing.

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { EMPX_SOCIALS } from "../../../design-system/data/socials";
import { mountDensityArt, mountHalftoneMark, type DensityArt } from "./mobileVisuals";
import "./landing-v4-mobile.css";

const LAUNCH_APP_PATH = "/portfolio-v2";
const DOCS_URL = "https://docs.empx.io";
const socialHref = (kind: (typeof EMPX_SOCIALS)[number]["kind"]) =>
  EMPX_SOCIALS.find((s) => s.kind === kind)?.href ?? "#";

// Mirrors the engine's SUB deck (landingV4Engine.ts) — keep the two in step.
const LAYERS = [
  { art: "swap", k: "01 · Layer", t: "Swap", s: "Same-chain aggregation", d: "Best price across 100+ DEXes on 15+ chains. Fully on-chain and permissionless — any token, any pair, no listing required." },
  { art: "cross", k: "02 · Layer", t: "Cross", s: "Twelve-rail cross-chain", d: "Other people bridge. You arrive. From native BTC to USDC on Base in one transaction — twelve rails behind one interface, sorted by output." },
  { art: "agents", k: "03 · Layer", t: "Agents", s: "Agent-ready infrastructure", d: "Agents trade rails. An MCP server, tool schemas for OpenAI and LangChain, x402 pay-per-call RPC, and burner wallets in the box." },
  { art: "embed", k: "04 · Layer", t: "Integrate", s: "Every surface", d: "Widget, SDK, API, or the router contracts direct. Your brand on our engine, with affiliate share built into every route." },
] as const satisfies readonly { art: DensityArt }[];

const PRODUCTS = [
  { label: "Swap", to: "/swap-v2" },
  { label: "Cross-chain", to: "/cross-v2" },
  { label: "Multi-send", to: "/multi-v2" },
  { label: "Gas top-up", to: "/gas-v2" },
  { label: "Portfolio", to: "/portfolio-v2" },
] as const;

function ArtCanvas({ className, mount }: { className: string; mount: (canvas: HTMLCanvasElement) => () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? mount(ref.current) : undefined), [mount]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

const mountHeroMark = (canvas: HTMLCanvasElement) => mountHalftoneMark(canvas, "/emp-logo.png");
const LAYER_MOUNTS = Object.fromEntries(
  LAYERS.map((layer) => [layer.art, (canvas: HTMLCanvasElement) => mountDensityArt(canvas, layer.art)]),
) as Record<DensityArt, (canvas: HTMLCanvasElement) => () => void>;

export default function LandingV4Mobile() {
  return (
    <div className="empx-landing-m">
      <header className="m-top">
        <span className="m-brand"><img src="/emp-logo.png" alt="" />EmpX</span>
        <Link className="m-btnA m-sm" to={LAUNCH_APP_PATH}>Launch app</Link>
      </header>

      <section className="m-hero">
        <ArtCanvas className="m-heroArt" mount={mountHeroMark} />
        <h1>The settlement layer<br />for <b>every chain.</b></h1>
        <p>On-chain, permissionless aggregation with native settlement across 15+ chains and 100+ DEXes — and cross-chain reach to over 180. One router, one signature.</p>
        <div className="m-row">
          <Link className="m-btnA" to={LAUNCH_APP_PATH}>Launch app</Link>
          <a className="m-btnB" href={DOCS_URL} target="_blank" rel="noopener noreferrer">Integrate EmpX</a>
        </div>
        <div className="m-stats">
          <div><span className="m-bdg">Live</span><strong>180+</strong><small>Chains reachable</small></div>
          <div><span className="m-bdg">Permissionless</span><strong>100+</strong><small>DEXes aggregated</small></div>
        </div>
      </section>

      <section className="m-layers" aria-label="Layers">
        {LAYERS.map((layer) => (
          <article key={layer.t}>
            <ArtCanvas className="m-art" mount={LAYER_MOUNTS[layer.art]} />
            <div className="m-kick">{layer.k}</div>
            <h2>{layer.t}</h2>
            <h3>{layer.s}</h3>
            <p>{layer.d}</p>
          </article>
        ))}
      </section>

      <footer className="m-ftr">
        <nav aria-label="Product">
          {PRODUCTS.map((p) => <Link key={p.to} to={p.to}>{p.label}</Link>)}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>
        <div className="m-socials">
          <a href={socialHref("x")} target="_blank" rel="noopener noreferrer">X</a>
          <a href={socialHref("github")} target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <small>© EmpX · The settlement layer for every chain</small>
      </footer>
    </div>
  );
}
