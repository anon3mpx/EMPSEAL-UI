import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { crossApi } from "../api/crossApi";

export function useCrossExecutionSession({
  api = crossApi,
}: {
  api?: typeof crossApi;
} = {}) {
  const [fallbackOfferSet, setFallbackOfferSet] = useState<any>(null);

  const singleIntent = useMutation({
    mutationFn: api.selectOffer,
  });

  const composedIntent = useMutation({
    mutationFn: api.selectComposed,
  });

  return {
    fallbackOfferSet,
    selectSingleIntent: async (payload: {
      offerSetId: string;
      offerId: string;
      userAddress: string;
    }) => {
      try {
        setFallbackOfferSet(null);
        return await singleIntent.mutateAsync(payload);
      } catch (error: any) {
        if (error?.status === 409 && error?.body?.fallbackOfferSet) {
          setFallbackOfferSet(error.body.fallbackOfferSet);
        }
        throw error;
      }
    },
    selectComposedIntent: composedIntent.mutateAsync,
    isSelecting: singleIntent.isPending || composedIntent.isPending,
  };
}
