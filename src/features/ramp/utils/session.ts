import type { RampSessionSnapshot } from "../api/contracts";

const STORAGE_KEY = "empx:ramp-session";

export function saveRampSession(session: RampSessionSnapshot): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadRampSession(): RampSessionSnapshot | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RampSessionSnapshot;
    if (!parsed?.wallet || !parsed?.chainId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRampSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
