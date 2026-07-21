
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useLocation } from "wouter";

const NAV_ITEMS = [
  { label: "Portfolio", href: "/dapp/portfolio" },
  { label: "Swap",      href: "/dapp/swap" },
  { label: "Cross",     href: "/dapp/cross" },
  { label: "Bridge",    href: "/dapp/bridge" },
  { label: "Limit",     href: "/dapp/orders" },
  { label: "Widget",    href: "/dapp/widget" },
  { label: "Gas",       href: "/dapp/gas" },
];

const NETWORKS = [
  { id: "eth",   name: "Ethereum",   short: "ETH",  color: "#FF8A00" },
  { id: "base",  name: "Base",       short: "BASE", color: "#FF8A00" },
  { id: "pulse", name: "PulseChain", short: "PLS",  color: "#FF8A00" },
  { id: "bsc",   name: "BSC",        short: "BSC",  color: "#F3BA2F" },
  { id: "arb",   name: "Arbitrum",   short: "ARB",  color: "#FF8A00" },
];

interface DappNavProps {
  onConnectWallet: () => void;
  connected: boolean;
  address?: string;
  balance?: string;
}

export default function DappNav({ onConnectWallet, connected, address, balance }: DappNavProps) {
  const [pathname] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSlippage, setSettingsSlippage] = useState("0.5");
  const [settingsDeadline, setSettingsDeadline] = useState("20");
  const [settingsExpert, setSettingsExpert] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <>
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: 52,
        padding: "0 20px",
        background: "rgba(3,3,10,0.95)",
        backdropFilter: "blur(40px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <Link href="/dapp/portfolio" className="flex items-center shrink-0 mr-8">
        <div className="relative" style={{ width: 90, height: 30 }}>
          <img src="/emp-logo-white.png" alt="EMPX" className="object-contain object-left" style={{ width: 90, height: 'auto' }} />
        </div>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-0 flex-1">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative transition-all duration-150"
              style={{
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? "#FF8A00" : "rgba(255,255,255,0.3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                borderBottom: active ? "2px solid #FF8A00" : "2px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Network */}
        <div className="relative">
          <button
            onClick={() => setNetworkOpen(!networkOpen)}
            className="flex items-center gap-2 transition-all"
            style={{
              padding: "5px 10px", borderRadius: 0, fontSize: 10, fontWeight: 700,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", cursor: "pointer",
            }}
          >
            <span className="w-1.5 h-1.5" style={{ background: selectedNetwork.color, borderRadius: 0 }} />
            {selectedNetwork.short}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ color: "rgba(255,255,255,0.2)" }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          {networkOpen && (
            <div
              className="absolute top-full mt-1 right-0 overflow-hidden py-0"
              style={{
                minWidth: 140, background: "rgba(6,6,14,0.99)", backdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", borderRadius: 0,
              }}
            >
              {NETWORKS.map(n => (
                <button key={n.id} onClick={() => { setSelectedNetwork(n); setNetworkOpen(false); }}
                  className="w-full flex items-center gap-2 text-left transition-colors"
                  style={{ padding: "9px 14px", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: selectedNetwork.id === n.id ? "#FF8A00" : "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,138,0,0.05)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="w-1.5 h-1.5" style={{ background: n.color, borderRadius: 0 }} />
                  {n.name}
                  {selectedNetwork.id === n.id && <span className="ml-auto" style={{ color: "#FF8A00" }}>&#10003;</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="relative">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center transition-all"
          style={{
            width: 32, height: 32, borderRadius: 0,
            background: settingsOpen ? "rgba(255,138,0,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${settingsOpen ? "rgba(255,138,0,0.25)" : "rgba(255,255,255,0.06)"}`,
            color: settingsOpen ? "#FF8A00" : "rgba(255,255,255,0.3)", cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* Settings modal */}
        {settingsOpen && (
          <>
            <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 201,
              minWidth: 280, background: "rgba(6,6,14,0.99)", backdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", borderRadius: 0,
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "white", letterSpacing: "0.1em" }}>SETTINGS</span>
                <button onClick={() => setSettingsOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ padding: "16px" }}>
                {/* Slippage */}
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>DEFAULT SLIPPAGE</p>
                <div className="flex gap-1" style={{ marginBottom: 16 }}>
                  {["0.1","0.5","1.0"].map(s => (
                    <button key={s} onClick={() => setSettingsSlippage(s)} style={{
                      flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 600, cursor: "pointer", borderRadius: 0,
                      background: settingsSlippage === s ? "rgba(255,138,0,0.1)" : "transparent",
                      border: `1px solid ${settingsSlippage === s ? "rgba(255,138,0,0.3)" : "rgba(255,255,255,0.06)"}`,
                      color: settingsSlippage === s ? "#FF8A00" : "rgba(255,255,255,0.3)",
                    }}>{s}%</button>
                  ))}
                  <input type="text" placeholder="Custom"
                    value={!["0.1","0.5","1.0"].includes(settingsSlippage) ? settingsSlippage : ""}
                    onChange={e => setSettingsSlippage(e.target.value.replace(/[^0-9.]/g,""))}
                    className="flex-1 text-center outline-none"
                    style={{ padding: "6px 4px", borderRadius: 0, fontSize: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  />
                </div>
                {/* Deadline */}
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>TX DEADLINE (MINUTES)</p>
                <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                  <input type="text" value={settingsDeadline}
                    onChange={e => setSettingsDeadline(e.target.value.replace(/[^0-9]/g,""))}
                    className="outline-none bg-transparent text-white"
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 0, fontSize: 12, border: "1px solid rgba(255,255,255,0.07)" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(255,138,0,0.3)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>min</span>
                </div>
                {/* Expert mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Expert Mode</p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", marginTop: 2 }}>Skip confirm dialogs</p>
                  </div>
                  <button onClick={() => setSettingsExpert(!settingsExpert)} style={{
                    width: 36, height: 20, borderRadius: 0, cursor: "pointer", border: "none", position: "relative",
                    background: settingsExpert ? "#FF8A00" : "rgba(255,255,255,0.08)", transition: "background 0.2s",
                  }}>
                    <div style={{ width: 14, height: 14, background: "white", borderRadius: 0, position: "absolute", top: 3, left: settingsExpert ? 19 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(o => !o)}
          className="md:hidden flex flex-col justify-center gap-1.5 ml-1"
          style={{ width: 32, height: 32, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 0, cursor: "pointer", alignItems: "center", padding: "0 8px" }}>
          <span style={{ display: "block", width: 16, height: 1.5, background: menuOpen ? "#FF8A00" : "rgba(255,255,255,0.6)", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translateY(5px)" : "none" }} />
          <span style={{ display: "block", width: 16, height: 1.5, background: "rgba(255,255,255,0.4)", transition: "opacity 0.2s", opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: 16, height: 1.5, background: menuOpen ? "#FF8A00" : "rgba(255,255,255,0.6)", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translateY(-5px)" : "none" }} />
        </button>

        {/* Wallet */}
        {connected ? (
          <button
            className="flex items-center gap-2 transition-all"
            style={{
              padding: "5px 12px", borderRadius: 0, fontSize: 11, fontWeight: 700,
              background: "rgba(255,138,0,0.08)", border: "1px solid rgba(255,138,0,0.2)", color: "#FF8A00",
            }}
          >
            <span className="w-1.5 h-1.5 animate-pulse" style={{ background: "#FF8A00", borderRadius: 0 }} />
            <span style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: 10 }}>{shortAddr}</span>
            {balance && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#FF8A00" }}>{balance}</span>
            )}
          </button>
        ) : (
          <button
            onClick={onConnectWallet}
            className="transition-opacity duration-200 hover:opacity-85"
            style={{
              padding: "7px 16px", borderRadius: 0, fontSize: 11, fontWeight: 700,
              background: "#FF8A00", color: "#03030a", letterSpacing: "0.06em",
              textTransform: "uppercase", cursor: "pointer", border: "none",
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>

    {/* Mobile slide-down menu */}
    <AnimatePresence>
      {menuOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
          className="fixed md:hidden z-40"
          style={{ top: 52, left: 0, right: 0, background: "rgba(3,3,10,0.98)", backdropFilter: "blur(40px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ padding: "8px 20px 16px" }}>
            {NAV_ITEMS.map((item, i) => {
              const active = pathname === item.href;
              return (
                <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                  style={{ display: "block", padding: "11px 0", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#FF8A00" : "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: i < NAV_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  {item.label}
                </Link>
              );
            })}
            {!connected ? (
              <button onClick={() => { onConnectWallet(); setMenuOpen(false); }}
                style={{ width: "100%", marginTop: 14, padding: "12px", background: "#FF8A00", color: "#03030a", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", borderRadius: 0 }}>
                Connect Wallet
              </button>
            ) : (
              <div style={{ marginTop: 12, padding: "10px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="w-1.5 h-1.5 animate-pulse" style={{ background: "#FF8A00", borderRadius: 0 }} />
                <span style={{ fontSize: 10, color: "#FF8A00", fontFamily: "monospace" }}>{shortAddr}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
