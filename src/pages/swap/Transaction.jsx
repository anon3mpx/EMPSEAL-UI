import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/images/empx-new.svg";
import { useChainConfig } from "../../hooks/useChainConfig";
import EL from "../../assets/images/emp-logo.png";

const Transaction = ({
  onClose,
  transactionHash,
  amountIn,
  amountOut,
  tokenA,
  tokenB,
  rate,
  minReceived,
  usdValueTokenA,
  usdValueTokenB,
}) => {
  const { blockExplorer, blockExplorerName } = useChainConfig();

  const formatNumber = (value) => {
    if (!value) return "";
    const str = String(value);
    const [integerPart, decimalPart] = str.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}`
      : formattedInteger;
  };

  const priceImpact =
    usdValueTokenA && parseFloat(usdValueTokenA) > 0
      ? (
          ((parseFloat(usdValueTokenB) - parseFloat(usdValueTokenA)) /
            parseFloat(usdValueTokenA)) *
          100
        ).toFixed(2)
      : "0.00";

  return (
    <>
      <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div
            className="md:max-w-[550px] w-full relative py-4 mx-auto clip-bg !px-4"
          >
            <div className="flex justify-between gap-2 items-center pb-2">
              <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
                <img src={EL} alt="EL" className="w-10 object-contain" />
                Transaction Submitted
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
            {/* You Pay */}
            {tokenA && amountIn && (
              <div className="mt-6">
                <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase mb-2">
                  You Paid
                </div>
                <div className="search-input !pl-2 flex gap-2 items-center">
                  <img src={tokenA?.image} alt="tokenA" className="w-4 h-4" />
                  {formatNumber(amountIn)} {tokenA?.ticker}
                </div>
              </div>
            )}
            {tokenB && amountOut && (
              <div className="mt-6">
                <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase mb-2">
                  You Received
                </div>
                <div className="search-input !pl-2 flex gap-2 items-center">
                  <img src={tokenB?.image} alt="tokenB" className="w-4 h-4" />
                  {formatNumber(amountOut)} {tokenB?.ticker}
                </div>
              </div>
            )}

            {tokenA && tokenB && rate && (
              <div className="flex justify-between items-center w-full mt-6">
                <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase">
                  Price
                </div>
                <div className="text-[13px] font-bold text-white tracking-[0.08em] uppercase">
                  1 {tokenA?.ticker} = {rate} {tokenB?.ticker}
                </div>
              </div>
            )}

            {/* Minimum Received */}
            {/* {tokenB && minReceived && (
              <div className="flex justify-between items-center w-full mt-2">
                <div className="text-[13px] font-bold text-white tracking-[0.08em]">
                  Minimum received
                </div>
                <div className="text-[13px] font-bold text-white tracking-[0.08em]">
                  {formatNumber(minReceived)} {tokenB?.ticker}
                </div>
              </div>
            )} */}

            {/* Price Impact */}
            {usdValueTokenA && usdValueTokenB && (
              <div className="flex justify-between items-center w-full mt-2">
                <div className="text-[13px] text-white tracking-[0.08em] uppercase">
                  Price Impact
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
                  {priceImpact} %
                </div>
              </div>
            )}

            <div className="px-4 py-4 search-input flex gap-4 items-center mt-6 justify-center">
              <Link target="_blank" to={`${blockExplorer}${transactionHash}`}>
                <div className="text-[13px] text-white tracking-[0.08em] uppercase text-center">
                  View on {blockExplorerName}
                </div>
              </Link>
            </div>
            <div className="flex justify-center items-center mt-6 text-[13px] ">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <span className="tracking-[0.08em] uppercase ">Powered by</span>
                <img
                  src={Logo}
                  alt="EmpX Logo"
                  className="w-10 h-8 object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Transaction;
