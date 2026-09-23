// ─── widgetKit — the BASE styling layer for every EmpX widget ─────────────
//
// Owner instruction (2026-08-19): "use this as base ui widget styling version".
// The swap widget is the pattern-setter; cross / bridge / gas / multi / ramp /
// portfolio inherit from here rather than re-deriving the language each time.
// If you find yourself writing a raw fontSize/letterSpacing inside a widget,
// the token probably belongs in this file instead.
//
// Ported from public/swap-experience.html, the design-locked prototype.
//
// LOCKED RULES ENCODED HERE — do not re-litigate, see the vault work-stream note:
//   1. Frameless. dApp widgets sit on flat #05050c with NO border and NO fill.
//      Structure comes from 24-26px section gaps, ONE hairline, and micro-
//      labels. (Measured: frameless costs 15px of height versus a bordered
//      card while removing 10 outlines from a single 480px column.)
//      The embeddable widget is the exception — it keeps a fill, because it
//      lands on a partner's unknown background.
//   2. Orange has FOUR roles only: outcome (receive amount), cost (fee),
//      action (CTA), active state. Semantic green/amber/red are permitted for
//      price impact only.
//   3. All logo frames are square at 4px radius. 6px status dots stay round —
//      a 6px square reads as a rendering artefact.
//   4. Numerals are Space Grotesk 300 with tabular-nums. Tabular is NOT
//      cosmetic: without it digits jitter on every quote refresh.
//   5. USD value belongs UNDER the amount, never on the identity row, where it
//      reads as a unit price. Identity rows carry "4.82 available" or
//      "1 ETH = 3,184.2 USDC".
//   6. Each branding device appears ONCE per surface.

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import TouchTooltip from "../components/TouchTooltip";
import Skeleton from "./components/Skeleton";
import ResolvedLogo from "./components/ResolvedLogo";
import { normalizeLogoUrl } from "./data/logoRegistry";

// ─── Palette ──────────────────────────────────────────────────────────────
// Mirrors the prototype's :root. Kept local so a widget is readable without
// chasing tokens.ts, and so the frameless language can't drift by accident.
export const wk = {
  bg: "var(--widget-bg, #05050c)",
  orange: "var(--widget-primary, #FF8A00)",
  orangeHover: "color-mix(in srgb, var(--widget-primary, #FF8A00) 88%, black)",
  orangeDim: "color-mix(in srgb, var(--widget-primary, #FF8A00) 48%, black)",
  border: "rgba(255,255,255,.07)",
  borderStrong: "rgba(255,255,255,.11)",
  t1: "rgba(255,255,255,.94)",
  t2: "rgba(255,255,255,.58)",
  t3: "rgba(255,255,255,.36)",
  t4: "rgba(255,255,255,.22)",
  ok: "#34D399",
  warn: "#F59E0B",
  bad: "#EF4444",
  /** The locked column measure. Identical on desktop and mobile. */
  columnWidth: 480,
} as const;

const GROTESK = "'Space Grotesk', sans-serif";
const INTER = "Inter, sans-serif";

// ─── Type ramp ────────────────────────────────────────────────────────────

/** 8.5px section micro-label. Replaces borders as the structural device. */
export const microLabel: CSSProperties = {
  fontFamily: INTER,
  fontSize: 8.5,
  fontWeight: 600,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: wk.t3,
};

/** 10px page/section eyebrow. One per surface. */
export const eyebrow: CSSProperties = {
  fontFamily: INTER,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.40em",
  textTransform: "uppercase",
  color: wk.t1,
};

/** Large numerals. `accent` marks the OUTCOME role — the amount received. */
export function numeral(size = 40, accent = false): CSSProperties {
  return {
    fontFamily: GROTESK,
    fontWeight: 300,
    fontSize: size,
    letterSpacing: "-.035em",
    lineHeight: 1,
    color: accent ? wk.orange : "#fff",
    fontVariantNumeric: "tabular-nums",
  };
}

/** The unit suffix beside a numeral (ETH, USDC). */
export const unit: CSSProperties = {
  fontFamily: GROTESK,
  fontWeight: 300,
  fontSize: 15,
  color: wk.t3,
};

/** USD line — always UNDER the amount, never on the identity row. */
export const amountUsd: CSSProperties = {
  fontFamily: INTER,
  fontSize: 11,
  color: wk.t3,
  fontVariantNumeric: "tabular-nums",
  margin: "7px 0 9px",
};

// ─── Structure ────────────────────────────────────────────────────────────

/** The single hairline a surface is allowed. Everything else is gap. */
export const rule: CSSProperties = {
  height: 1,
  background: wk.border,
  margin: "24px 0",
};

/** Two-up stat grid (fee / price impact). 26px gap, no dividers. */
export const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 26,
};

/**
 * Square logo frame — rule 3. Never round these.
 *
 * The fill is load-bearing, not decoration. Every icon CDN we use ships coin
 * art as a CIRCLE on a transparent square canvas — verified 2026-08-23 by
 * sampling TrustWallet's USDC and cryptocurrency-icons' ETH: alpha 0 at all
 * four corners, 255 at both edge midpoints. So a square frame alone still
 * *reads* round, because the only thing visible is the circle.
 *
 * The old `#0c0c15` was within a hair of the `#05050c` page background, making
 * the square invisible and leaving the circular artwork to define the shape.
 * A slightly lifted fill makes the square container actually visible behind
 * the coin — which is what "square logo frames" was always meant to achieve.
 * Owner decision 2026-08-23: backplate, not cropping (cropping the circle to
 * fill the square clips outer rings and lettering on some marks).
 */
export function logoFrame(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 4,
    overflow: "hidden",
    background: "rgba(255,255,255,.05)",
    flexShrink: 0,
    display: "block",
  };
}

/** 2px brand top edge, built from the palette not an asset. Once per surface. */
export const brandEdge: CSSProperties = {
  height: 2,
  background: `linear-gradient(90deg, ${wk.orange} 0%, ${wk.orangeDim} 42%, transparent 100%)`,
};

// ─── Shell ────────────────────────────────────────────────────────────────

interface WidgetShellProps {
  children: ReactNode;
  /** Embeddable widget only — adds the fill it needs on a partner background. */
  filled?: boolean;
  /** Renders the 2px brand edge at the top. One per surface. */
  edge?: boolean;
  style?: CSSProperties;
}

export function WidgetShell({ children, filled, edge, style }: WidgetShellProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: wk.columnWidth,
        padding: "26px 22px",
        fontFamily: INTER,
        // Frameless by default — rule 1.
        // Unfilled shells stay frameless unless the embed theme opts into a surface.
        background: filled ? "rgba(255,255,255,.025)" : "var(--widget-shell-bg, transparent)",
        border: filled ? `1px solid ${wk.border}` : "none",
        boxShadow: filled ? undefined : "inset 0 0 0 1px var(--widget-shell-border, transparent)",
        borderRadius: filled ? 6 : "var(--widget-shell-radius, 0)",
        ...style,
      }}
    >
      <WidgetKitKeyframes />
      {edge && <div aria-hidden style={{ ...brandEdge, margin: "0 -22px 22px" }} />}
      {children}
    </div>
  );
}

// ─── Shared pieces ────────────────────────────────────────────────────────

export function MicroLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...microLabel, ...style }}>{children}</span>;
}

function identityFallbackLabel(value: string, max = 4): string {
  const trimmed = value.trim();
  return trimmed.slice(0, max) || "?";
}

function CompatibleLogo({
  logo,
  size,
  alt,
  fallbackLabel,
}: {
  logo?: string | ReactNode;
  size: number;
  alt: string;
  fallbackLabel: string;
}) {
  const fallback = (
    <span style={{ fontSize: Math.max(8, Math.round(size * 0.34)), fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
      {fallbackLabel}
    </span>
  );
  if (typeof logo === "string") {
    const url = normalizeLogoUrl(logo);
    return (
      <ResolvedLogo
        candidates={url ? [url] : []}
        alt={alt}
        size={size}
        fallback={fallback}
      />
    );
  }
  return <>{logo ?? fallback}</>;
}

/** Square-framed logo. URLs are resolved safely; missing art uses fallback. */
export function LogoFrame({
  src,
  size,
  alt = "",
  children,
  fallback,
}: {
  src?: string;
  size: number;
  alt?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const url = src ? normalizeLogoUrl(src) : null;
  const content = children ?? (url ? (
    <ResolvedLogo
      candidates={[url]}
      alt={alt}
      size={size}
      fallback={fallback ?? <span>?</span>}
    />
  ) : fallback);
  return <span style={logoFrame(size)}>{content}</span>;
}

/**
 * Token identity row — two lines (name + context), not a bare chip.
 * `sub` carries balance or unit price. Never a USD value (rule 5).
 */
export function TokenIdentityRow({
  logo, name, sub, onClick, compact, ariaLabel,
}: { logo?: string | ReactNode; name: string; sub?: string; onClick?: () => void; compact?: boolean; ariaLabel?: string }) {
  const size = compact ? 26 : 30;
  const fallbackLabel = identityFallbackLabel(name);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: compact ? 9 : 11,
        width: compact ? undefined : "100%", flexShrink: compact ? 0 : undefined,
        padding: compact ? "7px 8px" : "9px 8px", marginLeft: -8,
        border: "none", background: "transparent", borderRadius: 4,
        cursor: onClick ? "pointer" : "default", textAlign: "left",
        transition: "background .18s", fontFamily: INTER, color: "inherit",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "rgba(255,255,255,.035)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <LogoFrame size={size} fallback={fallbackLabel}>
        <CompatibleLogo logo={logo} size={size} alt={`${name} logo`} fallbackLabel={fallbackLabel} />
      </LogoFrame>
      <span style={{ flex: compact ? undefined : 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: compact ? 12.5 : 13, fontWeight: 600, color: wk.t1, lineHeight: 1.15 }}>{name}</span>
        {sub && <span style={{ fontSize: 10, color: wk.t3, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{sub}</span>}
      </span>
      {onClick && <span style={{ fontSize: 11, color: wk.t4, flexShrink: 0 }}>▾</span>}
    </button>
  );
}

/**
 * Underline tabs — the locked switcher, ported from `.tabs` in
 * public/swap-experience.html (the picker's tier tabs use the identical rule).
 *
 * Deliberately NOT a filled segmented control: the frameless decision removes
 * pill backgrounds from navigation, and the nav spec says so in as many words.
 * Active = orange text + a 1.5px underline, nothing else.
 *
 * `dense` tightens gap and tracking — four tabs need 322px, and a 375px
 * viewport only leaves 291px inside the widget, which silently clipped the
 * last tab before this existed.
 */
export function WidgetTabs<T extends string>({
  options, active, onChange, dense,
}: {
  options: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
  dense?: boolean;
}) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${wk.border}` }}>
      {options.map((o, i) => {
        const on = o.value === active;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              position: "relative",
              background: "transparent",
              border: "none",
              padding: "9px 0",
              marginRight: i === options.length - 1 ? 0 : dense ? 10 : 20,
              cursor: "pointer",
              fontFamily: INTER,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: dense ? "0.10em" : "0.16em",
              textTransform: "uppercase",
              color: on ? wk.orange : wk.t3,
              transition: "color .16s",
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = wk.t2; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = wk.t3; }}
          >
            {o.label}
            {on && (
              <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1.5, background: wk.orange }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Switch row — title + hint beside a 30x17 track.
 * Extracted from the identical copies that had grown in EmpxCrossWidget
 * (`TransferToggle`) and EmpxGasWidget (`RecipientToggle`).
 *
 * The track is the one rounded container the language allows: it is a switch,
 * not a logo frame, so rule 3 does not apply to it.
 */
export function ToggleRow({
  title, hint, enabled, disabled, onToggle,
}: { title: string; hint?: string; enabled: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      }}
      onClick={disabled ? undefined : onToggle}
    >
      <span
        aria-hidden
        style={{
          width: 30, height: 17, borderRadius: 9, flexShrink: 0, marginTop: 1, position: "relative",
          background: enabled ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .30)" : "rgba(255,255,255,.10)", transition: "background .2s",
        }}
      >
        <i
          style={{
            position: "absolute", top: 2.5, left: enabled ? 15.5 : 2.5, width: 12, height: 12, borderRadius: "50%",
            background: enabled ? wk.orange : wk.t2, transition: "left .2s, background .2s", display: "block",
          }}
        />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 11.5, color: wk.t1, fontWeight: 500 }}>{title}</span>
        {hint && <span style={{ display: "block", fontSize: 9.5, color: wk.t3, marginTop: 3, lineHeight: 1.5 }}>{hint}</span>}
      </span>
    </label>
  );
}

/** Quiet disclosure — keeps explanatory prose off the surface until asked for. */
export function Disclosure({
  label, children, defaultOpen,
}: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 0", background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left", fontFamily: INTER,
        }}
      >
        <span style={{ fontSize: 10.5, color: wk.t2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 10, color: wk.t4, transform: open ? "rotate(180deg)" : undefined, transition: "transform .18s" }}>▾</span>
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

/**
 * Chain selector — a quiet pill carrying the REAL chain logo.
 * A 6px colour dot cannot separate 15 chains, several of them near-identical
 * blues; that was tried and rejected.
 */
export function ChainPill({
  logo, name, onClick, fallbackLabel,
}: {
  logo?: string | ReactNode;
  name: string;
  onClick?: () => void;
  fallbackLabel?: string;
}) {
  const label = fallbackLabel || identityFallbackLabel(name, 3);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "13px 9px 13px 6px", minHeight: 44,
        borderRadius: 3, background: "transparent", border: "none",
        cursor: onClick ? "pointer" : "default", transition: "background .2s",
        fontFamily: INTER, color: "inherit",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <LogoFrame size={17} fallback={label}>
        <CompatibleLogo logo={logo} size={17} alt={`${name} logo`} fallbackLabel={label} />
      </LogoFrame>
      <span style={{ fontSize: 10.5, color: wk.t1, fontWeight: 500 }}>{name}</span>
      {onClick && <span style={{ fontSize: 9, color: wk.t3 }}>▾</span>}
    </button>
  );
}

// ─── CTA state machine ────────────────────────────────────────────────────
// One 52px geometry for every state. The countdown renders as a 2px bar on the
// button's bottom edge, which costs zero extra rows.

export type CtaState = "connect" | "idle" | "blocked" | "ready" | "working" | "done";

const CTA_SKIN: Record<CtaState, CSSProperties> = {
  ready:   { background: wk.orange, color: "#08080e" },
  idle:    { background: "rgba(255,255,255,.05)", color: wk.t3, cursor: "not-allowed" },
  blocked: { background: "rgba(239,68,68,.10)", color: "#FCA5A5", cursor: "not-allowed" },
  connect: { background: "transparent", color: wk.t1, border: `1px solid ${wk.borderStrong}` },
  working: { background: "rgba(var(--widget-primary-rgb, 255, 138, 0), .14)", color: wk.orange, cursor: "wait" },
  done:    { background: "rgba(52,211,153,.12)", color: wk.ok },
};

export function WidgetCTA({
  state, label, sublabel, onClick, timerPct,
}: {
  state: CtaState;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  /** 0-100. Quote freshness, drawn as a 2px bar on the bottom edge. */
  timerPct?: number;
}) {
  const disabled = state === "idle" || state === "blocked" || state === "working";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        position: "relative", width: "100%", height: 52,
        border: "none", borderRadius: 4, cursor: "pointer",
        fontFamily: INTER, fontSize: 12, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        overflow: "hidden", transition: "background .2s, box-shadow .2s",
        ...CTA_SKIN[state],
      }}
    >
      {state === "working" && (
        <span
          aria-hidden
          style={{
            width: 13, height: 13, borderRadius: "50%",
            border: `1.5px solid rgba(var(--widget-primary-rgb, 255, 138, 0), .25)`, borderTopColor: wk.orange,
            animation: "empxSpin .7s linear infinite",
          }}
        />
      )}
      <span>{label}</span>
      {sublabel && (
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", opacity: 0.75, textTransform: "none" }}>
          {sublabel}
        </span>
      )}
      {typeof timerPct === "number" && state === "ready" && (
        <span
          aria-hidden
          style={{
            position: "absolute", left: 0, bottom: 0, height: 2,
            width: `${Math.max(0, Math.min(100, timerPct))}%`,
            background: "rgba(8,8,14,.32)", transition: "width 1s linear", zIndex: 3,
          }}
        />
      )}
    </button>
  );
}

/** Quote freshness row: status dot + label on the left, refresh on the right. */
export function QuoteStatusRow({
  ageSeconds, totalSeconds, canRefresh, refreshing, onRefresh,
}: {
  ageSeconds: number;
  totalSeconds: number;
  canRefresh: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const remaining = Math.max(0, totalSeconds - ageSeconds);
  const stale = remaining === 0;
  const aging = remaining <= totalSeconds / 2;
  const dot = stale ? wk.t4 : aging ? wk.warn : wk.ok;
  const text = stale ? "Quote stale" : `Quote fresh · ${remaining}s`;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: wk.t3 }}>
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{text}</span>
      </span>
      <button
        type="button"
        onClick={canRefresh ? onRefresh : undefined}
        disabled={!canRefresh}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 3, background: "transparent",
          border: `1px solid ${canRefresh ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .4)" : wk.borderStrong}`,
          color: canRefresh ? wk.t1 : wk.t3,
          fontFamily: INTER, fontSize: 9.5, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
          cursor: canRefresh ? "pointer" : "not-allowed",
          opacity: canRefresh ? 1 : 0.45, transition: ".2s",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "currentColor", fill: "none", strokeWidth: 1.7, animation: refreshing ? "empxSpin .7s linear infinite" : undefined }}>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

/** Price-impact meter. The ONE place semantic colour is allowed. */
export function ImpactMeter({ bps }: { bps: number }) {
  const pct = bps / 100;
  const color = bps > 300 ? wk.bad : bps > 100 ? wk.warn : wk.ok;
  const word = bps > 300 ? "High" : bps > 100 ? "Moderate" : "Minimal";
  return (
    <div>
      <MicroLabel>Price impact</MicroLabel>
      <div style={{ fontSize: 12.5, fontWeight: 500, color, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(2)}%
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,.07)", position: "relative", overflow: "hidden", marginTop: 8 }}>
        <i style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.min(100, Math.max(4, pct * 20))}%`, borderRadius: 2, background: color, transition: "width .4s, background .4s" }} />
      </div>
      <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{word}</div>
    </div>
  );
}

/** Keyframes the kit relies on. Mount once, high in the page tree. */
export function WidgetKitKeyframes() {
  return <style>{`
    @keyframes empxSpin { to { transform: rotate(360deg); } }
    @keyframes empxHintPulse { 0%,100% { opacity:.55; transform:translateX(0); } 50% { opacity:1; transform:translateX(2px); } }
  `}</style>;
}

// ─── Rail cards — cross-chain's rail picker, ported from cross-drafts.html ─
// (design-locked 2026-08-19/20, real interaction verified: wheel scroll,
// prev/next paging, edge-fade "more" hint). Output + ETA only per card — fee
// NEVER appears on a card, only in the widget's own Total cost stat, per
// owner correction. Real protocol logos, curl-verified; Via Labs has none in
// this icon source, so it gets the bare mode dot rather than a guessed slug.
export interface RailCardData {
  name: string;
  mode: "A" | "B";
  outAmount: string;
  eta: string;
  tag?: string;
  isActive: boolean;
}

const RAIL_ICON_SLUGS: Record<string, string> = {
  CCTP: "circle-cctp",
  "CCTP Fast": "circle-cctp",
  Axelar: "axelar",
  LayerZero: "layerzero",
  "LayerZero VT": "layerzero",
  Wormhole: "wormhole",
  "Gas.zip": "gas-zip",
  THORChain: "thorchain",
  Chainflip: "chainflip",
  Maya: "maya-protocol",
  TeleSwap: "teleswap",
  "Hyperlane Nexus": "hyperlane",
  deBridge: "debridge",
  // "Via Labs" deliberately absent — no working icon found on this source
  // (curl 404 on via-labs / vialabs) — falls back to the mode dot only.
};

/** Protocol-icon URL for a rail name, or null when none is known — never a guessed slug. */
export function railIconUrl(railName: string): string | null {
  const slug = RAIL_ICON_SLUGS[railName];
  return slug ? `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48` : null;
}

function RailCard({ rail, onClick }: { rail: RailCardData; onClick: () => void }) {
  const icon = railIconUrl(rail.name);
  const modeColor = rail.mode === "A" ? "#FFB347" : "#93C5FD";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "0 0 auto", minWidth: 118, padding: "11px 12px 12px", borderRadius: 5,
        background: rail.isActive ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .055)" : "transparent",
        border: `1px solid ${rail.isActive ? "rgba(var(--widget-primary-rgb, 255, 138, 0), .5)" : wk.border}`,
        cursor: "pointer", textAlign: "left", position: "relative",
        transition: "border-color .16s, background .16s", fontFamily: "Inter, sans-serif",
      }}
    >
      {rail.tag && (
        <span
          style={{
            position: "absolute", top: -7, right: 8, fontSize: 7.5, fontWeight: 700,
            letterSpacing: "0.16em", padding: "2px 5px", borderRadius: 2, color: wk.orange,
            background: "var(--widget-panel, #0a0a10)", border: "1px solid rgba(var(--widget-primary-rgb, 255, 138, 0), .4)",
          }}
        >
          {rail.tag}
        </span>
      )}
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon ? (
          <span style={{ width: 16, height: 16, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,.05)", flexShrink: 0 }}>
            <img src={icon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </span>
        ) : (
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: modeColor, boxShadow: `0 0 6px ${modeColor}`, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 10.5, fontWeight: 600, color: rail.isActive ? wk.t1 : wk.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {rail.name}
        </span>
      </span>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 400, color: rail.isActive ? wk.orange : wk.t1, letterSpacing: "-.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {rail.outAmount}
      </div>
      <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 6, fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: "tabular-nums" }}>
        {rail.eta}
      </div>
    </button>
  );
}

const CARD_STEP = 126;
const LINE_PX = 16;
const WHEEL_DAMPEN = 0.55;

export function RailCardStrip({
  rails, onSelect, count, label = "Rail",
}: { rails: RailCardData[]; onSelect: (name: string) => void; count?: number; label?: string }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateNav = () => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  };

  useEffect(() => {
    updateNav();
    window.addEventListener("resize", updateNav);
    return () => window.removeEventListener("resize", updateNav);
  }, [rails.length]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
        <MicroLabel>{label}</MicroLabel>
        <span style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: wk.t3 }}>{count ?? rails.length} available</span>
          <span style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            <RailNavButton
              disabled={atStart}
              dir="prev"
              onClick={() => stripRef.current?.scrollBy({ left: -CARD_STEP, behavior: "smooth" })}
            />
            <RailNavButton
              disabled={atEnd}
              dir="next"
              onClick={() => stripRef.current?.scrollBy({ left: CARD_STEP, behavior: "smooth" })}
            />
          </span>
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <div
          ref={stripRef}
          onScroll={updateNav}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // let native horizontal gestures through
            e.preventDefault();
            const el = stripRef.current;
            if (!el) return;
            const raw = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaY;
            el.scrollLeft += raw * WHEEL_DAMPEN;
          }}
          style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 10px", scrollbarWidth: "none" }}
        >
          {rails.map((r) => (
            <RailCard key={r.name} rail={r} onClick={() => onSelect(r.name)} />
          ))}
        </div>
        <span
          aria-hidden
          style={{
            position: "absolute", top: 0, bottom: 10, left: 0, width: 30, pointerEvents: "none",
            background: `linear-gradient(90deg, ${wk.bg} 10%, transparent 100%)`,
            opacity: atStart ? 0 : 1, transition: "opacity .2s",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute", top: 0, bottom: 10, right: 0, width: 30, pointerEvents: "none",
            background: `linear-gradient(270deg, ${wk.bg} 10%, transparent 100%)`,
            opacity: atEnd ? 0 : 1, transition: "opacity .2s",
            display: "flex", alignItems: "center", justifyContent: "flex-end",
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: wk.orange, fill: "none", strokeWidth: 2, marginRight: 1, animation: "empxHintPulse 1.6s ease-in-out infinite" }}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** Same shape as RailCardStrip (label row + a strip of card-sized blocks) so
 *  the layout doesn't jump when real offers arrive — replaces a plain
 *  "Fetching live quotes…" text line while useLiveOffers() is loading. */
export function RailCardStripSkeleton({ label = "Rail" }: { label?: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
        <MicroLabel>{label}</MicroLabel>
        <Skeleton variant="rect" width={70} height={11} radius={3} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "2px 2px 10px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: "0 0 auto", minWidth: 118, padding: "11px 12px 12px", borderRadius: 5, border: `1px solid ${wk.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Skeleton variant="circle" width={16} height={16} />
              <Skeleton variant="text" width={54} height={10} />
            </div>
            <Skeleton variant="text" width={64} height={17} style={{ marginBottom: 8 }} />
            <Skeleton variant="text" width={40} height={9} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RailNavButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const label = dir === "prev" ? "Previous rail" : "Next rail";
  return (
    <TouchTooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        style={{
          width: 20, height: 20, borderRadius: 3, border: `1px solid ${wk.borderStrong}`, background: "transparent",
          color: wk.t2, display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.28 : 1, padding: 0,
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 9, height: 9, stroke: "currentColor", fill: "none", strokeWidth: 2.2 }}>
          <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
        </svg>
      </button>
    </TouchTooltip>
  );
}
