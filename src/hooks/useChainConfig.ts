import { useChainId } from 'wagmi';
import { SUPPORTED_CHAINS } from '../config/chains';
import { CHAIN_TOKENS } from '../config/tokens';
import { CHAIN_ADAPTERS } from '../config/adapters';
import { useState, useEffect } from 'react';

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
  feature?: boolean;
}

interface Adapter {
  address: string;
  name: string;
}

export function useChainConfig() {
  const chainId = useChainId();
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [featureTokens, setfeatureTokens] = useState<Token[]>([]);

  const currentChain = chainId ? SUPPORTED_CHAINS[chainId] : undefined;

  useEffect(() => {
    if (!chainId) return;

    // Load chain-specific configurations
    setTokenList(CHAIN_TOKENS[chainId] || []);
    setAdapters(CHAIN_ADAPTERS[chainId] || []);

    // Load feature tokens
    const featureTokensForChain = CHAIN_TOKENS[chainId]?.filter(token =>
      token.featured === true
    ) || [];
    setfeatureTokens(featureTokensForChain);
  }, [chainId]);

  return {
    chain: currentChain,
    chainId,
    tokenList,
    adapters,
    featureTokens,
    symbol: currentChain?.symbol,
    routerAddress: currentChain?.routerAddress,
    wethAddress: currentChain?.wethAddress,
    priceApi: currentChain?.priceApi,
    blockExplorer: currentChain?.blockExplorer,
    blockExplorerName: currentChain?.blockExplorerName,
    isSupported: !!currentChain,
    maxHops: currentChain?.maxHops || 2,
    stableTokens: currentChain?.stableTokens || [],
    blockTime: currentChain?.blockTime || 10, // default to 15 seconds if not defined
  };
}
