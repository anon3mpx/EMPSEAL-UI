import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { pulsechain, base, arbitrum, polygon, avalanche, optimism } from "wagmi/chains";
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
      url: "https://bscscan.com",
    },
  },
} as const);

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
