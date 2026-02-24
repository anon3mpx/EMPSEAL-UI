import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface ChainContextType {
    selectedChainId: number;
    setSelectedChainId: (chainId: number) => void;
}

const DEFAULT_CHAIN_ID = 369; // PulseChain

const ChainContext = createContext<ChainContextType>({
    selectedChainId: DEFAULT_CHAIN_ID,
    setSelectedChainId: () => { },
});

export function ChainProvider({ children }: { children: React.ReactNode }) {
    const { isConnected } = useAccount();
    const wagmiChainId = useChainId();
    const [localChainId, setLocalChainId] = useState<number>(DEFAULT_CHAIN_ID);

    // When wallet connects or switches chain, sync local state to wallet's chain
    useEffect(() => {
        if (isConnected && wagmiChainId) {
            setLocalChainId(wagmiChainId);
        }
    }, [isConnected, wagmiChainId]);

    const setSelectedChainId = useCallback((chainId: number) => {
        setLocalChainId(chainId);
    }, []);

    // Use wallet's chainId when connected, local state when disconnected
    const selectedChainId = isConnected ? wagmiChainId : localChainId;

    return (
        <ChainContext.Provider value={{ selectedChainId, setSelectedChainId }}>
            {children}
        </ChainContext.Provider>
    );
}

export function useSelectedChainId(): number {
    const { selectedChainId } = useContext(ChainContext);
    return selectedChainId;
}

export function useSetSelectedChainId(): (chainId: number) => void {
    const { setSelectedChainId } = useContext(ChainContext);
    return setSelectedChainId;
}
