// ─── <DestinationAddressInput> ───────────────────────────────────────────────
//
// Shared input field for entering a non-EVM (or EVM) destination address.
// Per-chain placeholder, format hint, real-time validation badge, and the
// load-bearing "looks like X, you selected Y" wrong-chain warning.
//
// Lives in src/components/ (alongside the rest of the shared UI primitives).
// Backed by validators from src/lib/wallet/ — see Tier 1-2 of the
// cross-chain-wallet roadmap.
//
// Usage:
//
//   const [dst, setDst] = useState("");
//   const [valid, setValid] = useState(false);
//
//   <DestinationAddressInput
//     chainKind="bitcoin"
//     chainLabel="Bitcoin"           // optional pretty name for UI text
//     value={dst}
//     onChange={setDst}
//     onValidate={(result) => setValid(result.valid)}
//     blockExplorer="https://blockstream.info"  // optional — shows "view on explorer" link when valid
//   />
//
// Then:
//   <button disabled={!valid}>Submit</button>
//
// The component handles its own validation internally; the onValidate
// callback fires after every change so the parent can gate submit.

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, ExternalLink, Wallet } from "lucide-react";
import { validateForKind, validatorFor } from "../lib/wallet/validators";
import { hasAdaptersFor, loadAdaptersFor } from "../lib/wallet/adapters";

const KIND_LABEL = {
  evm: "EVM",
  bitcoin: "Bitcoin",
  doge: "Dogecoin",
  ltc: "Litecoin",
  bch: "Bitcoin Cash",
  solana: "Solana",
  tron: "Tron",
  cosmos: "Cosmos",
  ada: "Cardano",
  xrp: "XRP Ledger",
  ton: "TON",
  xmr: "Monero",
  aptos: "Aptos",
  sui: "Sui",
  near: "NEAR Protocol",
};

/**
 * @param {Object} props
 * @param {import("../lib/wallet/types").ChainKind} props.chainKind
 *   The destination chain's address-format family.  Drives validator,
 *   placeholder, format hint.
 * @param {string} [props.chainLabel]
 *   Pretty name for UI ("Bitcoin", "Solana", etc.).  Defaults to KIND_LABEL[chainKind].
 * @param {string} props.value
 *   Controlled input value.
 * @param {(value: string) => void} props.onChange
 *   Fires on every keystroke.  Receives raw input (no trim).
 * @param {(result: import("../lib/wallet/types").ValidationResult) => void} [props.onValidate]
 *   Fires after every validation run.  Parent uses this to gate submit
 *   button.  Receives the full ValidationResult (including looksLikeKind).
 * @param {string} [props.blockExplorer]
 *   Base URL for the chain's block explorer (e.g. "https://blockstream.info").
 *   When provided + address is valid, shows a "view" link next to the badge.
 * @param {string} [props.label]
 *   Override the default "Destination address" label.
 * @param {boolean} [props.required]
 *   Marks the input as required for screen readers / form validation.
 * @param {string} [props.id]
 *   HTML id for the input (defaults to "destination-address-input").
 */
export default function DestinationAddressInput({
  chainKind,
  chainLabel,
  value,
  onChange,
  onValidate,
  blockExplorer,
  label = "Destination address",
  required = false,
  id = "destination-address-input",
}) {
  const [result, setResult] = useState({ valid: false });
  const [touched, setTouched] = useState(false);
  // Wallet-adapter connection state.  When connecting=true the button shows
  // a spinner; adapterError surfaces failures inline so the user knows
  // whether they need to install the wallet, retry, or paste manually.
  const [connecting, setConnecting] = useState(false);
  const [adapterError, setAdapterError] = useState(null);

  // Resolve the validator + its display strings.
  const validator = validatorFor(chainKind);
  const placeholder = validator?.placeholder() || "";
  const formatHint = validator?.formatHint() || `Format check pending for ${chainKind}`;
  // Adapter availability comes from the registry (not the validator).  The
  // validator's isAdapterAvailable() method is inert in v1 — the registry
  // is the single source of truth for which kinds have working adapters.
  const adapterAvailable = hasAdaptersFor(chainKind);
  const prettyName = chainLabel || KIND_LABEL[chainKind] || chainKind;

  // Re-validate whenever value or chainKind changes.
  useEffect(() => {
    if (!value || !value.trim()) {
      const empty = { valid: false };
      setResult(empty);
      onValidate?.(empty);
      return;
    }
    const r = validateForKind(chainKind, value);
    setResult(r);
    onValidate?.(r);
  }, [value, chainKind, onValidate]);

  // Show errors only AFTER first user interaction — avoids hostile red
  // border on a freshly-rendered empty field.
  const showError = touched && value.trim().length > 0 && !result.valid;
  const showSuccess = touched && result.valid;

  // Build explorer URL.  Different chains use different path conventions;
  // we offer the host + caller can override with their own explorer link.
  const explorerUrl =
    blockExplorer && result.valid && value
      ? `${blockExplorer.replace(/\/$/, "")}/address/${encodeURIComponent(value.trim())}`
      : null;

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1.5" data-testid="destination-address-input">
      {/* Label + adapter button row */}
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[11px] font-medium uppercase tracking-[0.04em] text-white/70"
        >
          {label}
          {required && (
            <span className="text-[#FF8A00] ml-1" aria-hidden="true">
              *
            </span>
          )}
          <span className="ml-2 text-white/40 normal-case tracking-normal">
            ({prettyName})
          </span>
        </label>

        {adapterAvailable && (
          <button
            type="button"
            disabled={connecting}
            onClick={async () => {
              setAdapterError(null);
              setConnecting(true);
              try {
                const adapters = await loadAdaptersFor(chainKind);
                // v1 strategy: connect the first INSTALLED adapter; if none
                // installed, surface a clear install link for the first
                // adapter (typically the most popular wallet for the kind).
                const installed = adapters.find((a) => a.isInstalled());
                if (!installed) {
                  const first = adapters[0];
                  setAdapterError({
                    kind: "NOT_INSTALLED",
                    brand: first?.brand,
                    installUrl: first?.installUrl,
                  });
                  return;
                }
                const result = await installed.connect();
                // Populate input + mark touched so validation badge shows.
                onChange(result.address);
                setTouched(true);
              } catch (err) {
                // USER_REJECTED is silent (user cancelled — no need to
                // shout about it).  Other errors surface inline.
                if (err?.code !== "USER_REJECTED") {
                  setAdapterError({
                    kind: "ERROR",
                    message: err?.message || String(err),
                  });
                }
              } finally {
                setConnecting(false);
              }
            }}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.04em] text-[#FF8A00] hover:text-white px-2 py-1 border border-[#FF8A00]/40 hover:border-[#FF8A00] transition-colors disabled:opacity-50 disabled:cursor-wait"
            data-testid="destination-address-adapter-button"
          >
            <Wallet className="w-3 h-3" aria-hidden="true" />
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>

      {/* Input + validation badge */}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          aria-invalid={showError}
          aria-required={required}
          aria-describedby={`${hintId}${showError ? ` ${errorId}` : ""}`}
          className={[
            "w-full bg_swap_box px-3 py-2.5 pr-10 text-sm text-white",
            "placeholder:text-white/30 placeholder:text-[12px]",
            "focus:outline-none focus:border-[#FF8A00]",
            "transition-colors",
            showError ? "border border-red-500/60" : "",
            showSuccess ? "border border-green-500/60" : "",
            !showError && !showSuccess ? "border border-white/15" : "",
          ].join(" ")}
          data-testid="destination-address-input-field"
        />

        {/* Validation badge — right-aligned inside input */}
        {value.trim().length > 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {result.valid ? (
              <CheckCircle2
                className="w-4 h-4 text-green-500"
                aria-label="Valid address"
                data-testid="destination-address-valid-icon"
              />
            ) : (
              <AlertTriangle
                className="w-4 h-4 text-red-400"
                aria-label="Invalid address"
                data-testid="destination-address-invalid-icon"
              />
            )}
          </div>
        )}
      </div>

      {/* Format hint */}
      <div
        id={hintId}
        className="flex items-center gap-1.5 text-[10px] text-white/40"
        data-testid="destination-address-hint"
      >
        <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span>{formatHint}</span>
      </div>

      {/* Error / warning area */}
      {showError && (
        <div
          id={errorId}
          role="alert"
          className="text-[11px] text-red-400 leading-snug"
          data-testid="destination-address-error"
        >
          {result.reason || "Invalid address"}
        </div>
      )}

      {/* Wrong-chain hint — load-bearing safety feature */}
      {showError && result.looksLikeKind && result.looksLikeKind !== chainKind && (
        <div
          role="alert"
          className="flex items-start gap-1.5 text-[11px] text-[#FF8A00] bg-[#FF8A00]/10 border border-[#FF8A00]/30 px-2 py-1.5 leading-snug"
          data-testid="destination-address-wrong-chain"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            This looks like a{" "}
            <strong className="font-bold">
              {KIND_LABEL[result.looksLikeKind] || result.looksLikeKind}
            </strong>{" "}
            address — but the destination is set to{" "}
            <strong className="font-bold">{prettyName}</strong>. Did you select
            the wrong destination chain?
          </span>
        </div>
      )}

      {/* Adapter error / install prompt */}
      {adapterError && adapterError.kind === "NOT_INSTALLED" && (
        <div
          role="alert"
          className="flex items-start gap-1.5 text-[11px] text-white/80 bg-white/5 border border-white/15 px-2 py-1.5 leading-snug"
          data-testid="destination-address-adapter-not-installed"
        >
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {adapterError.brand} isn't installed in this browser.{" "}
            <a
              href={adapterError.installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF8A00] hover:underline"
            >
              Install {adapterError.brand}
            </a>{" "}
            and reload, or paste the address manually above.
          </span>
        </div>
      )}
      {adapterError && adapterError.kind === "ERROR" && (
        <div
          role="alert"
          className="text-[11px] text-red-400 leading-snug"
          data-testid="destination-address-adapter-error"
        >
          Wallet connection failed: {adapterError.message}
        </div>
      )}

      {/* Explorer link when valid */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-[#FF8A00] hover:underline"
          data-testid="destination-address-explorer-link"
        >
          View on explorer <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
