import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { useGetCalldataQuote } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeTx } from "../../hooks/useGasBridgeTx";
import { formatEther } from "viem";
import { toast } from "../../utils/toastHelper";
import ChainSelector from "../../components/gas/ChainSelector";
import UpDownAr from "../../assets/images/reverse.svg";

// Chain ID to network symbol mapping for GeckoTerminal API
const CHAIN_SYMBOLS = {
  369: "pulsechain",
  10001: "ethw",
  146: "sonic",
  8453: "base",
  1329: "sei-network",
  80094: "berachain",
  30: "rootstock",
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  56: "bsc",
  43114: "avalanche",
  250: "fantom",
  324: "zksync",
};

// Wrapped token addresses for native token price fetching
const WRAPPED_TOKENS = {
  369: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27", // WPLS
  10001: "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990", // WETHW
  146: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // WSONIC
  8453: "0x4200000000000000000000000000000000000006", // WETH (Base)
  1329: "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7", // WSEI
  80094: "0x6969696969696969696969696969696969696969", // WBERA
  30: "0x542fda317318ebf1d3deaf76e0b632741a7e677d", // WRBTC
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  137: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH (Polygon)
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH (Arbitrum)
  10: "0x4200000000000000000000000000000000000006", // WETH (Optimism)
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  250: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", // WFTM
  324: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", // WETH (zkSync)
};

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

  // Token price states for native tokens (from and to chains)
  const [fromTokenPrice, setFromTokenPrice] = useState(null);
  const [toTokenPrice, setToTokenPrice] = useState(null);
  const [fromUsdValue, setFromUsdValue] = useState("0.00");
  const [toUsdValue, setToUsdValue] = useState("0.00");
  const [isFromPriceLoading, setIsFromPriceLoading] = useState(false);
  const [isToPriceLoading, setIsToPriceLoading] = useState(false);

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
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}`
      : formattedInteger;
  };
  const getDynamicFontSize = (value, desktop = 48, mobile = 36) => {
    const length = value?.replace(/\D/g, "").length || 0;
    const baseSize = window.innerWidth >= 768 ? desktop : mobile;

    return Math.max(12, baseSize - length * 1.5);
  };

  // Fetch native token prices for both chains
  useEffect(() => {
    const fetchFromChainPrice = async () => {
      if (!fromChainId) {
        setFromTokenPrice(null);
        setFromUsdValue("0.00");
        return;
      }

      setIsFromPriceLoading(true);

      try {
        const networkSymbol = CHAIN_SYMBOLS[fromChainId];
        const wrappedTokenAddress = WRAPPED_TOKENS[fromChainId];

        if (!networkSymbol || !wrappedTokenAddress) {
          console.log(`Chain ${fromChainId} not supported for price fetching`);
          setFromTokenPrice(null);
          setIsFromPriceLoading(false);
          return;
        }

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${networkSymbol}/token_price/${wrappedTokenAddress.toLowerCase()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const tokenPrices = data?.data?.attributes?.token_prices;

        if (tokenPrices && tokenPrices[wrappedTokenAddress.toLowerCase()]) {
          const price = tokenPrices[wrappedTokenAddress.toLowerCase()];
          setFromTokenPrice(price);

          // Calculate USD value
          const amountNum = parseFloat(amount) || 0;
          const priceNum = parseFloat(price) || 0;
          setFromUsdValue((amountNum * priceNum).toFixed(2));
        } else {
          setFromTokenPrice(null);
        }
      } catch (error) {
        console.error("Error fetching from chain price:", error.message);
        setFromTokenPrice(null);
      } finally {
        setIsFromPriceLoading(false);
      }
    };

    const fetchToChainPrice = async () => {
      if (!toChainId) {
        setToTokenPrice(null);
        setToUsdValue("0.00");
        return;
      }

      setIsToPriceLoading(true);

      try {
        const networkSymbol = CHAIN_SYMBOLS[toChainId];
        const wrappedTokenAddress = WRAPPED_TOKENS[toChainId];

        if (!networkSymbol || !wrappedTokenAddress) {
          console.log(`Chain ${toChainId} not supported for price fetching`);
          setToTokenPrice(null);
          setIsToPriceLoading(false);
          return;
        }

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${networkSymbol}/token_price/${wrappedTokenAddress.toLowerCase()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const tokenPrices = data?.data?.attributes?.token_prices;

        if (tokenPrices && tokenPrices[wrappedTokenAddress.toLowerCase()]) {
          const price = tokenPrices[wrappedTokenAddress.toLowerCase()];
          setToTokenPrice(price);

          // Calculate USD value for expected amount
          const expectedAmountNum = parseFloat(formattedExpectedAmount) || 0;
          const priceNum = parseFloat(price) || 0;
          setToUsdValue((expectedAmountNum * priceNum).toFixed(2));
        } else {
          setToTokenPrice(null);
        }
      } catch (error) {
        console.error("Error fetching to chain price:", error.message);
        setToTokenPrice(null);
      } finally {
        setIsToPriceLoading(false);
      }
    };

    fetchFromChainPrice();
    fetchToChainPrice();
  }, [fromChainId, toChainId, amount, formattedExpectedAmount]);

  return (
    <>
      <div className="w-full md:px-0 px-4">
        <div className="lg:max-w-[650px] md:max-w-[650px] mx-auto w-full">
          <div className="relative bg_swap_box_chain">
            <div className="flex justify-between gap-3 items-center">
              <h2 className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                Gas Out
              </h2>
              <div className="md:text-xl text-[10px] font-orbitron">
                <span className="font-normal leading-normal text-[#FF9900]">
                  BAL
                </span>
                <span className="font-normal leading-normal text-[#FF9900]">
                  {" "}
                  :{" "}
                </span>
                <span className="text-white leading-normal">
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
            <div className="flex w-full mt-6 md:gap-10 gap-2">
              <div className="lg:md:max-w-[210px] w-full relative">
                <div className="relative">
                  <div className="absolute left-0 top45 z-[9]">
                    <ChainSelector
                      onSwitch={(fn) => {
                        switchRef.current = fn;
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full md:h-[53px] h-9">
                {(() => {
                  const formattedValue = formatNumber(amount?.toString() || "");
                  const defaultFontSize =
                    window.innerWidth >= 1024
                      ? 40
                      : window.innerWidth >= 768
                        ? 30
                        : 20;
                  const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 5;
                  const SHRINK_RATE = 3;

                  const outputLength = formattedValue.replace(/\D/g, "").length;

                  const excessDigits = Math.max(0, outputLength - FREE_DIGITS);
                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE,
                  );

                  return (
                    <>
                      <input
                        id="amount"
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.1"
                        className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    </>
                  );
                })()}
                <div
                  onClick={() => {
                    if (!isBalanceLoading && balanceData) {
                      setAmount(truncateToSixDecimals(balanceData.formatted));
                      setSelectedPercentage(100);
                    }
                  }}
                  className="relative flex-flex-col justify-end items-end w-full cursor-pointer mt-2"
                >
                  <p className="ml-auto py-1 border border-[#FFE7C3] flex justify-center items-center rounded-xl md:text-[10px] text-[8px] font-medium font-orbitron md:w-[100px] w-[100px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black">
                    Max Amount
                  </p>
                  {/* USD Value Display */}
                  <div className="text-right text-white text-xs mt-2 font-orbitron">
                    {isFromPriceLoading ? (
                      <span className="animate-pulse">Fetching...</span>
                    ) : fromTokenPrice ? (
                      <span>${fromUsdValue}</span>
                    ) : (
                      <span>--</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-2 items-center md:mt-10 mt-7">
              <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                {isFromPriceLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : fromTokenPrice ? (
                  `$${parseFloat(fromTokenPrice).toFixed(6)}`
                ) : (
                  "--"
                )}
                <span className="font-bold">Market Price</span>
              </div>
              <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                {[25, 50, 75, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    // disabled={isLoading}
                    disabled={isBalanceLoading || !balance}
                    onClick={() => handlePercentageChange(value)}
                    className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "!text-black !bg-[#FF9900] border-[#FF9900]"
            : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
        }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
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
        <div className="lg:max-w-[650px] md:max-w-[650px] mx-auto w-full">
          <div className="relative bg_swap_box_chain">
            <div className="flex justify-between gap-3 items-center">
              <h2 className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                Gas In
              </h2>
            </div>
            <div className="flex w-full mt-6 md:gap-10 gap-2">
              <div className="lg:md:max-w-[210px] w-full relative">
                <div className="relative">{/*  */}</div>
              </div>
              <div className="w-full md:h-[53px] h-9">
                {(() => {
                  const value = formattedExpectedAmount || "";

                  // const defaultFontSize = 48;
                  const defaultFontSize =
                    window.innerWidth >= 1024
                      ? 40
                      : window.innerWidth >= 768
                        ? 30
                        : 20;

                  const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 6;
                  const SHRINK_RATE = 3;
                  const outputLength = value.replace(/\D/g, "").length;

                  const excessDigits = Math.max(0, outputLength - FREE_DIGITS);

                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE,
                  );
                  return (
                    <div className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full flex justify-end items-center outline-none border-none transition-all duration-200 ease-in-out">
                      <div
                        className={`text-white`}
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      >
                        <div> {isQuoteLoading ? "Loading" : value}</div>
                      </div>

                      {quoteError && (
                        <p className="text-[#FF9900] text-xs mt-2 absolute bottom-4 right-4">
                          Could not fetch quote. Please check inputs.
                        </p>
                      )}
                    </div>
                  );
                })()}
                {/* USD Value Display for expected amount */}
                <div className="text-right text-white text-xs mt-2 font-orbitron">
                  {isToPriceLoading ? (
                    <span className="animate-pulse">Fetching...</span>
                  ) : toTokenPrice ? (
                    <span>${toUsdValue}</span>
                  ) : (
                    <span>--</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-2 items-center md:mt-10 mt-7">
              <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                {isToPriceLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : toTokenPrice ? (
                  `$${parseFloat(toTokenPrice).toFixed(6)}`
                ) : (
                  "--"
                )}
                <span className="font-bold">Market Price</span>
              </div>
              <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                {[25, 50, 75, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    // disabled={isLoading}
                    disabled={isBalanceLoading || !balance}
                    onClick={() => handlePercentageChange(value)}
                    className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "!text-black !bg-[#FF9900] border-[#FF9900]"
            : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
        }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="lg:max-w-[650px] md:max-w-[650px] mx-auto w-full">
          <div className="my-5 relative ">
            <div className="relative w-full bg_swap_box_chain !py-9">
              <input
                type="text"
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Recipient Address"
                className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full md:pl-4 pl-4 pr-32 py-12 bg-transparent text-white font-orbitron md:text-xl text-sm truncate outline-none"
              />
              <button
                className={`!absolute !bg-transparent md:w-[100px] w-20 md:h-12 h-12 hover:opacity-70 bg-black !border !border-[#FF9900] top-3 right-3 flex justify-center items-center rounded-xl px-2 roboto !text-[#FF9900] text-base font-bold`}
                // onClick={handleSelfButtonClick}
              >
                Self
              </button>
            </div>
          </div>
          <div className="md:px-1 px-4 md:pt-3 pt-2">
            <button
              onClick={handleBridgeClick}
              disabled={!quoteData || isSending || isConfirming}
              type="button"
              className="gtw relative w-full md:h-[68px] h-11 bg-[#F59216] md:rounded-[10px] rounded-md mx-auto cursor-pointer button-trans text-center flex justify-center items-center transition-all  font-orbitron lg:text-2xl text-base font-extrabold"
            >
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
