// Chain configuration with logos and metadata
// Logos sourced from CoinGecko and DexScreener

export const CHAIN_CONFIG = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    logo: "/icons/eth.svg",
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
    logo: "/icons/base.svg",
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
    logo: "/icons/arbitrum.svg",
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
    logo: "/icons/polygon.svg",
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
    logo: "/icons/binance.svg",
    color: "#F3BA2F",
    rpc: [
      "https://bsc-dataseed.binance.org",
      "https://bsc.llamarpc.com",
      "https://rpc.ankr.com/bsc",
    ],
    explorer: "https://bscscan.com",
    coinGeckoId: "binancecoin",
  },
  avalanche: {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    logo: "/icons/avalanche.svg",
    color: "#E84142",
    rpc: ["https://api.avax.network/ext/bc/C/rpc"],
    explorer: "https://snowtrace.io",
    coinGeckoId: "avalanche-2",
  },
  pulsechain: {
    id: "pulsechain",
    name: "PulseChain",
    symbol: "PLS",
    logo: "/icons/pls.svg",
    color: "#FF8A00",
    rpc: [
      "https://rpc.pulsechain.com",
      "https://rpc2.pulsechain.com",
    ],
    explorer: "https://scan.pulsechain.com",
    coinGeckoId: "pulsechain",
  },
  rootstock: {
    id: "rootstock",
    name: "Rootstock",
    symbol: "RBTC",
    logo: "http://api-assets.rubic.exchange/assets/coingecko/rootstock/0x0000000000000000000000000000000000000000/logo.png",
    color: "#FF8A00",
    rpc: [
      "https://public-node.rsk.co",
      "https://rootstock-mainnet.public.blastapi.io",
      "https://rootstock.drpc.org",
    ],
    explorer: "https://explorer.rsk.co",
    coinGeckoId: "rootstock-rbtc",
  },
  sonic: {
    id: "sonic",
    name: "Sonic",
    symbol: "S",
    logo: "/icons/sonic.png",
    color: "#00A4FF",
    rpc: ["https://rpc.soniclabs.com"],
    explorer: "https://sonicscan.org",
    coinGeckoId: "sonic-3",
  },
  sei: {
    id: "sei",
    name: "Sei",
    symbol: "SEI",
    logo: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/sei.svg",
    color: "#FF4D4D",
    rpc: ["https://sei.drpc.org"],
    explorer: "https://seitrace.com",
    coinGeckoId: "sei-network",
  },
  berachain: {
    id: "berachain",
    name: "Berachain",
    symbol: "BERA",
    logo: "/icons/berachain.svg",
    color: "#F8B648",
    rpc: ["https://berachain.drpc.org"],
    explorer: "https://berascan.com",
    coinGeckoId: "berachain-bera",
  },
  monad: {
    id: "monad",
    name: "Monad",
    symbol: "MONAD",
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/32120.png",
    color: "#836EF9",
    rpc: ["https://rpc.monad.xyz"],
    explorer: "https://monadscan.com",
    coinGeckoId: "monad",
  },
  hyperevm: {
    id: "hyperevm",
    name: "HyperEVM",
    symbol: "HYPE",
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png",
    color: "#43F4C6",
    rpc: ["https://rpc.hyperliquid.xyz/evm"],
    explorer: "https://hyperevmscan.io",
    coinGeckoId: "hyperliquid",
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    logo: "/icons/op.svg",
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
