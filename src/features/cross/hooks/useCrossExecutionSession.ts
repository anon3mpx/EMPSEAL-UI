import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { crossApi } from "../api/crossApi";
import type { OfferSet } from "../api/contracts";

interface CrossApiFailure {
  status?: number;
  body?: {
    fallbackOfferSet?: OfferSet;
  };
}

function isCrossApiFailure(error: unknown): error is CrossApiFailure {
  return typeof error === "object" && error !== null;
}

export function useCrossExecutionSession({
  api = crossApi,
}: {
  api?: typeof crossApi;
} = {}) {
  const [fallbackOfferSet, setFallbackOfferSet] = useState<OfferSet | null>(null);

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
      } catch (error: unknown) {
        if (
          isCrossApiFailure(error) &&
          error.status === 409 &&
          error.body?.fallbackOfferSet
        ) {
          setFallbackOfferSet(error.body.fallbackOfferSet);
        }
        throw error;
      }
    },
    selectComposedIntent: composedIntent.mutateAsync,
    isSelecting: singleIntent.isPending || composedIntent.isPending,
  };
}
