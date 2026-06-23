// ─── Navbar v2 — minimal, sticky, with magnetic CTA ──────────────────────────

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";
import { BrandMark } from "../../../design-system/components";

export default function NavbarV2() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(5, 5, 12, 0.8)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 md:h-20 flex items-center justify-between">
        {/* Brand mark — uses the BrandMark primitive (3 skewed parallelograms) */}
        <a href="/" className="flex items-center gap-3 group" aria-label="EmpX home">
          <span className="transition-transform duration-300 group-hover:scale-110">
            <BrandMark size={28} color="#FF8A00" />
          </span>
          <span
            className="text-white font-medium hidden sm:block"
            style={{ letterSpacing: "0.18em", fontFamily: "Inter, sans-serif", fontSize: 13 }}
          >
            EMPX
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#chains"
            className="text-white/60 hover:text-white text-xs uppercase transition-colors"
            style={{ letterSpacing: "0.25em" }}
          >
            Chains
          </a>
          <a
            href="#integrations"
            className="text-white/60 hover:text-white text-xs uppercase transition-colors"
            style={{ letterSpacing: "0.25em" }}
          >
            Integrations
          </a>
          <a
            href="#sdk"
            className="text-white/60 hover:text-white text-xs uppercase transition-colors"
            style={{ letterSpacing: "0.25em" }}
          >
            SDK
          </a>
          <a
            href="#widget"
            className="text-white/60 hover:text-white text-xs uppercase transition-colors"
            style={{ letterSpacing: "0.25em" }}
          >
            Widget
          </a>
          <a
            href="#whitepaper"
            className="text-white/60 hover:text-white text-xs uppercase transition-colors"
            style={{ letterSpacing: "0.25em" }}
          >
            Whitepaper
          </a>
        </div>

        {/* CTA */}
        <MagneticButton href="/portfolio-v2" variant="primary" size="default" strength={8}>
          Launch app →
        </MagneticButton>
      </div>
    </motion.nav>
  );
}
