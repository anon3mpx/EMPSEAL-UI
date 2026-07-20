// ─── Final CTA ───────────────────────────────────────────────────────────────

import MagneticButton from "./MagneticButton";
import { BrandMark, SocialTray, type SocialLink } from "../../../design-system/components";

const LANDING_SOCIALS: SocialLink[] = [
  { kind: "x",        href: "https://x.com/EmpXio",      label: "Follow on X" },
  { kind: "telegram", href: "https://t.me/EmpXEmpseal",        label: "Join Telegram" },
  { kind: "docs",     href: "https://docs.empx.io",        label: "Read the docs" },
  { kind: "github",   href: "https://github.com/3mperorsSeal", label: "Source on GitHub" },
];

export default function FinalCTA() {
  return (
    <section
      className="relative w-full py-32 md:py-48 px-6 md:px-12 overflow-hidden"
      style={{ background: "#05050c" }}
    >
      {/* Massive bottom glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(255,138,0,0.18) 0%, transparent 65%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto z-10 text-center">
        <p
          className="text-[11px] md:text-[12px] uppercase mb-10 md:mb-16"
          style={{ letterSpacing: "0.4em", color: "#FF8A00", fontFamily: "Inter, sans-serif" }}
        >
          SHIP TRADING · EARN REVENUE · SKIP THE BUILD
        </p>
        <h2
          className="font-light text-white leading-[0.95] mb-10 md:mb-14"
          style={{
            fontSize: "clamp(44px, 8vw, 128px)",
            letterSpacing: "-0.03em",
            fontFamily: "'Space Grotesk', sans-serif",
            textShadow:
              "0 0 80px rgba(255, 138, 0, 0.4), 0 0 160px rgba(255, 138, 0, 0.12)",
          }}
        >
          Plug in.{" "}
          <span
            className="italic"
            style={{
              color: "#FF8A00",
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.02em",
            }}
          >
            Earn.
          </span>{" "}
          Ship.
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center mb-20">
          <MagneticButton href="/portfolio-v2" variant="primary" size="large">
            Launch app →
          </MagneticButton>
          <MagneticButton href="https://docs.empx.network" variant="secondary" size="large">
            Read the docs
          </MagneticButton>
          <MagneticButton href="mailto:bd@empx.network" variant="ghost" size="large">
            Talk to BD
          </MagneticButton>
        </div>

        {/* Footer — brand mark + tagline + social tray + meta links */}
        <div className="pt-12 border-t border-white/8 flex flex-col md:flex-row gap-8 justify-between items-center">
          {/* Left: brand + tagline */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5">
            <BrandMark size={24} color="#FF8A00" />
            <p
              className="text-[10px] uppercase text-white/40 text-center md:text-left"
              style={{ letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
            >
              © 2026 EMPX · THE TRADING FRAMEWORK LAYER
            </p>
          </div>

          {/* Right: social icons + meta */}
          <div className="flex flex-col md:flex-row items-center gap-5">
            <SocialTray links={LANDING_SOCIALS} size={32} />
            <a
              href="mailto:bd@empx.network"
              className="text-[10px] uppercase text-white/40 hover:text-[#FF8A00] transition-colors"
              style={{ letterSpacing: "0.30em", fontFamily: "Inter, sans-serif" }}
            >
              BD · PARTNERSHIPS
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
