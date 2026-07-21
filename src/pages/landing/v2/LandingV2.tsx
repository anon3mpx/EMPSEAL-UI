// ─── Landing v2 — orchestrator ───────────────────────────────────────────────
//
// Composes all sections + wires Lenis for buttery smooth scroll.
// Renders at `/` (replaces the existing Landing).

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

import NavbarV2 from "./NavbarV2";
import HeroV2 from "./HeroV2";
import ProblemSection from "./ProblemSection";
import ChainsSection from "./ChainsSection";
import IntegrationsSection from "./IntegrationsSection";
import WhoIntegratesSection from "./WhoIntegratesSection";
import LayersSection from "./LayersSection";
import SDKSection from "./SDKSection";
import WidgetSection from "./WidgetSection";
import WhitepaperSection from "./WhitepaperSection";
import FinalCTA from "./FinalCTA";

import "./landing-v2.css";

gsap.registerPlugin(ScrollTrigger);

export default function LandingV2() {
  useEffect(() => {
    // ─── Lenis smooth scroll ─────────────────────────────────────────────
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP ScrollTrigger with Lenis
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <main
      id="landing-v2-root"
      style={{ background: "#05050c", color: "#fff" }}
    >
      <NavbarV2 />
      <HeroV2 />
      <section id="problem"><ProblemSection /></section>
      <section id="chains"><ChainsSection /></section>
      <section id="integrations"><IntegrationsSection /></section>
      <section id="who-integrates"><WhoIntegratesSection /></section>
      <section id="layers"><LayersSection /></section>
      <section id="sdk"><SDKSection /></section>
      <section id="widget"><WidgetSection /></section>
      <section id="whitepaper"><WhitepaperSection /></section>
      <FinalCTA />
    </main>
  );
}
