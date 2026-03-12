import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
import { pulsechain, sonic, sei, rootstock} from 'wagmi/chains';
import { defineChain } from 'viem';

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
  name: "Base",
  nativeCurrency: {
    name: "Base Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://base.drpc.org"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 16776770,
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  },
} as const);

// export const sei = defineChain({
//   id: 1329,
//   name: "Sei",
//   nativeCurrency: {
//     name: "Sei",
//     symbol: "SEI",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://sei.drpc.org"],
//     },
//   },
//   contracts: {
//     multicall3: {
//       address: "0xcA11bde05977b3631167028862bE2a173976CA11",
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "seitrace",
//       url: "https://seitrace.com/",
//     },
//   },
// } as const);

export const berachain = defineChain({
  id: 80094,
  name: "Berachain",
  nativeCurrency: {
    name: "Bera",
    symbol: "BERA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://berachain.drpc.org"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  blockExplorers: {
    default: {
      name: "Berascan",
      url: "https://berascan.org",
    },
  },
} as const);

// Wallet configuration for swap
const swapConnectors = connectorsForWallets(
  [
    {
      groupName: 'Suggested',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: 'RainbowKit Swap', projectId: 'YOUR_PROJECT_ID' },
);

export const config = getDefaultConfig({
  appName: 'Empseal Swap',
  projectId: 'YOUR_PROJECT_ID',
  // Note: ethw and sonic are temporarily disabled (not up to date)
  // To re-enable, change to: chains: [pulsechain, ethw, sonic],
  chains: [pulsechain, sonic, base, sei, berachain, rootstock, ethw],
  ssr: true,
  connectors: swapConnectors,
});
