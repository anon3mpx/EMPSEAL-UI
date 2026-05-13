import { getPublicClient } from "@wagmi/core";
import { erc20Abi, formatUnits, isAddress, type Address } from "viem";
import { config } from "../../Wagmi/config";
import { chains as wagmiChains } from "../../Wagmi/chains";
import { CHAIN_TOKENS } from "../../config/tokens";
import {
  COMMON_TOKEN_IDS,
  getTokenPricesByContract,
  getTokenPricesWithHistory,
} from "./coingecko";
import { getDexScreenerTokenPrices } from "./dexScreener";
import { getGeckoTerminalTokenPrices } from "./geckoTerminal";
import { CHAIN_CONFIG, type ChainId } from "./chains";
import type {
  ChainBalance,
  FetchPortfolioOptions,
  PortfolioData,
  PortfolioToken,
} from "./index";

const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
const BALANCE_BATCH_SIZE = 75;
const CHAIN_BATCH_SIZE = 4;
const CACHE_TTL_MS = 15 * 60 * 1000;
const REFRESH_COOLDOWN_MS = 60 * 1000;
const STORAGE_CACHE_PREFIX = "empx_portfolio_cache_v3";
const DISABLED_PORTFOLIO_CHAIN_IDS = new Set([10001]);

interface LocalToken {
  address: string;
  name?: string;
  ticker?: string;
  symbol?: string;
  image?: string;
  chainId: number;
  decimal?: number;
  decimals?: number;
  featured?: boolean;
  whitelisted?: boolean;
}

interface PortfolioChainMeta {
  chainKey?: ChainId;
  assetPlatformId?: string;
  nativeCoinGeckoId?: string;
}

interface ChainScanToken {
  id: string;
  address: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  amount: number;
  rawBalance: bigint;
  chainId: number;
  chainKey: string;
  chainName: string;
  chainColor: string;
  isNative: boolean;
}

const PORTFOLIO_CHAIN_META: Record<number, PortfolioChainMeta> = {
  369: {
    chainKey: "pulsechain",
    assetPlatformId: "pulsechain",
    nativeCoinGeckoId: "pulsechain",
  },
  8453: {
    chainKey: "base",
    assetPlatformId: "base",
    nativeCoinGeckoId: "ethereum",
  },
  42161: {
    chainKey: "arbitrum",
    assetPlatformId: "arbitrum-one",
    nativeCoinGeckoId: "ethereum",
  },
  10: {
    chainKey: "optimism",
    assetPlatformId: "optimistic-ethereum",
    nativeCoinGeckoId: "ethereum",
  },
  137: {
    chainKey: "polygon",
    assetPlatformId: "polygon-pos",
    nativeCoinGeckoId: "polygon-ecosystem-token",
  },
  56: {
    chainKey: "bsc",
    assetPlatformId: "binance-smart-chain",
    nativeCoinGeckoId: "binancecoin",
  },
  43114: {
    assetPlatformId: "avalanche",
    nativeCoinGeckoId: "avalanche-2",
  },
  146: {
    assetPlatformId: "sonic",
    nativeCoinGeckoId: "sonic-3",
  },
  1329: {
    assetPlatformId: "sei-network",
    nativeCoinGeckoId: "sei-network",
  },
  80094: {
    assetPlatformId: "berachain",
    nativeCoinGeckoId: "berachain-bera",
  },
  30: {
    chainKey: "rootstock",
    assetPlatformId: "rootstock",
    nativeCoinGeckoId: "rootstock-rbtc",
  },
  143: {
    assetPlatformId: "monad",
    nativeCoinGeckoId: "monad",
  },
  999: {
    assetPlatformId: "hyperevm",
    nativeCoinGeckoId: "hyperliquid",
  },
};

interface PortfolioCacheEntry {
  data: PortfolioData;
  expiry: number;
  fetchedAt: number;
}

const portfolioCache = new Map<string, PortfolioCacheEntry>();
const portfolioInFlight = new Map<string, Promise<PortfolioData>>();

const wagmiChainById = new Map(wagmiChains.map((chain) => [chain.id, chain]));

type PortfolioPriceProvider = "geckoTerminal" | "coingecko";

function getPortfolioPriceProvider(): PortfolioPriceProvider {
  const env = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env;
  const provider = env?.VITE_PORTFOLIO_PRICE_PROVIDER?.toLowerCase();

  return provider === "coingecko" ? "coingecko" : "geckoTerminal";
}

function getStorageCacheKey(cacheKey: string): string {
  return `${STORAGE_CACHE_PREFIX}:${cacheKey}`;
}

function readStoredPortfolioCache(cacheKey: string): PortfolioCacheEntry | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getStorageCacheKey(cacheKey));
    if (!raw) return null;

    return JSON.parse(raw) as PortfolioCacheEntry;
  } catch (error) {
    console.warn("Failed to read portfolio cache:", error);
    return null;
  }
}

function writeStoredPortfolioCache(
  cacheKey: string,
  entry: PortfolioCacheEntry,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getStorageCacheKey(cacheKey),
      JSON.stringify(entry),
    );
  } catch (error) {
    console.warn("Failed to write portfolio cache:", error);
  }
}

function getCachedPortfolio(
  cacheKey: string,
  forceRefresh: boolean,
): PortfolioData | null {
  const now = Date.now();
  const cached = portfolioCache.get(cacheKey) || readStoredPortfolioCache(cacheKey);
  if (!cached) return null;

  portfolioCache.set(cacheKey, cached);

  const isRefreshCoolingDown = now - cached.fetchedAt < REFRESH_COOLDOWN_MS;

  if (!forceRefresh) return cached.data;
  if (forceRefresh && isRefreshCoolingDown) return cached.data;

  return null;
}

function getConfiguredChainIds(): number[] {
  return wagmiChains
    .map((chain) => chain.id)
    .filter((chainId) => !DISABLED_PORTFOLIO_CHAIN_IDS.has(chainId));
}

function getLocalTokens(chainId: number): LocalToken[] {
  const tokens = (CHAIN_TOKENS[chainId] || []) as LocalToken[];
  const seen = new Set<string>();

  return tokens.filter((token) => {
    const address = token.address?.toLowerCase();
    if (!address || seen.has(address)) return false;

    seen.add(address);
    return (
      address === NATIVE_TOKEN_ADDRESS ||
      token.featured === true ||
      token.whitelisted === true
    );
  });
}

function getChainDisplay(chainId: number) {
  const meta = PORTFOLIO_CHAIN_META[chainId];
  const chainConfig = meta?.chainKey ? CHAIN_CONFIG[meta.chainKey] : undefined;
  const wagmiChain = wagmiChainById.get(chainId);

  return {
    chainKey: chainConfig?.id || wagmiChain?.name.toLowerCase().replace(/\s+/g, "-") || String(chainId),
    chainName: chainConfig?.name || wagmiChain?.name || `Chain ${chainId}`,
    logo: chainConfig?.logo || wagmiChain?.nativeCurrency.symbol?.[0] || "?",
    color: chainConfig?.color || "#FF8A00",
  };
}

function tokenSymbol(token: LocalToken): string {
  return (token.ticker || token.symbol || "").toUpperCase();
}

function isNativeToken(token: LocalToken): boolean {
  return token.address?.toLowerCase() === NATIVE_TOKEN_ADDRESS;
}

function formatBalance(rawBalance: bigint, decimals: number): number {
  const amount = Number(formatUnits(rawBalance, decimals));
  return Number.isFinite(amount) ? amount : 0;
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map(fn))));
  }

  return results;
}

async function scanChainBalances(
  address: Address,
  chainId: number,
): Promise<ChainScanToken[]> {
  const publicClient = getPublicClient(config, { chainId });
  const localTokens = getLocalTokens(chainId);

  if (!publicClient || localTokens.length === 0) return [];

  const chainDisplay = getChainDisplay(chainId);
  const nativeToken = localTokens.find(isNativeToken);
  const erc20Tokens = localTokens.filter(
    (token) => !isNativeToken(token) && isAddress(token.address),
  );
  const balances: ChainScanToken[] = [];

  try {
    const nativeBalance = await publicClient.getBalance({ address });
    const nativeDecimals = nativeToken?.decimal ?? nativeToken?.decimals ?? 18;
    const nativeSymbol =
      tokenSymbol(nativeToken || ({} as LocalToken)) ||
      wagmiChainById.get(chainId)?.nativeCurrency.symbol ||
      "NATIVE";

    if (nativeBalance > 0n) {
      balances.push({
        id: `${chainId}:native`,
        address: NATIVE_TOKEN_ADDRESS,
        symbol: nativeSymbol,
        name: nativeToken?.name || wagmiChainById.get(chainId)?.nativeCurrency.name || nativeSymbol,
        logo: nativeToken?.image || chainDisplay.logo,
        decimals: nativeDecimals,
        amount: formatBalance(nativeBalance, nativeDecimals),
        rawBalance: nativeBalance,
        chainId,
        chainKey: chainDisplay.chainKey,
        chainName: chainDisplay.chainName,
        chainColor: chainDisplay.color,
        isNative: true,
      });
    }
  } catch (error) {
    console.warn(`Native balance fetch failed on ${chainDisplay.chainName}:`, error);
  }

  for (let i = 0; i < erc20Tokens.length; i += BALANCE_BATCH_SIZE) {
    const batch = erc20Tokens.slice(i, i + BALANCE_BATCH_SIZE);

    try {
      const results = await publicClient.multicall({
        contracts: batch.map((token) => ({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        })),
        allowFailure: true,
      });

      results.forEach((result, index) => {
        const token = batch[index];
        const rawBalance =
          result.status === "success" && typeof result.result === "bigint"
            ? result.result
            : 0n;

        if (rawBalance === 0n) return;

        const decimals = token.decimal ?? token.decimals ?? 18;
        const symbol = tokenSymbol(token);

        balances.push({
          id: `${chainId}:${token.address.toLowerCase()}`,
          address: token.address.toLowerCase(),
          symbol,
          name: token.name || symbol,
          logo: token.image || symbol[0] || "?",
          decimals,
          amount: formatBalance(rawBalance, decimals),
          rawBalance,
          chainId,
          chainKey: chainDisplay.chainKey,
          chainName: chainDisplay.chainName,
          chainColor: chainDisplay.color,
          isNative: false,
        });
      });
    } catch (error) {
      console.warn(`ERC20 multicall failed on ${chainDisplay.chainName}:`, error);
    }
  }

  return balances;
}

async function getContractPriceMap(
  balances: ChainScanToken[],
  provider: PortfolioPriceProvider,
): Promise<Record<string, { price: number; change24h: number }>> {
  if (provider === "geckoTerminal") {
    const priceTokens = balances.map((token) => ({
      id: token.id,
      address: token.address,
      chainId: token.chainId,
      isNative: token.isNative,
    }));
    const prices = await getGeckoTerminalTokenPrices(priceTokens);
    const missingTokens = priceTokens.filter((token) => !prices[token.id]?.price);

    if (missingTokens.length > 0) {
      Object.assign(prices, await getDexScreenerTokenPrices(missingTokens));
    }

    return prices;
  }

  const byPlatform = new Map<string, { chainId: number; addresses: string[] }>();

  for (const token of balances) {
    if (token.isNative) continue;

    const assetPlatformId = PORTFOLIO_CHAIN_META[token.chainId]?.assetPlatformId;
    if (!assetPlatformId) continue;

    const platform = byPlatform.get(assetPlatformId) || {
      chainId: token.chainId,
      addresses: [],
    };

    platform.addresses.push(token.address);
    byPlatform.set(assetPlatformId, platform);
  }

  const prices: Record<string, { price: number; change24h: number }> = {};

  for (const [assetPlatformId, platform] of byPlatform.entries()) {
    const platformPrices = await getTokenPricesByContract(
      assetPlatformId,
      platform.addresses,
    );

    for (const [address, price] of Object.entries(platformPrices)) {
      prices[`${platform.chainId}:${address.toLowerCase()}`] = {
        price: price.usd || 0,
        change24h: price.usd_24h_change || 0,
      };
    }
  }

  const missingTokens = balances
    .filter((token) => !prices[token.id]?.price)
    .map((token) => ({
      id: token.id,
      address: token.address,
      chainId: token.chainId,
      isNative: token.isNative,
    }));

  if (missingTokens.length > 0) {
    Object.assign(prices, await getDexScreenerTokenPrices(missingTokens));
  }

  return prices;
}

function getFallbackCoinIds(tokens: ChainScanToken[]): string[] {
  const ids = new Set<string>();

  for (const token of tokens) {
    const nativeId = PORTFOLIO_CHAIN_META[token.chainId]?.nativeCoinGeckoId;
    const symbolId = COMMON_TOKEN_IDS[token.symbol.toUpperCase()];

    if (token.isNative && nativeId) ids.add(nativeId);
    if (symbolId) ids.add(symbolId);
  }

  return [...ids];
}

function toPortfolioTokens(
  balances: ChainScanToken[],
  contractPrices: Record<string, { price: number; change24h: number }>,
  fallbackPrices: Awaited<ReturnType<typeof getTokenPricesWithHistory>>,
): PortfolioToken[] {
  const tokens = balances.map((token) => {
    const nativeCoinId = PORTFOLIO_CHAIN_META[token.chainId]?.nativeCoinGeckoId;
    const fallbackCoinId = token.isNative
      ? nativeCoinId
      : COMMON_TOKEN_IDS[token.symbol.toUpperCase()];
    const contractPrice = contractPrices[token.id];
    const price = contractPrice?.price || (fallbackCoinId ? fallbackPrices.prices[fallbackCoinId] || 0 : 0);
    const change24h =
      contractPrice?.change24h ||
      (fallbackCoinId ? fallbackPrices.changes24h[fallbackCoinId] || 0 : 0);
    const change7d = fallbackCoinId ? fallbackPrices.changes7d[fallbackCoinId] || 0 : 0;

    return {
      id: token.id,
      address: token.address,
      chainId: token.chainId,
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      chain: token.chainKey,
      chainName: token.chainName,
      chainColor: token.chainColor,
      amount: token.amount,
      value: token.amount * price,
      price,
      change24h,
      change7d,
      allocation: 0,
      coinGeckoId: fallbackCoinId,
    };
  });

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);

  return tokens
    .map((token) => ({
      ...token,
      allocation: totalValue > 0 ? Math.round((token.value / totalValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function toChainBalances(tokens: PortfolioToken[]): ChainBalance[] {
  const chainMap = new Map<string, ChainBalance>();

  for (const token of tokens) {
    const existing = chainMap.get(token.chain);
    const chainDisplay = getChainDisplay(token.chainId || 0);

    if (existing) {
      existing.value += token.value;
      existing.tokens += 1;
    } else {
      chainMap.set(token.chain, {
        chain: token.chain,
        chainName: token.chainName || chainDisplay.chainName,
        logo: chainDisplay.logo,
        value: token.value,
        tokens: 1,
        color: token.chainColor,
      });
    }
  }

  return [...chainMap.values()].sort((a, b) => b.value - a.value);
}

function generateSparkline(seed: string, price: number, change7d: number): number[] {
  const basePrice = price || 1;
  const normalizedChange = change7d / 100;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }

  return Array.from({ length: 8 }, (_, index) => {
    const progress = index / 7;
    const drift = basePrice * (1 - normalizedChange * (1 - progress));
    const wave = Math.sin(progress * Math.PI * 2 + (hash % 17)) * 0.004;
    const curve = Math.sin(progress * Math.PI) * 0.002;

    return Math.max(0, drift * (1 + wave + curve));
  });
}

function generateSparklines(tokens: PortfolioToken[]): Record<string, number[]> {
  return Object.fromEntries(
    tokens.map((token) => [
      token.id || token.symbol,
      generateSparkline(token.id || token.symbol, token.price, token.change7d),
    ]),
  );
}

function generateChartData(currentValue: number, change7d: number): number[] {
  const points = 28;
  const startValue =
    currentValue > 0 ? currentValue / (1 + (change7d || 0) / 100) : 0;

  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const trend = startValue + (currentValue - startValue) * progress;
    const wave =
      currentValue *
      Math.sin(progress * Math.PI * 2 + 0.8) *
      0.002;
    const curve = currentValue * Math.sin(progress * Math.PI) * 0.0015;

    return Math.max(0, trend + wave + curve);
  });
}

export async function fetchOnchainPortfolio(
  address: string,
  options: FetchPortfolioOptions = {},
): Promise<PortfolioData> {
  if (!isAddress(address)) {
    throw new Error("Invalid wallet address");
  }

  const normalizedAddress = address.toLowerCase();
  const priceProvider = getPortfolioPriceProvider();
  const cacheKey = `${priceProvider}:${normalizedAddress}`;
  const cached = getCachedPortfolio(cacheKey, Boolean(options.forceRefresh));

  if (cached) {
    return cached;
  }

  const inFlight = portfolioInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = fetchFreshOnchainPortfolio(
    address as Address,
    cacheKey,
    priceProvider,
  );

  portfolioInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    portfolioInFlight.delete(cacheKey);
  }
}

async function fetchFreshOnchainPortfolio(
  address: Address,
  cacheKey: string,
  priceProvider: PortfolioPriceProvider,
): Promise<PortfolioData> {
  const fetchedAt = Date.now();

  const chainBalances = await mapInBatches(
    getConfiguredChainIds(),
    CHAIN_BATCH_SIZE,
    (chainId) => scanChainBalances(address, chainId),
  );
  const positiveBalances = chainBalances.flat();
  const contractPrices = await getContractPriceMap(positiveBalances, priceProvider);
  const fallbackPrices =
    priceProvider === "coingecko"
      ? await getTokenPricesWithHistory(getFallbackCoinIds(positiveBalances))
      : { prices: {}, changes24h: {}, changes7d: {} };
  const tokens = toPortfolioTokens(
    positiveBalances,
    contractPrices,
    fallbackPrices,
  );
  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  const chains = toChainBalances(tokens);
  const change24h =
    totalValue > 0
      ? tokens.reduce(
          (sum, token) => sum + (token.value * token.change24h) / 100,
          0,
        ) /
        totalValue *
        100
      : 0;
  const change7d =
    totalValue > 0
      ? tokens.reduce(
          (sum, token) => sum + (token.value * token.change7d) / 100,
          0,
        ) /
        totalValue *
        100
      : 0;

  const data: PortfolioData = {
    totalValue,
    change24h,
    change7d,
    tokens,
    chains,
    nfts: [],
    sparklines: generateSparklines(tokens),
    chartData: generateChartData(totalValue, change7d),
    lastUpdated: fetchedAt,
  };

  const entry: PortfolioCacheEntry = {
    data,
    expiry: fetchedAt + CACHE_TTL_MS,
    fetchedAt,
  };

  portfolioCache.set(cacheKey, entry);
  writeStoredPortfolioCache(cacheKey, entry);

  return data;
}
