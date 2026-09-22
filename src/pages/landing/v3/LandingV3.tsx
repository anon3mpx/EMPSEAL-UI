// ─── Landing v3 — orchestrator ───────────────────────────────────────────
//
// Motion-direction pitch, built out: real logo (not a generic approximation),
// a brand-derived shear system reused as the page's card language, an
// anime.js route-drawing hero, a living ambient background, a hover
// constellation graph, an upgraded architecture section, and a mock agent
// console. Renders at `/landing-v3` — does not touch `/` or `/landing-v1`.

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

import NavbarV3 from "./NavbarV3";
import HeroV3 from "./HeroV3";
import BrandSystemSection from "./BrandSystemSection";
import LivingMeshBackground from "./LivingMeshBackground";
import MechanicalEngineSection from "./MechanicalEngineSection";
import LayersSectionV3 from "./LayersSectionV3";
import AgentConsoleSection from "./AgentConsoleSection";
import WidgetSectionV3 from "./WidgetSectionV3";
import FinalCTAV3 from "./FinalCTAV3";

import ProblemSection from "../v2/ProblemSection";
import IntegrationsSection from "../v2/IntegrationsSection";
import WhoIntegratesSection from "../v2/WhoIntegratesSection";
import WhitepaperSection from "../v2/WhitepaperSection";

import "../v2/landing-v2.css";
import "./landing-v3.css";

gsap.registerPlugin(ScrollTrigger);

export default function LandingV3() {
  useEffect(() => {
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
    <main id="landing-v3-root" className="relative" style={{ background: "#05050c", color: "#fff" }}>
      <LivingMeshBackground />
      <div className="relative z-10">
        <NavbarV3 />
        <HeroV3 />
        <BrandSystemSection />
        <section id="problem"><ProblemSection /></section>
        <MechanicalEngineSection />
        <section id="integrations"><IntegrationsSection /></section>
        <section id="who-integrates"><WhoIntegratesSection /></section>
        <LayersSectionV3 />
        <AgentConsoleSection />
        <WidgetSectionV3 />
        <section id="whitepaper"><WhitepaperSection /></section>
        <FinalCTAV3 />
      </div>
    </main>
  );
}
