import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { http } from "wagmi";
import { fallback } from "viem";
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
} from "./chains";

// Wallet configuration for swap
const swapConnectors = connectorsForWallets(
  [
    {
      groupName: "Suggested",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: "RainbowKit Swap", projectId: "YOUR_PROJECT_ID" },
);

const transportOptions = {
  timeout: 12_000,
  retryCount: 1,
  retryDelay: 1_000,
} as const;

const uniqueUrls = (urls: string[]) => [...new Set(urls.filter(Boolean))];

const chainTransport = (
  chain: { rpcUrls: { default: { http: readonly string[] } } },
  preferredUrls: string[] = [],
) => {
  const urls = uniqueUrls([...preferredUrls, ...chain.rpcUrls.default.http]);
  const transports = urls.map((url) => http(url, transportOptions));

  if (transports.length <= 1) {
    return transports[0];
  }

  // Keep failover passive. `rank: true` actively probes all RPCs on an interval.
  return fallback(transports, { rank: false });
};

export const config = getDefaultConfig({
  appName: "Empseal Swap",
  projectId: "YOUR_PROJECT_ID",
  chains,
  transports: {
    [pulsechain.id]: chainTransport(pulsechain, [
      "https://rpc.pulsechain.com",
      "https://rpc.pulsechain.box",
      "https://pulsechain-rpc.publicnode.com",
      "https://rpc.pulsechainrpc.com",
    ]),
    [sonic.id]: chainTransport(sonic, [
      "https://rpc.soniclabs.com",
      "https://sonic-rpc.publicnode.com",
      "https://sonic.drpc.org",
      "https://sonic.api.pocket.network",
    ]),
    [base.id]: chainTransport(base, [
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com",
      "https://base.llamarpc.com",
      "https://developer-access-mainnet.base.org",
      "https://1rpc.io/base",
      "https://base.drpc.org",
      "https://base.public.blockpi.network/v1/rpc/public",
      "https://base.meowrpc.com",
    ]),
    [sei.id]: chainTransport(sei, [
      "https://evm-rpc.sei-apis.com",
      "https://sei.api.pocket.network",
      "https://sei.drpc.org",
      "https://sei-evm-rpc.publicnode.com",
      "https://sei.llamarpc.com",
    ]),
    [berachain.id]: chainTransport(berachain, [
      "https://berachain.drpc.org",
      "https://berachain-rpc.publicnode.com",
      "https://rpc.berachain-apis.com",
      "https://berachain.api.pocket.network",
    ]),
    [rootstock.id]: chainTransport(rootstock, [
      "https://public-node.rsk.co",
      "https://mycrypto.rsk.co",
      "https://rootstock-mainnet.public.blastapi.io",
      "https://rootstock.drpc.org",
    ]),
    [ethw.id]: chainTransport(ethw, [
      "https://mainnet.ethereumpow.org",
      "https://ethw.public-rpc.com",
    ]),
    [bsc.id]: chainTransport(bsc, [
      "https://bsc-rpc.publicnode.com",
      "https://bsc.api.pocket.network",
      "https://bsc-dataseed.binance.org",
      "https://bsc.blockpi.network/v1/rpc/public",
      "https://binance.llamarpc.com",
    ]),
    [monad.id]: chainTransport(monad, [
      "https://rpc.monad.xyz",
      "https://rpc4.monad.xyz",
      "https://rpc3.monad.xyz",
      "https://monad-mainnet.drpc.org",
    ]),
    [arbitrum.id]: chainTransport(arbitrum, [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.lava.build",
      "https://arb-one.api.pocket.network",
      "https://1rpc.io/arb",
      "https://arbitrum.blockpi.network/v1/rpc/public",
      "https://endpoints.omniatech.io/v1/arbitrum/one/public",
    ]),
    [optimism.id]: chainTransport(optimism, [
      "https://mainnet.optimism.io",
      "https://optimism.blockpi.network/v1/rpc/public",
      "https://1rpc.io/op",
      "https://endpoints.omniatech.io/v1/op/mainnet/public",
    ]),
    [polygon.id]: chainTransport(polygon, [
      "https://polygon.drpc.org",
      "https://polygon-rpc.com",
      "https://rpc.ankr.com/polygon",
      "https://polygon-bor-rpc.publicnode.com",
      "https://1rpc.io/matic",
      "https://polygon-mainnet.public.blastapi.io",
      "https://polygon.blockpi.network/v1/rpc/public",
    ]),
    [avalanche.id]: chainTransport(avalanche, [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://avalanche.public-rpc.com",
      "https://avax.api.pocket.network",
      "https://avalanche.blockpi.network/v1/rpc/public",
      "https://endpoints.omniatech.io/v1/avax/mainnet/public",
    ]),
    [hyperEVM.id]: chainTransport(hyperEVM, [
      "https://hyperevm-rpc.publicnode.com",
      "https://hyperliquid-json-rpc.stakely.io",
      "https://hyperliquid.llamarpc.com",
      "https://rpc.ankr.com/hyperliquid_evm",
      "https://hyperliquid.drpc.org",
      "https://rpc.hyperliquid.xyz/evm",
    ]),
  },
  ssr: true,
  connectors: swapConnectors,
});
