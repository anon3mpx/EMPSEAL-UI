import { useMutation } from "@tanstack/react-query";
import { crossApi } from "../api/crossApi";
import { crossApiFetch } from "../api/client";

export function useCrossRecovery(
  intentId: string,
  options: {
    gardenBitcoinRefund?: {
      userAddress: string;
      recoveryToken: string;
    } | null;
  } = {},
) {
  return {
    cancel: useMutation({
      mutationFn: (payload: any) =>
        crossApiFetch(`/api/v1/intent/${intentId}/cancel`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    }),
    refund: useMutation({
      mutationFn: (payload: any) => {
        if (options.gardenBitcoinRefund) {
          return crossApi.markGardenRefund(intentId, {
            userAddress: options.gardenBitcoinRefund.userAddress,
            recoveryToken: options.gardenBitcoinRefund.recoveryToken,
            reason: String(payload?.reason ?? "User requested refund"),
          });
        }
        return crossApiFetch(`/api/v1/intent/${intentId}/refund`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
    }),
  };
}
