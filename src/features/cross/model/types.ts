export interface CrossUiChain {
  chainId: number;
  name: string;
  symbol: string;
  logo?: string;
  explorer?: string;
}

export interface CrossUiToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isNative: boolean;
  featured: boolean;
  stable: boolean;
}
