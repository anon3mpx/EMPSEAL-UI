import { toast as toastify, ToastOptions, ToastContent, ToastContentProps } from "react-toastify";
import React from "react";

// "Elevated card" theme — matches src/design-system/components/Toaster.tsx
// exactly (owner's pick from public/toast-drafts.html, 2026-08-20), so the
// real wallet/tx toasts (this file, used by useSwapExecution.js,
// useGasBridgeTx.js, contractCalls.ts, widgetContractCalls.ts, TransferPanel.jsx)
// and the design-system's mock toasts render identically. Was a pre-lock
// "creative" style (black card, 3.5px glowing colored border, Orbitron font,
// icon rendering literally commented out) before the first flat-theme pass —
// this is the second pass, elevating it beyond the minimal draft-ported pill.
const CustomToastContent = ({ closeToast, data, type }: { closeToast?: () => void; data?: { title?: string }; type?: string }) => {
  const toastStyles = {
    success: { bar: "#34D399", iconBg: "rgba(52,211,153,0.12)", iconColor: "#6EE7B7" },
    error: { bar: "#EF4444", iconBg: "rgba(239,68,68,0.12)", iconColor: "#FCA5A5" },
    warning: { bar: "#FF8A00", iconBg: "rgba(255,138,0,0.12)", iconColor: "#FFB347" },
    info: { bar: "#60A5FA", iconBg: "rgba(96,165,250,0.12)", iconColor: "#93C5FD" },
    default: { bar: "#FF8A00", iconBg: "rgba(255,138,0,0.12)", iconColor: "#FFB347" },
  };

  const styles = toastStyles[type as keyof typeof toastStyles] || toastStyles.default;
  const message = data?.title || "";

  const getIcon = () => {
    const iconProps = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none" as const };
    switch (type) {
      case "success":
        return (
          <svg {...iconProps}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.8 7L6 9.2L10.2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "error":
        return (
          <svg {...iconProps}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        );
      case "warning":
        return (
          <svg {...iconProps}>
            <path d="M7 1.5L12.8 11.5H1.2L7 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="10.3" r="0.8" fill="currentColor" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg {...iconProps}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="10.5" r="0.9" fill="currentColor" />
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 12,
        padding: "14px 16px 14px 14px",
        minWidth: 320,
        maxWidth: 400,
        width: "100%",
        // Elevated card — flat #0a0a12 (matches the modal card), hairline
        // border, no ambient glow. Top accent line + tinted icon badge carry
        // state instead of a left bar.
        background: "#0a0a12",
        border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: 6,
        boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        overflow: "hidden",
        boxSizing: "border-box",
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
          background: `linear-gradient(90deg, ${styles.bar} 0%, transparent 100%)`,
        }}
      />

      {/* Flat tinted square icon badge — 28px, 4px radius */}
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: styles.iconBg,
          color: styles.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </span>

      {/* Right padding reserves room for the corner slab+dismiss cluster so
          long messages never run under it. */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1, paddingRight: 86 }}>
        <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.3, wordWrap: "break-word" }}>{message}</p>
      </div>

      {/* Corner cluster — slab mark then dismiss, side by side */}
      <span style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ display: "flex", gap: 2, opacity: 0.35 }}>
          <img src="/brand/empx-mark-slab-1.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
          <img src="/brand/empx-mark-slab-2.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
          <img src="/brand/empx-mark-slab-3.png" alt="" style={{ height: 9, width: "auto", display: "block" }} />
        </span>
        <button
          onClick={closeToast}
          aria-label="Close notification"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.40)",
            cursor: "pointer",
            padding: 4,
            margin: -4,
            display: "flex",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    </div>
  );
};

const defaultOptions: ToastOptions = {
  position: "bottom-center",
  autoClose: 5000,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 60,
};

// Create a component that works with react-toastify's ToastContentProps
const createToastComponent = (message: string, toastType: string): React.FC<ToastContentProps<unknown>> => {
  return (props: ToastContentProps<unknown>) => (
    <CustomToastContent 
      closeToast={props.closeToast} 
      data={{ title: message }}
      type={toastType}
    />
  );
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "success");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "success",
    });
  },

  error: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "error");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "error",
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "warning");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "warning",
    });
  },

  info: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "info");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "info",
    });
  },

  // Direct access to toastify for advanced usage
  original: toastify,
};

export default toast;
