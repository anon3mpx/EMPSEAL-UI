import { Address } from "viem";

export type WidgetChainKey = "pulsechain" | "sonic" | "base" | "monad";

export type WidgetChainRuntime = {
  key: WidgetChainKey;
  chainId: number;
  routerAddress: Address;
  wethAddress: Address;
};

export const WIDGET_CHAIN_BY_KEY: Record<WidgetChainKey, WidgetChainRuntime> = {
  pulsechain: {
    key: "pulsechain",
    chainId: 369,
    routerAddress: "0x35D3dfC2Be97761b2D56ACb84B4Fc465b960fC47",
    wethAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  },
  sonic: {
    key: "sonic",
    chainId: 146,
    routerAddress: "0x0B53D47f69AAF1Ed56b7Dc9AA24f26e7AA37d261",
    wethAddress: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
  },
  base: {
    key: "base",
    chainId: 8453,
    routerAddress: "0x5A86AB81254e3D0Fc3b417a3409aF2180029cDfb",
    wethAddress: "0x4200000000000000000000000000000000000006",
  },
  monad: {
    key: "monad",
    chainId: 143,
    routerAddress: "0x86B1b88B2BBFe49999fA9A415270997ed1Bfd803",
    wethAddress: "0x3bd359c1119da7da1d913d1c4d2b7c461115433a",
  },
};

export const WIDGET_CHAIN_IDS = Object.values(WIDGET_CHAIN_BY_KEY).map(
  (chain) => chain.chainId,
);

const CHAIN_ALIASES: Record<string, WidgetChainKey> = {
  pulsechain: "pulsechain",
  pulse: "pulsechain",
  sonic: "sonic",
  base: "base",
  monad: "monad",
  mon: "monad",
};

export const DEFAULT_WIDGET_CHAIN_KEY: WidgetChainKey = "pulsechain";

export const getWidgetChainKey = (
  rawChain: string | null | undefined,
): WidgetChainKey => {
  if (!rawChain) {
    return DEFAULT_WIDGET_CHAIN_KEY;
  }
  const normalized = rawChain.trim().toLowerCase();
  return CHAIN_ALIASES[normalized] || DEFAULT_WIDGET_CHAIN_KEY;
};

export const getWidgetChainById = (
  chainId: number | null | undefined,
): WidgetChainRuntime | null => {
  if (!chainId) {
    return null;
  }
  const found = Object.values(WIDGET_CHAIN_BY_KEY).find(
    (chain) => chain.chainId === chainId,
  );
  return found || null;
};

export const isWidgetChainId = (chainId: number | null | undefined): boolean => {
  return !!getWidgetChainById(chainId);
};
