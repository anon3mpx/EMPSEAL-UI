import { useQuery } from "@tanstack/react-query";
import { crossApi } from "../api/crossApi";
import type { QuoteRequest } from "../api/contracts";
import { normalizeOfferSet } from "../model/quotes";

export function useCrossQuote(enabled: boolean, request: QuoteRequest | null) {
  return useQuery({
    queryKey: ["cross-quote", request],
    queryFn: async () => {
      if (!request) {
        throw new Error("Cross-chain quote request is not ready.");
      }
      return normalizeOfferSet(await crossApi.quote(request));
    },
    enabled,
    staleTime: 0,
    retry: request ? 1 : false,
  });
}
