import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Swap", href: "#swap" },
  { label: "Bridge", href: "#bridge" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "SDK", href: "#sdk" },
  { label: "Docs", href: "/swap" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 pt-3"
    >
      <div
        className="max-w-7xl mx-auto flex items-center justify-between px-5 py-2.5 transition-all duration-700"
        style={{
          background: scrolled ? "rgba(3,3,10,0.88)" : "rgba(3,3,10,0.35)",
          backdropFilter: "blur(32px)",
          border: scrolled
            ? "1px solid rgba(255,138,0,0.12)"
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Link to="/" className="flex items-center shrink-0">
          <div className="relative" style={{ width: 120 }}>
            <img
              src="/emp-main-logo.png"
              alt="EMPX"
              sizes="120px"
              className="object-contain object-left"
            />
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[10px] font-bold tracking-[0.2em] text-white/40 hover:text-white transition-colors duration-300"
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            to="/swap"
            className="text-[10px] font-bold tracking-[0.15em] px-4 py-2 transition-all duration-300 text-white/60 hover:text-white"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            DOCS
          </Link>
          <Link
            to="/swap"
            className="text-[10px] font-black tracking-[0.15em] px-5 py-2.5 transition-all duration-300 flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, #FF8A00, #FF6B00)",
              color: "#03030a",
              boxShadow: "0 0 24px rgba(255,138,0,0.35)",
            }}
          >
            ENTER DAPP
            <span className="opacity-70">→</span>
          </Link>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Menu"
        >
          <span
            className={`block w-5 h-0.5 transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`}
            style={{ background: "#FF8A00" }}
          />
          <span
            className={`block w-5 h-0.5 transition-all duration-300 ${open ? "opacity-0" : ""}`}
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
          <span
            className={`block w-5 h-0.5 transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`}
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
        </button>
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden mx-4 mt-2 p-6 flex flex-col gap-5"
          style={{
            background: "rgba(3,3,10,0.96)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,138,0,0.14)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-semibold tracking-[0.15em] text-white/55 hover:text-white"
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
          <Link
            to="/swap"
            className="text-sm font-black tracking-[0.15em] mt-2 px-4 py-3.5 text-center"
            style={{
              background: "linear-gradient(135deg, #FF8A00, #FF6B00)",
              color: "#03030a",
            }}
          >
            ENTER DAPP →
          </Link>
        </motion.div>
      )}
    </motion.nav>
  );
}
