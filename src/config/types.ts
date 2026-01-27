// src/config/types.ts
export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  routerAddress: string;
  wethAddress: string;
  priceApi: {
    baseUrl: string;
    tokenPriceEndpoint: string;
    graphEndpoint: string;
  };
  blockExplorer: string;
  blockExplorerName: string;
  rpcUrl: string;
  maxHops: number;
  stableTokens?: string[];
  blockTime: number; // in seconds
}