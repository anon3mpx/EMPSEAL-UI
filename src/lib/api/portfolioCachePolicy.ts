const REFRESH_COOLDOWN_MS = 60 * 1000;

export function shouldUseCachedPortfolio(
  cache: { fetchedAt: number; expiry: number },
  now: number,
  forceRefresh: boolean,
): boolean {
  if (forceRefresh) return now - cache.fetchedAt < REFRESH_COOLDOWN_MS;
  return now < cache.expiry;
}
