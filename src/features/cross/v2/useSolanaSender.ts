import { useEffect, useState } from "react";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import { createSolanaWallet, type SolanaWalletPort } from "./solanaWallet";

export function useSolanaSender(chainId: number, evmSender?: string, injectedWallet?: SolanaWalletPort) {
  const [wallet] = useState(() => injectedWallet ?? createSolanaWallet());
  const [address, setAddress] = useState<string | null>(() => wallet.publicKey());
  const isSolana = chainId === NON_EVM_CHAIN_IDS.SOL;
  useEffect(() => {
    if (!isSolana) return;
    setAddress(wallet.publicKey());
    return wallet.subscribe?.(() => setAddress(wallet.publicKey()));
  }, [wallet, isSolana]);
  return {
    isSolana,
    wallet,
    sender: isSolana ? (address ?? undefined) : evmSender,
    connect: async () => {
      const next = await wallet.connect();
      setAddress(next);
    },
  };
}
