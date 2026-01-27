import { useState, useRef, useEffect } from "react";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transaction from "./Transaction";

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
      <div className="px-4 bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full fixed top-0 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center items-center">
          <div
            ref={modalRef}
            className="md:max-w-[600px] w-full bg-black clip-bg rounded-3xl relative py-10 md:px-8 px-6 mx-auto border border-[#222]"
          >
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
            <div className="flex items-center justify-center">
              <div className="text-white text-2xl font-bold roboto leading-7">
                Select Amount
              </div>
            </div>
            <div className="mt-6">
              <div className="text-white mb-2 text-sm font-normal roboto">
                You Pay
              </div>
              <div className="text-white text-2xl font-bold roboto flex gap-3 items-center w-auto-search bg-search bg-search-padd">
                {formatNumber(amountIn)} {tokenA?.ticker}
                <img src={tokenA?.image} alt="tokenA" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-white text-sm font-normal roboto mb-2">
                You Receive
              </div>
              <div className="text-white text-2xl font-bold roboto flex gap-3 items-center w-auto-search bg-search bg-search-padd">
                {formatNumber(amountOut)} {tokenB?.ticker}
                <img src={tokenB?.image} alt="tokenB" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6 text-[#9A5500] text-sm font-normal roboto">
              Output is estimated. You will receive at least{" "}
              {formatNumber(amountOut)} {tokenB?.ticker} or the transaction will
              revert.
            </div>
            <div className="flex justify-between items-center w-full mt-6">
              <div className="text-white text-sm font-normal roboto">Price</div>
              <div className="text-white text-sm font-normal roboto">
                1 {tokenA?.ticker} ={" "}
                {rate}{" "}
                {tokenB?.ticker}
              </div>
            </div>
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-white text-sm font-normal roboto">
                  Minimum received
                </div>
                <img src={Info} alt="info" />
              </div>
              <div className="text-white text-sm font-normal roboto">
                {formatNumber(amountOut)} {tokenB?.ticker}
              </div>
            </div>
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-white text-sm font-normal roboto">
                  Price Impact
                </div>
                <img src={Info} alt="info" />
              </div>
              <div className={`text-sm font-normal roboto ${parseFloat(priceImpact) > 0 ? "text-green-500" : parseFloat(priceImpact) < 0 ? "text-red-500" : "text-white"
                }`}>
                {/* {((amountOut / 1000) * 0.01).toFixed(6)} % */}
                {priceImpact} %
              </div>
            </div>

            {/* Price Alert */}
            {showPriceAlert && (
              <div className="p-4 rounded-xl w-full mt-4 border-2 border-[#FF9900] bg-[#FF9900]/10">
                <h3 className="text-lg font-bold roboto mb-3 text-[#FF9900]">
                  Price Update
                </h3>
                <div className="mb-4">
                  <p className="text-sm font-normal roboto text-white mb-2">
                    The price has {percentChange > 0 ? 'increased' : 'decreased'} by{" "}
                    <span className={`font-bold ${percentChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(percentChange).toFixed(2)}%
                    </span>
                  </p>
                  <div className="flex justify-between items-center text-sm font-normal roboto mt-2">
                    <span className="text-white">Previous:</span>
                    <span className="text-white">{parseFloat(initialQuote || 0).toFixed(6)} {tokenB?.ticker}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-normal roboto mt-2">
                    <span className="text-white">New:</span>
                    <span className={`font-bold ${percentChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(newQuote || 0).toFixed(6)} {tokenB?.ticker}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onAcceptNewQuote}
                  className="w-full px-4 py-3 bg-[#FF9900] text-black rounded-xl hover:bg-opacity-80 transition-colors text-sm font-bold roboto uppercase"
                >
                  Accept New Price
                </button>
              </div>
            )}

            <div className="bridge-button">
              <button
                onClick={needsApproval ? handleApprove : handleClick}
                disabled={disabled || isLoading || showPriceAlert}
                usdValueTokenA={usdValueTokenA}
                usdValueTokenB={usdValueTokenB}
                className="gtw relative w-full rounded-xl py-4 bg-[#FF9900] flex gap-4 items-center mt-6 justify-center border border-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <div className="w-full absolute md:top-2 top-2 md:-left-3 -left-3 z-[1] bg-transparent border-2 border-[#FF9900] rounded-xl h-[58px]"></div>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="md:text-xl text-base font-black font-orbitron">
                      Processing...
                    </span>
                  </div>
                ) : (
                  <div className="md:text-xl text-base font-black text-center leading-normal uppercase font-orbitron">
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

// import React, { useState, useRef, useEffect } from "react";
// import S from "../../assets/images/s.svg";
// import Three from "../../assets/images/324.svg";
// import Refresh from "../../assets/images/refresh.svg";
// import Info from "../../assets/images/info.svg";
// import { formatUnits } from "viem";
// import Transaction from "./Transaction";
// const Amount = ({
//   onClose,
//   amountIn,
//   amountOut,
//   tokenA,
//   singleToken,
//   tokenB,
//   refresh,
//   confirm,
//   disabled = false,
// }) => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [isConfirm, setConfirm] = useState(false);
//   const modalRef = useRef(null);
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (modalRef.current && !modalRef.current.contains(event.target)) {
//         onClose();
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [onClose]);

//   const handleClick = async () => {
//     if (disabled || isLoading) return;

//     setIsLoading(true);
//     try {
//       await confirm();
//     } catch (error) {
//       console.error("Confirmation failed:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const formatNumber = (value) => {
//     if (!value) return ""; // Handle empty input

//     const [integerPart, decimalPart] = value.split(".");
//     const formattedInteger = integerPart
//       .replace(/\D/g, "") // Allow only digits
//       .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

//     return decimalPart !== undefined
//       ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
//       : formattedInteger;
//   };

//   return (
//     <>
//       <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
//         <div className="w-full flex justify-center my-auto items-center">
//           <div
//             ref={modalRef}
//             className="md:max-w-[390px] w-full bg-black border border-white rounded-3xl relative py-6 px-6 mx-auto"
//           >
//             <svg
//               onClick={onClose}
//               className="absolute cursor-pointer right-8 top-8"
//               width={18}
//               height={19}
//               viewBox="0 0 18 19"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//             >
//               <path
//                 d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
//                 stroke="#ffff"
//                 strokeWidth={2}
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//             <div className="flex gap-3 items-center">
//               <svg
//                 className="cursor-pointer"
//                 onClick={onClose}
//                 width={14}
//                 height={11}
//                 viewBox="0 0 14 11"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//               >
//                 <path
//                   fillRule="evenodd"
//                   clipRule="evenodd"
//                   d="M13.5 5.96344C13.5 6.37765 13.1642 6.71344 12.75 6.71344L0.75 6.71344C0.335786 6.71344 -5.08894e-08 6.37765 -3.27835e-08 5.96344C-1.46777e-08 5.54923 0.335786 5.21344 0.75 5.21344L12.75 5.21344C13.1642 5.21344 13.5 5.54923 13.5 5.96344Z"
//                   fill="white"
//                 />
//                 <path
//                   fillRule="evenodd"
//                   clipRule="evenodd"
//                   d="M5.56689 1.14652C5.85978 1.43941 5.85978 1.91429 5.56689 2.20718L1.81065 5.96342L5.56689 9.71966C5.85978 10.0126 5.85978 10.4874 5.56689 10.7803C5.274 11.0732 4.79912 11.0732 4.50623 10.7803L0.219658 6.49375C-0.0732348 6.20086 -0.0732348 5.72598 0.219658 5.43309L4.50623 1.14652C4.79912 0.853626 5.274 0.853626 5.56689 1.14652Z"
//                   fill="white"
//                 />
//               </svg>
//               <div className="text-white text-lg font-bold roboto leading-7">
//                 Select Amount
//               </div>
//             </div>
//             <div className="mt-6">
//               <div className="text-amber-600 text-sm font-normal roboto leading-normal">
//                 You Pay
//               </div>
//               <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
//                 {formatNumber(amountIn)}
//                 <img src={tokenA.image} alt="Three" className="w-4 h-4" />
//               </div>
//             </div>
//             <div className="mt-6">
//               <div className="text-amber-600 text-sm font-normal roboto leading-normal">
//                 You Receive
//               </div>
//               <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
//                 {formatNumber(amountOut)}
//                 <img src={tokenB.image} alt="S" className="w-4 h-4" />
//               </div>
//             </div>
//             <div className="mt-6 text-gray-40 text-white text-sm font-normal robotoleading-normal">
//               Output is estimated. You will receive at least{" "}
//               {formatNumber(amountOut)} {tokenB.ticker} or the transaction will
//               revert
//             </div>
//             <div className="flex justify-between gap-3 items-center w-full mt-6">
//               <div className="text-gray-400 text-sm font-normal roboto leading-normal">
//                 Price
//               </div>
//               <div className="flex gap-2 items-center">
//                 <div className="text-right text-white text-sm font-normal roboto leading-normal">
//                   1 {tokenA.ticker} ={" "}
//                   {singleToken &&
//                   singleToken.amounts &&
//                   singleToken.amounts[singleToken.amounts.length - 1]
//                     ? parseFloat(
//                         formatUnits(
//                           singleToken.amounts[singleToken.amounts.length - 1],
//                           parseInt(tokenB.decimal)
//                         )
//                       ).toFixed(6)
//                     : "0"}{" "}
//                   {tokenB.ticker}
//                 </div>
//                 {/* <div className="cursor-pointer" onClick={() => refresh()}>
//                   <img src={Refresh} alt="Refresh" />
//                 </div> */}
//               </div>
//             </div>
//             <div className="flex justify-between gap-3 items-center w-full mt-2">
//               <div className="flex gap-2 items-center">
//                 <div className="text-gray-400 text-sm font-normal roboto leading-normal">
//                   Minimum received
//                 </div>
//                 <img src={Info} alt="Info" />
//               </div>
//               <div className="text-right text-white text-sm font-normal roboto leading-normal">
//                 {formatNumber(amountOut)} {tokenB.ticker}
//               </div>
//             </div>
//             <div className="flex justify-between gap-3 items-center w-full mt-2">
//               <div className="flex gap-2 items-center">
//                 <div className="text-gray-400 text-sm font-normal roboto leading-normal">
//                   Price Impact
//                 </div>
//                 <img src={Info} alt="Info" />
//               </div>
//               <div className="text-right text-white text-sm font-normal roboto leading-normal">
//                 {((amountOut / 1000) * 0.01).toFixed(6)} %
//               </div>
//             </div>
//             <button
//               onClick={handleClick}
//               disabled={disabled || isLoading}
//               className="w-full rounded-xl px-4 py-4 bg-[#FF9900] flex gap-4 items-center mt-6 justify-center hover:bg-transparent border border-[#FF9900] hover:text-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
//             >
//               {isLoading ? (
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                   <span className="text-white text-base font-bold roboto">
//                     Processing...
//                   </span>
//                 </div>
//               ) : (
//                 <div className="text-white text-base font-bold roboto text-center leading-normal">
//                   Confirm
//                 </div>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//       <div aria-label="Modal">
//         {isConfirm && <Transaction onClose={() => setConfirm(false)} />}
//       </div>
//     </>
//   );
// };

// export default Amount;
