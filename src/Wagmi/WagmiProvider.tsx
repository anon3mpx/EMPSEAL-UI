"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mode, hardhat } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "./config";
import { bridgeConfig } from "./bridgeConfig";
import { viaBridgeConfig } from "./viaBridgeConfig";
import React from "react";

const queryClient = new QueryClient();
const localHardhat = { ...hardhat, id: 1337 };

type AppType = 'swap' | 'bridge' | 'via-bridge';

interface WagmiProviderWrapperProps {
  children: React.ReactNode;
  appType: AppType;
}

export default function WagmiProviderWrapper({
  children,
  appType = 'swap',
}: WagmiProviderWrapperProps) {
  const wagmiConfig =
    appType === 'bridge'
      ? bridgeConfig
      : appType === 'via-bridge'
      ? viaBridgeConfig
      : config;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider key={appType} theme={darkTheme()} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
