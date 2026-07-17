const PUBLIC_CROSS_API_ORIGIN = "https://crosschain.empx.io";

export function resolveCrossApiBaseUrl(
  configuredBaseUrl: string | undefined,
  isDevelopment: boolean,
): string {
  const configured = configuredBaseUrl?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return isDevelopment ? "" : PUBLIC_CROSS_API_ORIGIN;
}

const API_BASE_URL = resolveCrossApiBaseUrl(
  import.meta.env.VITE_CROSS_API_BASE_URL,
  import.meta.env.DEV,
);

export async function crossApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw { status: response.status, body };
  }

  return response.json() as Promise<T>;
}
