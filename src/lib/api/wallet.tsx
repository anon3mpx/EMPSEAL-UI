// Wallet State Management with RPC Cycling
// Handles wallet connection, provider failover, and data refresh

"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { fetchPortfolio, PortfolioData } from "../api";

interface WalletState {
  connected: boolean;
  address: string | null;
  walletType: string | null;
  portfolio: PortfolioData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface WalletContextValue extends WalletState {
  connect: (walletType: string, address: string) => void;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const initialState: WalletState = {
  connected: false,
  address: null,
  walletType: null,
  portfolio: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initialState);

  const connect = useCallback((walletType: string, address: string) => {
    setState(prev => ({
      ...prev,
      connected: true,
      address: address.toLowerCase(),
      walletType,
      loading: true,
      error: null,
    }));
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
  }, []);

  const refresh = useCallback(async () => {
    if (!state.address) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const portfolio = await fetchPortfolio(state.address!);
      setState(prev => ({
        ...prev,
        portfolio,
        loading: false,
        lastUpdated: Date.now(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch portfolio",
      }));
    }
  }, [state.address]);

  // Fetch portfolio on connect
  useEffect(() => {
    if (state.connected && state.address) {
      refresh();
    }
  }, [state.connected, state.address, refresh]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!state.connected || !state.address) return;

    const interval = setInterval(() => {
      refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [state.connected, state.address, refresh]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, refresh }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// RPC Provider cycling utility
// Used for blockchain read operations with automatic failover

interface RpcProvider {
  url: string;
  chainId: number;
  latency?: number;
}

class RpcProviderPool {
  private providers: RpcProvider[];
  private currentIndex = 0;
  private failures = new Map<string, number>();

  constructor(providers: RpcProvider[]) {
    this.providers = providers;
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    let lastError: Error | null = null;
    const startIdx = this.currentIndex;

    for (let i = 0; i < this.providers.length; i++) {
      const idx = (startIdx + i) % this.providers.length;
      const provider = this.providers[idx];

      // Skip providers with too many failures
      if ((this.failures.get(provider.url) || 0) > 3) {
        continue;
      }

      try {
        const result = await this.callProvider<T>(provider, method, params);
        this.currentIndex = idx;
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(provider.url);
      }
    }

    throw lastError || new Error("All RPC providers failed");
  }

  private async callProvider<T>(provider: RpcProvider, method: string, params: unknown[]): Promise<T> {
    const start = Date.now();
    
    const response = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: 1,
      }),
    });

    const latency = Date.now() - start;
    provider.latency = latency;

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  }

  private recordFailure(url: string): void {
    const count = this.failures.get(url) || 0;
    this.failures.set(url, count + 1);
  }

  resetFailures(): void {
    this.failures.clear();
  }

  getBestProvider(): RpcProvider {
    return this.providers.reduce((best, current) => {
      if (!best) return current;
      if (!current.latency) return best;
      if (!best.latency) return current;
      return current.latency < best.latency ? current : best;
    }, this.providers[0]);
  }
}

// Pre-configured provider pools for each chain
const providerPools = new Map<string, RpcProviderPool>();

export function getRpcPool(chainId: string, rpcUrls: string[]): RpcProviderPool {
  const key = `${chainId}-${rpcUrls.join("-")}`;
  
  if (!providerPools.has(key)) {
    const providers: RpcProvider[] = rpcUrls.map(url => ({
      url,
      chainId: 0, // Will be set on first call
    }));
    providerPools.set(key, new RpcProviderPool(providers));
  }
  
  return providerPools.get(key)!;
}

// Example usage for reading chain data
export async function getBalance(address: string, chainId: string, rpcUrls: string[]): Promise<string> {
  const pool = getRpcPool(chainId, rpcUrls);
  return pool.call<string>("eth_getBalance", [address, "latest"]);
}

export async function getTokenBalance(
  address: string, 
  tokenAddress: string, 
  chainId: string, 
  rpcUrls: string[]
): Promise<string> {
  const pool = getRpcPool(chainId, rpcUrls);
  
  // ERC-20 balanceOf selector
  const selector = "0x70a08231";
  const data = selector + address.slice(2).padStart(64, "0");
  
  return pool.call<string>("eth_call", [{
    to: tokenAddress,
    data,
  }, "latest"]);
}