import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

const TOKENS = [
  { symbol: "ETH", logo: "Ξ", price: 2455.12, balance: "1.842" },
  { symbol: "USDC", logo: "$", price: 1.0, balance: "2,400" },
  { symbol: "USDT", logo: "₮", price: 1.0, balance: "1,200" },
  { symbol: "WBTC", logo: "₿", price: 67533, balance: "0.024" },
  { symbol: "DAI", logo: "◈", price: 1.0, balance: "800" },
  { symbol: "PLS", logo: "P", price: 0.003, balance: "180000" },
  { symbol: "ARB", logo: "A", price: 0.7, balance: "250" },
];

// Fake price chart data: ETH/USDC 24H
const PRICE_DATA = [
  2310, 2295, 2330, 2350, 2340, 2380, 2410, 2390, 2420, 2440, 2430, 2455, 2448,
  2455, 2461, 2450, 2458, 2470, 2455, 2460, 2455, 2465, 2455, 2450, 2455,
];

const MOCK_ORDERS = [
  {
    id: "1",
    sellToken: "USDC",
    buyToken: "ETH",
    sellAmt: "1,000",
    limitPrice: "$2,200",
    marketPrice: "$2,455",
    filled: 0,
    expires: "22h",
    status: "OPEN",
    created: "2h ago",
  },
  {
    id: "2",
    sellToken: "ETH",
    buyToken: "USDC",
    sellAmt: "0.5",
    limitPrice: "$2,600",
    marketPrice: "$2,455",
    filled: 0,
    expires: "19h",
    status: "OPEN",
    created: "5h ago",
  },
  {
    id: "3",
    sellToken: "USDC",
    buyToken: "WBTC",
    sellAmt: "500",
    limitPrice: "$64,000",
    marketPrice: "$67,533",
    filled: 100,
    expires: "—",
    status: "FILLED",
    created: "1d ago",
  },
  {
    id: "4",
    sellToken: "USDC",
    buyToken: "ETH",
    sellAmt: "200",
    limitPrice: "$2,100",
    marketPrice: "$2,455",
    filled: 0,
    expires: "—",
    status: "CANCELLED",
    created: "2d ago",
  },
];

type Tab = "open" | "history";

function TokenPill({
  symbol,
  logo,
  onClick,
}: {
  symbol: string;
  logo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.05] px-[10px] py-[5px] pl-[6px] transition-opacity hover:opacity-70"
    >
      <div className="flex h-5 w-5 items-center justify-center bg-white/[0.08] text-[9px] font-bold text-white/85">
        {logo}
      </div>

      <span className="text-xs font-semibold text-white">{symbol}</span>

      <svg
        width="7"
        height="7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-white/25"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function TokenDropdown({
  value,
  onChange,
  exclude,
}: {
  value: (typeof TOKENS)[0];
  onChange: (t: (typeof TOKENS)[0]) => void;
  exclude: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <TokenPill
        symbol={value.symbol}
        logo={value.logo}
        onClick={() => setOpen((o) => !o)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full z-20 mt-1 min-w-[140px] border border-white/[0.08] bg-[#06060e]/[0.99] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            {TOKENS.filter((t) => t.symbol !== exclude).map((t) => (
              <button
                key={t.symbol}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-left text-xs font-medium transition-all hover:bg-white/[0.03] ${
                  value.symbol === t.symbol ? "text-[#FF8A00]" : "text-white/50"
                }`}
              >
                <div className="flex h-[18px] w-[18px] items-center justify-center bg-white/[0.07] text-[9px] font-bold text-white/70">
                  {t.logo}
                </div>

                {t.symbol}

                <span className="ml-auto text-[9px] text-white/20">
                  {t.balance}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrdersPage() {
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected: connected } = useAccount();

  const [tab, setTab] = useState<Tab>("open");

  const [sellToken, setSellToken] = useState(TOKENS[1]); // USDC
  const [buyToken, setBuyToken] = useState(TOKENS[0]); // ETH

  const [sellAmount, setSellAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [expiry, setExpiry] = useState("24h");

  const [orders, setOrders] = useState(MOCK_ORDERS);

  const marketPrice = buyToken.price;

  const priceDiff =
    limitPrice && marketPrice
      ? (((parseFloat(limitPrice) - marketPrice) / marketPrice) * 100).toFixed(
          2,
        )
      : null;

  const buyAmount =
    sellAmount && limitPrice
      ? (parseFloat(sellAmount) / parseFloat(limitPrice)).toFixed(6)
      : "";

  const filtered = orders.filter((o) =>
    tab === "open" ? o.status === "OPEN" : o.status !== "OPEN",
  );

  const handlePlace = () => {
    if (!sellAmount || !limitPrice) return;

    setOrders((prev) => [
      {
        id: String(Date.now()),
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmt: sellAmount,
        limitPrice: `$${limitPrice}`,
        marketPrice: `$${marketPrice.toFixed(2)}`,
        filled: 0,
        expires: expiry === "Never" ? "—" : expiry,
        status: "OPEN",
        created: "just now",
      },
      ...prev,
    ]);

    setSellAmount("");
    setLimitPrice("");
  };

  const cancelOrder = (id: string) =>
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)),
    );

  // Mini price chart
  const min = Math.min(...PRICE_DATA),
    max = Math.max(...PRICE_DATA),
    range = max - min || 1;

  const W = 400,
    H = 80;

  const pts = PRICE_DATA.map(
    (v, i) =>
      `${(i / (PRICE_DATA.length - 1)) * W},${H - ((v - min) / range) * (H - 10) - 5}`,
  ).join(" ");

  const fillPts = `0,${H} ` + pts + ` ${W},${H}`;

  return (
    <>
      <div className="mx-auto min-h-[calc(100vh-52px)] max-w-[1000px] px-4 pb-16 md:px-8">
        <div className="pt-8">
          {/* Title */}
          <div className="mb-6">
            <p className="mb-2 text-[9px] font-bold tracking-[0.4em] text-[#FF8A00]/45">
              LIMIT ORDERS
            </p>

            <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">
              Set Your Price.{" "}
              <span className="text-[#FF8A00]">Trade on Your Terms.</span>
            </h1>
          </div>

          <div className="grid gap-4">
            {/* LEFT */}
            <div>
              {/* Price Chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3 overflow-hidden border border-white/[0.06]"
              >
                <div className="flex items-center justify-between border-b border-white/[0.05] bg-white/[0.015] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold text-white">
                      {sellToken.symbol}/{buyToken.symbol}
                    </span>

                    <span className="text-[18px] font-[200] tracking-[-0.03em] text-white">
                      ${marketPrice.toLocaleString()}
                    </span>

                    <span className="border border-[#4ade80]/[0.12] bg-[#4ade80]/[0.07] px-2 py-[3px] text-[10px] font-bold tracking-[0.04em] text-[#4ade80]">
                      +1.24%
                    </span>
                  </div>

                  <span className="text-[9px] tracking-[0.06em] text-white/18">
                    24H
                  </span>
                </div>

                <div className="bg-[#03030a] px-0 pb-2 pt-4">
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    width="100%"
                    height={H}
                  >
                    <defs>
                      <linearGradient
                        id="ordersGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FF8A00"
                          stopOpacity="0.08"
                        />
                        <stop
                          offset="100%"
                          stopColor="#FF8A00"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75].map((p) => (
                      <line
                        key={p}
                        x1="0"
                        y1={H - p * (H - 10) - 5}
                        x2={W}
                        y2={H - p * (H - 10) - 5}
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                    ))}

                    <polygon points={fillPts} fill="url(#ordersGrad)" />

                    <polyline
                      fill="none"
                      stroke="#FF8A00"
                      strokeWidth="1.5"
                      points={pts}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8"
                    />

                    {limitPrice && parseFloat(limitPrice) > 0 && (
                      <line
                        x1="0"
                        x2={W}
                        y1={
                          H -
                          ((parseFloat(limitPrice) - min) / range) * (H - 10) -
                          5
                        }
                        y2={
                          H -
                          ((parseFloat(limitPrice) - min) / range) * (H - 10) -
                          5
                        }
                        stroke="rgba(255,138,0,0.5)"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                    )}
                  </svg>

                  <div className="flex justify-between px-4">
                    {[
                      "00:00",
                      "04:00",
                      "08:00",
                      "12:00",
                      "16:00",
                      "20:00",
                      "24:00",
                    ].map((t) => (
                      <span
                        key={t}
                        className="text-[9px] tracking-[0.02em] text-white/12"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Order Table */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex">
                  {(["open", "history"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`mr-[2px] border border-white/[0.07] border-b-0 px-[18px] py-[10px] text-[10px] font-bold uppercase tracking-[0.08em] ${
                        tab === t
                          ? "bg-[#06060e]/[0.98] text-[#FF8A00]"
                          : "bg-transparent text-white/25"
                      }`}
                    >
                      {t === "open"
                        ? `Open Orders (${orders.filter((o) => o.status === "OPEN").length})`
                        : "History"}
                    </button>
                  ))}
                </div>

                <div className="border border-white/[0.07] bg-[#06060e]/[0.98]">
                  {/* Header */}
                  <div className="grid md:grid-cols-[1fr_1fr_1fr_1fr_80px_80px_80px] grid-cols-7 border-b border-white/[0.05] bg-white/[0.015] md:px-4 px-2 py-[9px]">
                    {[
                      "PAIR",
                      "YOU SELL",
                      "YOU BUY",
                      "LIMIT PRICE",
                      "MARKET",
                      "EXPIRES",
                      "STATUS",
                    ].map((h, i) => (
                      <span
                        key={i}
                        className="md:text-[9px] text-[7px] font-bold tracking-[0.2em] text-white/18"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {!connected ? (
                    <div className="flex flex-col items-center justify-center px-5 py-[60px]">
                      <p className="mb-[14px] text-xs text-white/20">
                        Connect wallet to see your orders
                      </p>

                      <button
                        onClick={() => setWalletOpen(true)}
                        className="bg-[#FF8A00] px-5 py-[9px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#03030a] transition-opacity hover:opacity-85"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex items-center justify-center px-5 py-12">
                      <p className="text-xs text-white/18">No {tab} orders</p>
                    </div>
                  ) : (
                    filtered.map((order, i) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="grid md:grid-cols-[1fr_1fr_1fr_1fr_80px_80px_80px] grid-cols-7 gap-3 items-center md:px-4 px-2 py-[13px] transition-colors hover:bg-white/[0.016]"
                      >
                        <span className="md:text-[13px] text-[8px] font-medium text-white">
                          {order.sellToken}/{order.buyToken}
                        </span>

                        <span className="md:text-xs text-[8px] text-white/55">
                          {order.sellAmt} {order.sellToken}
                        </span>

                        <span className="md:text-xs text-[8px] text-white/55">
                          {order.filled === 100
                            ? "—"
                            : order.sellAmt && order.limitPrice
                              ? `~${(parseFloat(order.sellAmt.replace(/,/g, "")) / parseFloat(order.limitPrice.replace("$", "").replace(",", ""))).toFixed(4)} ${order.buyToken}`
                              : "—"}
                        </span>

                        <span className="md:text-xs text-[8px] font-semibold text-[#FF8A00]">
                          {order.limitPrice}
                        </span>

                        <span className="md:text-[11px] text-[8px] text-white/35">
                          {order.marketPrice}
                        </span>

                        <span className="md:text-[10px] text-[8px] tracking-[0.04em] text-white/30">
                          {order.expires}
                        </span>
                        <div className="flex items-center md:gap-1.5 gap-[1px]">
                          <span
                            className={`border md:px-[7px] px-[2px] py-[3px] md:text-[9px] text-[6px] font-bold tracking-[0.08em]
                              ${
                                order.status === "OPEN"
                                  ? "border-[#FF8A00]/15 bg-[#FF8A00]/[0.08] text-[#FF8A00]"
                                  : order.status === "FILLED"
                                    ? "border-[#4ade80]/15 bg-[#4ade80]/[0.08] text-[#4ade80]"
                                    : "border-white/[0.07] bg-white/[0.04] text-white/25"
                              }`}
                          >
                            {order.status}
                          </span>
                          {order.status === "OPEN" && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="px-1 text-[9px] text-white/20 transition-colors hover:text-[#f87171]"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* RIGHT */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="h-fit border border-white/[0.07] bg-[#06060e]/[0.98] backdrop-blur-[60px]"
            >
              <div className="border-b border-white/[0.05] px-5 py-[18px]">
                <h3 className="text-[13px] font-bold tracking-[0.08em] text-white">
                  PLACE LIMIT ORDER
                </h3>
              </div>

              <div className="p-5">
                {/* YOU SELL */}
                <div className="border-b border-white/[0.05] pb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[0.15em] text-white/20">
                      YOU SELL
                    </span>
                    {connected && (
                      <span className="text-[9px] text-white/20">
                        Bal: {sellToken.balance} {sellToken.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={sellAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");

                        if (v.split(".").length <= 2) setSellAmount(v);
                      }}
                      className="w-0 min-w-0 flex-1 bg-transparent text-[clamp(1.4rem,4vw,2rem)] font-[200] tracking-[-0.03em] text-white outline-none placeholder:text-white/10"
                    />

                    <TokenDropdown
                      value={sellToken}
                      onChange={setSellToken}
                      exclude={buyToken.symbol}
                    />
                  </div>

                  {sellAmount && (
                    <p className="mt-[6px] text-[10px] text-white/20">
                      $
                      {(
                        parseFloat(sellAmount) * sellToken.price
                      ).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>

                {/* Flip */}
                <div className="flex justify-center py-1">
                  <button
                    onClick={() => {
                      const s = sellToken;
                      setSellToken(buyToken);
                      setBuyToken(s);
                    }}
                    className="flex h-7 w-7 items-center justify-center border border-white/[0.08] bg-white/[0.04] text-white/30 transition-all hover:border-[#FF8A00]/30 hover:text-[#FF8A00]"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                    </svg>
                  </button>
                </div>

                {/* YOU BUY */}
                <div className="mb-[14px] pt-[14px]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[0.15em] text-white/20">
                      YOU BUY (estimated)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-1 text-[clamp(1.4rem,4vw,2rem)] font-[200] tracking-[-0.03em] ${
                        buyAmount ? "text-white/85" : "text-white/[0.07]"
                      }`}
                    >
                      {buyAmount || "0"}
                    </div>

                    <TokenDropdown
                      value={buyToken}
                      onChange={setBuyToken}
                      exclude={sellToken.symbol}
                    />
                  </div>

                  {buyAmount && (
                    <p className="mt-[6px] text-[10px] text-white/18">
                      $
                      {(parseFloat(buyAmount) * buyToken.price).toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 2,
                        },
                      )}
                    </p>
                  )}
                </div>

                {/* Limit Price */}
                <div className="mb-[14px]">
                  <div className="mb-[6px] flex items-center justify-between">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-white/20">
                      LIMIT PRICE ({buyToken.symbol} in USD)
                    </p>

                    <button
                      onClick={() => setLimitPrice(marketPrice.toFixed(2))}
                      className="text-[9px] tracking-[0.04em] text-[#FF8A00]/50"
                    >
                      Market: ${marketPrice.toLocaleString()}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={limitPrice}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");

                        if (v.split(".").length <= 2) setLimitPrice(v);
                      }}
                      className="w-full border border-white/[0.07] bg-white/[0.03] px-3 py-[10px] text-base font-light text-white outline-none placeholder:text-white/15 focus:border-[#FF8A00]/30"
                    />

                    {priceDiff !== null && (
                      <span
                        className={`absolute right-[10px] top-1/2 -translate-y-1/2 text-[10px] font-bold ${
                          parseFloat(priceDiff) < 0
                            ? "text-[#4ade80]"
                            : "text-[#f87171]"
                        }`}
                      >
                        {parseFloat(priceDiff) >= 0 ? "+" : ""}
                        {priceDiff}%
                      </span>
                    )}
                  </div>

                  {/* Price shortcuts */}
                  <div className="mt-[6px] flex gap-1">
                    {["-5%", "-2%", "-1%", "+1%", "+2%", "+5%"].map((pct) => {
                      const mult = 1 + parseFloat(pct) / 100;

                      return (
                        <button
                          key={pct}
                          onClick={() =>
                            setLimitPrice((marketPrice * mult).toFixed(2))
                          }
                          className={`flex-1 border border-white/[0.06] bg-white/[0.03] py-[3px] text-[8px] font-semibold tracking-[0.02em] transition-colors hover:border-[#FF8A00]/20 ${
                            parseFloat(pct) < 0
                              ? "text-[#4ade80]/60"
                              : "text-[#f87171]/60"
                          }`}
                        >
                          {pct}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expiry */}
                <div className="mb-[18px]">
                  <p className="mb-[6px] text-[9px] font-bold tracking-[0.2em] text-white/20">
                    EXPIRY
                  </p>

                  <div className="flex border border-white/[0.07]">
                    {["1h", "24h", "7d", "30d", "Never"].map((e, i, arr) => (
                      <button
                        key={e}
                        onClick={() => setExpiry(e)}
                        className={`flex-1 py-[7px] text-[10px] font-semibold tracking-[0.04em] ${
                          expiry === e
                            ? "bg-[#FF8A00]/10 text-[#FF8A00]"
                            : "bg-transparent text-white/25"
                        } ${
                          i < arr.length - 1
                            ? "border-r border-white/[0.07]"
                            : ""
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {sellAmount && limitPrice && (
                  <div className="mb-[14px] border border-white/[0.05] bg-white/[0.015] px-3 py-[10px]">
                    <p className="text-[10px] leading-[1.6] text-white/25">
                      Sell{" "}
                      <span className="text-white">
                        {sellAmount} {sellToken.symbol}
                      </span>{" "}
                      when <span className="text-white">{buyToken.symbol}</span>{" "}
                      reaches{" "}
                      <span className="text-[#FF8A00]">
                        ${parseFloat(limitPrice).toLocaleString()}
                      </span>
                      {priceDiff !== null && (
                        <span
                          className={
                            parseFloat(priceDiff) < 0
                              ? "text-[#4ade80]"
                              : "text-[#f87171]"
                          }
                        >
                          {" "}
                          ({parseFloat(priceDiff) >= 0 ? "+" : ""}
                          {priceDiff}% vs market)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* CTA */}
                {!connected ? (
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="w-full bg-[#FF8A00] py-[14px] text-xs font-bold uppercase tracking-[0.1em] text-[#03030a] transition-opacity hover:opacity-85"
                  >
                    Connect Wallet
                  </button>
                ) : !sellAmount || !limitPrice ? (
                  <button
                    disabled
                    className="w-full cursor-not-allowed border border-white/[0.05] bg-white/[0.03] py-[14px] text-xs font-bold uppercase tracking-[0.1em] text-white/12"
                  >
                    Enter Amount & Price
                  </button>
                ) : (
                  <button
                    onClick={handlePlace}
                    className="w-full bg-[#FF8A00] py-[14px] text-xs font-bold uppercase tracking-[0.1em] text-[#03030a] transition-opacity hover:opacity-85"
                  >
                    Place Limit Order
                  </button>
                )}

                <p className="mt-[10px] text-center text-[9px] tracking-[0.14em] text-white/[0.07]">
                  POWERED BY EMPX · GASLESS LIMIT ORDERS
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
