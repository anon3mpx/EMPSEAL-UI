import { useEffect, useRef, useState } from "react";
import type { CrossUiChain, CrossUiToken } from "../model/types";

interface CrossTradeFormProps {
  chains: CrossUiChain[];
  fromChainId: number;
  toChainId: number;
  fromTokens: CrossUiToken[];
  toTokens: CrossUiToken[];
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  receiveAmount: string;
  receiveMetaLabel?: string;
  nativeDstAddress: string;
  showNativeDstAddress: boolean;
  onAmountChange: (value: string) => void;
  onFlip: () => void;
  onFromChainChange: (chainId: number) => void;
  onToChainChange: (chainId: number) => void;
  onFromTokenChange: (address: string) => void;
  onToTokenChange: (address: string) => void;
  onNativeDstAddressChange: (value: string) => void;
  balanceLabel?: string;
}

const sanitizeNumeric = (value: string) => {
  const next = value.replace(/[^0-9.]/g, "");
  return next.split(".").length <= 2 ? next : value;
};

const chainLogoFallback = (symbol?: string) => symbol?.slice(0, 1)?.toUpperCase() ?? "?";
const tokenLogoFallback = (symbol?: string) =>
  symbol === "USDT" ? "₮" : symbol === "WBTC" ? "₿" : symbol === "DAI" ? "◈" : "$";

function useOutsideClose(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  return ref;
}

function SelectorButton({
  icon,
  label,
  open,
  onClick,
}: {
  icon: string;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[160px] items-center gap-2 border px-[16px] py-[10px] text-left transition-all ${
        open
          ? "border-[#FF8A00]/35 bg-white/[0.06]"
          : "border-white/[0.07] bg-white/[0.04]"
      }`}
    >
      <div className="flex h-[32px] w-[32px] items-center justify-center bg-white/[0.06] text-[16px] font-bold text-white/80">
        {icon}
      </div>

      <span className="text-[14px] font-semibold text-white">{label}</span>

      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className={`ml-auto text-white/25 transition-transform ${open ? "rotate-180" : ""}`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function ChainDropdown({
  chains,
  currentChainId,
  excludeChainId,
  onSelect,
}: {
  chains: CrossUiChain[];
  currentChainId: number;
  excludeChainId: number;
  onSelect: (chainId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const current = chains.find((chain) => chain.chainId === currentChainId);

  return (
    <div ref={ref} className="relative">
      <SelectorButton
        icon={chainLogoFallback(current?.symbol)}
        label={current?.name ?? "Select chain"}
        open={open}
        onClick={() => setOpen((value) => !value)}
      />

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-[395px] min-w-[324px] overflow-auto border border-white/[0.08] bg-[rgba(9,9,17,0.98)] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {chains
            .filter((chain) => chain.chainId !== excludeChainId)
            .map((chain) => {
              const active = chain.chainId === currentChainId;

              return (
                <button
                  key={chain.chainId}
                  type="button"
                  onClick={() => {
                    onSelect(chain.chainId);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-4 border-b border-white/[0.05] px-5 py-[16px] text-left transition-colors ${
                    active ? "text-[#FF8A00]" : "text-white/55 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex h-[32px] w-[32px] items-center justify-center bg-white/[0.06] text-[16px] font-bold text-white/80">
                    {chainLogoFallback(chain.symbol)}
                  </div>

                  <span className="text-[17px] font-medium">{chain.name}</span>

                  {active ? (
                    <span className="ml-auto text-[24px] leading-none text-[#FF8A00]">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

function TokenDropdown({
  tokens,
  currentTokenAddress,
  onSelect,
}: {
  tokens: CrossUiToken[];
  currentTokenAddress: string;
  onSelect: (address: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const current = tokens.find((token) => token.address === currentTokenAddress);

  return (
    <div ref={ref} className="relative">
      <SelectorButton
        icon={tokenLogoFallback(current?.symbol)}
        label={current?.symbol ?? "Select token"}
        open={open}
        onClick={() => setOpen((value) => !value)}
      />

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-[320px] min-w-[252px] overflow-auto border border-white/[0.08] bg-[rgba(9,9,17,0.98)] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {tokens.map((token) => {
            const active = token.address === currentTokenAddress;

            return (
              <button
                key={`${token.chainId}-${token.address}`}
                type="button"
                onClick={() => {
                  onSelect(token.address);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-4 border-b border-white/[0.05] px-5 py-[14px] text-left transition-colors ${
                  active ? "text-[#FF8A00]" : "text-white/55 hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex h-[32px] w-[32px] items-center justify-center bg-white/[0.06] text-[16px] font-bold text-white/80">
                  {tokenLogoFallback(token.symbol)}
                </div>

                <span className="text-[17px] font-medium">{token.symbol}</span>

                {active ? (
                  <span className="ml-auto text-[24px] leading-none text-[#FF8A00]">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CrossTradeForm({
  chains,
  fromChainId,
  toChainId,
  fromTokens,
  toTokens,
  fromTokenAddress,
  toTokenAddress,
  amount,
  receiveAmount,
  receiveMetaLabel,
  nativeDstAddress,
  showNativeDstAddress,
  onAmountChange,
  onFlip,
  onFromChainChange,
  onToChainChange,
  onFromTokenChange,
  onToTokenChange,
  onNativeDstAddressChange,
  balanceLabel,
}: CrossTradeFormProps) {
  return (
    <div>
      <div className="border-b border-white/[0.05] pb-6">
        <div className="relative flex min-h-[220px] flex-col">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-[9px] font-bold tracking-[0.28em] text-white/18">
                FROM CHAIN
              </p>

              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(event) =>
                  onAmountChange(sanitizeNumeric(event.target.value))
                }
                className="mt-8 w-[220px] bg-transparent text-[84px] font-[250] leading-none tracking-[-0.06em] text-white/12 outline-none placeholder:text-white/12"
              />

              {balanceLabel ? (
                <p className="mt-3 text-[10px] text-white/18">{balanceLabel}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-[18px]">
              <ChainDropdown
                chains={chains}
                currentChainId={fromChainId}
                excludeChainId={toChainId}
                onSelect={onFromChainChange}
              />

              <TokenDropdown
                tokens={fromTokens}
                currentTokenAddress={fromTokenAddress}
                onSelect={onFromTokenChange}
              />
            </div>
          </div>

          <div className="mt-auto border-t border-white/[0.05] pt-3">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onFlip}
                className="flex h-[58px] w-[58px] items-center justify-center border border-white/[0.08] bg-white/[0.035] text-white/30 transition-all hover:border-[#FF8A00]/30 hover:text-[#FF8A00]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <div className="flex min-h-[230px] flex-col">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-[9px] font-bold tracking-[0.28em] text-white/18">
                TO CHAIN
              </p>

              <div className="mt-8 w-[220px] text-[84px] font-[250] leading-none tracking-[-0.06em] text-white/12">
                {receiveAmount || "0"}
              </div>

              {receiveMetaLabel ? (
                <p className="mt-3 max-w-[280px] text-[10px] text-[#FF8A00]/75">
                  {receiveMetaLabel}
                </p>
              ) : null}

              {showNativeDstAddress ? (
                <input
                  type="text"
                  value={nativeDstAddress}
                  onChange={(event) => onNativeDstAddressChange(event.target.value)}
                  placeholder="Destination native wallet address"
                  className="mt-4 w-full max-w-[280px] border border-white/[0.08] bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/20"
                />
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-[18px]">
              <ChainDropdown
                chains={chains}
                currentChainId={toChainId}
                excludeChainId={fromChainId}
                onSelect={onToChainChange}
              />

              <TokenDropdown
                tokens={toTokens}
                currentTokenAddress={toTokenAddress}
                onSelect={onToTokenChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
