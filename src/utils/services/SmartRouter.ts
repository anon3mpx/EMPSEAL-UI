import { PublicClient, parseAbi } from "viem";
import {
    BestRouteResult,
    ConvergeTrade,
    Hop,
    SplitPath,
} from "../types/router";
import { EmpsealRouterLiteV3 } from "../lite/EmpsealRouterLiteV3";

// Simple Adapter ABI for querying
const IAdapterAbi = parseAbi([
    "function query(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256 amountOut)",
]);

const FEE_DENOMINATOR = 10000;

// Timeout helper to prevent strategies from hanging
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T | null> => {
    return Promise.race([
        promise,
        new Promise<null>((_, reject) =>
            setTimeout(() => {
                // console.warn(`[SmartRouter] ${name} timed out after ${timeoutMs}ms`);
                reject(new Error(`${name} timed out`));
            }, timeoutMs)
        )
    ]).catch(() => null);
};

// Add ERC20 decimals ABI
const IERC20Abi = parseAbi([
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
]);

// Helper: Convert user input to wei
export function parseTokenAmount(
    amount: string,
    decimals: number
): bigint {
    // Validation
    if (!amount || amount.trim() === "") {
        throw new Error("Amount cannot be empty");
    }
    if (decimals < 0 || decimals > 77) {
        throw new Error(`Invalid decimals: ${decimals}`);
    }

    const cleanAmount = amount.replace(/,/g, "").trim();

    // Validate numeric format
    if (!/^\d+(\.\d+)?$/.test(cleanAmount)) {
        throw new Error(`Invalid amount format: ${amount}`);
    }

    // Split into integer and decimal parts
    const [integerPart, decimalPart = ""] = cleanAmount.split(".");

    // Pad decimal part to token decimals
    const paddedDecimals = decimalPart.padEnd(decimals, "0").slice(0, decimals);

    // Combine
    const fullAmount = integerPart + paddedDecimals;
    return BigInt(fullAmount);
}

// Helper: Convert wei to human readable
export function formatTokenAmount(
    amount: bigint,
    decimals: number,
    maxDecimals: number = 6
): string {
    const amountStr = amount.toString().padStart(decimals + 1, "0");
    const integerPart = amountStr.slice(0, -decimals) || "0";
    const decimalPart = amountStr.slice(-decimals);

    // Trim trailing zeros
    const trimmedDecimals = decimalPart.replace(/0+$/, "").slice(0, maxDecimals);

    if (trimmedDecimals) {
        return `${integerPart}.${trimmedDecimals}`;
    }
    return integerPart;
}

interface TokenInfo {
    decimals: number;
    symbol: string;
}

export class SmartRouter {
    private publicClient: PublicClient;
    private routerAddress: `0x${string}`;
    private adapters: `0x${string}`[] = [];
    private wnativeAddress: `0x${string}` | null = null;
    private trustedTokens: `0x${string}`[] = [];

    // Token info cache
    private tokenInfoCache: Map<string, TokenInfo> = new Map();

    // Configuration
    private maxAdaptersPerSplit = 4;
    private convergeOnly = false;
    private granularity = 5;
    private maxHops = 4;

    constructor(publicClient: PublicClient, routerAddress: `0x${string}`) {
        this.publicClient = publicClient;
        this.routerAddress = routerAddress;
    }

    /**
     * Load configuration from router contract
     */
    async loadAdapters(): Promise<void> {
        try {
            // Load adapters count
            const adapterCount = await this.publicClient.readContract({
                address: this.routerAddress,
                abi: EmpsealRouterLiteV3,
                functionName: "adaptersCount",
            });

            const adapterCalls = [];
            for (let i = 0; i < Number(adapterCount); i++) {
                adapterCalls.push({
                    address: this.routerAddress,
                    abi: EmpsealRouterLiteV3,
                    functionName: "ADAPTERS",
                    args: [i],
                });
            }

            const adapterResults = await this.publicClient.multicall({
                contracts: adapterCalls,
            });
            this.adapters = adapterResults.map((res) => res.result as `0x${string}`);

            // Load WNATIVE
            const wnative = await this.publicClient.readContract({
                address: this.routerAddress,
                abi: EmpsealRouterLiteV3,
                functionName: "WNATIVE",
            });
            this.wnativeAddress = wnative as `0x${string}`;

            // Load trusted tokens
            const trustedCount = await this.publicClient.readContract({
                address: this.routerAddress,
                abi: EmpsealRouterLiteV3,
                functionName: "trustedTokensCount",
            });

            const trustedCalls = [];
            for (let i = 0; i < Number(trustedCount); i++) {
                trustedCalls.push({
                    address: this.routerAddress,
                    abi: EmpsealRouterLiteV3,
                    functionName: "TRUSTED_TOKENS",
                    args: [i],
                });
            }

            const trustedResults = await this.publicClient.multicall({
                contracts: trustedCalls,
            });
            this.trustedTokens = trustedResults.map(
                (res) => res.result as `0x${string}`
            );
        } catch (error) {
            console.error("Failed to load router config:", error);
            throw error;
        }
    }

    setConvergeOnly(enabled: boolean) {
        this.convergeOnly = enabled;
    }

    setAdapters(adapters: `0x${string}`[]) {
        this.adapters = adapters;
    }

    setTrustedTokens(tokens: `0x${string}`[]) {
        this.trustedTokens = tokens;
    }

    setMaxAdapters(max: number) {
        this.maxAdaptersPerSplit = Math.min(Math.max(max, 1), 6);
    }

    setGranularity(percent: number) {
        this.granularity = Math.max(1, Math.min(percent, 20));
    }

    setMaxHops(hops: number) {
        this.maxHops = Math.max(1, Math.min(hops, 4));
    }

    private calculateAmountAfterFee(amountIn: bigint, fee: number): bigint {
        if (fee === 0) return amountIn;
        return (amountIn * BigInt(FEE_DENOMINATOR - fee)) / BigInt(FEE_DENOMINATOR);
    }

    private isNative(token: `0x${string}`): boolean {
        return (
            token === "0x0000000000000000000000000000000000000000" ||
            token.toLowerCase() === "0x0" ||
            BigInt(token) === 0n
        );
    }

    private normalizeToken(token: `0x${string}`): `0x${string}` {
        if (this.isNative(token)) {
            if (!this.wnativeAddress) {
                throw new Error("WNATIVE not loaded");
            }
            return this.wnativeAddress;
        }
        return token;
    }

    private generateSplitStrategies(numAdapters: number): number[][] {
        const strategies: number[][] = [];
        const stepSize = this.granularity * 100; // Basis points step (e.g., 500 = 5%)

        if (numAdapters === 1) {
            return [[10000]]; // 100% to single adapter
        }

        if (numAdapters === 2) {
            // Two-adapter splits: 100/0, 95/5, 90/10, ... down to 50/50
            strategies.push([10000, 0]);
            for (let adapterShare1 = 9500; adapterShare1 >= 5000; adapterShare1 -= stepSize) {
                const adapterShare2 = 10000 - adapterShare1;
                if (adapterShare2 >= 500) {
                    strategies.push([adapterShare1, adapterShare2]);
                }
            }
        } else if (numAdapters === 3) {
            // Three-adapter splits
            strategies.push([10000, 0, 0]);

            // Two active adapters
            for (let adapterShare1 = 9000; adapterShare1 >= 5000; adapterShare1 -= stepSize) {
                strategies.push([adapterShare1, 10000 - adapterShare1, 0]);
            }

            // Three active adapters
            for (let adapterShare1 = 7000; adapterShare1 >= 4000; adapterShare1 -= stepSize) {
                for (let adapterShare2 = 3000; adapterShare2 >= 2000; adapterShare2 -= stepSize) {
                    const adapterShare3 = 10000 - adapterShare1 - adapterShare2;
                    if (adapterShare3 >= 1000 && adapterShare3 <= 4000) {
                        strategies.push([adapterShare1, adapterShare2, adapterShare3]);
                    }
                }
            }
            strategies.push([3334, 3333, 3333]); // Equal split

        } else if (numAdapters >= 4) {
            // Four+ adapter splits - use predefined common patterns
            strategies.push([10000, 0, 0, 0]);

            // Two active adapters
            for (let adapterShare1 = 8000; adapterShare1 >= 5000; adapterShare1 -= stepSize * 2) {
                strategies.push([adapterShare1, 10000 - adapterShare1, 0, 0]);
            }

            // Predefined multi-adapter patterns
            strategies.push(
                [5000, 3000, 2000, 0],
                [5000, 2500, 2500, 0],
                [4000, 3000, 3000, 0],
                [6000, 2000, 2000, 0],
                [2500, 2500, 2500, 2500],
                [4000, 3000, 2000, 1000],
                [5000, 2000, 2000, 1000],
                [3500, 3000, 2000, 1500]
            );
        }

        return strategies;
    }

    /**
     * UPGRADED: Includes Micro-Optimization
     * Performs standard search, then refines the best result by small perturbations
     */
    private async findOptimalSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        sortedQuotes: Array<{ adapter: `0x${string}`; amountOut: bigint }>
    ): Promise<{
        splits: Array<{ adapter: `0x${string}`; proportion: number }>;
        totalOut: bigint;
    }> {
        if (sortedQuotes.length === 0) throw new Error("No valid quotes");

        if (sortedQuotes.length === 1) {
            return {
                splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
                totalOut: sortedQuotes[0].amountOut,
            };
        }

        const numAdapters = Math.min(sortedQuotes.length, this.maxAdaptersPerSplit);

        // 1. Coarse Search (Standard Strategies)
        const coarseStrategies = this.generateSplitStrategies(numAdapters);
        let { bestOutput, bestSplits, bestRawStrategy } =
            await this.executeSplitSearch(
                amountIn,
                tokenIn,
                tokenOut,
                sortedQuotes,
                coarseStrategies,
                numAdapters
            );

        // 2. Micro-Optimization Search
        // If the best strategy splits across multiple adapters, try to shift 1% around to find local maxima
        if (numAdapters > 1 && bestOutput > 0n && bestRawStrategy) {
            const refinedStrategies: number[][] = [];
            const step = 100; // 1% steps

            // Try shifting liquidity between any two active adapters
            for (let i = 0; i < numAdapters; i++) {
                for (let j = 0; j < numAdapters; j++) {
                    if (i === j) continue;

                    // Create a variation: -1% from i, +1% to j
                    const newStrategy = [...(bestRawStrategy as number[])];
                    if (newStrategy[i] >= step) {
                        newStrategy[i] -= step;
                        newStrategy[j] += step;
                        refinedStrategies.push(newStrategy);
                    }
                }
            }

            if (refinedStrategies.length > 0) {
                const refinedResult = await this.executeSplitSearch(
                    amountIn,
                    tokenIn,
                    tokenOut,
                    sortedQuotes,
                    refinedStrategies,
                    numAdapters
                );

                if (refinedResult.bestOutput > bestOutput) {
                    bestOutput = refinedResult.bestOutput;
                    bestSplits = refinedResult.bestSplits;
                }
            }
        }

        if (bestOutput === 0n) {
            // Fallback to single best
            return {
                splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
                totalOut: sortedQuotes[0].amountOut,
            };
        }

        return { splits: bestSplits, totalOut: bestOutput };
    }

    /**
     * Helper to execute a batch of split strategies
     * OPTIMIZED: Uses Multicall to reduce RPC requests
     */
    private async executeSplitSearch(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        sortedQuotes: any[],
        strategies: number[][],
        numAdapters: number
    ) {
        let bestOutput = 0n;
        let bestSplits: any[] = [];
        let bestRawStrategy: number[] | null = null;

        // Batch size can be larger now that we use multicall
        const batchSize = 20;

        for (let i = 0; i < strategies.length; i += batchSize) {
            const batch = strategies.slice(i, i + batchSize);
            const flattenCalls: any[] = [];
            // Map multicall result index back to { strategyIndexInBatch, adapterIndex }
            const callMap: { strategyIdx: number; adapterIdx: number }[] = [];

            // 1. Prepare Multicall Data
            batch.forEach((strategy, sIdx) => {
                strategy.slice(0, numAdapters).forEach((proportion, aIdx) => {
                    if (proportion > 0) {
                        const splitAmount =
                            (amountIn * BigInt(proportion)) / BigInt(FEE_DENOMINATOR);

                        flattenCalls.push({
                            address: sortedQuotes[aIdx].adapter,
                            abi: IAdapterAbi,
                            functionName: "query",
                            args: [splitAmount, tokenIn, tokenOut],
                        });
                        callMap.push({ strategyIdx: sIdx, adapterIdx: aIdx });
                    }
                });
            });

            if (flattenCalls.length === 0) continue;

            // 2. Execute Multicall
            const results = await this.publicClient.multicall({
                contracts: flattenCalls,
            });

            // 3. Aggregate Results per Strategy
            const strategyTotals = new Array(batch.length).fill(0n);

            results.forEach((res, index) => {
                if (res.status === "success") {
                    const { strategyIdx } = callMap[index];
                    const val = res.result as bigint;
                    strategyTotals[strategyIdx] += val;
                }
            });

            // 4. Find Best in Batch
            strategyTotals.forEach((total, idx) => {
                if (total > bestOutput) {
                    bestOutput = total;
                    bestRawStrategy = batch[idx];

                    // Reconstruct splits for the winner
                    bestSplits = batch[idx]
                        .slice(0, numAdapters)
                        .map((proportion: number, aIdx: number) => ({
                            adapter: sortedQuotes[aIdx].adapter,
                            proportion,
                        }))
                        .filter((s: any) => s.proportion > 0);
                }
            });
        }
        return { bestOutput, bestSplits, bestRawStrategy };
    }

    private async getAllAdapterQuotes(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<Array<{ adapter: `0x${string}`; amountOut: bigint }>> {
        const calls = this.adapters.map((adapter) => ({
            address: adapter,
            abi: IAdapterAbi,
            functionName: "query",
            args: [amountIn, tokenIn, tokenOut],
        }));

        const results = await this.publicClient.multicall({ contracts: calls });

        const quotes = results
            .map((res, i) => ({
                adapter: this.adapters[i],
                amountOut: (res.result as bigint) || 0n,
            }))
            .filter((q) => q.amountOut > 0n)
            .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
        return quotes;
    }

    private async findBestMultiHopPath(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        visited: Set<string> = new Set(),
        currentPath: `0x${string}`[] = [],
        depth: number = 0
    ): Promise<{
        path: `0x${string}`[];
        adapters: `0x${string}`[];
        amountOut: bigint;
    } | null> {
        if (depth === 0 || currentPath.length === 0) {
            const directQuotes = await this.getAllAdapterQuotes(
                amountIn,
                tokenIn,
                tokenOut
            );
            if (directQuotes.length > 0) {
                return {
                    path: [tokenIn, tokenOut],
                    adapters: [directQuotes[0].adapter],
                    amountOut: directQuotes[0].amountOut,
                };
            }
            if (depth >= this.maxHops - 1) {
                return null;
            }
        }

        visited.add(tokenIn.toLowerCase());
        let bestPath: {
            path: `0x${string}`[];
            adapters: `0x${string}`[];
            amountOut: bigint;
        } | null = null;

        for (const intermediate of this.trustedTokens) {
            if (
                visited.has(intermediate.toLowerCase()) ||
                intermediate.toLowerCase() === tokenIn.toLowerCase() ||
                intermediate.toLowerCase() === tokenOut.toLowerCase()
            ) {
                continue;
            }

            const firstLegQuotes = await this.getAllAdapterQuotes(
                amountIn,
                tokenIn,
                intermediate
            );
            if (firstLegQuotes.length === 0) continue;

            const firstLegBest = firstLegQuotes[0];

            const restOfPath = await this.findBestMultiHopPath(
                firstLegBest.amountOut,
                intermediate,
                tokenOut,
                new Set(visited),
                [...currentPath, tokenIn],
                depth + 1
            );

            if (restOfPath) {
                const totalAmountOut = restOfPath.amountOut;
                if (!bestPath || totalAmountOut > bestPath.amountOut) {
                    bestPath = {
                        path: [tokenIn, ...restOfPath.path.slice(1)],
                        adapters: [firstLegBest.adapter, ...restOfPath.adapters],
                        amountOut: totalAmountOut,
                    };
                }
            }
        }

        return bestPath;
    }

    /**
     * Get token decimals with caching
     */
    async getTokenDecimals(token: `0x${string}`): Promise<number> {
        const key = token.toLowerCase();

        // Check cache
        if (this.tokenInfoCache.has(key)) {
            return this.tokenInfoCache.get(key)!.decimals;
        }

        // Fetch from chain
        try {
            const decimals = await this.publicClient.readContract({
                address: token,
                abi: IERC20Abi,
                functionName: "decimals",
            });

            const symbol = await this.publicClient.readContract({
                address: token,
                abi: IERC20Abi,
                functionName: "symbol",
            });

            // Cache it
            this.tokenInfoCache.set(key, {
                decimals: Number(decimals),
                symbol: symbol as string,
            });

            return Number(decimals);
        } catch (error) {
            console.warn(`Failed to get decimals for ${token}, using 18`);
            return 18; // Default to 18
        }
    }

    /**
     * Get token info with caching
     */
    async getTokenInfo(token: `0x${string}`): Promise<TokenInfo> {
        const key = token.toLowerCase();

        if (this.tokenInfoCache.has(key)) {
            return this.tokenInfoCache.get(key)!;
        }

        const decimals = await this.getTokenDecimals(token);
        return this.tokenInfoCache.get(key) || { decimals, symbol: "UNKNOWN" };
    }

    /**
     * Main entry point with decimal handling
     * 
     * @param amountInUser - Human readable amount (e.g., "1000" for 1000 tokens)
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param fee - Fee in basis points (e.g., 30 = 0.3%)
     */
    async getBestQuoteFromUser(
        amountInUser: string,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        fee: number = 0
    ): Promise<{
        route: BestRouteResult | null;
        amountInWei: bigint;
        amountOutWei: bigint;
        amountOutFormatted: string;
    }> {
        // 1. Get token decimals
        const normalizedTokenIn = this.normalizeToken(tokenIn);
        const normalizedTokenOut = this.normalizeToken(tokenOut);

        const decimalsIn = await this.getTokenDecimals(normalizedTokenIn);
        const decimalsOut = await this.getTokenDecimals(normalizedTokenOut);

        // 2. Convert user input to wei
        const amountInWei = parseTokenAmount(amountInUser, decimalsIn);

        // 3. Get best route (using wei)
        const route = await this.getBestQuote(
            amountInWei,
            normalizedTokenIn,
            normalizedTokenOut,
            fee
        );

        if (!route) {
            return {
                route: null,
                amountInWei,
                amountOutWei: 0n,
                amountOutFormatted: "0",
            };
        }

        // 4. Format output
        const amountOutFormatted = formatTokenAmount(
            route.amountOut,
            decimalsOut,
            6
        );

        return {
            route,
            amountInWei,
            amountOutWei: route.amountOut,
            amountOutFormatted,
        };
    }

    /**
     * Main Entry Point: Get best quote
     */
    async getBestQuote(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        fee: number = 0
    ): Promise<BestRouteResult | null> {
        if (!this.wnativeAddress || this.trustedTokens.length === 0) {
            throw new Error("Router not initialized. Call loadAdapters() first.");
        }

        const normalizedTokenIn = this.normalizeToken(tokenIn);
        const normalizedTokenOut = this.normalizeToken(tokenOut);

        // Check for direct wrap/unwrap BEFORE calculating fee
        const isWrapping =
            this.isNative(tokenIn) &&
            normalizedTokenOut.toLowerCase() === this.wnativeAddress.toLowerCase();
        const isUnwrapping =
            normalizedTokenIn.toLowerCase() === this.wnativeAddress.toLowerCase() &&
            this.isNative(tokenOut);

        if (isWrapping) {
            return {
                type: "WRAP",
                amountOut: amountIn,
                payload: {
                    tokenIn,
                    tokenOut,
                    amountIn: amountIn,
                },
                gasEstimate: 0n,
            };
        }

        if (isUnwrapping) {
            return {
                type: "UNWRAP",
                amountOut: amountIn,
                payload: {
                    tokenIn,
                    tokenOut,
                    amountIn: amountIn,
                },
                gasEstimate: 0n,
            };
        }

        // Calculate fee only for other route types
        const amountAfterFee = this.calculateAmountAfterFee(amountIn, fee);
        if (this.convergeOnly) {
            const convergeResult = await this.findConvergePath(
                // amountAfterFee,
                amountIn,
                normalizedTokenIn,
                normalizedTokenOut
            );
            if (!convergeResult) {
                return null;
            }
            return convergeResult;
        }

        // Run all strategies in parallel with timeouts to prevent hanging
        const STRATEGY_TIMEOUT = 10000; // 10 seconds (balanced)
        const [
            convergeResult,
            splitResult,
            multiHopResult,
            convergeMultiHopResult,
            hybridResult,
            // multiStageConvergeSplitResult,
        ] = await Promise.allSettled([
            withTimeout(
                this.findConvergePath(amountIn, normalizedTokenIn, normalizedTokenOut),
                STRATEGY_TIMEOUT,
                'findConvergePath'
            ),
            withTimeout(
                this.findStandardSplit(amountIn, normalizedTokenIn, normalizedTokenOut),
                STRATEGY_TIMEOUT,
                'findStandardSplit'
            ),
            withTimeout(
                this.findNoSplit(amountIn, normalizedTokenIn, normalizedTokenOut),
                STRATEGY_TIMEOUT,
                'findNoSplit'
            ),
            withTimeout(
                this.findConvergeMultiHop(amountIn, normalizedTokenIn, normalizedTokenOut),
                STRATEGY_TIMEOUT,
                'findConvergeMultiHop'
            ),
            withTimeout(
                this.findHybridSplit(amountIn, normalizedTokenIn, normalizedTokenOut),
                STRATEGY_TIMEOUT,
                'findHybridSplit'
            ),
            // withTimeout(
            //     this.findMultiStageConvergeSplit(amountIn, normalizedTokenIn, normalizedTokenOut),
            //     STRATEGY_TIMEOUT,
            //     'findMultiStageConvergeSplit'
            // ),
        ]);

        // Log any rejected strategies for debugging
        // const strategyNames = ['converge', 'split', 'multiHop', 'convergeMultiHop', 'hybrid', 'multiStageConvergeSplit'];
        // [convergeResult, splitResult, multiHopResult, convergeMultiHopResult, hybridResult, multiStageConvergeSplitResult].forEach((result, i) => {
        //   if (result.status === "rejected") {
        //     console.error(`[SmartRouter] ${strategyNames[i]} REJECTED:`, result.reason);
        //   }
        // });

        const converge =
            convergeResult.status === "fulfilled" ? convergeResult.value : null;
        const split = splitResult.status === "fulfilled" ? splitResult.value : null;
        const multiHop =
            multiHopResult.status === "fulfilled" ? multiHopResult.value : null;
        const convergeMultiHop =
            convergeMultiHopResult.status === "fulfilled"
                ? convergeMultiHopResult.value
                : null;
        const hybrid =
            hybridResult.status === "fulfilled" ? hybridResult.value : null;
        // const multiStageConvergeSplit =
        //     multiStageConvergeSplitResult.status === "fulfilled" ? multiStageConvergeSplitResult.value : null;

        const candidates = [converge, split, multiHop, convergeMultiHop, hybrid /*, multiStageConvergeSplit */]
            .filter((c): c is BestRouteResult => c !== null && c.amountOut > 0n);

        if (candidates.length === 0) {
            return null;
        }

        // Simply select the route with the highest amountOut
        const winner = candidates.reduce((best, current) =>
            current.amountOut > best.amountOut ? current : best
        );

        let winnerName = "Unknown";
        if (winner === converge) winnerName = "Omni-Converge";
        else if (winner === split) winnerName = "Direct";
        else if (winner === convergeMultiHop) winnerName = "Converge Multi-hop";
        else if (winner === hybrid) winnerName = "Hybrid Split";
        // else if (winner === multiStageConvergeSplit) winnerName = "Multi-Stage Converge Split";
        else winnerName = "Multi-hop";

        return winner;
    }

    /**
     * Strategy: Hybrid Split (Partial Converge)
     * Splits liquidity between Direct adapters and best Multi-hop paths.
     */
    private async findHybridSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {
        // 1. Get Direct Quotes
        const directQuotes = await this.getAllAdapterQuotes(
            amountIn,
            tokenIn,
            tokenOut
        );

        // 2. Get Top Multi-Hop Paths
        const multiHopPaths = await this.findTopMultiHopPaths(
            amountIn,
            tokenIn,
            tokenOut,
            3
        );

        // 3. Combine into "Route Candidates"
        const candidates = [
            ...directQuotes.map((q) => ({
                type: "DIRECT" as const,
                adapter: q.adapter,
                path: [tokenIn, tokenOut] as `0x${string}`[],
                adapters: [q.adapter] as `0x${string}`[],
                amountOut: q.amountOut,
            })),
            ...multiHopPaths.map((p) => ({
                type: "MULTIHOP" as const,
                adapter: "0x0000000000000000000000000000000000000000" as `0x${string}`,
                path: p.path,
                adapters: p.adapters,
                amountOut: p.amountOut,
            })),
        ].sort((a, b) => (a.amountOut > b.amountOut ? -1 : 1));

        if (candidates.length === 0) return null;

        // 4. Run Optimal Split Search on Candidates
        const { splits, totalOut } = await this.findOptimalRouteSplit(
            amountIn,
            tokenIn,
            tokenOut,
            candidates
        );

        if (totalOut === 0n) return null;

        const payload: SplitPath[] = splits.map((s) => ({
            path: s.candidate.path,
            adapters: s.candidate.adapters,
            proportion: s.proportion,
        }));

        return {
            type: "SPLIT",
            amountOut: totalOut,
            payload,
            gasEstimate: 0n,
        };
    }

    /**
     * Specialized Split Search that handles mixed Route types (Direct + MultiHop)
     */
    private async findOptimalRouteSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        candidates: any[]
    ) {
        if (candidates.length === 1) {
            const simulatedOutput = await this.simulateHybridStrategy(
                [10000],
                candidates,
                amountIn,
                tokenIn,
                tokenOut,
                3
            );
            return {
                splits: [{ candidate: candidates[0], proportion: 10000 }],
                totalOut: simulatedOutput
            };
        }

        const numRoutes = Math.min(candidates.length, 3);
        const strategies = this.generateSplitStrategies(numRoutes);

        let bestOutput = 0n;
        let bestSplits: any[] = [];
        let consecutiveNoImprovement = 0;

        // Process strategies in parallel batches for performance
        const batchSize = 5;
        for (let i = 0; i < strategies.length; i += batchSize) {
            const batch = strategies.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
                batch.map(strategy =>
                    this.simulateHybridStrategy(
                        strategy,
                        candidates,
                        amountIn,
                        tokenIn,
                        tokenOut,
                        numRoutes
                    )
                )
            );

            let foundImprovement = false;
            batchResults.forEach((result, batchIdx) => {
                if (result.status === "fulfilled" && result.value > bestOutput) {
                    bestOutput = result.value;
                    const strategy = batch[batchIdx];
                    bestSplits = strategy.slice(0, numRoutes).map((prop, idx) => ({
                        candidate: candidates[idx],
                        proportion: prop
                    })).filter(s => s.proportion > 0);
                    foundImprovement = true;
                }
            });

            // Early termination: if no improvement for 2 consecutive batches
            if (foundImprovement) {
                consecutiveNoImprovement = 0;
            } else {
                consecutiveNoImprovement++;
                if (consecutiveNoImprovement >= 2 && bestOutput > 0n) {
                    break;
                }
            }
        }

        return { splits: bestSplits, totalOut: bestOutput };
    }

    private async simulateHybridStrategy(
        strategy: number[],
        candidates: any[],
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        numRoutes: number
    ): Promise<bigint> {
        const promises = strategy.slice(0, numRoutes).map(async (proportion, idx) => {
            if (proportion === 0) return 0n;
            const splitAmount = (amountIn * BigInt(proportion)) / BigInt(FEE_DENOMINATOR);
            const candidate = candidates[idx];

            if (candidate.type === 'DIRECT') {
                return this.publicClient.readContract({
                    address: candidate.adapter,
                    abi: IAdapterAbi,
                    functionName: "query",
                    args: [splitAmount, tokenIn, tokenOut],
                }) as Promise<bigint>;
            } else {
                let currentAmount = splitAmount;
                for (let i = 0; i < candidate.adapters.length; i++) {
                    const hopIn = candidate.path[i];
                    const hopOut = candidate.path[i + 1];
                    const adapter = candidate.adapters[i];
                    try {
                        currentAmount = await this.publicClient.readContract({
                            address: adapter,
                            abi: IAdapterAbi,
                            functionName: "query",
                            args: [currentAmount, hopIn, hopOut]
                        }) as bigint;
                    } catch {
                        return 0n;
                    }
                    if (currentAmount === 0n) return 0n;
                }
                return currentAmount;
            }
        });

        const results = await Promise.all(promises);
        return results.reduce((sum, val) => sum + val, 0n);
    }

    private async findNoSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {
        const bestPath = await this.findBestMultiHopPath(
            amountIn,
            tokenIn,
            tokenOut
        );

        if (!bestPath) {
            return null;
        }

        const payload: SplitPath[] = [
            {
                path: bestPath.path,
                adapters: bestPath.adapters,
                proportion: 10000,
            },
        ];

        return {
            type: "NOSPLIT",
            amountOut: bestPath.amountOut,
            payload,
            gasEstimate: 0n,
        };
    }

    /**
     * Strategy: Converge Multi-Hop
     * (Uses WNATIVE as pivot for multi-hop on both sides)
     */
    private async findConvergeMultiHop(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {

        if (
            !this.wnativeAddress ||
            tokenIn === this.wnativeAddress ||
            tokenOut === this.wnativeAddress
        ) {
            return null;
        }

        // Step 1: Paths TO WNATIVE
        const inputPaths = await this.findTopMultiHopPaths(
            amountIn,
            tokenIn,
            this.wnativeAddress,
            3
        );

        if (inputPaths.length === 0) {
            return null;
        }
        // Select the single best path for input leg
        const singleBest = inputPaths[0];
        const totalIntermediateAmount = singleBest.amountOut;
        const bestInputConfig = [
            {
                path: singleBest.path,
                adapters: singleBest.adapters,
                proportion: 10000,
            },
        ];

        // Step 3: Paths FROM WNATIVE
        const outputPath = await this.findBestMultiHopPath(
            totalIntermediateAmount,
            this.wnativeAddress,
            tokenOut
        );

        if (!outputPath) {
            return null;
        }

        // Build the full path combining input and output legs
        const fullPath = [
            ...bestInputConfig[0].path,
            ...outputPath.path.slice(1),
        ];
        const fullAdapters = [
            ...bestInputConfig[0].adapters,
            ...outputPath.adapters,
        ];

        const payload: SplitPath[] = [
            {
                path: fullPath,
                adapters: fullAdapters,
                proportion: 10000,
            },
        ];

        return {
            type: "NOSPLIT",
            amountOut: outputPath.amountOut,
            payload,
            gasEstimate: 0n,
        };
    }

    private async findTopMultiHopPaths(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        topN: number = 3
    ): Promise<
        Array<{
            path: `0x${string}`[];
            adapters: `0x${string}`[];
            amountOut: bigint;
        }>
    > {
        const allPaths: Array<{
            path: `0x${string}`[];
            adapters: `0x${string}`[];
            amountOut: bigint;
        }> = [];

        const directQuotes = await this.getAllAdapterQuotes(
            amountIn,
            tokenIn,
            tokenOut
        );

        if (directQuotes.length > 0) {
            allPaths.push({
                path: [tokenIn, tokenOut],
                adapters: [directQuotes[0].adapter],
                amountOut: directQuotes[0].amountOut,
            });
        }

        for (const intermediate of this.trustedTokens) {
            if (
                intermediate.toLowerCase() === tokenIn.toLowerCase() ||
                intermediate.toLowerCase() === tokenOut.toLowerCase()
            ) {
                continue;
            }

            const firstLegQuotes = await this.getAllAdapterQuotes(
                amountIn,
                tokenIn,
                intermediate
            );

            if (firstLegQuotes.length === 0) continue;

            const secondLegQuotes = await this.getAllAdapterQuotes(
                firstLegQuotes[0].amountOut,
                intermediate,
                tokenOut
            );

            if (secondLegQuotes.length > 0) {
                // console.log(`[SmartRouter] MultiHop Trace: ${tokenIn} -> ${intermediate} -> ${tokenOut}:`, {
                //   in: amountIn.toString(),
                //   mid: firstLegQuotes[0].amountOut.toString(),
                //   out: secondLegQuotes[0].amountOut.toString()
                // });
                allPaths.push({
                    path: [tokenIn, intermediate, tokenOut],
                    adapters: [firstLegQuotes[0].adapter, secondLegQuotes[0].adapter],
                    amountOut: secondLegQuotes[0].amountOut,
                });
            }
        }

        const topPaths = allPaths
            .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))
            .slice(0, topN);

        return topPaths;
    }

    /**
     * UPGRADED: Omni-Converge
     * Checks ALL trusted tokens as intermediate candidates, not just WNATIVE.
     */
    private async findConvergePath(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {

        // Filter valid intermediates
        const candidates = this.trustedTokens.filter(
            (t) =>
                t.toLowerCase() !== tokenIn.toLowerCase() &&
                t.toLowerCase() !== tokenOut.toLowerCase()
        );

        if (candidates.length === 0) {
            return null;
        }

        // Parallelize search across all intermediates
        const results = await Promise.all(
            candidates.map(async (intermediate) => {
                try {
                    // Leg 1: In -> Intermediate
                    const inputQuotes = await this.getAllAdapterQuotes(
                        amountIn,
                        tokenIn,
                        intermediate
                    );
                    if (inputQuotes.length === 0) return null;

                    const { splits: inputSplits, totalOut: totalIntermediate } =
                        await this.findOptimalSplit(
                            amountIn,
                            tokenIn,
                            intermediate,
                            inputQuotes
                        );

                    if (totalIntermediate === 0n) return null;

                    // Leg 2: Intermediate -> Out
                    const outputQuotes = await this.getAllAdapterQuotes(
                        totalIntermediate,
                        intermediate,
                        tokenOut
                    );
                    if (outputQuotes.length === 0) return null;

                    const { splits: outputSplits, totalOut: finalAmount } =
                        await this.findOptimalSplit(
                            totalIntermediate,
                            intermediate,
                            tokenOut,
                            outputQuotes
                        );

                    return {
                        intermediate,
                        finalAmount,
                        inputSplits,
                        outputSplits,
                    };
                } catch (e) {
                    return null;
                }
            })
        );

        // Filter and find winner
        const validResults = results.filter(
            (r) => r !== null && r.finalAmount > 0n
        );

        if (validResults.length === 0) {
            return null;
        }

        const bestResult = validResults.reduce((prev, current) =>
            prev!.finalAmount > current!.finalAmount ? prev : current
        );

        const payload: ConvergeTrade = {
            tokenIn,
            intermediate: bestResult!.intermediate, // Now dynamic!
            tokenOut,
            amountIn,
            inputHops: bestResult!.inputSplits.map((s) => ({
                adapter: s.adapter,
                proportion: s.proportion,
                data: "0x",
            })),
            outputHop: {
                adapter: bestResult!.outputSplits[0].adapter,
                proportion: 10000,
                data: "0x",
            },
        };

        return {
            type: "CONVERGE",
            amountOut: bestResult!.finalAmount,
            payload,
            gasEstimate: 0n,
        };
    }

    private async findStandardSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {
        const quotes = await this.getAllAdapterQuotes(amountIn, tokenIn, tokenOut);

        if (quotes.length === 0) {
            return null;
        }

        const { splits, totalOut } = await this.findOptimalSplit(
            amountIn,
            tokenIn,
            tokenOut,
            quotes
        );

        const payload: SplitPath[] = splits.map((s) => ({
            path: [tokenIn, tokenOut],
            adapters: [s.adapter],
            proportion: s.proportion,
        }));

        return {
            type: splits.length === 1 ? "NOSPLIT" : "SPLIT",
            amountOut: totalOut,
            payload,
            gasEstimate: 0n,
        };
    }

    /**
     * Strategy: Multi-Stage Converge Split
     * Pattern: Split → Converge → Split → Converge
     * Uses optimal splits across adapters at each leg with 2 intermediates
     */
    private async findMultiStageConvergeSplit(
        amountIn: bigint,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`
    ): Promise<BestRouteResult | null> {
        let bestResult: {
            intermediate1: `0x${string}`;
            intermediate2: `0x${string}`;
            leg1Splits: Array<{ adapter: `0x${string}`; proportion: number }>;
            leg2Splits: Array<{ adapter: `0x${string}`; proportion: number }>;
            leg3Adapter: `0x${string}`;
            totalLeg1Out: bigint;
            totalLeg2Out: bigint;
            finalAmountOut: bigint;
        } | null = null;

        // Limit combinations to avoid excessive RPC calls
        const maxIntermediates = Math.min(this.trustedTokens.length, 5);
        const candidateTokens = this.trustedTokens.slice(0, maxIntermediates);

        // Try each pair of trusted tokens as intermediate1 and intermediate2
        for (const intermediate1 of candidateTokens) {
            if (
                intermediate1.toLowerCase() === tokenIn.toLowerCase() ||
                intermediate1.toLowerCase() === tokenOut.toLowerCase()
            ) {
                continue;
            }

            // Leg 1: tokenIn → intermediate1 (with split)
            const leg1Quotes = await this.getAllAdapterQuotes(
                amountIn,
                tokenIn,
                intermediate1
            );
            if (leg1Quotes.length === 0) continue;

            const { splits: leg1Splits, totalOut: totalLeg1Out } =
                await this.findOptimalSplit(amountIn, tokenIn, intermediate1, leg1Quotes);

            if (totalLeg1Out === 0n) continue;

            for (const intermediate2 of candidateTokens) {
                if (
                    intermediate2.toLowerCase() === tokenIn.toLowerCase() ||
                    intermediate2.toLowerCase() === tokenOut.toLowerCase() ||
                    intermediate2.toLowerCase() === intermediate1.toLowerCase()
                ) {
                    continue;
                }

                // Leg 2: intermediate1 → intermediate2 (with split)
                const leg2Quotes = await this.getAllAdapterQuotes(
                    totalLeg1Out,
                    intermediate1,
                    intermediate2
                );
                if (leg2Quotes.length === 0) continue;

                const { splits: leg2Splits, totalOut: totalLeg2Out } =
                    await this.findOptimalSplit(totalLeg1Out, intermediate1, intermediate2, leg2Quotes);

                if (totalLeg2Out === 0n) continue;

                // Leg 3: intermediate2 → tokenOut (single best adapter for simplicity)
                const leg3Quotes = await this.getAllAdapterQuotes(
                    totalLeg2Out,
                    intermediate2,
                    tokenOut
                );
                if (leg3Quotes.length === 0) continue;

                const leg3Best = leg3Quotes[0];
                const finalAmountOut = leg3Best.amountOut;

                // Track best result
                if (!bestResult || finalAmountOut > bestResult.finalAmountOut) {
                    bestResult = {
                        intermediate1,
                        intermediate2,
                        leg1Splits,
                        leg2Splits,
                        leg3Adapter: leg3Best.adapter,
                        totalLeg1Out,
                        totalLeg2Out,
                        finalAmountOut,
                    };
                }
            }
        }

        if (!bestResult) {
            return null;
        }

        // Build payload - using SPLIT type with multi-hop paths
        const payload: SplitPath[] = [];

        bestResult.leg1Splits.forEach((leg1Split) => {
            bestResult!.leg2Splits.forEach((leg2Split) => {
                // Calculate combined proportion: (p1 * p2) / 10000
                // e.g. 50% * 50% = 25% (2500 basis points)
                const combinedProportion = (leg1Split.proportion * leg2Split.proportion) / 10000;

                if (combinedProportion > 0) {
                    payload.push({
                        path: [tokenIn, bestResult!.intermediate1, bestResult!.intermediate2, tokenOut],
                        adapters: [
                            leg1Split.adapter,
                            leg2Split.adapter,
                            bestResult!.leg3Adapter,
                        ],
                        proportion: Math.floor(combinedProportion),
                    });
                }
            });
        });

        // Normalize proportions to ensure they sum to 10000 due to floor rounding
        const totalProp = payload.reduce((sum, p) => sum + p.proportion, 0);
        if (totalProp < 10000 && payload.length > 0) {
            payload[0].proportion += (10000 - totalProp);
        }

        return {
            type: "SPLIT",
            amountOut: bestResult.finalAmountOut,
            payload,
            gasEstimate: 0n,
        };
    }
}
