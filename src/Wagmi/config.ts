import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';
import { fallback } from 'viem';
import {
  chains,
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
} from './chains';

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

const fallbackTransport = (urls: string[]) =>
  fallback(
    urls.map((url) =>
      http(url, {
        timeout: 30_000,
        retryCount: 1,
        retryDelay: 2500,
      }),
    ),
    { rank: false },
  );

export const config = getDefaultConfig({
  appName: 'Empseal Swap',
  projectId: 'YOUR_PROJECT_ID',
  // Note: ethw and sonic are temporarily disabled (not up to date)
  // To re-enable, change to: chains: [pulsechain, ethw, sonic],
  chains,
  transports: {
    [pulsechain.id]: http(),
    [sonic.id]: http(),
    [base.id]: fallbackTransport([
      "https://base.drpc.org",
      "https://base-rpc.publicnode.com",
    ]),
    [sei.id]: fallbackTransport([
      "https://evm-rpc.sei-apis.com",
      "https://sei.api.pocket.network",
      "https://sei.drpc.org",
      "https://sei-evm-rpc.publicnode.com",
    ]),
    [berachain.id]: http(),
    [rootstock.id]: http(),
    [ethw.id]: http(),
    [bsc.id]: http(),
    [monad.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [avalanche.id]: http(),
    [hyperEVM.id]: http(),
  },
  ssr: true,
  connectors: swapConnectors,
});
