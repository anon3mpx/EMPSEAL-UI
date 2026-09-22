const STORAGE_KEY = "empx:cross-session";

function stripNativeCallbackAuth(session: unknown): unknown {
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return session;
  }
  if (!("nativeCallbackAuth" in session)) return session;
  const { nativeCallbackAuth: _omit, ...rest } = session as Record<string, unknown>;
  return rest;
}

export function saveCrossSession(session: unknown) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripNativeCallbackAuth(session)));
}

export function loadCrossSession<T>() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function clearCrossSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
