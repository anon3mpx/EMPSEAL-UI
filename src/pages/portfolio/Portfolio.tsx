import { useState, useMemo, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Link } from "wouter";
// import WalletConnectModal from "../landing/dapp/WalletConnectModal";
import {
  fetchPortfolio,
  getTokenPricesWithHistory,
  PortfolioData,
  ChainBalance,
} from "../../lib/api";
import BreadCrumb from "../../components/BreadCrumb";

const REFRESH_COOLDOWN_MS = 60_000;
const MARKET_CACHE_TTL_MS = 10 * 60 * 1000;
const MARKET_CACHE_KEY = "empx_portfolio_market_assets_v1";

type MarketAsset = {
  id: "bitcoin" | "ethereum";
  label: string;
  sym: string;
  price: number;
  change24h: number;
  change7d: number;
  data: number[];
};

type MarketAssetCacheEntry = {
  data: MarketAsset[];
  expiry: number;
};

let marketAssetCache: MarketAssetCacheEntry | null = null;

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`,
    )
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        fill="none"
        stroke={up ? "#4ade80" : "#f87171"}
        strokeWidth="1.5"
        points={pts}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

function PortfolioChart({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 600;
  const H = 140;
  const labelDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index) * 5);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  });
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 16) - 8}`,
    )
    .join(" ");
  const fillPts = `0,${H} ` + pts + ` ${W},${H}`;
  const lastParts = pts.split(" ").pop()?.split(",");
  const [lx, ly] = lastParts ? lastParts.map(Number) : [0, 0];

  return (
    <div className="relative w-full" style={{ height: H + 24 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
      >
        <defs>
          <linearGradient id="pChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FF8A00" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            y1={H - p * (H - 16) - 8}
            x2={W}
            y2={H - p * (H - 16) - 8}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
        ))}
        <polygon points={fillPts} fill="url(#pChartGrad)" />
        <polyline
          fill="none"
          stroke="#FF8A00"
          strokeWidth="1.5"
          points={pts}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lx} cy={ly} r="3.5" fill="#FF8A00" />
        <circle cx={lx} cy={ly} r="7" fill="rgba(255,138,0,0.1)" />
      </svg>
      <div className="flex justify-between mt-2">
        {labelDates.map((d) => (
          <span
            key={d}
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "0.02em",
            }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

const Skel = ({ w = "100%", h = 20 }: { w?: string | number; h?: number }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: 0,
      background: "rgba(255,255,255,0.04)",
    }}
  />
);

function LogoMark({
  value,
  fallback,
  size,
}: {
  value?: string;
  fallback: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const label = typeof value === "string" ? value.trim() : "";
  const fallbackLabel = (fallback || "?").slice(0, 3).toUpperCase();
  const isRemoteImage = /^https?:\/\//i.test(label);

  if (isRemoteImage && !failed) {
    return (
      <img
        src={label}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
        }}
      />
    );
  }

  return <>{fallbackLabel}</>;
}

const formatUsd = (value: number, minimumFractionDigits = 2) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  })}`;

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatSignedUsd = (value: number) =>
  `${value >= 0 ? "+" : "-"}${formatUsd(Math.abs(value))}`;

const formatTokenAmount = (value: number) =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1 ? 4 : 8,
  });

const formatLastUpdated = (timestamp?: number) => {
  if (!timestamp) return "Not refreshed yet";

  return `Updated ${new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function generateMarketSparkline(
  seed: string,
  price: number,
  changePercent: number,
): number[] {
  const points = 10;
  const startPrice =
    price > 0 ? price / (1 + (changePercent || 0) / 100) : 0;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }

  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const trend = startPrice + (price - startPrice) * progress;
    const wave =
      price *
      Math.sin(progress * Math.PI * 2 + (hash % 17)) *
      0.0018;
    const curve = price * Math.sin(progress * Math.PI) * 0.0012;

    return Math.max(0, trend + wave + curve);
  });
}

function readStoredMarketAssetCache(): MarketAssetCacheEntry | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return null;

    return JSON.parse(raw) as MarketAssetCacheEntry;
  } catch (error) {
    console.warn("Failed to read market asset cache:", error);
    return null;
  }
}

function writeStoredMarketAssetCache(entry: MarketAssetCacheEntry) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to write market asset cache:", error);
  }
}

function getCachedMarketAssets(): MarketAsset[] | null {
  const now = Date.now();
  const cached = marketAssetCache || readStoredMarketAssetCache();

  if (!cached || cached.expiry <= now) return null;

  marketAssetCache = cached;
  return cached.data;
}

async function fetchMarketAssets(): Promise<MarketAsset[]> {
  const cached = getCachedMarketAssets();
  if (cached) return cached;

  const priceData = await getTokenPricesWithHistory(["bitcoin", "ethereum"]);
  const assets: MarketAsset[] = [
    {
      id: "bitcoin",
      label: "BITCOIN",
      sym: "BTC",
      price: priceData.prices.bitcoin || 0,
      change24h: priceData.changes24h.bitcoin || 0,
      change7d: priceData.changes7d.bitcoin || 0,
      data: generateMarketSparkline(
        "bitcoin",
        priceData.prices.bitcoin || 0,
        priceData.changes7d.bitcoin || priceData.changes24h.bitcoin || 0,
      ),
    },
    {
      id: "ethereum",
      label: "ETHEREUM",
      sym: "ETH",
      price: priceData.prices.ethereum || 0,
      change24h: priceData.changes24h.ethereum || 0,
      change7d: priceData.changes7d.ethereum || 0,
      data: generateMarketSparkline(
        "ethereum",
        priceData.prices.ethereum || 0,
        priceData.changes7d.ethereum || priceData.changes24h.ethereum || 0,
      ),
    },
  ];
  const entry = {
    data: assets,
    expiry: Date.now() + MARKET_CACHE_TTL_MS,
  };

  marketAssetCache = entry;
  writeStoredMarketAssetCache(entry);

  return assets;
}

function ChangePill({
  change,
  value,
}: {
  change: number;
  value: number;
}) {
  const positive = change >= 0;
  const color = positive ? "#4ade80" : "#f87171";
  const bg = positive ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)";
  const border = positive ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)";

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 0,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {positive ? "▲" : "▼"} {formatSignedUsd(value)} · {formatPercent(change)}
    </span>
  );
}

function ChainBreakdown({
  chains,
  connected,
}: {
  chains: ChainBalance[];
  connected: boolean;
}) {
  const [page, setPage] = useState(0);
  const perPage = 4;
  const totalPages = Math.ceil(chains.length / perPage);
  const visible = chains.slice(page * perPage, (page + 1) * perPage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.16 }}
      style={{
        marginBottom: 3,
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          BALANCE BY CHAIN
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>
              {page + 1}/{totalPages}
            </span>
            {[false, true].map((fwd) => (
              <button
                key={String(fwd)}
                onClick={() =>
                  setPage((p) =>
                    fwd ? Math.min(totalPages - 1, p + 1) : Math.max(0, p - 1),
                  )
                }
                disabled={fwd ? page >= totalPages - 1 : page === 0}
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 0,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d={fwd ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {connected
          ? visible.map((c, i) => (
              <div
                key={c.chain}
                style={{
                  padding: "16px 20px",
                  borderRight:
                    i < visible.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ marginBottom: 8 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.7)",
                      borderRadius: 0,
                    }}
                  >
                    <LogoMark
                      value={c.logo}
                      fallback={c.chainName[0] || c.chain}
                      size={16}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {c.chainName}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 200,
                    color: "white",
                    letterSpacing: "-0.03em",
                    marginBottom: 2,
                }}
              >
                  {c.value > 0 ? formatUsd(c.value, 0) : "Unpriced"}
                </p>
                <p
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {c.tokens} token{c.tokens > 1 ? "s" : ""}
                </p>
              </div>
            ))
          : [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  padding: "16px 20px",
                  borderRight:
                    i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <Skel w="60%" h={12} />
                <div style={{ marginTop: 8 }}>
                  <Skel w="40%" h={20} />
                </div>
              </div>
            ))}
      </div>
    </motion.div>
  );
}

type SortKey = "value" | "change24h" | "change7d" | "allocation";

export default function PortfolioPage() {
  const [walletOpen, setWalletOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [period, setPeriod] = useState<"24H" | "7D" | "30D" | "ALL">("30D");

  const loadPortfolio = useCallback(
    async (walletAddress: string, forceRefresh = false) => {
      if (!walletAddress) return;

      if (forceRefresh) {
        const refreshedAt = Date.now();
        setNow(refreshedAt);
        setRefreshCooldownUntil(refreshedAt + REFRESH_COOLDOWN_MS);
      }

      setPortfolioLoading(true);
      setPortfolioError(null);

      try {
        const data = await fetchPortfolio(walletAddress, { forceRefresh });
        setPortfolio(data);
      } catch (error) {
        console.error("Failed to fetch portfolio:", error);
        setPortfolioError("Failed to fetch portfolio");
      } finally {
        setPortfolioLoading(false);
      }
    },
    [],
  );

  // Handle wallet connection from the local demo modal
  const handleConnect = async (wallet: string, addr: string) => {
    try {
      await loadPortfolio(addr);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      setPortfolioError("Failed to fetch portfolio");
    }
  };

  useEffect(() => {
    if (refreshCooldownUntil <= Date.now()) return;

    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= refreshCooldownUntil) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [refreshCooldownUntil]);

  useEffect(() => {
    let cancelled = false;

    fetchMarketAssets()
      .then((assets) => {
        if (!cancelled) setMarketAssets(assets);
      })
      .catch((error) => {
        console.warn("Failed to fetch market assets:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setPortfolio(null);
      setPortfolioLoading(false);
      setPortfolioError(null);
      setRefreshCooldownUntil(0);
      return;
    }

    loadPortfolio(address);
  }, [address, isConnected, loadPortfolio]);

  const connected = isConnected || Boolean(portfolio);
  const portfolioReady = Boolean(portfolio);

  // Get data from portfolio or use defaults
  const totalValue = portfolio?.totalValue ?? 0;
  const change24h = portfolio?.change24h ?? 0;
  const change7d = portfolio?.change7d ?? 0;
  const tokens = portfolio?.tokens ?? [];
  const chains = portfolio?.chains ?? [];
  const nfts = portfolio?.nfts ?? [];
  const sparklines = portfolio?.sparklines ?? {};
  const chartData = portfolio?.chartData ?? [];
  const pricedTokens = useMemo(
    () => tokens.filter((token) => token.price > 0 && token.value > 0),
    [tokens],
  );
  const hasPricedPortfolio = totalValue > 0 && pricedTokens.length > 0;
  const portfolioValueChange24h = (totalValue * change24h) / 100;
  const portfolioValueChange7d = (totalValue * change7d) / 100;
  const bestPerformer = pricedTokens.reduce<PortfolioData["tokens"][number] | null>(
    (best, token) => (!best || token.change7d > best.change7d ? token : best),
    null,
  );
  const refreshSecondsRemaining = Math.max(
    0,
    Math.ceil((refreshCooldownUntil - now) / 1000),
  );
  const canRefresh =
    Boolean(address) &&
    portfolioReady &&
    !portfolioLoading &&
    refreshSecondsRemaining === 0;

  const handleRefresh = () => {
    if (!address || !canRefresh) return;
    loadPortfolio(address, true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortBy(key);
      setSortDir(-1);
    }
  };

  // Sort tokens
  const sortedTokens = useMemo(() => {
    if (!tokens.length) return [];
    return [...tokens].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue !== bValue) return sortDir * (bValue - aValue);
      return b.amount - a.amount;
    });
  }, [tokens, sortBy, sortDir]);
  const marketCards: Array<
    Partial<MarketAsset> & {
      id: MarketAsset["id"];
      label: string;
      sym: string;
    }
  > =
    marketAssets.length > 0
      ? marketAssets
      : [
          { id: "bitcoin", label: "BITCOIN", sym: "BTC" },
          { id: "ethereum", label: "ETHEREUM", sym: "ETH" },
        ];
  // const sorted = [...TOKENS].sort((a, b) => sortDir * (b[sortBy] - a[sortBy]));

  return (
    <>
      <BreadCrumb />
      <div
        className="min-h-[calc(100vh-52px)] px-4 md:px-8 py-16"
        style={{ maxWidth: 1280, margin: "0 auto" }}
      >
        <div style={{ paddingTop: 32 }}>
          {/* ── Hero ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.38em",
                  color: "rgba(255,138,0,0.4)",
                  marginBottom: 10,
                }}
              >
                PORTFOLIO OVERVIEW
              </p>
              {portfolioReady ? (
                <>
                  <h1
                    style={{
                      fontSize: "clamp(2.4rem,5vw,3.6rem)",
                      fontWeight: 200,
                      color: "white",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {formatUsd(totalValue)}
                    <span
                      style={{
                        color: "rgba(255,255,255,0.2)",
                        fontSize: "0.45em",
                        fontWeight: 300,
                      }}
                    ></span>
                  </h1>
                  <div
                    className="flex items-center gap-2"
                    style={{ marginTop: 8 }}
                  >
                    {hasPricedPortfolio ? (
                      <ChangePill
                        change={change24h}
                        value={portfolioValueChange24h}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 0,
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.35)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Pricing unavailable
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.18)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      today
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Skel w={220} h={48} />
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.2)",
                      marginTop: 10,
                    }}
                  >
                    {portfolioLoading
                      ? "Fetching on-chain balances..."
                      : portfolioError || "Connect wallet to view portfolio"}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              {portfolioReady && (
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {formatLastUpdated(portfolio.lastUpdated)}
                </p>
              )}
              {connected && (
                <button
                  onClick={handleRefresh}
                  disabled={!canRefresh}
                  className="transition-opacity"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: canRefresh
                      ? "rgba(255,138,0,0.12)"
                      : "rgba(255,255,255,0.04)",
                    color: canRefresh ? "#FF8A00" : "rgba(255,255,255,0.28)",
                    border: `1px solid ${
                      canRefresh
                        ? "rgba(255,138,0,0.28)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                    cursor: canRefresh ? "pointer" : "not-allowed",
                  }}
                >
                  {portfolioLoading
                    ? "Refreshing"
                    : refreshSecondsRemaining > 0
                      ? `Wait ${refreshSecondsRemaining}s`
                      : "Refresh"}
                </button>
              )}
            {/* <div className="flex items-center gap-2">
              <div
                className="flex"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 0,
                }}
              >
                {(["24H", "7D", "30D", "ALL"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      background:
                        period === p ? "rgba(255,138,0,0.1)" : "transparent",
                      color:
                        period === p ? "#FF8A00" : "rgba(255,255,255,0.25)",
                      borderRight:
                        p !== "ALL"
                          ? "1px solid rgba(255,255,255,0.07)"
                          : "none",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {!connected && (
                <button
                  onClick={() => setWalletOpen(true)}
                  className="transition-opacity hover:opacity-85"
                  style={{
                    padding: "8px 18px",
                    borderRadius: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#FF8A00",
                    color: "#03030a",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </div> */}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 lg:grid-cols-4 mb-4"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 0,
            }}
          >
            {[
              {
                label: "TOTAL VALUE",
                val: formatUsd(totalValue, 0),
                sub: hasPricedPortfolio
                  ? `${formatPercent(change24h)} today`
                  : "pricing unavailable",
                subColor: hasPricedPortfolio
                  ? change24h >= 0
                    ? "#4ade80"
                    : "#f87171"
                  : "rgba(255,255,255,0.28)",
              },
              {
                label: "24H P&L",
                val: hasPricedPortfolio
                  ? formatSignedUsd(portfolioValueChange24h)
                  : "—",
                sub: "vs yesterday",
                subColor: hasPricedPortfolio
                  ? change24h >= 0
                    ? "#4ade80"
                    : "#f87171"
                  : "rgba(255,255,255,0.28)",
              },
              {
                label: "7D P&L",
                val: hasPricedPortfolio
                  ? formatSignedUsd(portfolioValueChange7d)
                  : "—",
                sub: "vs last week",
                subColor: hasPricedPortfolio
                  ? change7d >= 0
                    ? "#4ade80"
                    : "#f87171"
                  : "rgba(255,255,255,0.28)",
              },
              {
                label: "BEST PERFORMER",
                val: bestPerformer?.symbol || "—",
                sub: bestPerformer
                  ? `${formatPercent(bestPerformer.change7d)} (7d)`
                  : "needs priced token",
                subColor: bestPerformer ? "#FF8A00" : "rgba(255,255,255,0.28)",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "18px 22px",
                  borderLeft:
                    i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    color: "rgba(255,255,255,0.18)",
                    marginBottom: 8,
                  }}
                >
                  {s.label}
                </p>
                {portfolioReady ? (
                  <>
                    <p
                      style={{
                        fontSize: 20,
                        fontWeight: 200,
                        color: "white",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        marginBottom: 4,
                      }}
                    >
                      {s.val}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: s.subColor,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.sub}
                    </p>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <Skel w="65%" h={20} />
                    <Skel w="42%" h={12} />
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* ── Chart row: Portfolio + BTC + ETH ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            {/* Portfolio chart — spans 2 cols */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
              style={{
                padding: 20,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 0,
              }}
            >
              <div
                className="flex items-start justify-between"
                style={{ marginBottom: 14 }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.25em",
                      color: "rgba(255,255,255,0.18)",
                      marginBottom: 6,
                    }}
                  >
                    PORTFOLIO VALUE · {period}
                  </p>
                  {portfolioReady ? (
                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 200,
                        color: "white",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {formatUsd(totalValue)}
                    </p>
                  ) : (
                    <Skel w={130} h={24} />
                  )}
                </div>
                {hasPricedPortfolio && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 0,
                      background:
                        change7d >= 0
                          ? "rgba(74,222,128,0.07)"
                          : "rgba(248,113,113,0.07)",
                      color: change7d >= 0 ? "#4ade80" : "#f87171",
                      border: `1px solid ${
                        change7d >= 0
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(248,113,113,0.12)"
                      }`,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {formatPercent(change7d)}
                  </span>
                )}
              </div>
              {portfolioReady && hasPricedPortfolio && chartData.length > 0 ? (
                <PortfolioChart data={chartData} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 164,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.22)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                  }}
                >
                  {portfolioReady
                    ? "PRICE DATA UNAVAILABLE"
                    : ""}
                </div>
              )}
            </motion.div>

            {/* BTC + ETH stacked in the 3rd col */}
            <div className="flex flex-col gap-3">
              {marketCards.map((asset) => {
                const assetData = asset.data || [];
                const hasMarketPrice = Boolean(asset.price && assetData.length);
                const min = assetData.length ? Math.min(...assetData) : 0,
                  max = assetData.length ? Math.max(...assetData) : 0,
                  range = max - min || 1;
                const W = 300,
                  H = 44;
                const pts = assetData
                  .map(
                    (v, i) =>
                      `${(i / (assetData.length - 1)) * W},${H - ((v - min) / range) * (H - 8) - 4}`,
                  )
                  .join(" ");
                const fill = `0,${H} ` + pts + ` ${W},${H}`;
                const positive = (asset.change24h || 0) >= 0;
                const chartColor = positive ? "#4ade80" : "#f87171";
                return (
                  <motion.div
                    key={asset.sym}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 0,
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 8 }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.22em",
                            color: "rgba(255,255,255,0.18)",
                            marginBottom: 3,
                          }}
                        >
                          {asset.label}
                        </p>
                        <p
                          style={{
                            fontSize: 18,
                            fontWeight: 200,
                            color: "white",
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {hasMarketPrice
                            ? formatUsd(asset.price || 0, 0)
                            : "—"}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 0,
                          background: hasMarketPrice
                            ? positive
                              ? "rgba(74,222,128,0.07)"
                              : "rgba(248,113,113,0.07)"
                            : "rgba(255,255,255,0.04)",
                          color: hasMarketPrice
                            ? chartColor
                            : "rgba(255,255,255,0.28)",
                          border: `1px solid ${
                            hasMarketPrice
                              ? positive
                                ? "rgba(74,222,128,0.12)"
                                : "rgba(248,113,113,0.12)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                        }}
                      >
                        {hasMarketPrice
                          ? formatPercent(asset.change24h || 0)
                          : "—"}
                      </span>
                    </div>
                    {hasMarketPrice ? (
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        preserveAspectRatio="none"
                        width="100%"
                        height={H}
                      >
                        <defs>
                          <linearGradient
                            id={`gc-${asset.sym}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={chartColor}
                              stopOpacity="0.1"
                            />
                            <stop
                              offset="100%"
                              stopColor={chartColor}
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <polygon points={fill} fill={`url(#gc-${asset.sym})`} />
                        <polyline
                          fill="none"
                          stroke={chartColor}
                          strokeWidth="1.5"
                          points={pts}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.7"
                        />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: H,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── By Chain breakdown ── */}
          <ChainBreakdown
            chains={portfolioReady ? chains : []}
            connected={portfolioReady}
          />

          {/* ── Allocation bar ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            style={{
              padding: 20,
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 0,
              marginBottom: 3,
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.25em",
                color: "rgba(255,255,255,0.18)",
                marginBottom: 14,
              }}
            >
              TOKEN ALLOCATION
            </p>
            {portfolioReady && hasPricedPortfolio ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
                {sortedTokens.slice(0, 8).map((t) => (
                  <div key={t.id || `${t.chain}-${t.symbol}`}>
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 5 }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: 3,
                            height: 12,
                            background: "#FF8A00",
                            opacity: 0.6,
                            borderRadius: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {t.symbol}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {t.allocation}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 2,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 0,
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.allocation}%` }}
                        transition={{
                          delay: 0.2 + sortedTokens.indexOf(t) * 0.04,
                          duration: 0.6,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{
                          height: "100%",
                          background: "#FF8A00",
                          opacity: 0.55,
                          borderRadius: 0,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : portfolioReady ? (
              <div
                style={{
                  padding: "10px 0 2px",
                  color: "rgba(255,255,255,0.24)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                Value allocation appears when pricing is available for the
                detected balances.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
                {[80, 60, 48, 34, 26, 18, 12, 8].map((w, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <Skel w="48%" h={10} />
                    <Skel w={`${w}%`} h={2} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Token table ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 72px 72px",
                padding: "10px 20px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {[
                { key: null, label: "ASSET" },
                { key: "value", label: "VALUE" },
                { key: "change24h", label: "24H" },
                { key: "change7d", label: "7D" },
                { key: "allocation", label: "ALLOC" },
                { key: null, label: "CHART" },
                { key: null, label: "" },
              ].map(({ key, label }, i) => (
                <button
                  key={i}
                  onClick={() => key && toggleSort(key as SortKey)}
                  className="text-left flex items-center gap-1 transition-colors"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    color:
                      sortBy === key ? "#FF8A00" : "rgba(255,255,255,0.18)",
                    cursor: key ? "pointer" : "default",
                    background: "none",
                    border: "none",
                  }}
                >
                  {label}
                  {sortBy === key && (
                    <span style={{ fontSize: 10 }}>
                      {sortDir === -1 ? "↓" : "↑"}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {sortedTokens.map((token, i) => (
              <motion.div
                key={token.id || `${token.chain}-${token.symbol}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.03 + i * 0.02 }}
                className="grid items-center group"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 72px 72px",
                  padding: "13px 20px",
                  borderBottom:
                    i < sortedTokens.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  cursor: "default",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.018)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                {/* Asset */}
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <div className="relative shrink-0">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        borderRadius: 0,
                      }}
                    >
                      <LogoMark
                        value={token.logo}
                        fallback={token.symbol[0] || token.name[0] || "?"}
                        size={24}
                      />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        width: 12,
                        height: 12,
                        background: token.chainColor,
                        opacity: 0.7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 6,
                        fontWeight: 700,
                        color: "white",
                        borderRadius: 0,
                        border: "1px solid #03030a",
                      }}
                    >
                      {token.chain[0].toUpperCase()}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "white",
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {token.symbol}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.22)",
                        letterSpacing: "0.02em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTokenAmount(token.amount)}
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {portfolioReady && token.price > 0
                    ? formatUsd(token.value)
                    : "Unpriced"}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: token.change24h >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {portfolioReady && token.price > 0
                    ? `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`
                    : "—"}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: token.change7d >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {portfolioReady && token.price > 0
                    ? `${token.change7d >= 0 ? "+" : ""}${token.change7d.toFixed(2)}%`
                    : "—"}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {portfolioReady && token.price > 0 ? `${token.allocation}%` : "—"}
                </p>
                <div>
                  {portfolioReady && token.price > 0 && sparklines[token.id || token.symbol] ? (
                    <Sparkline
                      data={sparklines[token.id || token.symbol]}
                      up={token.change7d >= 0}
                    />
                  ) : (
                    <div
                      style={{
                        height: 24,
                        width: 64,
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 0,
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/dapp/swap"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "5px 10px",
                      borderRadius: 0,
                      background: "rgba(255,138,0,0.08)",
                      color: "#FF8A00",
                      border: "1px solid rgba(255,138,0,0.18)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    SWAP
                  </Link>
                </div>
              </motion.div>
            ))}
            {portfolioReady && sortedTokens.length === 0 && (
              <div
                style={{
                  padding: "28px 20px",
                  color: "rgba(255,255,255,0.26)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                No balances found in the supported token lists.
              </div>
            )}
          </motion.div>

          {/* ── NFT Holdings ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="flex items-center gap-2">
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    color: "rgba(255,255,255,0.18)",
                  }}
                >
                  NFT HOLDINGS
                </p>
                <span
                  style={{
                    fontSize: 8,
                    padding: "2px 7px",
                    background: "rgba(255,138,0,0.08)",
                    border: "1px solid rgba(255,138,0,0.15)",
                    color: "rgba(255,138,0,0.6)",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  TOKENS ONLY
                </span>
              </div>
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.18)",
                  letterSpacing: "0.06em",
                }}
              >
                {nfts.length} NFTs
              </span>
            </div>
            {!connected ? (
              <div
                className="flex items-center justify-center"
                style={{ padding: "32px 20px" }}
              >
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                  Connect wallet to view NFTs
                </p>
              </div>
            ) : nfts.length === 0 ? (
              <div
                className="flex items-center justify-center"
                style={{ padding: "32px 20px" }}
              >
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                  NFT holdings are not fetched without an NFT indexer.
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
                style={{ padding: "16px 20px" }}
              >
                {nfts.map((nft) => (
                  <div
                    key={nft.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "1",
                        background: "rgba(255,138,0,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 40,
                          opacity: 0.35,
                          color: "#FF8A00",
                        }}
                      >
                        {nft.icon}
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "white",
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {nft.name}
                      </p>
                      <p
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.25)",
                          marginBottom: 6,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {nft.collection}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#FF8A00",
                          }}
                        >
                          {nft.floor}
                        </span>
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 700,
                            padding: "2px 5px",
                            letterSpacing: "0.08em",
                            background:
                              nft.rare === "LEGENDARY"
                                ? "rgba(255,138,0,0.1)"
                                : "rgba(255,255,255,0.04)",
                            color:
                              nft.rare === "LEGENDARY"
                                ? "#FF8A00"
                                : "rgba(255,255,255,0.25)",
                            border: `1px solid ${nft.rare === "LEGENDARY" ? "rgba(255,138,0,0.2)" : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          {nft.rare}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Past Transactions ── */}
          {[
            {
              title: "SWAP HISTORY",
              delay: 0.32,
              href: "/dapp/swap",
              txs: [
                {
                  from: "1.0 ETH",
                  to: "2,450 USDC",
                  chain: "Ethereum",
                  time: "2h ago",
                  hash: "0x1a2b...cd3e",
                  status: "success",
                },
                {
                  from: "500 USDC",
                  to: "0.204 ETH",
                  chain: "Base",
                  time: "6h ago",
                  hash: "0x4f5a...bc12",
                  status: "success",
                },
                {
                  from: "0.5 WBTC",
                  to: "33,700 USDT",
                  chain: "Ethereum",
                  time: "1d ago",
                  hash: "0x9e8d...fa01",
                  status: "success",
                },
              ],
            },
            {
              title: "BRIDGE HISTORY",
              delay: 0.35,
              href: "/dapp/bridge",
              txs: [
                {
                  from: "0.5 ETH on Ethereum",
                  to: "Base",
                  chain: "Cross-chain",
                  time: "1d ago",
                  hash: "0x7c6b...de90",
                  status: "success",
                },
                {
                  from: "1,000 USDC on Base",
                  to: "Arbitrum",
                  chain: "Cross-chain",
                  time: "3d ago",
                  hash: "0x2a1b...ef45",
                  status: "success",
                },
              ],
            },
            {
              title: "GAS TRANSFERS",
              delay: 0.37,
              href: "/dapp/gas",
              txs: [
                {
                  from: "0.005 ETH",
                  to: "PulseChain gas",
                  chain: "Ethereum → PLS",
                  time: "5m ago",
                  hash: "0x3d4c...ab78",
                  status: "success",
                },
                {
                  from: "0.01 ETH",
                  to: "Base gas",
                  chain: "Ethereum → Base",
                  time: "2h ago",
                  hash: "0x5e6f...cd90",
                  status: "success",
                },
              ],
            },
          ].map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: section.delay }}
              style={{
                marginTop: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    color: "rgba(255,255,255,0.18)",
                  }}
                >
                  {section.title}
                </p>
                <Link
                  href={section.href}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(255,138,0,0.5)",
                    letterSpacing: "0.08em",
                  }}
                >
                  VIEW ALL →
                </Link>
              </div>
              {!connected ? (
                <div
                  className="flex items-center justify-center"
                  style={{ padding: "24px 20px" }}
                >
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
                    Connect wallet to view history
                  </p>
                </div>
              ) : (
                section.txs.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                    style={{
                      padding: "11px 20px",
                      borderBottom:
                        i < section.txs.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          background: "#4ade80",
                          borderRadius: 0,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {tx.from} → {tx.to}
                        </p>
                        <p
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.2)",
                            marginTop: 1,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {tx.chain} · {tx.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "#4ade80",
                        }}
                      >
                        SUCCESS
                      </p>
                      <p
                        style={{
                          fontSize: 8,
                          color: "rgba(255,255,255,0.15)",
                          marginTop: 1,
                          fontFamily: "monospace",
                        }}
                      >
                        {tx.hash}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ))}

          {/* ── Future features placeholder ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              {
                title: "YIELD POSITIONS",
                desc: "Staking, farming & liquidity positions across chains",
              },
              {
                title: "LIMIT ORDERS",
                desc: "Active and filled limit orders tracking",
              },
              {
                title: "P&L ANALYTICS",
                desc: "Realized / unrealized P&L, tax reports, CSV export",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "18px 20px",
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 0,
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ marginBottom: 8 }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      color: "rgba(255,255,255,0.15)",
                    }}
                  >
                    {f.title}
                  </p>
                  <span
                    style={{
                      fontSize: 8,
                      padding: "2px 6px",
                      background: "rgba(255,138,0,0.06)",
                      border: "1px solid rgba(255,138,0,0.12)",
                      color: "rgba(255,138,0,0.4)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    SOON
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.18)",
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-center"
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.08)",
              marginTop: 20,
            }}
          >
            DATA: DEBANK · OKX · COINGECKO · COINPAPRIKA · MORALIS · AUTO-CYCLED
            TO AVOID API LIMITS
          </p>
        </div>
      </div>
    </>
  );
}
