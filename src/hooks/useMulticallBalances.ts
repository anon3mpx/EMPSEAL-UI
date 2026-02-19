import { useState, useEffect, useMemo } from 'react';
import { usePublicClient, useAccount, useBalance } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';

interface Token {
    address: string;
    name: string;
    symbol: string;
    decimal?: number;
    decimals?: number;
}

interface BalanceData {
    formatted: string;
    value: bigint;
    decimals: number;
    symbol: string;
}

interface UseMulticallBalancesResult {
    balances: Map<string, BalanceData>;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
const BATCH_SIZE = 100; // Max contracts per multicall to avoid gas limits

/**
 * Custom hook to batch-fetch ERC20 token balances using multicall.
 * Reduces RPC calls from N (one per token) to ~2 (one multicall + one native balance).
 */
export function useMulticallBalances(
    tokens: Token[]
): UseMulticallBalancesResult {
    const publicClient = usePublicClient();
    const { address: walletAddress, isConnected } = useAccount();

    const [balances, setBalances] = useState<Map<string, BalanceData>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState(0);

    // Separate native token from ERC20 tokens
    const { nativeToken, erc20Tokens } = useMemo(() => {
        const native = tokens.find(
            (t) => t.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
        );
        const erc20 = tokens.filter(
            (t) => t.address.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase()
        );
        return { nativeToken: native, erc20Tokens: erc20 };
    }, [tokens]);

    // Fetch native token balance separately using wagmi hook
    const { data: nativeBalance } = useBalance({
        address: walletAddress,
        query: {
            enabled: isConnected && !!nativeToken,
        },
    });

    useEffect(() => {
        if (!publicClient || !walletAddress || !isConnected || erc20Tokens.length === 0) {
            return;
        }

        const fetchBalances = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const newBalances = new Map<string, BalanceData>();

                // Add native token balance if available
                if (nativeToken && nativeBalance) {
                    newBalances.set(NATIVE_TOKEN_ADDRESS.toLowerCase(), {
                        formatted: nativeBalance.formatted,
                        value: nativeBalance.value,
                        decimals: nativeBalance.decimals,
                        symbol: nativeBalance.symbol,
                    });
                }

                // Batch ERC20 balance calls
                for (let i = 0; i < erc20Tokens.length; i += BATCH_SIZE) {
                    const batch = erc20Tokens.slice(i, i + BATCH_SIZE);

                    const calls = batch.map((token) => ({
                        address: token.address as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'balanceOf',
                        args: [walletAddress],
                    }));

                    const results = await publicClient.multicall({
                        contracts: calls,
                        allowFailure: true,
                    });

                    // Process results
                    results.forEach((result, index) => {
                        const token = batch[index];
                        const decimals = token.decimal ?? token.decimals ?? 18;

                        if (result.status === 'success' && result.result !== undefined) {
                            const value = result.result as bigint;
                            const formatted = formatUnits(value, decimals);

                            newBalances.set(token.address.toLowerCase(), {
                                formatted,
                                value,
                                decimals,
                                symbol: token.symbol,
                            });
                        } else {
                            // Token contract call failed - set balance to 0
                            newBalances.set(token.address.toLowerCase(), {
                                formatted: '0',
                                value: BigInt(0),
                                decimals,
                                symbol: token.symbol,
                            });
                        }
                    });
                }

                setBalances(newBalances);
            } catch (err) {
                console.error('Error fetching balances via multicall:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch balances'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchBalances();
    }, [publicClient, walletAddress, isConnected, erc20Tokens, nativeBalance, nativeToken, fetchTrigger]);

    const refetch = () => {
        setFetchTrigger((prev) => prev + 1);
    };

    return { balances, isLoading, error, refetch };
}
