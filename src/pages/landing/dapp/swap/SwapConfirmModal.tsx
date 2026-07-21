
import { motion, AnimatePresence } from "framer-motion";
import { Token } from "./TokenSelectModal";

interface SwapConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  slippage: string;
  minReceived: string;
  networkFee: string;
  priceImpact: string;
}

export default function SwapConfirmModal({
  open, onClose, onConfirm,
  fromToken, toToken, fromAmount, toAmount,
  slippage, minReceived, networkFee, priceImpact,
}: SwapConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
            style={{ maxWidth: 380 }}
          >
            <div className="mx-4" style={{
              background: "rgba(6,6,14,0.99)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 0,
              backdropFilter: "blur(60px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            }}>
              {/* Header */}
              <div className="flex items-center justify-between" style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>Review Swap</h3>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.04em" }}>Confirm details below</p>
                </div>
                <button onClick={onClose}
                  style={{ width: 28, height: 28, borderRadius: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* From */}
              <div style={{ padding: "16px 20px 10px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: 10, textTransform: "uppercase" }}>You pay</p>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontSize: "clamp(1.8rem,8vw,2.4rem)", fontWeight: 200, color: "white", letterSpacing: "-0.04em" }}>{fromAmount}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-sm"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)", borderRadius: 0 }}>
                      {fromToken.logo}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: 1 }}>{fromToken.symbol}</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", lineHeight: 1, marginTop: 2, letterSpacing: "0.04em" }}>{fromToken.chain}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center" style={{ padding: "6px 20px" }}>
                <div className="w-6 h-6 flex items-center justify-center"
                  style={{ background: "rgba(255,138,0,0.08)", border: "1px solid rgba(255,138,0,0.15)", color: "#FF8A00", borderRadius: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                </div>
              </div>

              {/* To */}
              <div style={{ padding: "0 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: 10, textTransform: "uppercase" }}>You receive</p>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontSize: "clamp(1.8rem,8vw,2.4rem)", fontWeight: 200, color: "#FF8A00", letterSpacing: "-0.04em" }}>{toAmount}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-sm"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)", borderRadius: 0 }}>
                      {toToken.logo}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: 1 }}>{toToken.symbol}</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", lineHeight: 1, marginTop: 2, letterSpacing: "0.04em" }}>{toToken.chain}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: "12px 20px" }}>
                {[
                  { label: "Rate",          value: `1 ${fromToken.symbol} = 2,455.12 ${toToken.symbol}` },
                  { label: "Price Impact",  value: priceImpact },
                  { label: "Min. Received", value: minReceived },
                  { label: "Slippage",      value: `${slippage}%` },
                  { label: "Network Fee",   value: networkFee },
                  { label: "EMPX Fee",      value: "0.05%" },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className="flex justify-between items-center"
                    style={{ padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.02em" }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: "0 20px 20px" }}>
                <button onClick={onConfirm}
                  className="w-full transition-opacity duration-200 hover:opacity-85"
                  style={{
                    background: "#FF8A00", color: "#03030a", borderRadius: 0,
                    padding: "14px", fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", border: "none",
                  }}>
                  Confirm Swap
                </button>
                <p className="text-center" style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 8, letterSpacing: "0.04em" }}>
                  Output is estimated. Slippage {slippage}%
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
