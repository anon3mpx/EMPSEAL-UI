"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "./config";
import { ChainProvider } from "../hooks/ChainContext";
import { ConnectPopupProvider } from "../hooks/ConnectPopupContext";
import React from "react";

const queryClient = new QueryClient();

type AppType = 'swap' | 'bridge' | 'via-bridge';

interface WagmiProviderWrapperProps {
  children: React.ReactNode;
  appType: AppType;
}

export default function WagmiProviderWrapper({
  children,
  appType = 'swap',
}: WagmiProviderWrapperProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider key={appType} theme={darkTheme()} modalSize="compact">
          <ChainProvider>
            <ConnectPopupProvider>
              {children}
            </ConnectPopupProvider>
          </ChainProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
