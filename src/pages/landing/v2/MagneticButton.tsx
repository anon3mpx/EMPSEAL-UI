// ─── MagneticButton — cursor-attracting CTA ─────────────────────────────────
//
// Subtly pulls the button toward the cursor when nearby, then springs back
// on leave.  Used on primary CTAs to add "premium" tactile feel.
// Disabled on touch (no cursor to attract toward).

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "large";
  /** Maximum pull distance in pixels (default 12). */
  strength?: number;
  className?: string;
  ariaLabel?: string;
}

export default function MagneticButton({
  children,
  onClick,
  href,
  variant = "primary",
  size = "default",
  strength = 12,
  className = "",
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const maxDistance = Math.max(rect.width, rect.height);
    const factor = Math.min(1, distance / maxDistance);
    setOffset({
      x: (dx / maxDistance) * strength * (1 - factor * 0.5),
      y: (dy / maxDistance) * strength * (1 - factor * 0.5),
    });
  }

  function handleLeave() {
    setOffset({ x: 0, y: 0 });
  }

  const baseClasses =
    "relative inline-flex items-center justify-center select-none";
  const sizeClasses =
    size === "large"
      ? "px-9 py-4 text-[14px]"
      : "px-7 py-3 text-[12px]";
  const variantClasses = {
    primary:
      "bg-[#FF8A00] text-[#05050c] hover:opacity-90 shadow-[0_0_40px_rgba(255,138,0,0.35)] hover:shadow-[0_0_60px_rgba(255,138,0,0.5)]",
    secondary:
      "border border-white/20 text-white hover:border-[#FF8A00]/60 hover:text-[#FF8A00]",
    ghost:
      "text-white/70 hover:text-white",
  }[variant];
  const fontClasses = "font-medium tracking-[0.18em] uppercase";

  const Inner = (
    <motion.span
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 180, damping: 15, mass: 0.4 }}
      className={`block ${baseClasses} ${sizeClasses} ${variantClasses} ${fontClasses} ${className}`}
    >
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        aria-label={ariaLabel}
        className="inline-block"
      >
        {Inner}
      </a>
    );
  }
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
      className="inline-block bg-transparent border-0 p-0"
    >
      {Inner}
    </button>
  );
}
