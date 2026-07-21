// ─── <FirstTimeTokenWarning> ─────────────────────────────────────────────────
//
// Modal gate shown before the first swap involving an unverified token.
// Industry-standard DeFi safety pattern — proven reduction in scam-token
// loss events.
//
// Behaviour:
//   • Renders only when needed (token trust !== 'verified' AND user
//     hasn't already acknowledged THIS token on THIS chain).
//   • Two-checkbox gating before the confirm button enables:
//       1. "I verified the contract address from an official source"
//       2. "I understand I may lose my funds if this is a scam token"
//   • Acknowledgement persists per-token per-chain in localStorage
//     (lib/safety/acknowledgedTokens).
//   • Caller passes onContinue (fired only on explicit confirm) and
//     onCancel.
//
// Usage in the swap flow:
//
//   const trust = evaluateTokenTrust({ tokenAddress, featuredTokens, tokenList });
//   const acked = isTokenAcknowledged(chainId, tokenAddress);
//   const needsWarning = needsTokenWarning(trust) && !acked;
//
//   if (needsWarning) {
//     setShowWarning(true);
//     return; // intercept swap until ack'd
//   }
//
//   <FirstTimeTokenWarning
//     open={showWarning}
//     onOpenChange={setShowWarning}
//     token={selectedTokenB}
//     chainId={chainId}
//     trust={trust}
//     onContinue={() => {
//       acknowledgeToken(chainId, tokenAddress);
//       setShowWarning(false);
//       proceedWithSwap();
//     }}
//   />

import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import EmpxModal from "./EmpxModal";
import { trustLabel, trustExplainer } from "../lib/safety/tokenTrust";
import { acknowledgeToken } from "../lib/safety/acknowledgedTokens";
import { truncateAddress } from "../lib/format/address";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {Object} props.token              - { address, symbol, ticker, name }
 * @param {number|string} props.chainId
 * @param {'verified'|'listed'|'custom'|'unknown'} props.trust
 * @param {() => void} props.onContinue     - fired ONLY on explicit confirm
 * @param {string} [props.blockExplorer]    - URL prefix for the "view on explorer" link
 */
export default function FirstTimeTokenWarning({
  open,
  onOpenChange,
  token,
  chainId,
  trust,
  onContinue,
  blockExplorer,
}) {
  const [ackVerified, setAckVerified] = useState(false);
  const [ackRisk, setAckRisk] = useState(false);

  // Reset checkboxes whenever the modal reopens for a new token.
  useEffect(() => {
    if (open) {
      setAckVerified(false);
      setAckRisk(false);
    }
  }, [open, token?.address]);

  if (!token) return null;

  const symbol = token.symbol || token.ticker || "TOKEN";
  const name = token.name || symbol;
  const addr = token.address || "";
  const canContinue = ackVerified && ackRisk;
  const explorerUrl = blockExplorer && addr
    ? `${blockExplorer.replace(/\/+$/, "")}/token/${addr}`
    : null;

  const handleContinue = () => {
    if (!canContinue) return;
    if (chainId && addr) acknowledgeToken(chainId, addr);
    onOpenChange?.(false);
    onContinue?.();
  };

  return (
    <EmpxModal
      open={open}
      onOpenChange={onOpenChange}
      title="Verify this token"
      icon={<AlertTriangle className="w-6 h-6 text-[#FF8A00]" aria-hidden="true" />}
      maxWidth="480"
    >
      <div className="px-2 pt-2 pb-4 space-y-4">
        {/* Token identity card */}
        <div className="border border-[#FF8A00]/40 bg-[#FF8A00]/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-white uppercase">
              {symbol}
            </div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#FF8A00] font-bold">
              {trustLabel(trust)}
            </div>
          </div>
          {name !== symbol && (
            <div className="text-xs text-white/70">{name}</div>
          )}
          {addr && (
            <div className="flex items-center justify-between gap-2 text-[11px] text-white/60 font-mono">
              <span title={addr}>{truncateAddress(addr, { start: 8, end: 6 })}</span>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#FF8A00] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] focus-visible:outline-offset-2"
                >
                  <span>View</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Why this matters */}
        <p className="text-xs text-white/70 leading-relaxed">
          {trustExplainer(trust)}
        </p>

        {/* Acknowledgements */}
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ackVerified}
              onChange={(e) => setAckVerified(e.target.checked)}
              className="mt-0.5 accent-[#FF8A00] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] focus-visible:outline-offset-2"
              data-testid="ack-verified"
            />
            <span className="text-[11px] text-white/80 leading-relaxed select-none">
              I verified the contract address from an official source.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ackRisk}
              onChange={(e) => setAckRisk(e.target.checked)}
              className="mt-0.5 accent-[#FF8A00] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] focus-visible:outline-offset-2"
              data-testid="ack-risk"
            />
            <span className="text-[11px] text-white/80 leading-relaxed select-none">
              I understand I may lose my funds if this is a scam token.
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] border border-white/20 text-white/70 hover:text-white hover:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] focus-visible:outline-offset-2 cursor-pointer transition-colors"
            data-testid="warning-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 transition-opacity ${
              canContinue
                ? "bg-[#FF8A00] text-black hover:opacity-80 cursor-pointer"
                : "bg-[#FF8A00]/30 text-black/50 cursor-not-allowed"
            }`}
            data-testid="warning-continue"
          >
            Continue
          </button>
        </div>
      </div>
    </EmpxModal>
  );
}
