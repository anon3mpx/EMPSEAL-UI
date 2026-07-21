
import { motion, AnimatePresence } from "framer-motion";
import { Token } from "./TokenSelectModal";

interface TxStatusModalProps {
  open: boolean;
  status: "idle" | "pending" | "success" | "failed";
  txHash: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  onClose: () => void;
}

export default function TxStatusModal({ open, status, txHash, fromToken, toToken, fromAmount, toAmount, onClose }: TxStatusModalProps) {
  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isFailed  = status === "failed";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={isFailed || isSuccess ? onClose : undefined}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
            style={{ maxWidth: 340 }}
          >
            <div className="mx-4 text-center" style={{
              background: "rgba(6,6,14,0.99)",
              border: `1px solid ${isSuccess ? "rgba(74,222,128,0.15)" : isFailed ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 0,
              backdropFilter: "blur(60px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            }}>
              <div style={{ padding: "36px 24px 28px" }}>
                {/* Icon */}
                <div className="flex justify-center" style={{ marginBottom: 20 }}>
                  {isPending && (
                    <div className="relative" style={{ width: 56, height: 56 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full"
                        style={{ border: "2px solid rgba(255,138,0,0.1)", borderTopColor: "#FF8A00", borderRadius: 0 }}
                      />
                      <div className="absolute inset-3 flex items-center justify-center" style={{ color: "#FF8A00" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  {isSuccess && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-14 h-14 flex items-center justify-center"
                      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                    </motion.div>
                  )}
                  {isFailed && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-14 h-14 flex items-center justify-center"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </motion.div>
                  )}
                </div>

                {/* Status text */}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: isSuccess ? "#4ade80" : isFailed ? "#f87171" : "white", marginBottom: 8, letterSpacing: "-0.01em" }}>
                  {isPending && "Swapping..."}
                  {isSuccess && "Swap Complete"}
                  {isFailed && "Swap Failed"}
                </h3>

                {/* Summary */}
                <div className="flex items-center justify-center gap-2" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 200, color: "white", letterSpacing: "-0.03em" }}>{fromAmount} {fromToken.symbol}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>→</span>
                  <span style={{ fontSize: 16, fontWeight: 200, color: "#FF8A00", letterSpacing: "-0.03em" }}>{toAmount} {toToken.symbol}</span>
                </div>

                {isPending && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
                    Waiting for confirmation...<br/>This may take a few seconds.
                  </p>
                )}

                {txHash && !isPending && (
                  <div className="flex items-center justify-center gap-2" style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 0, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
                      {txHash.slice(0, 14)}...{txHash.slice(-6)}
                    </span>
                    <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 9, fontWeight: 700, color: "#FF8A00", letterSpacing: "0.06em" }}>
                      VIEW
                    </a>
                  </div>
                )}

                {(isSuccess || isFailed) && (
                  <button onClick={onClose}
                    className="w-full transition-opacity hover:opacity-85"
                    style={{
                      padding: "13px", borderRadius: 0, fontSize: 12, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      background: isSuccess ? "#FF8A00" : "rgba(255,255,255,0.05)",
                      color: isSuccess ? "#03030a" : "rgba(255,255,255,0.4)",
                      border: isSuccess ? "none" : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}>
                    {isSuccess ? "Done" : "Close"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
