// Floating V1 | V2 switch for side-by-side testing. Shown only when the build enables both engines; it touches neither page's layout.
import type { CrossEngine } from "./engine";

const OPTIONS: Array<{ value: CrossEngine; label: string; hint: string }> = [
  { value: "v1", label: "V1", hint: "Current cross-chain backend" },
  { value: "v2", label: "V2 · Beta", hint: "EMPX V2 backend" },
];

export default function CrossEngineToggle({ engine, onChange }: { engine: CrossEngine; onChange: (e: CrossEngine) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Cross-chain engine"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "rgba(12,12,20,0.92)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
      }}
    >
      {OPTIONS.map((o) => {
        const active = o.value === engine;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => !active && onChange(o.value)}
            style={{
              minHeight: 44,
              minWidth: 72,
              padding: "0 16px",
              borderRadius: 999,
              border: `1px solid ${active ? "rgba(255,138,0,0.45)" : "transparent"}`,
              background: active ? "rgba(255,138,0,0.14)" : "transparent",
              color: active ? "#FF8A00" : "rgba(255,255,255,0.72)",
              fontSize: 13,
              fontWeight: 600,
              cursor: active ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
