import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { useGetCalldataQuote } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeTx } from "../../hooks/useGasBridgeTx";
import { formatEther, parseEther } from "viem";
import { toast } from "react-toastify";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";
import Rbox from "../../assets/images/r-d.png";
import ChainSelector from "../../components/gas/ChainSelector";
import UpDownAr from "../../assets/images/reverse.svg";

// A simple debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const TransferPanel = () => {
  const { address: connectedAddress } = useAccount();
  const {
    fromChainId,
    toChainId,
    amount,
    recipientAddress,
    setAmount,
    setRecipientAddress,
  } = useGasBridgeStore();

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address: connectedAddress,
    chainId: fromChainId,
  });

  // console.log(
  //   "calldata input data: ",
  //   fromChainId,
  //   toChainId,
  //   amount,
  //   recipientAddress,
  //   connectedAddress
  // );

  // Set recipient to connected address by default
  useEffect(() => {
    if (connectedAddress) {
      setRecipientAddress(connectedAddress);
    }
  }, [connectedAddress, setRecipientAddress]);

  const debouncedAmount = useDebounce(amount, 500); // 500ms debounce

  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useGetCalldataQuote({
    fromChain: fromChainId,
    toChain: toChainId,
    amount: debouncedAmount,
    toAddress: recipientAddress,
    fromAddress: connectedAddress,
  });

  // console.log("Calldata quote data: ", quoteData);

  const { executeBridge, isSending, isConfirming } = useGasBridgeTx();

  const handleBridgeClick = () => {
    const txDetails = quoteData?.contractDepositTxn; // Get the transaction details object

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount to bridge.");
      return;
    }
    if (!txDetails?.to) {
      // Check if the 'to' address is available
      toast.error("Could not get routing address from the API quote.");
      return;
    }
    if (!txDetails?.data) {
      // Check if the 'data' is available
      toast.error("Could not retrieve transaction data from the API quote.");
      return;
    }
    if (!txDetails?.value) {
      // Check if the 'value' is available
      toast.error("Could not retrieve transaction value from the API quote.");
      return;
    }

    executeBridge({
      to: txDetails.to,
      value: BigInt(txDetails.value), // Convert hex string to BigInt for wagmi
      data: txDetails.data,
    });
  };

  const expectedAmountInWei = quoteData?.quotes?.[0]?.expected ?? "0";
  let formattedExpectedAmount = "0.00";
  if (BigInt(expectedAmountInWei) > 0) {
    const expectedAmountInEth = formatEther(BigInt(expectedAmountInWei));
    formattedExpectedAmount = parseFloat(expectedAmountInEth).toFixed(6);
  }
  const switchRef = useRef(null);

  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const balance = balanceData ? Number(balanceData.formatted) : 0;

  const truncateToSixDecimals = (value) => {
    if (!value) return "";
    let str = value.toString();
    if (str.includes("e")) {
      return Number(value).toFixed(6);
    }
    const [integer, decimal] = str.split(".");
    if (decimal && decimal.length > 6) {
      return `${integer}.${decimal.substring(0, 6)}`;
    }
    return str;
  };

  const handlePercentageChange = (percentage) => {
    if (!balance || balance <= 0) return;

    const calculatedAmount = (balance * percentage) / 100;

    setSelectedPercentage(percentage);
    setAmount(truncateToSixDecimals(calculatedAmount));
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    if (!balance || !value || isNaN(value)) {
      setSelectedPercentage(null);
      return;
    }

    const numericValue = Number(value);

    // Clamp amount to balance
    if (numericValue > balance) {
      setAmount(truncateToSixDecimals(balanceData?.formatted || balance));
      setSelectedPercentage(100);
      return;
    }

    const percent = Math.round((numericValue / balance) * 100);

    if ([25, 50, 75, 100].includes(percent)) {
      setSelectedPercentage(percent);
    } else {
      setSelectedPercentage(null);
    }
  };
  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ""); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };
  const getDynamicFontSize = (value, desktop = 48, mobile = 36) => {
    const length = value?.replace(/\D/g, "").length || 0;
    const baseSize = window.innerWidth >= 768 ? desktop : mobile;

    return Math.max(12, baseSize - length * 1.5);
  };
  return (
    <>
      <div className="w-full md;px-0 px-4">
        <div className="relative flex justify-center items-center md:max-w-[730px] w-full mx-auto">
          <div className="flex md:max-w-[730px] w-full  relative">
            <div className="flex w-full justify-between rounded-2xl py-4 scales-b scales-top-1 bg_swap_box">
              {/* <img className="bg-sell w-full" src={Sellbox} alt="sellbox" /> */}
              <div className="flex justify-between gap-3 items-center">
                <h2 className="font-orbitron md:text-2xl text-xs font-semibold leading-normal relative 2xl:top-[-52px] top-[-55px]">
                  From
                </h2>
                <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2">
                  <span className="font-extrabold font-orbitron leading-normal">
                    BAL
                  </span>
                  <span className="font-bold font-orbitron leading-normal">
                    {" "}
                    :{" "}
                  </span>
                  <span className="rigamesh leading-normal">
                    {isBalanceLoading ? (
                      <span>Fetching balance...</span>
                    ) : balanceData ? (
                      <span>
                        {parseFloat(balanceData.formatted).toFixed(6)}{" "}
                        {/* {balanceData.symbol} */}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
              <div>
                <div className="relative flex-flex-col justify-end items-end w-full md:top-8 md:mt-0 mt-10">
                  <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        // disabled={isLoading}
                        disabled={isBalanceLoading || !balance}
                        onClick={() => handlePercentageChange(value)}
                        className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[12px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "bg-black text-white"
            : "bg-black text-white hover:border-black hover:bg-[#FF9900] hover:text-black"
        }`}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                  {(() => {
                    //  const inputLength =
                    //     formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
                    //   const defaultFontSize =
                    //     window.innerWidth >= 768 ? 48 : 32;
                    //   // const dynamicFontSize = Math.max(
                    //   //   12,
                    //   //   defaultFontSize - inputLength * 1.5
                    //   // );
                    //   const FREE_DIGITS = 10;
                    //   const SHRINK_RATE = 3;

                    //   const excessDigits = Math.max(
                    //     0,
                    //     inputLength - FREE_DIGITS
                    //   );

                    //   const dynamicFontSize = Math.max(
                    //     12,
                    //     defaultFontSize - excessDigits * SHRINK_RATE
                    //   );
                    const formattedValue = formatNumber(
                      amount?.toString() || ""
                    );

                    // const defaultFontSize = 48;
                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 48
                        : window.innerWidth >= 768
                        ? 40
                        : 32;
                    // const minFontSize = 32;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 5;
                    const SHRINK_RATE = 3;

                    const outputLength = formattedValue.replace(
                      /\D/g,
                      ""
                    ).length;

                    const excessDigits = Math.max(
                      0,
                      outputLength - FREE_DIGITS
                    );

                    // const dynamicFontSize = Math.max(
                    //   minFontSize,
                    //   defaultFontSize - excessDigits * SHRINK_RATE
                    // );
                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE
                    );

                    return (
                      <>
                        <input
                          id="amount"
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0.1"
                          className="text-[#000000] py-2 text-sh text-end w-full leading-7 outline-none border-none bg-transparent token_input px-1 rigamesh placeholder-black transition-all duration-200 ease-in-out"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
                <div
                  onClick={() => {
                    if (!isBalanceLoading && balanceData) {
                      setAmount(truncateToSixDecimals(balanceData.formatted));
                      setSelectedPercentage(100);
                    }
                  }}
                  className="relative flex-flex-col justify-end items-end w-full cursor-pointer md:top-6 md:pb-4"
                >
                  <p className="ml-auto py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[10px] text-[8px] font-medium font-orbitron md:w-[100px] w-[100px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black">
                    Max Amount
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute md:left-[-40px] left-[-10px] top45 z-[9]">
              <ChainSelector
                onSwitch={(fn) => {
                  switchRef.current = fn;
                }}
              />
            </div>
          </div>
        </div>
        {/*  */}
        <button
          onClick={() => switchRef.current && switchRef.current()}
          className="cursor-pointer mtb mt-6 mb-8 flex scales-b scales-top-2 mx-auto md:w-[70px] w-12"
        >
          <img
            src={UpDownAr}
            alt="Ar"
            className="hoverswap transition-all rounded-xl"
          />
        </button>
        {/*  */}
        <div className="md:max-w-[730px] w-full mx-auto relative flex justify-center items-center text-white scales-b scales-top bg_swap_box_black">
          {/* <img className="bg-sell w-full" src={Buybox} alt="Buybox" /> */}
          <div className="md:max-w-[730px] w-full">
            <div className="flex w-full justify-between rounded-2xl">
              <div className="flex justify-between gap-3 items-center">
                <h2 className="font-orbitron md:text-2xl text-xs font-semibold leading-normal text-[#FF9900] relative lg:top-[-5px] top-[-5px]">
                  You will receive
                </h2>
                {/*  */}
              </div>
            </div>
            <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
              {[25, 50, 75, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  // disabled={isLoading}
                  disabled={isBalanceLoading || !balance}
                  onClick={() => handlePercentageChange(value)}
                  className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[12px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "bg-black text-white"
            : "bg-[#FF9900] text-black hover:border-[#FF9900] hover:bg-transparent hover:text-[#FF9900]"
        }`}
                >
                  {value}%
                </button>
              ))}
            </div>
            {(() => {
              const value = formattedExpectedAmount || "";

              // const defaultFontSize = 48;
              const defaultFontSize =
                window.innerWidth >= 1024
                  ? 48
                  : window.innerWidth >= 768
                  ? 40
                  : 32;

              // const minFontSize = 32;

              const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 6;
              const SHRINK_RATE = 3;
              const outputLength = value.replace(/\D/g, "").length;

              const excessDigits = Math.max(0, outputLength - FREE_DIGITS);

              const dynamicFontSize = Math.max(
                10,
                defaultFontSize - excessDigits * SHRINK_RATE
              );
              // const dynamicFontSize = Math.max(
              //   minFontSize,
              //   defaultFontSize - excessDigits * SHRINK_RATE
              // );

              return (
                <div className="w-full py-2 text-end px-1 text-sh rigamesh transition-all duration-200 ">
                  <span
                    className={`text-white`}
                    style={{
                      fontSize: `${dynamicFontSize}px`,
                    }}
                  >
                    <span className="">
                      {" "}
                      {isQuoteLoading ? "Loading" : value}
                    </span>
                  </span>

                  {quoteError && (
                    <p className="text-[#FF9900] text-xs mt-2 absolute right-4">
                      Could not fetch quote. Please check inputs.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="md:max-w-[710px] mx-auto w-full md:px-4 px-2 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 scales-b scales-top_1 lg:mt-0 mt-4">
          <div className="md:my-2 my-6 relative">
            <label className="block md:text-4xl text-xl font-medium text-white mb-6 font-orbitron text-center">
              Recipient Address
            </label>
            <div className="relative w-full border border-[#FF9900] py-10 rounded-[40px]">
              {/* <img className="bg-rb" src={Rbox} alt="Rbox" /> */}
              <input
                type="text"
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full md:pl-10 pl-4 pr-32 py-12 bg-transparent text-white roboto md:text-xl text-sm truncate outline-none"
              />
              <button
                className={`!absolute !bg-transparent bg-black w-[100px] h-12 hover:opacity-70 !border !border-white top-4 right-4 flex justify-center items-center rounded-xl px-2 roboto !text-[#FF9900] text-base font-bold`}
              >
                Self
              </button>
            </div>
          </div>
          <div className="md:px-1 px-4 md:pt-10 pt-5">
            <button
              onClick={handleBridgeClick}
              disabled={!quoteData || isSending || isConfirming}
              type="button"
              className="gtw relative md:w-[360px] w-[200px] md:h-[68px] h-11 bg-[#FF9900] md:rounded-[10px] rounded-md mx-auto cursor-pointer button-trans text-center flex justify-center items-center transition-all  font-orbitron lg:text-2xl text-base font-extrabold"
            >
              {/* <img
                className="absolute swap-button1 top-0 bottom-0 my-auto"
                src={Swapbutton}
                alt="Swap"
              /> */}
              <div className="w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[#FF9900] md:rounded-[10px] rounded-md md:h-[68px] h-11"></div>

              <span>
                {" "}
                {isSending
                  ? "Check Wallet..."
                  : isConfirming
                  ? "Bridging..."
                  : "Bridge"}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/*  */}
    </>
  );
};

export default TransferPanel;
