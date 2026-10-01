// useWalletConnection — bridges wagmi v2 with the V2 design-system wallet components
//
// Maps wagmi's useConnect / useAccount / useDisconnect / useChainId into the
// shape expected by WalletModal, WalletButton, and the per-page wallet state.
//
// Replaces the mock WalletState (hardcoded after 1.4s timeout) in every V2
// page with a real wagmi-powered connection flow.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import type { Connector } from "wagmi";
import type { WalletOption, WalletKind } from "../components/WalletModal";
import { toast } from "../components/Toaster";
import { loadAdaptersFor } from "../../lib/wallet/adapters";
import type { WalletAdapter } from "../../lib/wallet/adapters/types";

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

type NonEvmKind = Exclude<WalletKind, "evm">;

const NON_EVM_KINDS: NonEvmKind[] = ["solana", "bitcoin", "tron", "cosmos"];

const NON_EVM_LABEL: Record<NonEvmKind, string> = {
  solana: "Solana",
  bitcoin: "Bitcoin",
  tron: "Tron",
  cosmos: "Cosmos",
};

// EIP-6963 announces some non-EVM-first extensions (TronLink, Unisat) as
// injected EVM providers. They belong in their own network section, served
// by the native adapters, not in the EVM list.
const NON_EVM_FIRST_CONNECTOR = /tronlink|unisat/i;

// RainbowKit names every WalletConnect-backed connector "WalletConnect" and
// keeps the wallet's real name in `rkDetails`; it also adds a second
// QR-modal copy of the WalletConnect connector.
type RkConnector = Connector & {
  rkDetails?: { name?: string; isWalletConnectModalConnector?: boolean };
};

const connectorDisplayName = (c: Connector) => (c as RkConnector).rkDetails?.name ?? c.name;

const connectorOptionId = (c: Connector) => {
  const name = connectorDisplayName(c);
  return CONNECTOR_NAME_TO_ID[name] ?? name.toLowerCase().replace(/\s+/g, "-");
};

const nonEvmOptionId = (kind: NonEvmKind, brand: string) =>
  `native:${kind}:${brand.toLowerCase().replace(/\s+/g, "-")}`;

export interface NonEvmWalletConnection {
  kind: NonEvmKind;
  address: string;
  providerName: string;
}

export function useWalletConnection({ includeNonEvm = true }: { includeNonEvm?: boolean } = {}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const evmConnectors = useMemo(() => {
    const seen = new Set<string>();
    return connectors
      .filter((c) => !(c as RkConnector).rkDetails?.isWalletConnectModalConnector)
      .filter((c) => !NON_EVM_FIRST_CONNECTOR.test(connectorDisplayName(c)))
      // EIP-6963 connectors come first, so an installed extension wins over
      // RainbowKit's fallback entry for the same wallet.
      .filter((c) => {
        const id = connectorOptionId(c);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [connectors]);

  const [nonEvmAdapters, setNonEvmAdapters] = useState<WalletAdapter[]>([]);
  const [nonEvmWallet, setNonEvmWallet] = useState<NonEvmWalletConnection | null>(null);

  useEffect(() => {
    if (!includeNonEvm) return;
    let cancelled = false;
    Promise.all(NON_EVM_KINDS.map((kind) => loadAdaptersFor(kind)))
      .then((lists) => {
        if (!cancelled) setNonEvmAdapters(lists.flat());
      })
      .catch(() => {
        if (!cancelled) setNonEvmAdapters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [includeNonEvm]);

  const walletOptions: WalletOption[] = useMemo(() => {
    const evm = evmConnectors
      .map((c) => {
        const id = connectorOptionId(c);
        const name = connectorDisplayName(c);
        return {
          id,
          name,
          description: CONNECTOR_DESCRIPTIONS[id] ?? `Connect with ${name}`,
          kind: "evm" as WalletKind,
          installed: c.type === "injected" && !(c as RkConnector).rkDetails,
        };
      })
      .sort((a, b) => {
        if (a.name === "MetaMask") return -1;
        if (b.name === "MetaMask") return 1;
        if (a.name === "Rabby Wallet") return -1;
        if (b.name === "Rabby Wallet") return 1;
        return 0;
      });
    const nonEvm = nonEvmAdapters.map((adapter) => {
      const kind = adapter.kind as NonEvmKind;
      return {
        id: nonEvmOptionId(kind, adapter.brand),
        name: adapter.brand,
        description: `${NON_EVM_LABEL[kind]} · read-only address connection`,
        kind,
        installed: adapter.isInstalled(),
      };
    });
    return [...evm, ...nonEvm];
  }, [evmConnectors, nonEvmAdapters]);

  const onSelectWallet = useCallback(
    (wallet: WalletOption) => {
      if (wallet.kind && wallet.kind !== "evm") {
        const kind = wallet.kind;
        const adapter = nonEvmAdapters.find(
          (a) => a.kind === kind && nonEvmOptionId(kind, a.brand) === wallet.id,
        );
        if (!adapter) return;
        if (!adapter.isInstalled()) {
          window.open(adapter.installUrl, "_blank", "noopener,noreferrer");
          return;
        }
        adapter
          .connect()
          .then((result) => {
            setNonEvmWallet({ kind, address: result.address, providerName: adapter.brand });
            toast.success(`${adapter.brand} connected (${NON_EVM_LABEL[kind]}, read-only).`);
          })
          .catch((error: any) => {
            if (error?.code !== "USER_REJECTED") {
              toast.error(error?.message ?? "Wallet connection failed.");
            }
          });
        return;
      }
      const connector = evmConnectors.find((c) => connectorOptionId(c) === wallet.id);
      if (connector) {
        connect({ connector });
      }
    },
    [connect, evmConnectors, nonEvmAdapters],
  );

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
    nonEvmWallet,
    disconnect,
    switchChain,
    currentChain,
    address,
    isConnected,
    connect: onSelectWallet,
  };
}
