// ─── Modal — creative overlay with bracket accents + ambient gradient ──────
//
// Inspired by editorial book covers and stage-lighting setups.  Each modal:
//   - Corner brackets (top-left + bottom-right) in brand orange
//   - Subtle ambient gradient wash from the top-right corner
//   - Eyebrow (orange uppercase) + serif italic accent option in title
//   - Smoother entrance: backdrop fade + card translate-up + scale-in
//   - Persistent variant for confirm-style modals (no backdrop dismiss)
//
// `theme="slab"` opt-in: the flat/hairline chrome ported from the locked
// prototype's `.pk` picker card (public/swap-experience.html) — flat card,
// 1px hairline border, no ambient glow, a 2px brandedge top strip + compact
// mark-and-label header instead of brackets. Slab colours still read the
// `--widget-*` embed-theme vars so darker/midnight embeds keep their look.

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import BrandMark from "./BrandMark";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number | string;
  title?: ReactNode;
  eyebrow?: string;
  /** Optional content rendered in the top-right of the header (e.g. QuoteCountdown) */
  headerExtra?: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
  persistent?: boolean;
  /** Disable corner brackets (for picker/list modals where they're noisy) */
  bracketless?: boolean;
  /** "slab" = flat/hairline chrome from the locked prototype's picker card. Default = current bracket/gradient chrome. */
  theme?: "default" | "slab";
}

export default function Modal({
  open,
  onClose,
  children,
  maxWidth = 460,
  title,
  eyebrow,
  headerExtra,
  footer,
  hideClose = false,
  persistent = false,
  bracketless = false,
  theme = "default",
}: ModalProps) {
  const slab = theme === "slab";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, persistent]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div
      onClick={persistent ? undefined : onClose}
      className="empx-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: slab
          ? "var(--widget-backdrop, rgba(3,3,7,0.76))"
          : "radial-gradient(ellipse 80% 70% at 50% 35%, rgba(var(--widget-primary-rgb, 255, 138, 0), 0.08) 0%, transparent 60%), var(--widget-backdrop, rgba(2,2,8,0.82))",
        backdropFilter: slab ? "blur(8px)" : "blur(16px)",
        WebkitBackdropFilter: slab ? "blur(8px)" : "blur(16px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "empxModalFadeIn 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="empx-modal-card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          background: slab
            ? "var(--widget-modal-bg, #0a0a12)"
            : "var(--widget-modal-bg, linear-gradient(135deg, rgba(20,20,32,0.85) 0%, rgba(8,8,16,0.95) 100%))",
          border: slab ? "1px solid rgba(255,255,255,0.11)" : "1px solid rgba(255,255,255,0.10)",
          borderRadius: slab ? 6 : 8,
          boxShadow: slab
            ? "0 20px 50px rgba(0,0,0,0.6)"
            : "0 36px 100px rgba(0,0,0,0.55), 0 0 80px rgba(var(--widget-primary-rgb, 255, 138, 0), 0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          flexDirection: "column",
          animation: "empxModalCardIn 380ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
        }}
      >
        {/* Ambient gradient wash + brand-mark watermark — default theme only.
            Slab carries the mark once, in its header (one branding device per surface). */}
        {!slab && (
          <>
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(var(--widget-primary-rgb, 255, 138, 0), 0.10) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                bottom: -22,
                right: -22,
                pointerEvents: "none",
                transform: "rotate(-8deg)",
              }}
            >
              <BrandMark size={180} color="var(--widget-primary, #FF8A00)" opacity={0.055} />
            </span>
          </>
        )}

        {/* Brandedge — 2px top strip, slab theme's replacement for corner brackets */}
        {slab && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg, var(--widget-primary, #FF8A00) 0%, color-mix(in srgb, var(--widget-primary, #FF8A00) 48%, black) 42%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Corner brackets — top-left + bottom-right — default theme only */}
        {!slab && !bracketless && (
          <>
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                width: 16,
                height: 16,
                borderTop: "1px solid var(--widget-primary, #FF8A00)",
                borderLeft: "1px solid var(--widget-primary, #FF8A00)",
                pointerEvents: "none",
                opacity: 0.9,
              }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                width: 16,
                height: 16,
                borderBottom: "1px solid var(--widget-primary, #FF8A00)",
                borderRight: "1px solid var(--widget-primary, #FF8A00)",
                pointerEvents: "none",
                opacity: 0.9,
              }}
            />
          </>
        )}

        {(title || eyebrow || headerExtra || !hideClose) && (
          <header
            style={
              slab
                ? {
                    position: "relative",
                    padding: "16px 18px 13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 18,
                    zIndex: 1,
                  }
                : {
                    position: "relative",
                    padding: "22px 24px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 18,
                    zIndex: 1,
                  }
            }
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: slab ? 9 : 0 }}>
              {slab && (
                <span aria-hidden style={{ display: "inline-flex" }}>
                  <BrandMark size={19} opacity={1} />
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {!slab && eyebrow && (
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.40em",
                      color: "var(--widget-primary, #FF8A00)",
                      textTransform: "uppercase",
                      margin: "0 0 8px",
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <h2
                    style={
                      slab
                        ? {
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.34em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.94)",
                            margin: 0,
                            lineHeight: 1.2,
                          }
                        : {
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 24,
                            fontWeight: 400,
                            letterSpacing: "-0.025em",
                            margin: 0,
                            lineHeight: 1.1,
                          }
                    }
                  >
                    {title}
                  </h2>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {headerExtra}
              {!hideClose && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  style={
                    slab
                      ? {
                          background: "transparent",
                          border: "none",
                          color: "rgba(255,255,255,0.36)",
                          cursor: "pointer",
                          padding: 0,
                          width: 26,
                          height: 26,
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 160ms ease, background 160ms ease",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "rgba(255,255,255,0.65)",
                          cursor: "pointer",
                          padding: 0,
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 160ms ease, background 160ms ease, border-color 160ms ease",
                        }
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = slab ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)";
                    if (!slab) e.currentTarget.style.borderColor = "rgba(var(--widget-primary-rgb, 255, 138, 0), 0.40)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = slab ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.65)";
                    e.currentTarget.style.background = slab ? "transparent" : "rgba(255,255,255,0.05)";
                    if (!slab) e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path
                      d="M1 1L10 10M10 1L1 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </header>
        )}

        <div
          style={{
            padding: slab ? "14px 18px 18px" : "18px 24px",
            overflowY: "auto",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {children}
        </div>

        {footer && (
          <footer
            style={{
              padding: "18px 24px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {footer}
          </footer>
        )}
      </div>

      <style>{`
        @keyframes empxModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes empxModalCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
