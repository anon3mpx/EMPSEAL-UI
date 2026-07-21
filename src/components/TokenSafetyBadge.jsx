// ─── <TokenSafetyBadge> ──────────────────────────────────────────────────────
//
// Visual badge displayed next to a token symbol indicating its trust level.
// Drop-in for token select rows, swap-confirmation modal, etc.
//
// Industry pattern: 1inch / Matcha / CoW all show "Verified" green badges
// and "Unverified" orange/red warning badges.  Reduces scam-token loss.

import { ShieldCheck, ShieldAlert, ShieldQuestion, Users } from "lucide-react";
import { trustLabel } from "../lib/safety/tokenTrust";

const VARIANT_MAP = {
  verified: {
    Icon: ShieldCheck,
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    text: "text-green-400",
  },
  listed: {
    Icon: Users,
    bg: "bg-white/5",
    border: "border-white/20",
    text: "text-white/70",
  },
  custom: {
    Icon: ShieldAlert,
    bg: "bg-[#FF8A00]/10",
    border: "border-[#FF8A00]/40",
    text: "text-[#FF8A00]",
  },
  unknown: {
    Icon: ShieldQuestion,
    bg: "bg-white/5",
    border: "border-white/20",
    text: "text-white/50",
  },
};

const SIZE_MAP = {
  small: {
    container: "px-1.5 py-0.5 text-[9px]",
    icon: "w-3 h-3",
  },
  default: {
    container: "px-2 py-1 text-[10px]",
    icon: "w-3.5 h-3.5",
  },
};

/**
 * @param {Object} props
 * @param {'verified'|'listed'|'custom'|'unknown'} props.trust
 * @param {'small'|'default'} [props.size]
 * @param {string} [props.className]
 * @param {boolean} [props.iconOnly]  - render just the icon (no label text)
 */
export default function TokenSafetyBadge({
  trust,
  size = "default",
  className = "",
  iconOnly = false,
}) {
  const variant = VARIANT_MAP[trust] ?? VARIANT_MAP.unknown;
  const s = SIZE_MAP[size] ?? SIZE_MAP.default;
  const { Icon } = variant;
  const label = trustLabel(trust);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold tracking-[0.06em] uppercase border ${variant.bg} ${variant.border} ${variant.text} ${s.container} ${className}`}
      title={label}
      aria-label={`Trust level: ${label}`}
      data-testid={`token-safety-badge-${trust}`}
    >
      <Icon className={s.icon} aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}
