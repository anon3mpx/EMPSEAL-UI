const DRPC_NETWORKS: Record<number, string> = {
  143: "monad-mainnet",
  56: "bsc",
  8453: "base",
  137: "polygon",
  10: "optimism",
  42161: "arbitrum",
  43114: "avalanche",
  146: "sonic",
  1329: "sei",
  80094: "berachain",
  30: "rootstock",
};

export function buildDrpcBrowserRpcUrls(
  publicKey: string,
): Partial<Record<number, string>> {
  const trimmedKey = publicKey.trim();
  if (!trimmedKey) return {};

  return Object.fromEntries(
    Object.entries(DRPC_NETWORKS).map(([chainId, network]) => [
      Number(chainId),
      `https://lb.drpc.live/${network}/${trimmedKey}`,
    ]),
  );
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const DRPC_BROWSER_RPC_URLS = buildDrpcBrowserRpcUrls(
  env?.VITE_DRPC_PUBLIC_KEY ?? "",
);

export const getPrimaryRpcUrl = (
  chainId: number,
  fallbackUrl?: string,
): string => DRPC_BROWSER_RPC_URLS[chainId] || fallbackUrl || "";

export const prependPrimaryRpcUrl = (
  chainId: number,
  urls: string[] = [],
): string[] => {
  const primary = DRPC_BROWSER_RPC_URLS[chainId];
  const filtered = urls.filter(Boolean);
  if (!primary) return [...new Set(filtered)];
  return [...new Set([primary, ...filtered])];
};
