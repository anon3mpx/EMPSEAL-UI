// ─── Toaster — creative notification system ───────────────────────────────
//
// Each toast: left accent bar in variant color (with subtle glow), iconified
// badge in a circle with gradient, message + description, action button,
// dismiss X.  Progress bar at the bottom auto-shrinks as time elapses.
// Slide-in from right + scale-in.

import { ReactNode, useEffect, useState } from "react";

export interface ToastItem {
  id: number;
  variant: "info" | "success" | "error" | "pending";
  message: string;
  description?: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

type Listener = (items: ToastItem[]) => void;

const state = {
  items: [] as ToastItem[],
  listeners: new Set<Listener>(),
  counter: 1,
};

function notify() {
  state.listeners.forEach((l) => l([...state.items]));
}

function addToast(input: Omit<ToastItem, "id">) {
  const id = state.counter++;
  const item: ToastItem = { id, durationMs: 5000, ...input };
  state.items = [...state.items, item];
  notify();
  if (item.durationMs && item.durationMs > 0) {
    setTimeout(() => dismissToast(id), item.durationMs);
  }
  return id;
}

function dismissToast(id: number) {
  state.items = state.items.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  info: (message: string, opts?: Omit<ToastItem, "id" | "variant" | "message">) =>
    addToast({ variant: "info", message, ...opts }),
  success: (message: string, opts?: Omit<ToastItem, "id" | "variant" | "message">) =>
    addToast({ variant: "success", message, ...opts }),
  error: (message: string, opts?: Omit<ToastItem, "id" | "variant" | "message">) =>
    addToast({ variant: "error", message, ...opts }),
  pending: (message: string, opts?: Omit<ToastItem, "id" | "variant" | "message">) =>
    addToast({ variant: "pending", message, durationMs: 0, ...opts }),
  dismiss: dismissToast,
};

const PALETTE: Record<
  ToastItem["variant"],
  { bar: string; iconBg: string; iconColor: string; glow: string }
> = {
  info: {
    bar: "#60A5FA",
    iconBg: "linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(96,165,250,0.05) 100%)",
    iconColor: "#93C5FD",
    glow: "rgba(96,165,250,0.30)",
  },
  success: {
    bar: "#34D399",
    iconBg: "linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(52,211,153,0.05) 100%)",
    iconColor: "#6EE7B7",
    glow: "rgba(52,211,153,0.30)",
  },
  error: {
    bar: "#EF4444",
    iconBg: "linear-gradient(135deg, rgba(239,68,68,0.30) 0%, rgba(239,68,68,0.05) 100%)",
    iconColor: "#FCA5A5",
    glow: "rgba(239,68,68,0.35)",
  },
  pending: {
    bar: "#FF8A00",
    iconBg: "linear-gradient(135deg, rgba(255,138,0,0.25) 0%, rgba(255,138,0,0.05) 100%)",
    iconColor: "#FFB347",
    glow: "rgba(255,138,0,0.35)",
  },
};

const ICONS: Record<ToastItem["variant"], ReactNode> = {
  info: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10.5" r="0.9" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 7L6 9.2L10.2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  pending: (
    <span style={{ display: "inline-flex", animation: "empxToastSpin 0.95s linear infinite" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.20" />
        <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  ),
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onUpdate = (next: ToastItem[]) => setItems(next);
    state.listeners.add(onUpdate);
    setItems([...state.items]);
    return () => {
      state.listeners.delete(onUpdate);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 200,
        pointerEvents: "none",
        maxWidth: 380,
        width: "calc(100vw - 48px)",
      }}
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
      <style>{`
        @keyframes empxToastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.94); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes empxToastSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes empxToastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const palette = PALETTE[item.variant];
  const hasProgress = item.variant !== "pending" && item.durationMs && item.durationMs > 0;

  return (
    <div
      className="empx-toast"
      style={{
        position: "relative",
        pointerEvents: "auto",
        display: "flex",
        gap: 0,
        background: "rgba(8,8,16,0.94)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 6,
        boxShadow: `0 18px 50px rgba(0,0,0,0.55), 0 0 32px ${palette.glow}`,
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        animation: "empxToastIn 320ms cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {/* Left accent bar with glow */}
      <span
        aria-hidden
        style={{
          width: 3,
          flexShrink: 0,
          background: palette.bar,
          boxShadow: `inset 0 0 12px ${palette.bar}, 0 0 16px ${palette.bar}66`,
        }}
      />

      {/* Body */}
      <div style={{ display: "flex", gap: 12, padding: "12px 14px", flex: 1, minWidth: 0 }}>
        {/* Icon disc */}
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: palette.iconBg,
            border: `1px solid ${palette.bar}40`,
            color: palette.iconColor,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {ICONS[item.variant]}
        </span>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.3 }}>{item.message}</p>
          {item.description && (
            <p
              style={{
                margin: "3px 0 0",
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {item.description}
            </p>
          )}
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action!.onClick();
                dismissToast(item.id);
              }}
              style={{
                marginTop: 8,
                padding: 0,
                background: "transparent",
                border: "none",
                color: palette.iconColor,
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 160ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {item.action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => dismissToast(item.id)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.40)",
            cursor: "pointer",
            padding: 4,
            margin: -4,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            flexShrink: 0,
            transition: "color 160ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.40)")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {hasProgress && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 3,
            right: 0,
            bottom: 0,
            height: 1.5,
            background: palette.bar,
            opacity: 0.65,
            transformOrigin: "left center",
            animation: `empxToastProgress ${item.durationMs}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
