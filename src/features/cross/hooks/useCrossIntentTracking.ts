import { useQuery } from "@tanstack/react-query";
import { crossApiFetch } from "../api/client";

export function useCrossIntentTracking(
  intentId?: string,
  composedIds?: { primary: string; gas: string },
) {
  return useQuery({
    queryKey: ["cross-intent-tracking", intentId, composedIds],
    queryFn: () => {
      if (composedIds) {
        return crossApiFetch(
          `/api/v1/intent/composed/${composedIds.primary}/${composedIds.gas}`,
        );
      }

      return crossApiFetch(`/api/v1/intent/${intentId}`);
    },
    enabled: Boolean(intentId || composedIds),
    refetchInterval: 5000,
  });
}
