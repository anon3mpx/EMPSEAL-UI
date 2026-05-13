import { useState, useRef, useEffect } from "react";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transaction from "./Transaction";
import TokenLogo from "../../components/TokenLogo.jsx";
import EL from "../../assets/images/emp-logo.png";

const Amount = ({
  onClose,
  amountIn,
  amountOut,
  tokenA,
  singleToken,
  tokenB,
  refresh,
  confirm,
  disabled = false,
  usdValueTokenA,
  usdValueTokenB,
  needsApproval,
  handleApprove,
  rate,
  showPriceAlert,
  newQuote,
  initialQuote,
  percentChange,
  onAcceptNewQuote,
  onRejectNewQuote,
  swapStatus,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirm, setConfirm] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await confirm();
    } catch (error) {
      console.error("Confirmation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value) => {
    if (!value) return "";
    const [integerPart, decimalPart] = value.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}`
      : formattedInteger;
  };

  const priceImpact =
    usdValueTokenA > 0
      ? (
          ((parseFloat(usdValueTokenB) - parseFloat(usdValueTokenA)) /
            parseFloat(usdValueTokenA)) *
          100
        ).toFixed(2)
      : 0;

  return (
    <>
      <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div
            ref={modalRef}
            className="md:max-w-[550px] w-full relative py-4 mx-auto clip-bg !px-4"
          >
            <div className="flex justify-between gap-2 items-center pb-2">
              <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
                <img src={EL} alt="EL" className="w-10 object-contain" />
                Select Amount
              </h2>
              <button onClick={onClose} className="close-btn">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-6">
              <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase mb-2">
                You Pay
              </div>
              <div className="search-input flex gap-2 items-center !pl-2">
                <TokenLogo token={tokenA} className="w-4 h-4" />
                {formatNumber(amountIn)} {tokenA?.ticker}
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase mb-2">
                You Receive
              </div>
              <div className="search-input flex gap-2 items-center !pl-2">
                <TokenLogo token={tokenB} className="w-4 h-4" />
                {formatNumber(amountOut)} {tokenB?.ticker}
              </div>
            </div>
            <div className="mt-4 text-white/50 text-xs font-normal ">
              Output is estimated. You will receive at least{" "}
              {formatNumber(amountOut)} {tokenB?.ticker} or the transaction will
              revert.
            </div>
            <div className="flex justify-between items-center w-full mt-6">
              <div className="text-white text-xs">Price</div>
              <div className="text-white text-xs">
                1 {tokenA?.ticker} = {rate} {tokenB?.ticker}
              </div>
            </div>
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-white text-xs">
                  Minimum received
                </div>
                <img src={Info} alt="info" />
              </div>
              <div className="text-white text-xs">
                {formatNumber(amountOut)} {tokenB?.ticker}
              </div>
            </div>
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-white text-xs">
                  Price Impact
                </div>
                <img src={Info} alt="info" />
              </div>
              <div
                className={`text-sm font-normal  ${
                  parseFloat(priceImpact) > 0
                    ? "text-green-500"
                    : parseFloat(priceImpact) < 0
                      ? "text-white"
                      : "text-white"
                }`}
              >
                {/* {((amountOut / 1000) * 0.01).toFixed(6)} % */}
                {priceImpact} %
              </div>
            </div>

            {/* Price Alert */}
            {showPriceAlert && (
              <div className="p-2 w-full mt-4 border border-white/5 bg-[rgba(255, 255, 255, 0.03);]">
                <h3 className="text-xs font-bold  mb-3 text-white">
                  Price Update
                </h3>
                <div className="mb-4">
                  <p className="text-xs font-normal  text-white/50 mb-2">
                    The price has{" "}
                    {percentChange > 0 ? "increased" : "decreased"} by{" "}
                    <span
                      className={`font-bold ${percentChange > 0 ? "text-green-500" : "text-white"}`}
                    >
                      {Math.abs(percentChange).toFixed(2)}%
                    </span>
                  </p>
                  <div className="flex justify-between items-center text-xs font-normal  mt-2">
                    <span className="text-white/50">Previous:</span>
                    <span className="text-white/50">
                      {parseFloat(initialQuote || 0).toFixed(6)}{" "}
                      {tokenB?.ticker}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-normal  mt-2">
                    <span className="text-white/50">New:</span>
                    <span
                      className={`font-bold ${percentChange > 0 ? "text-green-500" : "text-white"}`}
                    >
                      {parseFloat(newQuote || 0).toFixed(6)} {tokenB?.ticker}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onAcceptNewQuote}
                  className="w-full px-4 py-3 bg-[#FF8A00] text-black hover:bg-opacity-80 transition-colors text-xs font-bold uppercase"
                >
                  Accept New Price
                </button>
              </div>
            )}

            <div className="mt-2">
              <button
                onClick={needsApproval ? handleApprove : handleClick}
                disabled={
                  disabled ||
                  isLoading ||
                  showPriceAlert ||
                  swapStatus === "APPROVING" ||
                  swapStatus === "WAITING_FOR_CONFIRMATION" ||
                  swapStatus === "SWAPPING"
                }
                usdValueTokenA={usdValueTokenA}
                usdValueTokenB={usdValueTokenB}
                className="gtw text-xs relative z-50 w-full uppercase md:h-12 h-11 bg-[#FF8A00] mx-auto font-bold button-trans h- flex justify-center items-center transition-all"
              >
                {/* <div className="w-full absolute md:top-2 top-2 md:-left-3 -left-3 z-[1] bg-transparent border-2 border-[#FF8A00]  h-[58px]"></div> */}
                {isLoading ||
                swapStatus === "APPROVING" ||
                swapStatus === "WAITING_FOR_CONFIRMATION" ||
                swapStatus === "SWAPPING" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">
                      {swapStatus === "APPROVING"
                        ? "Approving..."
                        : swapStatus === "WAITING_FOR_CONFIRMATION"
                          ? "Waiting for confirmation..."
                          : swapStatus === "SWAPPING"
                            ? "Swapping..."
                            : "Processing..."}
                    </span>
                  </div>
                ) : (
                  <div className="text-xstext-center leading-normal uppercase ">
                    {needsApproval ? "Approve" : "Swap"}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction modal */}
      <div aria-label="Modal">
        {isConfirm && <Transaction onClose={() => setConfirm(false)} />}
      </div>
    </>
  );
};

export default Amount;
