import { defineChain } from 'viem';
import { pulsechain, sonic, rootstock, avalanche } from 'wagmi/chains';

export { pulsechain, sonic, rootstock, avalanche };

export const ethw = defineChain({
  id: 10001,
  name: 'EthereumPoW',
  nativeCurrency: {
    name: 'EthereumPoW',
    symbol: 'ETHW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.ethereumpow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/ethereum-pow',
    },
  },
} as const);

export const base = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    name: 'Base Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://base.drpc.org'],
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
} as const);

export const bsc = defineChain({
  id: 56,
  name: 'BSC',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://bsc-rpc.publicnode.com'],
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
} as const);

export const sei = defineChain({
  id: 1329,
  name: 'Sei Network',
  nativeCurrency: {
    name: 'Sei',
    symbol: 'SEI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sei.api.pocket.network'],
      // https://evm-rpc.sei-apis.com
      // https://sei.drpc.org
      // https://sei-evm-rpc.stakeme.pro
      // https://sei-evm-rpc.publicnode.com
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
  blockExplorers: {
    default: {
      name: 'seitrace',
      url: 'https://seitrace.com/',
    },
  },
} as const);

export const berachain = defineChain({
  id: 80094,
  name: 'Berachain',
  nativeCurrency: {
    name: 'Bera',
    symbol: 'BERA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://berachain.drpc.org'],
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  blockExplorers: {
    default: {
      name: 'Berascan',
      url: 'https://berascan.org',
    },
  },
} as const);

export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MONAD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  blockExplorers: {
    default: {
      name: 'Monadscan',
      url: 'https://monadscan.com/',
    },
  },
} as const);

export const arbitrum = defineChain({
  id: 42161,
  name: 'Arbitrum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://arb1.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
} as const);

export const optimism = defineChain({
  id: 10,
  name: 'Optimism',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://mainnet.optimism.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Optimism Explorer',
      url: 'https://optimistic.etherscan.io',
      apiUrl: 'https://api-optimistic.etherscan.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
} as const);

export const polygon = defineChain({
  id: 137,
  name: 'Polygon',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://polygon.drpc.org'],
    },
  },
  blockExplorers: {
    default: {
    name: 'PolygonScan',
      url: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
} as const);

export const hyperEVM = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HyperEVM', symbol: 'HEVM', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid.xyz/evm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'hyperevmscan',
      url: 'https://hyperevmscan.io/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
} as const);

export const chains = [
  pulsechain,
  sonic,
  base,
  sei,
  berachain,
  rootstock,
  ethw,
  bsc,
  monad,
  arbitrum,
  optimism,
  polygon,
  avalanche,
  hyperEVM,
] as const;
