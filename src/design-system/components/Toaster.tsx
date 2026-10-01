// ─── Toaster — notification system, restyled to the locked language ───────
//
// Was a pre-lock "creative" design (backdrop blur, colored gradient icon
// circles, glowing box-shadows) that never got updated when swap-experience
// locked the frameless/flat visual language — same drift the TokenPicker
// Recent-chip border and picker scrollbar already had (2026-08-19 fixes).
// Restyled 2026-08-20: flat card + hairline border, no blur, no glow, bare
// variant-colored icons instead of badge circles. Functionality unchanged —
// variants, description, action button, dismiss, auto-progress bar,
// multi-toast stacking all still work exactly as before.

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

// "Elevated card" — Variant A from public/toast-drafts.html (owner's pick,
// 2026-08-20). Bigger footprint, a flat tinted square icon badge (not the
// old glow-gradient circle — matches the "squarish containers" locked rule),
// a 2px accent line across the top instead of a left bar.
const PALETTE: Record<
  ToastItem["variant"],
  { bar: string; iconBg: string; iconColor: string }
> = {
  info: { bar: "#60A5FA", iconBg: "rgba(96,165,250,0.12)", iconColor: "#93C5FD" },
  success: { bar: "#34D399", iconBg: "rgba(52,211,153,0.12)", iconColor: "#6EE7B7" },
  error: { bar: "#EF4444", iconBg: "rgba(239,68,68,0.12)", iconColor: "#FCA5A5" },
  pending: { bar: "#FF8A00", iconBg: "rgba(255,138,0,0.12)", iconColor: "#FFB347" },
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
        bottom: 26,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: 8,
        zIndex: 200,
        pointerEvents: "none",
        maxWidth: 380,
        width: "calc(100vw - 40px)",
      }}
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
      <style>{`
        @keyframes empxToastIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
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
        gap: 12,
        padding: "14px 16px 14px 14px",
        // Elevated card — flat #0a0a12 (matches the modal card, not the
        // slimmer #0c0c15 toast pill this replaced), hairline border, no
        // ambient glow. The top accent line + tinted icon badge carry state.
        background: "#0a0a12",
        border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: 6,
        boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        animation: "empxToastIn 320ms cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {/* Top accent line — 2px gradient, replaces the old left bar */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${palette.bar} 0%, transparent 100%)`,
        }}
      />

      {/* Flat tinted square icon badge — 28px, 4px radius */}
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: palette.iconBg,
          color: palette.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {ICONS[item.variant]}
      </span>

      {/* Body — right padding reserves room for the corner slab mark so long
          messages can never run under it (caught in the draft's pre-flight
          stress test with a long real error message). */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1, paddingRight: 86 }}>
        <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.3 }}>{item.message}</p>
        {item.description && (
          <p
            style={{
              margin: "3px 0 0",
              color: "rgba(255,255,255,0.55)",
              fontSize: 11.5,
              lineHeight: 1.5,
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

      {/* Corner cluster — slab mark (quiet signature, from the draft's `.a-slab`) then dismiss, side by side so neither overlaps the other */}
      <span style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ display: "flex", gap: 2, opacity: 0.35 }}>
          <img src="/brand/empx-mark-slab-1.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
          <img src="/brand/empx-mark-slab-2.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
          <img src="/brand/empx-mark-slab-3.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
        </span>
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
            transition: "color 160ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.40)")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </span>

      {/* Auto-dismiss progress bar */}
      {hasProgress && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
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
