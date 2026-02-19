import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { pulsechain, base, arbitrum, avalanche, optimism } from "wagmi/chains";
import { defineChain } from "viem";

export const bnb = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://bsc-dataseed.binance.org/"],
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://56.rpc.vialabs.io/",
    },
  },
} as const);

export const polygon = defineChain({
  id: 137,
  name: "Polygon",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://polygon.drpc.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://polygonscan.com",
    },
  },
});

// Wallet configuration for via-bridge
const viaBridgeConnectors = connectorsForWallets(
  [
    {
      groupName: "Suggested",
      wallets: [
        metaMaskWallet,
        phantomWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: "RainbowKit Via Bridge", projectId: "YOUR_PROJECT_ID" }
);

export const viaBridgeConfig = getDefaultConfig({
  appName: "Emplseal Via Bridge",
  projectId: "YOUR_PROJECT_ID",
  chains: [pulsechain, base, arbitrum, polygon, avalanche, optimism, bnb],
  ssr: true,
  connectors: viaBridgeConnectors,
});
