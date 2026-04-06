import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/images/empx-new.svg";
import { useChainConfig } from "../../hooks/useChainConfig";

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
      <div className="px-4 bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full fixed top-0 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center items-center">
          <div className="md:max-w-[600px] w-full bg-black clip-bg rounded-3xl relative py-10 md:px-8 px-6 mx-auto border border-[#222]">
            <svg
              onClick={onClose}
              className="absolute cursor-pointer right-8 top-8"
              width={18}
              height={19}
              viewBox="0 0 18 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                stroke="#ffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Header */}
            <div className="flex items-center justify-center gap-3">
              <div className="text-white text-2xl font-bold font-orbitron leading-7">
                Transaction Submitted
              </div>
            </div>

            {/* You Pay */}
            {tokenA && amountIn && (
              <div className="mt-6">
                <div className="text-white mb-2 text-sm font-normal font-orbitron">
                  You Paid
                </div>
                <div className="text-white text-2xl font-bold font-orbitron flex gap-3 items-center w-auto-search bg-search bg-search-padd">
                  {formatNumber(amountIn)} {tokenA?.ticker}
                  <img
                    src={tokenA?.image}
                    alt="tokenA"
                    className="w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* You Receive */}
            {tokenB && amountOut && (
              <div className="mt-6">
                <div className="text-white text-sm font-normal font-orbitron mb-2">
                  You Received
                </div>
                <div className="text-white text-2xl font-bold font-orbitron flex gap-3 items-center w-auto-search bg-search bg-search-padd">
                  {formatNumber(amountOut)} {tokenB?.ticker}
                  <img
                    src={tokenB?.image}
                    alt="tokenB"
                    className="w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Price */}
            {tokenA && tokenB && rate && (
              <div className="flex justify-between items-center w-full mt-6">
                <div className="text-white text-sm font-normal font-orbitron">
                  Price
                </div>
                <div className="text-white text-sm font-normal font-orbitron">
                  1 {tokenA?.ticker} = {rate} {tokenB?.ticker}
                </div>
              </div>
            )}

            {/* Minimum Received */}
            {/* {tokenB && minReceived && (
              <div className="flex justify-between items-center w-full mt-2">
                <div className="text-white text-sm font-normal roboto">
                  Minimum received
                </div>
                <div className="text-white text-sm font-normal roboto">
                  {formatNumber(minReceived)} {tokenB?.ticker}
                </div>
              </div>
            )} */}

            {/* Price Impact */}
            {usdValueTokenA && usdValueTokenB && (
              <div className="flex justify-between items-center w-full mt-2">
                <div className="text-white text-sm font-normal font-orbitron">
                  Price Impact
                </div>
                <div
                  className={`text-sm font-normal font-orbitron ${parseFloat(priceImpact) > 0
                      ? "text-green-500"
                      : parseFloat(priceImpact) < 0
                        ? "text-red-500"
                        : "text-white"
                    }`}
                >
                  {priceImpact} %
                </div>
              </div>
            )}

            {/* Transaction Hash */}
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-6 justify-center">
              <Link
                target="_blank"
                to={`${blockExplorer}${transactionHash}`}
              >
                <div className="text-white text-base font-bold font-orbitron text-center leading-normal">
                  View on {blockExplorerName}
                </div>
              </Link>
            </div>

            {/* Powered By */}
            <div className="flex justify-center items-center mt-6">
              <a
                href="https://empx.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <span className="text-md font-normal font-orbitron">Powered by</span>
                <img src={Logo} alt="EmpX Logo" className="w-10 h-8 object-contain" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Transaction;
