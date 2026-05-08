
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TokenSelectModal, { Token } from "./TokenSelectModal";
import SwapConfirmModal from "./SwapConfirmModal";
import TxStatusModal from "./TxStatusModal";

const DEFAULT_FROM: Token = {
  symbol: "ETH", name: "Ethereum", chain: "Ethereum", chainColor: "#FF8A00",
  balance: "1.842", value: "$4,521.30", price: "$2,455.12", logo: "Ξ",
};
const DEFAULT_TO: Token = {
  symbol: "USDC", name: "USD Coin", chain: "Base", chainColor: "#FF8A00",
  balance: "2,400", value: "$2,400.00", price: "$1.00", logo: "$",
};

type TxStatus = "idle" | "pending" | "success" | "failed";

interface SwapWidgetProps {
  connected: boolean;
  onConnectWallet: () => void;
}

function scaledFs(val: string): string {
  const digits = val.replace(/[^0-9]/g, "").length;
  if (digits >= 14) return "1.25rem";
  if (digits >= 12) return "1.6rem";
  if (digits >= 11) return "2rem";
  return "clamp(2.2rem,5vw,3rem)";
}

type RouteStep = { type: "token"; logo: string; symbol: string } | { type: "dex"; name: string; pool: string } | { type: "router" };

function getRoute(from: string, to: string): RouteStep[] {
  // Smart routing: returns [fromToken, ...hops..., toToken]
  const routeMap: Record<string, RouteStep[]> = {
    "ETH-USDC":  [{ type:"token", logo:"Ξ", symbol:"ETH" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.05%" }, { type:"token", logo:"$", symbol:"USDC" }],
    "ETH-USDT":  [{ type:"token", logo:"Ξ", symbol:"ETH" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.05%" }, { type:"token", logo:"₮", symbol:"USDT" }],
    "ETH-WBTC":  [{ type:"token", logo:"Ξ", symbol:"ETH" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.3%" }, { type:"token", logo:"W", symbol:"WETH" }, { type:"dex", name:"SushiSwap", pool:"0.25%" }, { type:"token", logo:"₿", symbol:"WBTC" }],
    "ETH-DAI":   [{ type:"token", logo:"Ξ", symbol:"ETH" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.3%" }, { type:"token", logo:"W", symbol:"WETH" }, { type:"dex", name:"Curve", pool:"0.04%" }, { type:"token", logo:"◈", symbol:"DAI" }],
    "USDC-ETH":  [{ type:"token", logo:"$", symbol:"USDC" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.05%" }, { type:"token", logo:"Ξ", symbol:"ETH" }],
    "USDC-WBTC": [{ type:"token", logo:"$", symbol:"USDC" }, { type:"router" }, { type:"dex", name:"Uniswap V3", pool:"0.05%" }, { type:"token", logo:"W", symbol:"WETH" }, { type:"dex", name:"Uniswap V3", pool:"0.3%" }, { type:"token", logo:"₿", symbol:"WBTC" }],
    "USDC-PLS":  [{ type:"token", logo:"$", symbol:"USDC" }, { type:"router" }, { type:"dex", name:"PulseX V2", pool:"0.3%" }, { type:"token", logo:"Ξ", symbol:"WPLS" }, { type:"dex", name:"PulseX V1", pool:"0.3%" }, { type:"token", logo:"P", symbol:"PLS" }],
    "WBTC-ETH":  [{ type:"token", logo:"₿", symbol:"WBTC" }, { type:"router" }, { type:"dex", name:"SushiSwap", pool:"0.25%" }, { type:"token", logo:"W", symbol:"WETH" }, { type:"dex", name:"Uniswap V3", pool:"0.05%" }, { type:"token", logo:"Ξ", symbol:"ETH" }],
    "ETH-ARB":   [{ type:"token", logo:"Ξ", symbol:"ETH" }, { type:"router" }, { type:"dex", name:"Camelot V3", pool:"0.25%" }, { type:"token", logo:"A", symbol:"ARB" }],
    "USDC-DAI":  [{ type:"token", logo:"$", symbol:"USDC" }, { type:"router" }, { type:"dex", name:"Curve 3pool", pool:"0.04%" }, { type:"token", logo:"◈", symbol:"DAI" }],
  };
  const key = `${from}-${to}`;
  if (routeMap[key]) return routeMap[key];
  // Default: direct via EMPX + Uniswap
  return [
    { type:"token", logo:"?", symbol: from },
    { type:"router" },
    { type:"dex", name:"Uniswap V3", pool:"0.3%" },
    { type:"token", logo:"?", symbol: to },
  ];
}

function TokenBtn({ token, onClick }: { token: Token; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 shrink-0 transition-opacity duration-150 hover:opacity-60"
      style={{
        padding: "6px 10px 6px 6px",
        borderRadius: 0,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
      }}
    >
      <div
        className="w-6 h-6 flex items-center justify-center text-xs font-bold"
        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderRadius: 0 }}
      >
        {token.logo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "white", letterSpacing: "0.02em", lineHeight: 1 }}>
          {token.symbol}
        </span>
        <span style={{ fontSize: 8, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", lineHeight: 1 }}>
          {token.chain}
        </span>
      </div>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ color: "rgba(255,255,255,0.25)" }}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export default function SwapWidget({ connected, onConnectWallet }: SwapWidgetProps) {
  const [fromToken,     setFromToken]     = useState<Token>(DEFAULT_FROM);
  const [toToken,       setToToken]       = useState<Token>(DEFAULT_TO);
  const [fromAmount,    setFromAmount]    = useState("");
  const [slippage,      setSlippage]      = useState("0.5");
  const [showSlippage,  setShowSlippage]  = useState(false);
  const [showTokenFrom, setShowTokenFrom] = useState(false);
  const [showTokenTo,   setShowTokenTo]   = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [showRoute,     setShowRoute]     = useState(false);
  const [txStatus,      setTxStatus]      = useState<TxStatus>("idle");
  const [txHash,        setTxHash]        = useState("");

  const numFrom    = parseFloat(fromAmount) || 0;
  const FROM_PRICE = 2455.12;
  const toAmount   = numFrom > 0 ? (numFrom * FROM_PRICE * 0.9985).toFixed(2) : "";
  const fromUsd    = numFrom > 0
    ? `$${(numFrom * FROM_PRICE).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "$0.00";
  const toUsd = toAmount
    ? `$${parseFloat(toAmount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "$0.00";
  const minReceived = toAmount
    ? `${(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(2)} ${toToken.symbol}`
    : "—";
  const hasRoute = numFrom > 0;

  const handleFlip = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  }, [fromToken, toToken, toAmount]);

  const handleSwap = () => {
    setShowConfirm(false);
    setTxStatus("pending");
    setTimeout(() => {
      const ok = Math.random() > 0.1;
      setTxStatus(ok ? "success" : "failed");
      setTxHash("0x" + Math.random().toString(16).slice(2, 66));
    }, 2200);
  };

  const handlePercent = (pct: number) => {
    const bal = parseFloat((fromToken.balance ?? "0").replace(/,/g, ""));
    setFromAmount((bal * pct / 100).toString());
  };

  return (
    <>
      <div
        style={{
          background: "rgba(6,6,14,0.98)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 0,
          backdropFilter: "blur(60px)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between" style={{ padding: "18px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>Swap</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5  animate-pulse"
                style={{ background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.5)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 500, letterSpacing: "0.06em" }}>LIVE</span>
            </div>
            <button
              onClick={() => setShowSlippage(!showSlippage)}
              style={{
                padding: "4px 8px", borderRadius: 0, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: showSlippage ? "rgba(255,138,0,0.08)" : "transparent",
                border: `1px solid ${showSlippage ? "rgba(255,138,0,0.25)" : "rgba(255,255,255,0.07)"}`,
                color: showSlippage ? "#FF8A00" : "rgba(255,255,255,0.3)",
                letterSpacing: "0.06em",
              }}
            >
              {slippage}% SLIP
            </button>
          </div>
        </div>

        {/* ── Slippage panel ── */}
        <AnimatePresence>
          {showSlippage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>SLIPPAGE TOLERANCE</p>
                <div className="flex gap-1">
                  {["0.1", "0.5", "1.0"].map(s => (
                    <button key={s} onClick={() => setSlippage(s)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 0, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: slippage === s ? "rgba(255,138,0,0.1)" : "transparent",
                      border: `1px solid ${slippage === s ? "rgba(255,138,0,0.3)" : "rgba(255,255,255,0.06)"}`,
                      color: slippage === s ? "#FF8A00" : "rgba(255,255,255,0.3)",
                      letterSpacing: "0.04em",
                    }}>{s}%</button>
                  ))}
                  <input
                    type="text" inputMode="decimal" placeholder="Custom"
                    value={!["0.1","0.5","1.0"].includes(slippage) ? slippage : ""}
                    onChange={e => setSlippage(e.target.value)}
                    className="flex-1 text-center outline-none"
                    style={{ padding: "6px 0", borderRadius: 0, fontSize: 11, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FROM ── */}
        <div style={{ padding: "20px 20px 16px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              You pay
            </span>
            {fromToken.balance && (
              <button
                onClick={() => handlePercent(100)}
                style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontWeight: 500, cursor: "pointer", background: "none", border: "none", letterSpacing: "0.04em" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#FF8A00"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.18)"; }}
              >
                {fromToken.balance} {fromToken.symbol}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={fromAmount}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                setFromAmount(val);
              }}
              placeholder="0"
              className="bg-transparent outline-none text-white placeholder:text-white/10"
              style={{
                fontSize: scaledFs(fromAmount),
                fontWeight: 200,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                transition: "font-size 0.15s ease",
                minWidth: 0,
                width: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            />
            <TokenBtn token={fromToken} onClick={() => setShowTokenFrom(true)} />
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>{fromUsd}</span>
            {connected && (
              <div className="flex gap-1">
                {[25, 50, 75].map(p => (
                  <button key={p} onClick={() => handlePercent(p)} style={{
                    padding: "2px 7px", borderRadius: 0, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em",
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#FF8A00"; el.style.borderColor = "rgba(255,138,0,0.25)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(255,255,255,0.22)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >{p}%</button>
                ))}
                <button onClick={() => handlePercent(100)} style={{
                  padding: "2px 7px", borderRadius: 0, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#FF8A00"; el.style.borderColor = "rgba(255,138,0,0.25)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(255,255,255,0.22)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >MAX</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Divider + flip ── */}
        <div className="relative" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-center" style={{ height: 36 }}>
            <motion.button
              onClick={handleFlip}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 28, height: 28, borderRadius: 0,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.25)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#FF8A00"; el.style.borderColor = "rgba(255,138,0,0.3)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(255,255,255,0.25)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* ── TO ── */}
        <div style={{ padding: "16px 20px 20px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              You receive
            </span>
            {toAmount && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#4ade80", letterSpacing: "0.06em" }}>
                &lt; 0.01% IMPACT
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              style={{
                fontSize: scaledFs(toAmount),
                fontWeight: 200,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                transition: "font-size 0.15s ease",
                color: toAmount ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.06)",
                userSelect: "none",
                minWidth: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {toAmount || "0"}
            </div>
            <TokenBtn token={toToken} onClick={() => setShowTokenTo(true)} />
          </div>

          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>{toUsd}</span>
          </div>
        </div>

        {/* ── Rate summary + Route ── */}
        <AnimatePresence>
          {hasRoute && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {/* Rate row — click to toggle route */}
              <button
                onClick={() => setShowRoute(r => !r)}
                className="w-full text-left"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "8px 20px", cursor: "pointer", background: "none" }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
                    1 {fromToken.symbol} = 2,455.12 {toToken.symbol}
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Fee $1.24</span>
                    <span style={{ fontSize: 10, color: "rgba(255,138,0,0.5)", fontWeight: 600, letterSpacing: "0.04em" }}>&lt;0.01%</span>
                    <div className="flex items-center gap-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
                      <span>ROUTE</span>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showRoute ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </button>

              {/* Collapsible route visualization */}
              <AnimatePresence>
                {showRoute && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div style={{ padding: "8px 20px 12px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
                      {/* Dynamic route path with connector lines */}
                      <div className="flex items-center" style={{ marginBottom: 8, overflowX: "auto" }}>
                        {getRoute(fromToken.symbol, toToken.symbol).flatMap((step, idx, arr) => {
                          let el: React.ReactNode;
                          if (step.type === "router") {
                            el = <span key={`s${idx}`} style={{ flexShrink: 0, padding: "3px 8px", background: "rgba(255,138,0,0.07)", border: "1px solid rgba(255,138,0,0.2)", fontSize: 9, fontWeight: 700, color: "#FF8A00", letterSpacing: "0.06em" }}>EMPX</span>;
                          } else if (step.type === "dex") {
                            el = <span key={`s${idx}`} style={{ flexShrink: 0, padding: "3px 7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{step.name} <span style={{ color: "rgba(255,138,0,0.4)" }}>{step.pool}</span></span>;
                          } else {
                            el = <span key={`s${idx}`} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{step.logo}</span><span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{step.symbol}</span></span>;
                          }
                          if (idx < arr.length - 1) {
                            return [el, <div key={`l${idx}`} style={{ flexShrink: 0, width: 14, height: 1, background: "rgba(255,255,255,0.12)" }} />];
                          }
                          return [el];
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
                          Best of 12 routes · saves ~$0.18
                        </span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
                          Min: {minReceived}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA ── */}
        <div style={{ padding: "0 20px 20px" }}>
          {!connected ? (
            <button
              onClick={onConnectWallet}
              className="w-full transition-opacity duration-200 hover:opacity-85"
              style={{
                background: "#FF8A00",
                color: "#03030a", borderRadius: 0, padding: "14px",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", border: "none",
              }}
            >
              Connect Wallet
            </button>
          ) : !fromAmount || numFrom === 0 ? (
            <button disabled style={{
              width: "100%", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.12)",
              borderRadius: 0, padding: "14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.05)", cursor: "not-allowed",
            }}>
              Enter amount
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full transition-opacity duration-200 hover:opacity-85"
              style={{
                background: "#FF8A00",
                color: "#03030a", borderRadius: 0, padding: "14px",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", border: "none",
              }}
            >
              Swap {fromToken.symbol} → {toToken.symbol}
            </button>
          )}

          <p className="text-center" style={{ fontSize: 9, color: "rgba(255,255,255,0.07)", marginTop: 10, fontWeight: 500, letterSpacing: "0.14em" }}>
            POWERED BY EMPX · 100+ DEXS · ZERO FEES
          </p>
        </div>
      </div>

      <TokenSelectModal open={showTokenFrom} onClose={() => setShowTokenFrom(false)} onSelect={setFromToken} title="You Pay" excludeSymbol={toToken.symbol} />
      <TokenSelectModal open={showTokenTo} onClose={() => setShowTokenTo(false)} onSelect={setToToken} title="You Receive" excludeSymbol={fromToken.symbol} />
      <SwapConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleSwap}
        fromToken={fromToken} toToken={toToken} fromAmount={fromAmount} toAmount={toAmount}
        slippage={slippage} minReceived={minReceived} networkFee="$1.24" priceImpact="< 0.01%"
      />
      <TxStatusModal open={txStatus !== "idle"} status={txStatus} txHash={txHash}
        fromToken={fromToken} toToken={toToken} fromAmount={fromAmount} toAmount={toAmount}
        onClose={() => setTxStatus("idle")}
      />
    </>
  );
}
