import { useQuery } from "@tanstack/react-query";
import { crossApi } from "../api/crossApi";
import { normalizeOfferSet } from "../model/quotes";

export function useCrossQuote(enabled: boolean, request: any) {
  return useQuery({
    queryKey: ["cross-quote", request],
    queryFn: async () => normalizeOfferSet(await crossApi.quote(request)),
    enabled,
    staleTime: 0,
    retry: 1,
  });
}
