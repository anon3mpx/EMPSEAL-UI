// Chain configuration with logos and metadata
// Logos sourced from CoinGecko and DexScreener

export const CHAIN_CONFIG = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    color: "#FF8A00",
    rpc: [
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
      "https://eth-mainnet.g.alchemy.com/v2/demo",
    ],
    explorer: "https://etherscan.io",
    coinGeckoId: "ethereum",
  },
  base: {
    id: "base",
    name: "Base",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/38417/small/base-cb.png",
    color: "#FF8A00",
    rpc: [
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
      "https://rpc.ankr.com/base",
    ],
    explorer: "https://basescan.org",
    coinGeckoId: "base",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
    color: "#FF8A00",
    rpc: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.llamarpc.com",
      "https://rpc.ankr.com/arbitrum",
    ],
    explorer: "https://arbiscan.io",
    coinGeckoId: "arbitrum-one",
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    logo: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
    color: "#F5AC37",
    rpc: [
      "https://polygon-rpc.com",
      "https://matic.llamarpc.com",
      "https://rpc.ankr.com/polygon",
    ],
    explorer: "https://polygonscan.com",
    coinGeckoId: "matic-network",
  },
  bsc: {
    id: "bsc",
    name: "BNB Chain",
    symbol: "BNB",
    logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    color: "#F3BA2F",
    rpc: [
      "https://bsc-dataseed.binance.org",
      "https://bsc.llamarpc.com",
      "https://rpc.ankr.com/bsc",
    ],
    explorer: "https://bscscan.com",
    coinGeckoId: "binancecoin",
  },
  pulsechain: {
    id: "pulsechain",
    name: "PulseChain",
    symbol: "PLS",
    logo: "https://dexscreener.com/assets/chains/avax.svg", // Placeholder - replace with actual
    color: "#FF8A00",
    rpc: [
      "https://rpc.pulsechain.com",
      "https://rpc2.pulsechain.com",
    ],
    explorer: "https://scan.pulsechain.com",
    coinGeckoId: "pulsechain",
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    color: "#FF8A00",
    rpc: [
      "https://mainnet.optimism.io",
      "https://optimism.llamarpc.com",
      "https://rpc.ankr.com/optimism",
    ],
    explorer: "https://optimistic.etherscan.io",
    coinGeckoId: "optimism",
  },
} as const;

export type ChainId = keyof typeof CHAIN_CONFIG;

export const CHAIN_LIST = Object.values(CHAIN_CONFIG);

export function getChainById(id: string): typeof CHAIN_LIST[number] | undefined {
  return CHAIN_LIST.find(c => c.id === id);
}

export function getChainBySymbol(symbol: string): typeof CHAIN_LIST[number] | undefined {
  return CHAIN_LIST.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
}