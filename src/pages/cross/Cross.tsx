import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

const CHAINS = [
  { id: "eth", name: "Ethereum", short: "ETH", logo: "Ξ" },
  { id: "base", name: "Base", short: "BASE", logo: "B" },
  { id: "pulse", name: "PulseChain", short: "PLS", logo: "P" },
  { id: "arb", name: "Arbitrum", short: "ARB", logo: "A" },
  { id: "op", name: "Optimism", short: "OP", logo: "O" },
  { id: "bsc", name: "BSC", short: "BSC", logo: "B" },
  { id: "avax", name: "Avalanche", short: "AVAX", logo: "A" },
  { id: "poly", name: "Polygon", short: "MATIC", logo: "M" },
  { id: "sonic", name: "Sonic", short: "SONIC", logo: "S" },
];

const TOKENS_BY_CHAIN: Record<
  string,
  { symbol: string; logo: string; balance: string }[]
> = {
  eth: [
    { symbol: "ETH", logo: "Ξ", balance: "1.842" },
    { symbol: "USDC", logo: "$", balance: "2,400" },
    { symbol: "USDT", logo: "₮", balance: "1,200" },
    { symbol: "WBTC", logo: "₿", balance: "0.024" },
  ],
  base: [
    { symbol: "ETH", logo: "Ξ", balance: "0.42" },
    { symbol: "USDC", logo: "$", balance: "800" },
    { symbol: "DAI", logo: "◈", balance: "400" },
  ],
  pulse: [
    { symbol: "PLS", logo: "P", balance: "180000" },
    { symbol: "PLSX", logo: "X", balance: "5000" },
    { symbol: "USDC", logo: "$", balance: "200" },
  ],
  arb: [
    { symbol: "ETH", logo: "Ξ", balance: "0.22" },
    { symbol: "ARB", logo: "A", balance: "250" },
    { symbol: "USDC", logo: "$", balance: "600" },
  ],
  op: [
    { symbol: "ETH", logo: "Ξ", balance: "0.18" },
    { symbol: "OP", logo: "O", balance: "140" },
    { symbol: "USDC", logo: "$", balance: "300" },
  ],
  bsc: [
    { symbol: "BNB", logo: "B", balance: "0.8" },
    { symbol: "USDT", logo: "₮", balance: "500" },
    { symbol: "BUSD", logo: "B", balance: "200" },
  ],
  avax: [
    { symbol: "AVAX", logo: "A", balance: "4.2" },
    { symbol: "USDC", logo: "$", balance: "180" },
  ],
  poly: [
    { symbol: "MATIC", logo: "M", balance: "420" },
    { symbol: "USDC", logo: "$", balance: "150" },
  ],
  sonic: [
    { symbol: "SONIC", logo: "S", balance: "1200" },
    { symbol: "USDC", logo: "$", balance: "80" },
  ],
};

const RAILS: Record<
  string,
  { name: string; time: string; fee: string; color: string }[]
> = {
  "eth-base": [
    { name: "CCTP", time: "~2 min", fee: "$0.12", color: "#4ade80" },
    { name: "Across", time: "~3 min", fee: "$0.18", color: "#FF8A00" },
  ],
  "eth-arb": [
    { name: "CCTP", time: "~2 min", fee: "$0.08", color: "#4ade80" },
    { name: "Axelar", time: "~5 min", fee: "$0.22", color: "#FF8A00" },
  ],
  "eth-op": [
    { name: "CCTP", time: "~2 min", fee: "$0.09", color: "#4ade80" },
    { name: "Across", time: "~3 min", fee: "$0.14", color: "#FF8A00" },
  ],
  "eth-poly": [
    { name: "Axelar", time: "~4 min", fee: "$0.15", color: "#4ade80" },
    { name: "LayerZero", time: "~6 min", fee: "$0.20", color: "#FF8A00" },
  ],
  "eth-avax": [
    { name: "Axelar", time: "~5 min", fee: "$0.45", color: "#4ade80" },
    { name: "Thorchain", time: "~8 min", fee: "$0.80", color: "#FF8A00" },
  ],
  "eth-bsc": [
    { name: "LayerZero", time: "~5 min", fee: "$0.18", color: "#4ade80" },
    { name: "Thorchain", time: "~10 min", fee: "$1.20", color: "#FF8A00" },
  ],
  "eth-pulse": [
    { name: "Thorchain", time: "~10 min", fee: "$1.40", color: "#FF8A00" },
  ],
};

const getRoute = (from: string, to: string) => {
  const key = `${from}-${to}`;
  const rev = `${to}-${from}`;

  return (
    RAILS[key] ||
    RAILS[rev] || [
      {
        name: "LayerZero",
        time: "~8 min",
        fee: "$0.30",
        color: "#4ade80",
      },
    ]
  );
};

const scaledFs = (value: string, isMobile = false) => {
  const digits = value?.replace(/[^0-9]/g, "").length ?? 0;

  if (isMobile) {
    if (digits >= 14) return "1.25rem";
    if (digits >= 12) return "1.4rem";
    if (digits >= 10) return "1.6rem";
    if (digits >= 8) return "1.8rem";
    return "2rem";
  }

  if (digits >= 16) return "1.4rem";
  if (digits >= 14) return "1.6rem";
  if (digits >= 12) return "2rem";
  if (digits >= 11) return "2.4rem";
  return "clamp(1.6rem,5vw,2.8rem)";
};

function ChainSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: (typeof CHAINS)[0];
  onChange: (c: (typeof CHAINS)[0]) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-between">
      <p className="text-[9px] font-bold tracking-[0.2em] text-white/20">
        {label}
      </p>

      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-none border px-[10px] py-[5px] pl-[8px] transition-opacity hover:opacity-75 ${
          open ? "border-[#FF8A00]/25" : "border-white/[0.07]"
        } bg-white/[0.04]`}
      >
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-none bg-white/[0.07] text-[9px] font-bold text-white/80">
          {value.logo}
        </div>

        <span className="text-[12px] font-semibold text-white">
          {value.name}
        </span>

        <svg
          width="7"
          height="7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-white/25 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full z-20 mt-1 max-h-[220px] min-w-[180px] overflow-auto rounded-none border border-white/[0.08] bg-[rgba(6,6,14,0.99)] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            {CHAINS.filter((c) => c.id !== exclude).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 border-b border-white/[0.04] bg-none px-3 py-2 text-left text-[12px] font-medium transition-all hover:bg-white/[0.03] ${
                  value.id === c.id ? "text-[#FF8A00]" : "text-white/50"
                }`}
              >
                <div className="flex h-[18px] w-[18px] items-center justify-center rounded-none bg-white/[0.06] text-[9px] font-bold text-white/70">
                  {c.logo}
                </div>

                {c.name}

                {value.id === c.id && (
                  <span className="ml-auto text-[10px] text-[#FF8A00]">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TokenSelect({
  label,
  chain,
  value,
  onChange,
}: {
  label: string;
  chain: string;
  value: { symbol: string; logo: string; balance: string };
  onChange: (t: { symbol: string; logo: string; balance: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  const tokens = TOKENS_BY_CHAIN[chain] ?? [];

  return (
    <div className="relative">
      <p className="mb-[6px] text-[9px] font-bold tracking-[0.2em] text-white/20">
        {label}
      </p>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-none border border-white/[0.08] bg-white/[0.05] px-[10px] py-[5px] pl-[6px] transition-opacity hover:opacity-70"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-none bg-white/[0.08] text-[9px] font-bold text-white/85">
          {value.logo}
        </div>

        <span className="text-[12px] font-semibold text-white">
          {value.symbol}
        </span>

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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-none border border-white/[0.08] bg-[rgba(6,6,14,0.99)] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            {tokens.map((t) => (
              <button
                key={t.symbol}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-left text-[12px] font-medium transition-all hover:bg-white/[0.03] ${
                  value.symbol === t.symbol ? "text-[#FF8A00]" : "text-white/50"
                }`}
              >
                <div className="flex h-[18px] w-[18px] items-center justify-center rounded-none bg-white/[0.07] text-[9px] font-bold text-white/70">
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

type Status = "idle" | "pending" | "success" | "failed";

export default function CrossChainPage() {
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected: connected } = useAccount();

  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain, setToChain] = useState(CHAINS[1]);

  const [fromToken, setFromToken] = useState(TOKENS_BY_CHAIN["eth"][1]);

  const [toToken, setToToken] = useState(TOKENS_BY_CHAIN["base"][1]);

  const [amount, setAmount] = useState("");
  const [selectedRail, setSelectedRail] = useState(0);

  const [status, setStatus] = useState<Status>("idle");

  const [showRouteDetails, setShowRouteDetails] = useState(false);

  const routes = getRoute(fromChain.id, toChain.id);

  const activeRail = routes[selectedRail] ?? routes[0];

  const numAmt = parseFloat(amount) || 0;

  const receiveAmt = numAmt > 0 ? (numAmt * 0.9985).toFixed(6) : "";

  const handleFlip = useCallback(() => {
    const fc = fromChain,
      tc = toChain,
      ft = fromToken,
      tt = toToken;

    setFromChain(tc);
    setToChain(fc);

    const newFromTokens = TOKENS_BY_CHAIN[tc.id] ?? [];
    const newToTokens = TOKENS_BY_CHAIN[fc.id] ?? [];

    setFromToken(
      newFromTokens.find((t) => t.symbol === tt.symbol) ?? newFromTokens[0],
    );

    setToToken(
      newToTokens.find((t) => t.symbol === ft.symbol) ?? newToTokens[0],
    );
  }, [fromChain, toChain, fromToken, toToken]);

  const handleSwap = () => {
    setStatus("pending");

    setTimeout(() => {
      setStatus(Math.random() > 0.08 ? "success" : "failed");

      setTimeout(() => setStatus("idle"), 5000);
    }, 3500);
  };

  const handleFromChainChange = (c: (typeof CHAINS)[0]) => {
    setFromChain(c);

    const tokens = TOKENS_BY_CHAIN[c.id] ?? [];

    setFromToken(tokens[0]);

    setSelectedRail(0);
  };

  const handleToChainChange = (c: (typeof CHAINS)[0]) => {
    setToChain(c);

    const tokens = TOKENS_BY_CHAIN[c.id] ?? [];

    setToToken(tokens[0]);

    setSelectedRail(0);
  };

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,138,0,0.04)_0%,transparent_60%)] px-4 py-12">
      <div className="mx-auto w-full max-w-[520px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <p className="mb-2 text-[9px] font-bold tracking-[0.4em] text-[#FF8A00]/45">
              CROSS-CHAIN SWAP
            </p>
            <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">
              Swap Across Chains.{" "}
              <span className="text-[#FF8A00]">Smart Routing.</span>
            </h1>
            <p className="mt-2 text-[12px] text-white/25">
              Powered by CCTP · Axelar · LayerZero · Thorchain
            </p>
          </div>
          <div className="rounded-none border border-white/[0.07] bg-[rgba(6,6,14,0.98)] shadow-[0_40px_80px_rgba(0,0,0,0.7)] backdrop-blur-[60px]">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-[18px]">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-white">
                Cross-Chain Swap
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
                <span className="text-[10px] tracking-[0.06em] text-white/20">
                  LIVE
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="border-b border-white/[0.05] pb-4">
                <ChainSelect
                  label="FROM CHAIN"
                  value={fromChain}
                  onChange={handleFromChainChange}
                  exclude={toChain.id}
                />

                <div className="mt-[10px] flex items-center gap-3 justify-between">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");

                      if (v.split(".").length <= 2) setAmount(v);
                    }}
                    className="w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/10"
                    style={{
                      fontSize: scaledFs(
                        amount,
                        typeof window !== "undefined" && window.innerWidth < 768,
                      ),
                      fontWeight: 200,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />

                  <TokenSelect
                    label=""
                    chain={fromChain.id}
                    value={fromToken}
                    onChange={setFromToken}
                  />
                </div>

                {connected && (
                  <p className="mt-[6px] text-[10px] text-white/18">
                    Bal: {fromToken.balance} {fromToken.symbol}
                  </p>
                )}
              </div>
              <div className="flex justify-center py-[6px]">
                <button
                  onClick={handleFlip}
                  className="flex h-8 w-8 items-center justify-center rounded-none border border-white/[0.08] bg-white/[0.04] text-white/30 transition-all hover:border-[#FF8A00]/30 hover:text-[#FF8A00]"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                  </svg>
                </button>
              </div>
              <div className="mb-4 pt-[14px]">
                <ChainSelect
                  label="TO CHAIN"
                  value={toChain}
                  onChange={handleToChainChange}
                  exclude={fromChain.id}
                />

                <div className="mt-[10px] flex items-center gap-3 justify-between">
                  <div
                    className={`${
                      receiveAmt ? "text-white/90" : "text-white/[0.07]"
                    }`}
                    style={{
                      fontSize: scaledFs(
                        receiveAmt || "0",
                        typeof window !== "undefined" && window.innerWidth < 768,
                      ),
                      fontWeight: 200,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {receiveAmt || "0"}
                  </div>

                  <TokenSelect
                    label=""
                    chain={toChain.id}
                    value={toToken}
                    onChange={setToToken}
                  />
                </div>
              </div>
              {routes.length > 0 && (
                <div className="mb-[14px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowRouteDetails((prev) => !prev);
                    }}
                    className="mb-2 flex w-full items-center justify-between"
                  >
                    <p className="text-[9px] font-bold tracking-[0.2em] text-white/20">
                      ROUTING RAIL
                    </p>

                    <div className="flex items-center gap-1 text-[9px] text-white/20">
                      <span>{showRouteDetails ? "HIDE" : "DETAILS"}</span>

                      <svg
                        width="7"
                        height="7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`transition-transform duration-200 ${
                          showRouteDetails ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </button>
                  <div className="flex gap-[6px]">
                    {routes.map((rail, i) => (
                      <button
                        key={rail.name}
                        type="button"
                        onClick={() => setSelectedRail(i)}
                        className={`flex-1 rounded-none border p-[10px] text-left transition-all ${
                          selectedRail === i
                            ? "border-[#FF8A00]/25 bg-white/[0.05]"
                            : "border-white/[0.06] bg-white/[0.02]"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold tracking-[0.04em] ${
                              selectedRail === i
                                ? "text-[#FF8A00]"
                                : "text-white/50"
                            }`}
                          >
                            {rail.name}
                          </span>

                          {i === 0 && (
                            <span className="border border-[#4ade80]/15 bg-[#4ade80]/10 px-[5px] py-[1px] text-[8px] font-bold tracking-[0.08em] text-[#4ade80]">
                              BEST
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] tracking-[0.02em] text-white/30">
                          {rail.time} · {rail.fee}
                        </p>
                      </button>
                    ))}
                  </div>
                  <AnimatePresence initial={false}>
                    {showRouteDetails && (
                      <motion.div
                        key="route-details"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 border border-white/[0.05] bg-white/[0.015] px-[14px] py-[10px]">
                          <div className="mb-2 flex items-center gap-1.5">
                            <span className="border border-white/[0.07] bg-white/[0.04] px-[8px] py-[3px] text-[9px] font-semibold text-white/60">
                              {fromToken.symbol} on {fromChain.short}
                            </span>

                            <div className="h-px flex-1 bg-white/[0.07]" />

                            <span className="border border-[#FF8A00]/20 bg-[#FF8A00]/10 px-[8px] py-[3px] text-[9px] font-bold text-[#FF8A00]">
                              EMPX
                            </span>

                            <div className="h-px w-2 bg-white/[0.07]" />

                            <span className="border border-white/[0.06] bg-white/[0.03] px-[8px] py-[3px] text-[9px] font-semibold text-white/40">
                              {activeRail.name}
                            </span>

                            <div className="h-px flex-1 bg-white/[0.07]" />

                            <span className="border border-white/[0.07] bg-white/[0.04] px-[8px] py-[3px] text-[9px] font-semibold text-white/60">
                              {toToken.symbol} on {toChain.short}
                            </span>
                          </div>

                          {[
                            {
                              label: "Bridge Fee",
                              value: activeRail.fee,
                            },
                            {
                              label: "Estimated Time",
                              value: activeRail.time,
                            },
                            {
                              label: "Slippage",
                              value: "0.5%",
                            },
                            {
                              label: "You Receive",
                              value: receiveAmt
                                ? `${receiveAmt} ${toToken.symbol}`
                                : "—",
                            },
                          ].map(({ label, value }, i, arr) => (
                            <div
                              key={label}
                              className={`flex justify-between py-1 ${
                                i < arr.length - 1
                                  ? "border-b border-white/[0.04]"
                                  : ""
                              }`}
                            >
                              <span className="text-[10px] text-white/25">
                                {label}
                              </span>

                              <span className="text-[10px] font-semibold text-white/60">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {/* STATUS */}
              <AnimatePresence>
                {status !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-3 overflow-hidden rounded-none border px-[14px] py-[10px] ${
                      status === "success"
                        ? "border-[#4ade80]/15 bg-[#4ade80]/10"
                        : status === "failed"
                          ? "border-red-400/15 bg-red-400/10"
                          : "border-[#FF8A00]/15 bg-[#FF8A00]/10"
                    }`}
                  >
                    <p
                      className={`text-[12px] font-semibold ${
                        status === "success"
                          ? "text-[#4ade80]"
                          : status === "failed"
                            ? "text-red-400"
                            : "text-[#FF8A00]"
                      }`}
                    >
                      {status === "pending" &&
                        `⏳ Routing via ${activeRail.name}...`}

                      {status === "success" &&
                        `✓ Swap complete — ${toToken.symbol} arriving on ${toChain.name}`}

                      {status === "failed" &&
                        "✕ Swap failed — please try again"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              {!connected ? (
                <button
                  onClick={() => setWalletOpen(true)}
                  className="w-full rounded-none bg-[#FF8A00] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-[#03030a] transition-opacity hover:opacity-85"
                >
                  Connect Wallet
                </button>
              ) : fromChain.id === toChain.id ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-none border border-white/[0.05] bg-white/[0.03] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-white/12"
                >
                  Select Different Chains
                </button>
              ) : !amount || numAmt === 0 ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-none border border-white/[0.05] bg-white/[0.03] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-white/12"
                >
                  Enter Amount
                </button>
              ) : (
                <button
                  onClick={handleSwap}
                  disabled={status === "pending"}
                  className={`w-full rounded-none px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-[#03030a] transition-opacity hover:opacity-85 ${
                    status === "pending"
                      ? "cursor-not-allowed bg-[#FF8A00]/40"
                      : "bg-[#FF8A00]"
                  }`}
                >
                  {status === "pending"
                    ? `Routing via ${activeRail.name}...`
                    : `Swap ${fromToken.symbol} → ${toToken.symbol}`}
                </button>
              )}

              <p className="mt-[10px] text-center text-[9px] tracking-[0.14em] text-white/[0.07]">
                CCTP · AXELAR · LAYERZERO · THORCHAIN · POWERED BY EMPX
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
