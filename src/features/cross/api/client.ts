const API_BASE_URL =
  import.meta.env.VITE_CROSS_API_BASE_URL ?? "https://crosschain.empx.io";

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
