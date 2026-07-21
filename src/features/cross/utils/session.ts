const STORAGE_KEY = "empx:cross-session";

export function saveCrossSession(session: unknown) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadCrossSession<T>() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function clearCrossSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
