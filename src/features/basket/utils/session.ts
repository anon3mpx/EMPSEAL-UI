import type { BasketSessionSnapshot } from "../api/contracts";

const STORAGE_KEY = "empx:basket-session";

export function saveBasketSession(session: BasketSessionSnapshot): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadBasketSession(): BasketSessionSnapshot | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BasketSessionSnapshot;
    if (!parsed?.basketId || !parsed?.wallet || !parsed?.mode) return null;
    return {
      basketId: parsed.basketId,
      wallet: parsed.wallet,
      mode: parsed.mode,
      ...(parsed.quoteVersion !== undefined ? { quoteVersion: parsed.quoteVersion } : {}),
      ...(parsed.planId ? { planId: parsed.planId } : {}),
      ...(parsed.planVersion !== undefined ? { planVersion: parsed.planVersion } : {}),
    };
  } catch {
    return null;
  }
}

export function clearBasketSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
