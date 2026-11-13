// Which cross-chain backend ("engine") the /cross-v2 page runs on. Testing-only switch, built to be deleted:
//   VITE_CROSS_ENGINES = "v1" (default) | "v2" | "v1,v2"
// With both enabled the page shows a V1 | V2 toggle; the choice comes from ?engine=, then this browser's last pick, then the first listed.
// Launch: set VITE_CROSS_ENGINES=v2. Removing V1: see README ("EMPX V2 cross-chain").
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type CrossEngine = "v1" | "v2";
const KNOWN: readonly CrossEngine[] = ["v1", "v2"];
const STORAGE_KEY = "empx.crossEngine";

/** Parses the build setting. Unknown entries are ignored; nothing valid means V1 only. */
export function parseEngines(raw: string | undefined): CrossEngine[] {
  const out: CrossEngine[] = [];
  for (const part of (raw ?? "").split(",")) {
    const e = part.trim().toLowerCase() as CrossEngine;
    if (KNOWN.includes(e) && !out.includes(e)) out.push(e);
  }
  return out.length ? out : ["v1"];
}

export const enabledEngines = (): CrossEngine[] => parseEngines(import.meta.env.VITE_CROSS_ENGINES);

/** The engine to show: the URL's if enabled, else the stored one if enabled, else the first enabled. */
export function resolveEngine(enabled: readonly CrossEngine[], fromUrl: string | null, fromStorage: string | null): CrossEngine {
  const ok = (v: string | null): v is CrossEngine => v !== null && (enabled as readonly string[]).includes(v);
  if (ok(fromUrl)) return fromUrl;
  if (ok(fromStorage)) return fromStorage;
  return enabled[0]!;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeStored(e: CrossEngine): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, e);
  } catch {
    // Private mode or blocked storage: the URL still carries the choice.
  }
}

export function useCrossEngine(enabled: readonly CrossEngine[] = enabledEngines()) {
  const [params, setParams] = useSearchParams();
  const engine = resolveEngine(enabled, params.get("engine"), readStored());
  const setEngine = useCallback(
    (next: CrossEngine) => {
      writeStored(next);
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("engine", next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return useMemo(() => ({ engine, setEngine, showToggle: enabled.length > 1 }), [engine, setEngine, enabled.length]);
}
