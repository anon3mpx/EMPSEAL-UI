
import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "loading" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms — 0 = sticky (manual dismiss only)
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => string;
  updateToast: (id: string, patch: Partial<Omit<ToastItem, "id">>) => void;
  removeToast: (id: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Single toast card ──────────────────────────────────────────────────────────

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dur = toast.duration ?? (toast.type === "loading" ? 0 : 5000);
    if (dur > 0) {
      timerRef.current = setTimeout(onRemove, dur);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.duration, toast.type, onRemove]);

  const accent =
    toast.type === "success" ? "#4ade80" :
    toast.type === "error"   ? "#f87171" :
    toast.type === "loading" ? "#FF8A00" :
    "#627EEA";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 w-full"
      style={{
        background: "rgba(8,8,20,0.97)",
        border: `1px solid ${accent}28`,
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}10`,
        maxWidth: 340,
        pointerEvents: "auto",
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8  flex items-center justify-center"
        style={{ background: `${accent}14` }}
      >
        {toast.type === "loading" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 "
            style={{ border: `2px solid ${accent}30`, borderTopColor: accent }}
          />
        )}
        {toast.type === "success" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        )}
        {toast.type === "error" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        )}
        {toast.type === "info" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-white leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            {toast.description}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onRemove}
        className="shrink-0 transition-all"
        style={{ color: "rgba(255,255,255,0.2)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </motion.div>
  );
}

// ── Container (fixed bottom-right) ─────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="fixed z-[200] flex flex-col gap-2 items-end"
      style={{
        bottom: 24,
        right: 24,
        pointerEvents: "none",
        width: 340,
      }}
    >
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, patch: Partial<Omit<ToastItem, "id">>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastCtx.Provider>
  );
}
