import { useQuery } from "@tanstack/react-query";
import type { BasketCapabilities, BasketMode } from "../api/contracts";
import { basketApi } from "../api/basketApi";
import { mapBasketApiError } from "../utils/errors";

export function modeCapability(
  capabilities: BasketCapabilities | null | undefined,
  mode: BasketMode,
): { enabled: boolean; reason?: string } {
  if (!capabilities) {
    return { enabled: false, reason: "Basket capabilities are unavailable." };
  }
  if (!capabilities.enabled) {
    return { enabled: false, reason: "Intent baskets are disabled." };
  }
  const modeState = capabilities.modes?.[mode];
  if (!modeState?.enabled) {
    return {
      enabled: false,
      reason: modeState?.reason ?? `Basket mode ${mode} is disabled.`,
    };
  }
  return { enabled: true };
}

export function useBasketCapabilities() {
  const query = useQuery({
    queryKey: ["basket-capabilities"],
    queryFn: basketApi.getCapabilities,
    retry: 1,
    staleTime: 30_000,
  });

  return {
    capabilities: query.data ?? null,
    isLoading: query.isLoading,
    errorMessage: query.error ? mapBasketApiError(query.error) : null,
    refetch: query.refetch,
  };
}
