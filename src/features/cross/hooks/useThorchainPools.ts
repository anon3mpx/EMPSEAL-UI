import { useQuery } from "@tanstack/react-query";
import type { ThorchainPoolAsset } from "../model/thorchainCatalog";

const THORCHAIN_POOLS_URL = "https://thornode.thorchain.network/thorchain/pools";

export function useThorchainPools() {
  return useQuery({
    queryKey: ["thorchain-pools"],
    queryFn: async (): Promise<ThorchainPoolAsset[]> => {
      const response = await fetch(THORCHAIN_POOLS_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
    retry: 1,
  });
}
