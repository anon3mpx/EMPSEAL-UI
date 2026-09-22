// ─── DappNavbar — frameless, grouped, brand-led top navigation ────────────
//
// Ported from public/nav-drafts.html, Variant A (owner-locked 2026-08-19).
//
// WHY THIS WAS REBUILT — the old bar was measurably broken, not just dated:
//   brand 77.4 + eight links 783.2 + controls 403.6 + padding/gaps 84
//   = 1348px minimum. At a 1280px viewport the centre row measured
//   scrollWidth 776 vs clientWidth 735 with overflowX:auto, so destinations
//   were SILENTLY scroll-clipped on the two most common laptop widths.
//   Four group triggers + socials moved to the footer bring it to 806px.
//
// LOCKED DESIGN RULES (do not re-litigate — see the vault work-stream note):
//   - Frameless: no border-bottom, no backdrop-filter panel, no pill fills on
//     links. The bar is solid var(--bg) so scrolling content disappears behind
//     it cleanly on flat #05050c without needing a rule.
//   - Brand block is the E mark + EMPX text ONLY. The slab rule was tried and
//     removed by the owner — one brand asset in the bar, not two.
//   - Orange has four roles only (outcome / cost / action / active state). The
//     active trigger is orange text + a 2px underline with NO box-shadow glow;
//     the glow was decoration the frameless decision removes.
//   - Destinations come from data/navGroups.ts. Never re-introduce a per-page
//     links array — that duplication is what let the old bar drift.

import { ReactNode, useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { useIsMobile } from "../breakpoints";
import { NAV_GROUPS, NavGroup, NavItem, groupContains } from "../data/navGroups";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}

interface DappNavbarProps {
  /** Route of the current page, e.g. "/swap-v2". Drives the active state. */
  activeHref: string;
  /** Right-side controls — typically NetworkSelector + WalletButton. */
  controls?: ReactNode;
  brandName?: string;
}

const ORANGE = "#FF8A00";
const T1 = "rgba(255,255,255,.94)";
const T3 = "rgba(255,255,255,.36)";

export default function DappNavbar({ activeHref, controls, brandName = "EMPX" }: DappNavbarProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile && drawerOpen) setDrawerOpen(false);
  }, [isMobile, drawerOpen]);

  // Close any open dropdown on outside click / Esc.
  useEffect(() => {
    const close = () => setOpenGroup(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenGroup(null); setDrawerOpen(false); }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          height: isMobile ? 56 : 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: isMobile ? "0 16px" : "0 24px",
          // Solid, not translucent — frameless relies on content vanishing
          // behind an opaque bar rather than being cut off by a border.
          background: "#05050c",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Brand — E mark + EMPX text. One asset, no rule. */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
            color: "#fff",
            flexShrink: 0,
            marginRight: isMobile ? 0 : 16,
          }}
        >
          <BrandMark size={22} />
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.18em" }}>{brandName}</span>
        </a>

        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center", minWidth: 0 }}>
            {NAV_GROUPS.map((group) => (
              <NavTrigger
                key={group.label}
                group={group}
                activeHref={activeHref}
                open={openGroup === group.label}
                onToggle={() => setOpenGroup((cur) => (cur === group.label ? null : group.label))}
              />
            ))}
          </div>
        )}

        {!isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{controls}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
              style={{
                width: 34, height: 34,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 4, color: "#fff", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                <path d="M1 1H13M1 6H13M1 11H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </nav>

      {isMobile && drawerOpen && (
        <MobileDrawer activeHref={activeHref} controls={controls} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 8 5"
      aria-hidden
      style={{
        width: 7, height: 7, stroke: "currentColor", fill: "none", strokeWidth: 1.8,
        transition: "transform 200ms ease",
        transform: open ? "rotate(180deg)" : "none",
      }}
    >
      <path d="M1 1l3 3 3-3" />
    </svg>
  );
}

function NavTrigger({
  group, activeHref, open, onToggle,
}: {
  group: NavGroup; activeHref: string; open: boolean; onToggle: () => void;
}) {
  const isActive = groupContains(group, activeHref);
  const [hover, setHover] = useState(false);

  const base: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 12px",
    border: "none",
    background: "transparent",   // no pill fill — frameless
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.20em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    textDecoration: "none",
    color: isActive ? ORANGE : hover ? "#fff" : "rgba(255,255,255,.72)",
    transition: "color 160ms ease",
  };

  // Active underline: 2px, no glow.
  const underline = isActive ? (
    <span aria-hidden style={{ position: "absolute", left: 12, right: 12, bottom: 2, height: 2, background: ORANGE, borderRadius: 1 }} />
  ) : null;

  if (!group.items) {
    return (
      <a
        href={group.href}
        style={base}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {group.label}
        {underline}
      </a>
    );
  }

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={base}
      >
        {group.label}
        <Caret open={open} />
        {underline}
      </button>
      {open && <Panel items={group.items} activeHref={activeHref} />}
    </div>
  );
}

function Panel({ items, activeHref }: { items: NavItem[]; activeHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "absolute",
        top: "calc(100% - 6px)",
        left: 0,
        minWidth: 266,
        background: "#0a0a12",
        border: "1px solid rgba(255,255,255,.11)",
        borderRadius: 6,
        padding: 6,
        zIndex: 80,
        boxShadow: "0 20px 50px rgba(0,0,0,.6)",
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(6px)",
        transition: "opacity 180ms ease, transform 180ms cubic-bezier(.22,1,.36,1)",
      }}
    >
      {items.map((item) => (
        <PanelRow key={item.href} item={item} current={item.href === activeHref} />
      ))}
    </div>
  );
}

function PanelRow({ item, current }: { item: NavItem; current: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={item.href}
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 4,
        textDecoration: "none",
        background: hover ? "rgba(255,255,255,.04)" : "transparent",
        transition: "background 160ms ease",
      }}
    >
      {current && (
        <span aria-hidden style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 2, background: ORANGE, borderRadius: 1 }} />
      )}
      <span style={{ fontSize: 12.5, fontWeight: 500, color: current ? ORANGE : T1 }}>{item.label}</span>
      <span style={{ fontSize: 9.5, color: T3, letterSpacing: "0.02em" }}>{item.sub}</span>
      {item.badge && (
        <span
          style={{
            marginLeft: "auto", fontSize: 8, padding: "2px 5px", borderRadius: 2,
            background: "rgba(255,138,0,.15)", color: ORANGE, fontWeight: 700, letterSpacing: "0.15em",
          }}
        >
          {item.badge}
        </span>
      )}
    </a>
  );
}

function MobileDrawer({
  activeHref, controls, onClose,
}: {
  activeHref: string; controls?: ReactNode; onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(2,2,8,0.78)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          zIndex: 90, animation: "empxDrawerFade 200ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(85vw, 320px)", background: "#0A0A14",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.55)",
          zIndex: 91, display: "flex", flexDirection: "column",
          color: "#fff", fontFamily: "Inter, sans-serif", overflowY: "auto",
          animation: "empxDrawerSlide 260ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <header
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <BrandMark size={22} />
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.18em" }}>EMPX</span>
          </span>
          <button
            type="button" aria-label="Close menu" onClick={onClose}
            style={{
              width: 30, height: 30, background: "transparent",
              border: "1px solid rgba(255,255,255,0.11)", borderRadius: 4,
              color: "rgba(255,255,255,0.65)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {controls && (
          <div
            style={{
              padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            {controls}
          </div>
        )}

        {/* Groups become drawer sections — same model, no second list. */}
        <nav style={{ padding: "8px 0 18px", flex: 1 }}>
          {NAV_GROUPS.map((group) => {
            const items = group.items ?? [{ label: group.label, href: group.href!, sub: group.sub ?? "" }];
            return (
              <div key={group.label}>
                <div
                  style={{
                    padding: "14px 18px 6px", fontSize: 8.5, fontWeight: 700,
                    letterSpacing: "0.28em", textTransform: "uppercase", color: T3,
                  }}
                >
                  {group.label}
                </div>
                {items.map((item) => {
                  const current = item.href === activeHref;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 18px", textDecoration: "none", fontSize: 13,
                        color: current ? ORANGE : T1,
                        boxShadow: current ? `inset 2px 0 0 ${ORANGE}` : "none",
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ fontSize: 9.5, color: T3 }}>{item.sub}</span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      <style>{`
        @keyframes empxDrawerFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes empxDrawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
