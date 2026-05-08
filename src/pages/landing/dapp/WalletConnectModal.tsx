
import { motion, AnimatePresence } from "framer-motion";

const WALLETS = [
  { id: "metamask",      name: "MetaMask",        desc: "Browser extension",  color: "#E8831D", letter: "M", popular: true  },
  { id: "walletconnect", name: "WalletConnect",    desc: "Scan with mobile",   color: "#FF8A00", letter: "W", popular: true  },
  { id: "coinbase",      name: "Coinbase Wallet",  desc: "Mobile & browser",   color: "#FF8A00", letter: "C", popular: false },
  { id: "trust",         name: "Trust Wallet",     desc: "Multi-chain mobile", color: "#FF8A00", letter: "T", popular: false },
  { id: "rabby",         name: "Rabby Wallet",     desc: "Multi-chain browser",color: "#FF8A00", letter: "R", popular: false },
  { id: "phantom",       name: "Phantom",          desc: "Solana & EVM",       color: "#AB9FF2", letter: "P", popular: false },
];

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (wallet: string, address: string) => void;
}

export default function WalletConnectModal({ open, onClose, onConnect }: WalletConnectModalProps) {
  const handleSelect = (walletId: string) => {
    const addr = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    onConnect(walletId, addr);
    onClose();
  };

  const popular = WALLETS.filter(w => w.popular);
  const others  = WALLETS.filter(w => !w.popular);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-100"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(16px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-101 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
            style={{ maxWidth: 380 }}
          >
            <div className="mx-4" style={{
              background: "rgba(6,6,14,0.99)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 0,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              backdropFilter: "blur(60px)",
            }}>
              {/* Header */}
              <div className="flex items-center justify-between" style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Connect Wallet
                  </h2>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.04em" }}>
                    Choose your preferred wallet
                  </p>
                </div>
                <button onClick={onClose}
                  style={{ width: 28, height: 28, borderRadius: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Popular wallets — 2-col grid */}
              <div style={{ padding: "16px 20px 12px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,138,0,0.4)", marginBottom: 10 }}>POPULAR</p>
                <div className="grid grid-cols-2 gap-2">
                  {popular.map(w => (
                    <button key={w.id} onClick={() => handleSelect(w.id)}
                      className="flex flex-col items-center transition-all duration-150"
                      style={{ padding: "18px 12px", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 0, cursor: "pointer" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,138,0,0.05)"; el.style.borderColor = "rgba(255,138,0,0.2)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.03)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                      <div style={{ width: 40, height: 40, background: `${w.color}18`, border: `1px solid ${w.color}30`, borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: w.color }}>
                        {w.letter}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "white", lineHeight: 1.2 }}>{w.name}</p>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2, letterSpacing: "0.02em" }}>{w.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Other wallets — compact list */}
              <div style={{ padding: "0 20px 16px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.18)", marginBottom: 8 }}>MORE OPTIONS</p>
                <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 0 }}>
                  {others.map((w, i) => (
                    <button key={w.id} onClick={() => handleSelect(w.id)}
                      className="w-full flex items-center gap-3 text-left transition-all duration-100"
                      style={{ padding: "11px 14px", background: "none", border: "none", borderBottom: i < others.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}>
                      <div style={{ width: 32, height: 32, background: `${w.color}14`, border: `1px solid ${w.color}25`, borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: w.color, flexShrink: 0 }}>
                        {w.letter}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{w.name}</p>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.02em" }}>{w.desc}</p>
                      </div>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 20px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 10, textAlign: "center", color: "rgba(255,255,255,0.18)", lineHeight: 1.6 }}>
                  By connecting, you agree to EMPX{" "}
                  <span style={{ color: "rgba(255,138,0,0.5)", cursor: "pointer", textDecoration: "underline" }}>Terms of Service</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
