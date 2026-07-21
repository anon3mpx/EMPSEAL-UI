// ─── Modal — creative overlay with bracket accents + ambient gradient ──────
//
// Inspired by editorial book covers and stage-lighting setups.  Each modal:
//   - Corner brackets (top-left + bottom-right) in brand orange
//   - Subtle ambient gradient wash from the top-right corner
//   - Eyebrow (orange uppercase) + serif italic accent option in title
//   - Smoother entrance: backdrop fade + card translate-up + scale-in
//   - Persistent variant for confirm-style modals (no backdrop dismiss)

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
}: ModalProps) {
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
        background:
          "radial-gradient(ellipse 80% 70% at 50% 35%, rgba(255,138,0,0.08) 0%, transparent 60%), rgba(2,2,8,0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
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
          background:
            "linear-gradient(135deg, rgba(20,20,32,0.85) 0%, rgba(8,8,16,0.95) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          boxShadow:
            "0 36px 100px rgba(0,0,0,0.55), 0 0 80px rgba(255,138,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          flexDirection: "column",
          animation: "empxModalCardIn 380ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
        }}
      >
        {/* Ambient gradient wash from top-right corner */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,138,0,0.10) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle EmpX brand-mark watermark — bottom-right interior */}
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
          <BrandMark size={180} color="#FF8A00" opacity={0.055} />
        </span>

        {/* Corner brackets — top-left + bottom-right */}
        {!bracketless && (
          <>
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                width: 16,
                height: 16,
                borderTop: "1px solid #FF8A00",
                borderLeft: "1px solid #FF8A00",
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
                borderBottom: "1px solid #FF8A00",
                borderRight: "1px solid #FF8A00",
                pointerEvents: "none",
                opacity: 0.9,
              }}
            />
          </>
        )}

        {(title || eyebrow || headerExtra || !hideClose) && (
          <header
            style={{
              position: "relative",
              padding: "22px 24px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
              zIndex: 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {eyebrow && (
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.40em",
                    color: "#FF8A00",
                    textTransform: "uppercase",
                    margin: "0 0 8px",
                  }}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 24,
                    fontWeight: 400,
                    letterSpacing: "-0.025em",
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {title}
                </h2>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {headerExtra}
              {!hideClose && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  style={{
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
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                    e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
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

        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1, position: "relative", zIndex: 1 }}>
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
