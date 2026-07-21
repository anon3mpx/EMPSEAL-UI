
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Token {
  symbol: string;
  name: string;
  chain: string;
  chainColor: string;
  balance?: string;
  value?: string;
  price?: string;
  change24h?: number;
  logo: string;
}

const POPULAR_TOKENS: Token[] = [
  { symbol: "ETH",  name: "Ethereum",       chain: "Ethereum",   chainColor: "#FF8A00", balance: "1.842",   value: "$4,521.30", price: "$2,455.12", change24h:  1.2,  logo: "Ξ" },
  { symbol: "USDC", name: "USD Coin",        chain: "Base",       chainColor: "#FF8A00", balance: "2,400",   value: "$2,400.00", price: "$1.00",     change24h:  0.01, logo: "$" },
  { symbol: "USDT", name: "Tether USD",      chain: "Ethereum",   chainColor: "#26A17B", balance: "1,200",   value: "$1,200.00", price: "$1.00",     change24h: -0.01, logo: "₮" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", chain: "Ethereum",   chainColor: "#F7931A", balance: "0.024",   value: "$1,620.80", price: "$67,533",   change24h:  2.8,  logo: "₿" },
  { symbol: "PLS",  name: "PulseChain",      chain: "PulseChain", chainColor: "#FF8A00", balance: "180,000", value: "$540.00",   price: "$0.003",    change24h:  5.1,  logo: "P" },
  { symbol: "DAI",  name: "Dai Stablecoin",  chain: "Ethereum",   chainColor: "#F5AC37", balance: "800",     value: "$800.00",   price: "$1.00",     change24h:  0.0,  logo: "◈" },
  { symbol: "MATIC",name: "Polygon",         chain: "Polygon",    chainColor: "#F5AC37", balance: "420",     value: "$294.00",   price: "$0.70",     change24h: -1.4,  logo: "M" },
  { symbol: "ARB",  name: "Arbitrum",        chain: "Arbitrum",   chainColor: "#FF8A00", balance: "250",     value: "$175.00",   price: "$0.70",     change24h:  3.2,  logo: "A" },
];

const QUICK_TOKENS = ["ETH", "USDC", "USDT", "WBTC", "PLS", "DAI", "ARB", "MATIC"];

interface TokenSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  title: string;
  excludeSymbol?: string;
}

export default function TokenSelectModal({ open, onClose, onSelect, title, excludeSymbol }: TokenSelectModalProps) {
  const [search, setSearch] = useState("");

  const filtered = POPULAR_TOKENS.filter(
    t => t.symbol !== excludeSymbol &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
       t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (token: Token) => { onSelect(token); onClose(); setSearch(""); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[101] bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full"
            style={{ maxWidth: 420 }}
          >
            <div
              className="flex flex-col"
              style={{
                background: "rgba(6,6,14,0.99)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 0,
                maxHeight: "85vh",
                backdropFilter: "blur(60px)",
                boxShadow: "0 -8px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between shrink-0" style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</h3>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.04em" }}>Select a token</p>
                </div>
                <button
                  onClick={onClose}
                  style={{ width: 28, height: 28, borderRadius: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Search */}
              <div className="shrink-0" style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="relative">
                  <svg className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, color: "rgba(255,255,255,0.18)" }}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text" placeholder="Search token or paste address..."
                    value={search} onChange={e => setSearch(e.target.value)} autoFocus
                    className="w-full text-white placeholder:text-white/20 outline-none transition-all"
                    style={{
                      fontSize: 12, fontWeight: 400, borderRadius: 0,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "10px 14px 10px 34px",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(255,138,0,0.3)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  />
                </div>
              </div>

              {/* Quick-select — 8 tokens, flex-wrap so they never overflow */}
              {!search && (
                <div className="flex flex-wrap gap-1.5 shrink-0" style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {QUICK_TOKENS.filter(s => s !== excludeSymbol).map(sym => {
                    const t = POPULAR_TOKENS.find(tk => tk.symbol === sym);
                    if (!t) return null;
                    return (
                      <button key={sym} onClick={() => handleSelect(t)}
                        className="flex items-center gap-1.5 transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 0, padding: "5px 10px 5px 6px", cursor: "pointer", flexShrink: 0 }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,138,0,0.06)"; el.style.borderColor = "rgba(255,138,0,0.2)"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", borderRadius: 0 }}>
                          {t.logo}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>{t.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Column headers */}
              <div className="grid shrink-0" style={{ gridTemplateColumns: "1fr auto auto", gap: "0 16px", padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)" }}>TOKEN</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", textAlign: "right" }}>BALANCE</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", textAlign: "right", width: 64 }}>VALUE</span>
              </div>

              {/* Token list */}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <p className="text-center py-12" style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>No tokens found</p>
                ) : filtered.map(token => (
                  <button key={`${token.symbol}-${token.chain}`} onClick={() => handleSelect(token)}
                    className="w-full grid items-center transition-all duration-100"
                    style={{ gridTemplateColumns: "1fr auto auto", gap: "0 16px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 flex items-center justify-center font-bold"
                          style={{ fontSize: 14, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", borderRadius: 0 }}>
                          {token.logo}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 flex items-center justify-center text-white"
                          style={{ fontSize: 6, fontWeight: 700, background: "rgba(255,138,0,0.65)", borderRadius: 0, border: "1px solid rgba(6,6,14,1)" }}>
                          {token.chain[0]}
                        </div>
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: 1.2 }}>{token.symbol}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.02em" }}>{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{token.balance ?? "—"}</p>
                      {token.change24h !== undefined && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: token.change24h >= 0 ? "#4ade80" : "#f87171" }}>
                          {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%
                        </p>
                      )}
                    </div>
                    <div style={{ width: 64, textAlign: "right" }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>{token.value ?? "—"}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cancel */}
              <div className="shrink-0" style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button onClick={onClose} className="w-full transition-opacity hover:opacity-60"
                  style={{ padding: "11px", borderRadius: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
