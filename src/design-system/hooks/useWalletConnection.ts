// useWalletConnection — bridges wagmi v2 with the V2 design-system wallet components
//
// Maps wagmi's useConnect / useAccount / useDisconnect / useChainId into the
// shape expected by WalletModal, WalletButton, and the per-page wallet state.
//
// Replaces the mock WalletState (hardcoded after 1.4s timeout) in every V2
// page with a real wagmi-powered connection flow.

import { useMemo } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import type { WalletOption, WalletKind } from "../components/WalletModal";

const CONNECTOR_NAME_TO_ID: Record<string, string> = {
  "MetaMask":        "metamask",
  "Rabby Wallet":    "rabby",
  "WalletConnect":   "walletconnect",
  "Coinbase Wallet": "coinbase",
};

const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  metamask:      "Most popular EVM wallet",
  rabby:         "Multi-chain native, security-first",
  walletconnect: "Connect any mobile wallet",
  coinbase:      "Coinbase Wallet",
};

const CHAIN_COLORS: Record<number, string> = {
  1:     "#627EEA",
  10:    "#FF0420",
  56:    "#F0B90B",
  137:   "#7B3FE4",
  143:   "#7C5CFC",
  146:   "#FE9A4D",
  369:   "#FF008F",
  999:   "#97FBE5",
  1329:  "#9D1F1F",
  8453:  "#0052FF",
  42161: "#28A0F0",
  43114: "#E84142",
  80094: "#814625",
  30:    "#FF9900",
  10001: "#00FF00",
};

const CHAIN_NAMES: Record<number, string> = {
  1:     "Ethereum",
  10:    "Optimism",
  56:    "BSC",
  137:   "Polygon",
  143:   "Monad",
  146:   "Sonic",
  369:   "PulseChain",
  999:   "HyperEVM",
  1329:  "Sei",
  8453:  "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
  80094: "Berachain",
  30:    "Rootstock",
  10001: "EthereumPOW",
};

export interface V2Chain {
  id: number;
  name: string;
  color: string;
}

export type V2WalletState =
  | { status: "disconnected" }
  | { status: "loading" }
  | {
      status: "connected";
      address: string;
      providerName: string;
      chain: V2Chain;
    };

export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const walletOptions: WalletOption[] = useMemo(
    () =>
      connectors
        .map((c) => {
          const id = CONNECTOR_NAME_TO_ID[c.name] ?? c.name.toLowerCase().replace(/\s+/g, "-");
          return {
            id,
            name: c.name,
            description: CONNECTOR_DESCRIPTIONS[id] ?? `Connect with ${c.name}`,
            kind: "evm" as WalletKind,
            installed: c.ready ?? true,
          };
        })
        .sort((a, b) => {
          if (a.name === "MetaMask") return -1;
          if (b.name === "MetaMask") return 1;
          if (a.name === "Rabby Wallet") return -1;
          if (b.name === "Rabby Wallet") return 1;
          return 0;
        }),
    [connectors],
  );

  const onSelectWallet = (wallet: WalletOption) => {
    const connector = connectors.find((c) => {
      const id = CONNECTOR_NAME_TO_ID[c.name] ?? c.name.toLowerCase().replace(/\s+/g, "-");
      return id === wallet.id;
    });
    if (connector) {
      connect({ connector });
    }
  };

  const currentChain: V2Chain = {
    id: chainId || 369,
    name: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
    color: CHAIN_COLORS[chainId] ?? "#FF8A00",
  };

  const walletState: V2WalletState = isPending
    ? { status: "loading" }
    : isConnected && address
      ? {
          status: "connected",
          address,
          providerName: "EVM Wallet",
          chain: currentChain,
        }
      : { status: "disconnected" };

  return {
    walletState,
    walletOptions,
    onSelectWallet,
    disconnect,
    switchChain,
    currentChain,
    address,
    isConnected,
    connect: onSelectWallet,
  };
}
