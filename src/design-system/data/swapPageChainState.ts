type SwapPageChain = {
  id: number;
};

type SwapWalletState<TChain extends SwapPageChain> =
  | { status: "connected"; chain: TChain }
  | { status?: string; chain?: TChain };

export function resolveSwapPageChain<TChain extends SwapPageChain>({
  walletState,
  selectedChainId,
  chains,
  defaultChain,
}: {
  walletState: SwapWalletState<TChain>;
  selectedChainId: number;
  chains: TChain[];
  defaultChain: TChain;
}): TChain {
  if (walletState.status === "connected" && walletState.chain) {
    return walletState.chain;
  }

  return chains.find((chain) => chain.id === selectedChainId) ?? defaultChain;
}
