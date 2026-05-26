const DRPC_PUBLIC_KEY = "Alj6-PidlEmLn_S7Ly5es5HretM-VDoR8a-xtiKh6MJI";

export const DRPC_BROWSER_RPC_URLS: Partial<Record<number, string>> = {
  143: `https://lb.drpc.live/monad-mainnet/${DRPC_PUBLIC_KEY}`,
  56: `https://lb.drpc.live/bsc/${DRPC_PUBLIC_KEY}`,
  8453: `https://lb.drpc.live/base/${DRPC_PUBLIC_KEY}`,
  137: `https://lb.drpc.live/polygon/${DRPC_PUBLIC_KEY}`,
  10: `https://lb.drpc.live/optimism/${DRPC_PUBLIC_KEY}`,
  42161: `https://lb.drpc.live/arbitrum/${DRPC_PUBLIC_KEY}`,
  43114: `https://lb.drpc.live/avalanche/${DRPC_PUBLIC_KEY}`,
  146: `https://lb.drpc.live/sonic/${DRPC_PUBLIC_KEY}`,
  1329: `https://lb.drpc.live/sei/${DRPC_PUBLIC_KEY}`,
  80094: `https://lb.drpc.live/berachain/${DRPC_PUBLIC_KEY}`,
  30: `https://lb.drpc.live/rootstock/${DRPC_PUBLIC_KEY}`,
};

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
