export interface CrossChainCapability {
  fullSwapSupported: boolean;
  sourceExecution: "evm";
}

const FULL_SWAP_CHAIN_IDS = new Set([8453, 42161, 10]);

export function getChainCapability(chainId: number): CrossChainCapability {
  return {
    fullSwapSupported: FULL_SWAP_CHAIN_IDS.has(chainId),
    sourceExecution: "evm",
  };
}
