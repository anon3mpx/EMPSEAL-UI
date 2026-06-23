// ─── DappNavbar — responsive in-dApp top navigation ───────────────────────
//
// Layout adapts:
//   xs (< 640px)  → brand + hamburger; nav links collapse to drawer
//   md (640-1023) → brand + condensed links + controls
//   lg+ (1024+)   → full bar: brand + nav links centered + controls right
//
// Controls (NetworkSelector + WalletButton) drop into the drawer on phones.

import { ReactNode, useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { useIsMobile } from "../breakpoints";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}

interface DappNavbarProps {
  logo?: ReactNode;
  links: NavLink[];
  /** Right-side controls — typically NetworkSelector + WalletButton */
  controls?: ReactNode;
  /** Optional pre-controls slot (e.g. SocialTray icons + separator) */
  socials?: ReactNode;
  brandName?: string;
}

export default function DappNavbar({ logo, links, controls, socials, brandName = "EMPX" }: DappNavbarProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when transitioning to desktop
  useEffect(() => {
    if (!isMobile && drawerOpen) setDrawerOpen(false);
  }, [isMobile, drawerOpen]);

  // Close drawer on Esc
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: isMobile ? 56 : 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 14px" : "0 20px",
          background: "rgba(5,5,12,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontFamily: "Inter, sans-serif",
          gap: 12,
        }}
      >
        {/* Brand mark */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {logo ? (
            <span style={{ display: "inline-flex", alignItems: "center" }}>{logo}</span>
          ) : (
            <BrandMark size={22} />
          )}
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.18em",
            }}
          >
            {brandName}
          </span>
        </a>

        {/* Desktop: full nav links */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flex: 1,
              justifyContent: "center",
              minWidth: 0,
              overflowX: "auto",
              padding: "0 10px",
            }}
          >
            {links.map((link) => (
              <NavLinkPill key={link.href} link={link} />
            ))}
          </div>
        )}

        {/* Controls — render inline on desktop, only WalletButton on phone */}
        {!isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {socials}
            {controls}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Hamburger */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 34,
                height: 34,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 4,
                color: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                <path d="M1 1H13M1 6H13M1 11H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </nav>

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <MobileDrawer
          links={links}
          controls={controls}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function NavLinkPill({ link }: { link: NavLink }) {
  return (
    <a
      href={link.href}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px",
        borderRadius: 4,
        color: link.active ? "#FF8A00" : "rgba(255,255,255,0.78)",
        background: link.active ? "rgba(255,138,0,0.10)" : "transparent",
        textDecoration: "none",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        transition: "color 160ms ease, background 160ms ease",
      }}
      onMouseEnter={(e) => {
        if (link.active) return;
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.background = "rgba(255,255,255,0.045)";
      }}
      onMouseLeave={(e) => {
        if (link.active) return;
        e.currentTarget.style.color = "rgba(255,255,255,0.78)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Active indicator — thin orange underline */}
      {link.active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -2,
            left: "18%",
            right: "18%",
            height: 2,
            background: "#FF8A00",
            borderRadius: 1,
            boxShadow: "0 0 8px rgba(255,138,0,0.55)",
          }}
        />
      )}
      {link.label}
      {link.badge && (
        <span
          style={{
            fontSize: 8,
            padding: "2px 6px",
            background: link.active ? "rgba(255,138,0,0.22)" : "rgba(255,138,0,0.15)",
            color: "#FF8A00",
            borderRadius: 2,
            letterSpacing: "0.18em",
            fontWeight: 700,
            border: "1px solid rgba(255,138,0,0.35)",
          }}
        >
          {link.badge}
        </span>
      )}
    </a>
  );
}

function MobileDrawer({
  links,
  controls,
  onClose,
}: {
  links: NavLink[];
  controls?: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,2,8,0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 90,
          animation: "empxDrawerFade 200ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(85vw, 320px)",
          background: "#0A0A14",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.55)",
          zIndex: 91,
          display: "flex",
          flexDirection: "column",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          animation: "empxDrawerSlide 260ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <BrandMark size={22} />
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.18em" }}>EMPX</span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              color: "rgba(255,255,255,0.65)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Controls */}
        {controls && (
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {controls}
          </div>
        )}

        {/* Links */}
        <nav style={{ padding: "8px 0", flex: 1, overflowY: "auto" }}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                color: link.active ? "#FF8A00" : "rgba(255,255,255,0.85)",
                background: link.active ? "rgba(255,138,0,0.06)" : "transparent",
                borderLeft: `2px solid ${link.active ? "#FF8A00" : "transparent"}`,
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span
                  style={{
                    fontSize: 8,
                    padding: "1px 5px",
                    background: "rgba(255,138,0,0.15)",
                    color: "#FF8A00",
                    borderRadius: 2,
                    letterSpacing: "0.15em",
                    fontWeight: 700,
                  }}
                >
                  {link.badge}
                </span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      <style>{`
        @keyframes empxDrawerFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes empxDrawerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
