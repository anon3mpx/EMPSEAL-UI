"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

const CHAINS = [
  { id: "eth", name: "Ethereum", short: "ETH", logo: "Ξ", color: "#FF8A00" },
  { id: "base", name: "Base", short: "BASE", logo: "B", color: "#FF8A00" },
  {
    id: "pulse",
    name: "PulseChain",
    short: "PLS",
    logo: "P",
    color: "#FF8A00",
  },
  { id: "bsc", name: "BSC", short: "BSC", logo: "B", color: "#F3BA2F" },
  { id: "arb", name: "Arbitrum", short: "ARB", logo: "A", color: "#FF8A00" },
  { id: "avax", name: "Avalanche", short: "AVAX", logo: "A", color: "#E84142" },
  { id: "op", name: "Optimism", short: "OP", logo: "O", color: "#FF0420" },
  { id: "poly", name: "Polygon", short: "MATIC", logo: "M", color: "#F5AC37" },
];
const TOKENS = [
  { symbol: "ETH", logo: "Ξ", balance: "1.842" },
  { symbol: "USDC", logo: "$", balance: "2,400" },
  { symbol: "USDT", logo: "₮", balance: "1,200" },
  { symbol: "WBTC", logo: "₿", balance: "0.024" },
  { symbol: "DAI", logo: "◈", balance: "800" },
];
const BRIDGE_FEES: Record<string, string> = {
  eth: "$3.20",
  base: "$0.12",
  pulse: "$0.04",
  bsc: "$0.18",
  arb: "$0.08",
  avax: "$0.45",
  op: "$0.09",
  poly: "$0.05",
};
type Status = "idle" | "pending" | "success" | "failed";
function ChainSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: (typeof CHAINS)[0];
  onChange: (c: (typeof CHAINS)[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <p className="mb-2 text-[9px] font-bold tracking-[0.2em] text-white/20">
        {label}
      </p>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-[10px] bg-white/[0.04] border transition-opacity hover:opacity-75 ${
          open ? "border-[#FF8A00]/25" : "border-white/10"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/80">
            {value.logo}
          </div>
          <span className="text-[13px] font-semibold text-white">
            {value.name}
          </span>
        </div>
        <svg
          width="9"
          height="9"
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
            className="absolute top-full left-0 right-0 mt-1 z-10 overflow-hidden dropdown-css"
          >
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-[9px] text-left text-xs font-medium border-b border-white/[0.04] transition-all hover:bg-white/[0.03] ${
                  value.id === c.id ? "text-[#FF8A00]" : "text-white/50"
                }`}
              >
                <div className="w-5 h-5 bg-white/[0.06] flex items-center justify-center text-[9px] font-bold text-white/70">
                  {c.logo}
                </div>
                {c.name}
                {value.id === c.id && (
                  <span className="ml-auto text-[#FF8A00] text-[10px]">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default function BridgePage() {
  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain, setToChain] = useState(CHAINS[2]);
  const [token, setToken] = useState(TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected: connected } = useAccount();
  const [status, setStatus] = useState<Status>("idle");
  const [showTokenDrop, setShowTokenDrop] = useState(false);
  const numAmt = parseFloat(amount) || 0;
  const receiveAmt = numAmt > 0 ? (numAmt * 0.9988).toFixed(6) : "";
  const bridgeFee = BRIDGE_FEES[fromChain.id] ?? "$0.10";
  const estimatedTime = fromChain.id === "eth" ? "~8 min" : "~2 min";
  const handleFlip = useCallback(() => {
    const tmp = fromChain;
    setFromChain(toChain);
    setToChain(tmp);
  }, [fromChain, toChain]);
  const handleBridge = () => {
    setStatus("pending");
    setTimeout(() => {
      setStatus(Math.random() > 0.08 ? "success" : "failed");
      setTimeout(() => setStatus("idle"), 4000);
    }, 3000);
  };
  return (
    <div className="min-h-[calc(100vh-52px)] flex flex-col items-center px-4 py-12 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,138,0,0.04)_0%,transparent_60%)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px]"
      >
        {/* Title */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-[9px] font-bold tracking-[0.4em] text-[#FF8A00]/45">
            CROSS-CHAIN BRIDGE
          </p>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">
            Move Assets. <span className="text-[#FF8A00]">Any Chain.</span>
          </h1>
        </div>
        {/* Widget */}
        <div className="bg-[#06060e]/98 border border-white/[0.07] backdrop-blur-[60px] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.05]">
            <h3 className="text-[13px] font-bold text-white tracking-[0.08em] uppercase">
              Bridge
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 animate-pulse bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
              <span className="text-[10px] text-white/20 tracking-[0.06em]">
                LIVE
              </span>
            </div>
          </div>
          {/* FROM */}
          <div className="px-5 pt-5 pb-4">
            <div className="grid items-center gap-2 mb-4">
              <ChainSelect
                label="FROM CHAIN"
                value={fromChain}
                onChange={setFromChain}
              />
              <button
                onClick={handleFlip}
                className="w-7 h-7 bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mt-[18px] text-white/30 hover:text-[#FF8A00] hover:border-[#FF8A00]/30 transition-all"
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
              <ChainSelect
                label="TO CHAIN"
                value={toChain}
                onChange={setToChain}
              />
            </div>
            <div className="flex items-center justify-between mb-[10px]">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-white/20">
                YOU SEND
              </span>
              {connected && (
                <button className="text-[10px] text-white/20 tracking-[0.04em]">
                  {token.balance} {token.symbol}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  if (v.split(".").length <= 2) {
                    setAmount(v);
                  }
                }}
                className="flex-1 w-0 bg-transparent outline-none text-white placeholder:text-white/10 text-[clamp(1.8rem,6vw,3rem)] font-[200] tracking-[-0.04em] min-w-0 overflow-hidden text-ellipsis"
              />
              {/* Token Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowTokenDrop(!showTokenDrop)}
                  className="flex items-center gap-1.5 px-[10px] py-[6px] pl-[6px] bg-white/[0.05] border border-white/[0.08] transition-opacity hover:opacity-70"
                >
                  <div className="w-[22px] h-[22px] bg-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/85">
                    {token.logo}
                  </div>
                  <span className="text-xs font-semibold text-white">
                    {token.symbol}
                  </span>
                  <svg
                    width="8"
                    height="8"
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
                  {showTokenDrop && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full right-0 mt-1 z-10 min-w-[130px] dropdown-css"
                    >
                      {TOKENS.map((t) => (
                        <button
                          key={t.symbol}
                          onClick={() => {
                            setToken(t);
                            setShowTokenDrop(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium border-b border-white/[0.04] hover:bg-white/[0.03] ${
                            token.symbol === t.symbol
                              ? "text-[#FF8A00]"
                              : "text-white/50"
                          }`}
                        >
                          <span className="text-[11px] font-bold">
                            {t.logo}
                          </span>
                          {t.symbol}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {numAmt > 0 && (
              <p className="mt-2 text-[11px] text-white/20">
                $
                {(numAmt * 2455).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
          {/* Divider */}
          <div className="border-y border-white/[0.05]">
            <div className="flex items-center justify-center h-[34px]">
              <div className="w-6 h-6 bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00]">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            </div>
          </div>
          {/* RECEIVE */}
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center justify-between mb-[10px]">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-white/20">
                YOU RECEIVE
              </span>
              <span className="text-[9px] text-white/25 tracking-[0.04em]">
                on {toChain.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[clamp(1.8rem,6vw,3rem)] font-[200] tracking-[-0.04em] overflow-hidden text-ellipsis whitespace-nowrap text-white/90">
                {receiveAmt || "0"}
              </div>
              <div className="flex items-center gap-2 shrink-0 px-[10px] py-[6px] pl-[6px] bg-white/[0.05] border border-white/[0.08]">
                <div className="w-[22px] h-[22px] bg-white/[0.07] flex items-center justify-center text-[10px] font-bold text-white/85">
                  {token.logo}
                </div>
                <span className="text-xs font-semibold text-white">
                  {token.symbol}
                </span>
              </div>
            </div>
          </div>
          {/* Rate */}
          <AnimatePresence>
            {numAmt > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/[0.05] px-5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/20">
                      EMPX Native Bridge · {estimatedTime}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-white/20">
                        Fee {bridgeFee}
                      </span>
                      <span className="text-[10px] text-white/20">
                        Min: {receiveAmt} {token.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Status */}
          <AnimatePresence>
            {status !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mx-5 mb-3 px-[14px] py-[10px] overflow-hidden border ${
                  status === "success"
                    ? "bg-green-400/10 border-green-400/20"
                    : status === "failed"
                      ? "bg-red-400/10 border-red-400/20"
                      : "bg-[#FF8A00]/10 border-[#FF8A00]/20"
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    status === "success"
                      ? "text-green-400"
                      : status === "failed"
                        ? "text-red-400"
                        : "text-[#FF8A00]"
                  }`}
                >
                  {status === "pending" && "⏳ Bridging in progress..."}
                  {status === "success" &&
                    "✓ Bridge complete — funds arriving shortly"}
                  {status === "failed" && "✕ Bridge failed — please try again"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* CTA */}
          <div className="px-5 pb-5">
            {!connected ? (
              <button
                onClick={() => setWalletOpen(true)}
                className="w-full py-[14px] bg-[#FF8A00] text-[#03030a] text-xs font-bold tracking-[0.1em] uppercase hover:opacity-85 transition-opacity"
              >
                Connect Wallet
              </button>
            ) : !amount || numAmt === 0 ? (
              <button
                disabled
                className="w-full py-[14px] bg-white/[0.03] text-white/10 border border-white/[0.05] text-xs font-bold tracking-[0.1em] uppercase cursor-not-allowed"
              >
                Enter Amount
              </button>
            ) : fromChain.id === toChain.id ? (
              <button
                disabled
                className="w-full py-[14px] bg-white/[0.03] text-white/10 border border-white/[0.05] text-xs font-bold tracking-[0.1em] uppercase cursor-not-allowed"
              >
                Select Different Chains
              </button>
            ) : (
              <button
                onClick={handleBridge}
                disabled={status === "pending"}
                className={`w-full py-[14px] text-[#03030a] text-xs font-bold tracking-[0.1em] uppercase transition-opacity hover:opacity-85 ${
                  status === "pending"
                    ? "bg-[#FF8A00]/40 cursor-not-allowed"
                    : "bg-[#FF8A00]"
                }`}
              >
                {status === "pending"
                  ? "Bridging..."
                  : `Bridge ${token.symbol} → ${toChain.short}`}
              </button>
            )}
            <p className="mt-[10px] text-center text-[9px] tracking-[0.14em] text-white/[0.07]">
              POWERED BY EMPX · NATIVE BRIDGE · NO THIRD PARTIES
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
