import { useMutation } from "@tanstack/react-query";
import { crossApiFetch } from "../api/client";

export function useCrossRecovery(intentId: string) {
  return {
    cancel: useMutation({
      mutationFn: (payload: any) =>
        crossApiFetch(`/api/v1/intent/${intentId}/cancel`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    }),
    refund: useMutation({
      mutationFn: (payload: any) =>
        crossApiFetch(`/api/v1/intent/${intentId}/refund`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    }),
  };
}
