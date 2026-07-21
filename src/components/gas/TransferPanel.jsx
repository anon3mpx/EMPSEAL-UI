import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { useGetCalldataQuote } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeTx } from "../../hooks/useGasBridgeTx";
import { formatEther } from "viem";
import { toast } from "../../utils/toastHelper";
import ChainSelector, { ChainLogo } from "../../components/gas/ChainSelector";
import UpDownAr from "../../assets/images/reverse.svg";
import TransactionHistory from "./TransactionHistory";
import { useGetChains } from "../../hooks/useGasBridgeAPI";
import {
  filterDisplayGasChains,
  formatBridgeFee,
  formatGasChainPrice,
  GAS_CHAIN_PAGE_SIZE,
} from "./gasPriceHelpers";

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
    setToChain,
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

  const { data: chains = [], isLoading: chainsLoading } = useGetChains();

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
  const bridgeFeeLabel = formatBridgeFee(quoteData?.quotes?.[0]);
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
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

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
          // console.log(`Chain ${fromChainId} not supported for price fetching`);
          setFromTokenPrice(null);
          setIsFromPriceLoading(false);
          return;
        }

        let price = null;
        let fetchSuccess = false;

        try {
          const response = await fetch(
            `https://api.geckoterminal.com/api/v2/simple/networks/${networkSymbol}/token_price/${wrappedTokenAddress.toLowerCase()}`,
          );
          if (!response.ok) throw new Error("GeckoTerminal API failed");
          const data = await response.json();
          const tokenPrices = data?.data?.attributes?.token_prices;
          if (tokenPrices && tokenPrices[wrappedTokenAddress.toLowerCase()]) {
            price = tokenPrices[wrappedTokenAddress.toLowerCase()];
            fetchSuccess = true;
          }
        } catch (error) {
          console.warn(
            "GeckoTerminal failed, falling back to DexScreener:",
            error,
          );
        }

        if (!fetchSuccess) {
          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${wrappedTokenAddress}`,
            );
            if (!response.ok) throw new Error("DexScreener API failed");
            const data = await response.json();
            if (data.pairs && data.pairs.length > 0) {
              const pair =
                data.pairs.find(
                  (p) =>
                    p.baseToken.address.toLowerCase() ===
                    wrappedTokenAddress.toLowerCase(),
                ) || data.pairs[0];
              if (pair && pair.priceUsd) {
                price = pair.priceUsd;
                fetchSuccess = true;
              }
            }
          } catch (error) {
            console.error("DexScreener API also failed:", error);
          }
        }

        if (price) {
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
          // console.log(`Chain ${toChainId} not supported for price fetching`);
          setToTokenPrice(null);
          setIsToPriceLoading(false);
          return;
        }

        let price = null;
        let fetchSuccess = false;

        try {
          const response = await fetch(
            `https://api.geckoterminal.com/api/v2/simple/networks/${networkSymbol}/token_price/${wrappedTokenAddress.toLowerCase()}`,
          );
          if (!response.ok) throw new Error("GeckoTerminal API failed");
          const data = await response.json();
          const tokenPrices = data?.data?.attributes?.token_prices;
          if (tokenPrices && tokenPrices[wrappedTokenAddress.toLowerCase()]) {
            price = tokenPrices[wrappedTokenAddress.toLowerCase()];
            fetchSuccess = true;
          }
        } catch (error) {
          console.warn(
            "GeckoTerminal failed, falling back to DexScreener:",
            error,
          );
        }

        if (!fetchSuccess) {
          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${wrappedTokenAddress}`,
            );
            if (!response.ok) throw new Error("DexScreener API failed");
            const data = await response.json();
            if (data.pairs && data.pairs.length > 0) {
              const pair =
                data.pairs.find(
                  (p) =>
                    p.baseToken.address.toLowerCase() ===
                    wrappedTokenAddress.toLowerCase(),
                ) || data.pairs[0];
              if (pair && pair.priceUsd) {
                price = pair.priceUsd;
                fetchSuccess = true;
              }
            }
          } catch (error) {
            console.error("DexScreener API also failed:", error);
          }
        }

        if (price) {
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

  // New
  const scaledFs = (val, isMobile = false) => {
    const digits = val?.replace(/[^0-9]/g, "").length || 0;
    if (isMobile) {
      if (digits >= 14) return "1.25rem";
      if (digits >= 12) return "1.4rem";
      if (digits >= 10) return "1.6rem";
      if (digits >= 8) return "1.8rem";
      return "2rem";
    }
    if (digits >= 16) return "1.4rem";
    if (digits >= 14) return "1.6rem";
    if (digits >= 12) return "2rem";
    if (digits >= 11) return "2.4rem";
    return "clamp(2.2rem, 5vw, 3rem)";
  };
  const [page, setPage] = useState(0);
  const displayGasChains = useMemo(
    () => filterDisplayGasChains(chains),
    [chains],
  );
  const totalPages = Math.ceil(displayGasChains.length / GAS_CHAIN_PAGE_SIZE);
  const safeTotalPages = Math.max(totalPages, 1);
  const paginatedChains = displayGasChains.slice(
    page * GAS_CHAIN_PAGE_SIZE,
    (page + 1) * GAS_CHAIN_PAGE_SIZE,
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, safeTotalPages - 1));
  }, [safeTotalPages]);
  //
  return (
    <>
      <div className="gas-header">
        <p className="gas-header-title">LIVE GAS PRICES</p>
        <div className="flex items-center gap-2">
          <span className="gas-page-indicator">
            {page + 1} / {safeTotalPages}
          </span>
          <button
            className={`gas-nav-btn ${page === 0 ? "disabled" : ""}`}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
          >
            <svg width={10} height={10} viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            className={`gas-nav-btn ${
              page >= safeTotalPages - 1 ? "disabled" : ""
            }`}
            onClick={() => setPage((p) => Math.min(p + 1, safeTotalPages - 1))}
            disabled={page >= safeTotalPages - 1}
          >
            <svg width={10} height={10} viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="gas-chain-grid">
        {chainsLoading ? (
          <p className="text-white text-xs">Loading chains...</p>
        ) : paginatedChains.length === 0 ? (
          <p className="text-white text-xs">No gas data available.</p>
        ) : (
          paginatedChains.map((chain) => {
            const gasPrice = formatGasChainPrice(chain);

            return (
              <button
                key={chain.chain}
                onClick={() => setToChain(chain.chain)}
                className={`gas-chain-card ${
                  toChainId === chain.chain ? "active" : ""
                }`}
              >
                <div className="gas-chain-top">
                  <div className="gas-chain-icon uppercase overflow-hidden">
                    <ChainLogo
                      chain={{
                        ...chain,
                        logoURI: chain.logo,
                        shortName:
                          chain.name
                            ?.match(/^\w+/)?.[0]
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "") ?? "",
                      }}
                      className="w-4 h-4 object-cover rounded-full"
                    />
                  </div>
                  <div className="gas-chain-status" />
                </div>
                <p className="gas-chain-name">{chain.name}</p>
                <p className="gas-chain-price">{gasPrice.transferCost}</p>
                <p className="gas-chain-meta">
                  avg transfer · {gasPrice.gasUnit}
                </p>
              </button>
            );
          })
        )}
      </div>
      <div className="md:max-w-[480px] mx-auto w-full md:px-0 px-1">
        {/*  */}
        <div className="w-full">
          <div className="relative bg-[#070710] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
            <div className="px-[20px] py-[18px] border-b border-white/5">
              <h3 className="text-[13px] font-bold text-white tracking-[0.08em]">
                SEND GAS
              </h3>
              <p className="text-[10px] text-white/20 mt-[2px] tracking-[0.04em]">
                Bridge native gas to any chain
              </p>
            </div>
            <div className="p-4">
              <div className="flex justify-between gap-3 items-center">
                <h2 className="you_pay_heading">SOURCE CHAIN</h2>
                <div className="md:text-xs text-[10px] ">
                  <span className="font-normal leading-normal text-[#FF8A00]">
                    BAL
                  </span>
                  <span className="font-normal leading-normal text-[#FF8A00]">
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
              <div className="flex w-full justify-end mt-3 md:gap-5 gap-2">
                <div className="lg:md:max-w-[210px] w-full relative">
                  <div className="relative">
                    <div className="absolute right-0 top45 z-[8]">
                      <ChainSelector
                        setIsChainModalOpen={setIsChainModalOpen}
                        onSwitch={(fn) => {
                          switchRef.current = fn;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-10 mt-7">
                <div className="you_pay_heading flex flex-col relative top-2">
                  {isFromPriceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : fromTokenPrice ? (
                    `$${parseFloat(fromTokenPrice).toFixed(6)}`
                  ) : (
                    "--"
                  )}
                  <span className="mt-1">Market Price</span>
                </div>
              </div>
              {/* USD Value Display */}
              <div className="text-right text-white text-xs mt-2 ">
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
        {/*  */}
        <div className="separator">
          <div className="separator-inner">
            <button
              onClick={() => switchRef.current && switchRef.current()}
              className="separator-btn"
            >
              <svg
                width="11"
                height="11"
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
        {/*  */}
        <div className="w-full">
          <div className="relative bg-[#070710] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.7)] p-4">
            <div className="flex justify-between gap-3 items-center">
              <h2 className="you_pay_heading">DESTINATION CHAIN</h2>
            </div>
            <div className="flex w-full justify-end mt-3 md:gap-5 gap-2">
              <div className="lg:md:max-w-[210px] w-full relative">
                <div className="relative">{/*  */}</div>
              </div>
            </div>
            <div className="flex justify-between gap-2 items-center md:mt-3 mt-2">
              <div className="you_pay_heading flex flex-col relative top-2">
                {isToPriceLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : toTokenPrice ? (
                  `$${parseFloat(toTokenPrice).toFixed(6)}`
                ) : (
                  "--"
                )}
                <span className="mt-1">Market Price</span>
              </div>
            </div>
            {/* USD Value Display for expected amount */}
            <div className="text-right text-white text-xs mt-2 ">
              {isToPriceLoading ? (
                <span className="animate-pulse">Fetching...</span>
              ) : toTokenPrice ? (
                <span>${toUsdValue}</span>
              ) : (
                <span>--</span>
              )}
            </div>
            {/*  */}
            <p className="text-[9px] font-bold tracking-[0.2em] text-white/20 my-2">
              AMOUNT (BASE)
            </p>
            <div className="w-full">
              {(() => {
                const rawAmount = amount?.replace(/,/g, "") || "0";
                const isMobile = window.innerWidth < 768;

                return (
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    className="
                    w-full 
                    bg-white/[0.03] 
                    border border-white/[0.07] 
                    rounded-none 
                    outline-none 
                    text-white 
                    placeholder:text-white/15 
                    px-3 py-1
                    font-light
                    text-[clamp(1.2rem,4vw,1.8rem)]"
                    style={{
                      fontSize: scaledFs(rawAmount, isMobile),
                    }}
                  />
                );
              })()}
            </div>
            <div
              className={`mt-4 grid md:grid-cols-4 grid-cols-2 md:gap-2 gap-2 relative ${isChainModalOpen ? "z-[5]" : "z-[10]"}`}
            >
              {[25, 50, 75, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  // disabled={isLoading}
                  disabled={isBalanceLoading || !balance}
                  onClick={() => handlePercentageChange(value)}
                  className={`slippage-btn
         ${
           selectedPercentage === value
             ? "!text-[#FF8A00]/80 !bg-white/[0.03] border border-white/[0.07] !"
             : "text-[#FF8A00]/80 !bg-white/[0.03] hover:text-[#FF8A00]/80 hover:border-[#FF8A00]/80 hover:bg-[#FF8A00]/5"
         }`}
                >
                  {value}%
                </button>
              ))}
            </div>
            <div className="mb-[14px] py-[10px] border-t border-white/[0.05]">
              <div className="flex justify-between py-[4px] border-b border-white/[0.04]">
                <div className="text-[10px] text-white/[0.22] whitespace-nowrap">
                  DESTINATION CHAIN
                </div>
                <div className="text-[10px] font-semibold text-white/[0.55] w-full text-right">
                  <div className="w-full text-right">
                    {(() => {
                      const value = formattedExpectedAmount || "";
                      const isMobile = window.innerWidth < 768;
                      const rawValue = value.toString().replace(/,/g, "");
                      return (
                        <input
                          type="text"
                          value={isQuoteLoading ? "Loading..." : value}
                          readOnly
                          className="bg-transparent text-right w-full outline-none !text-[10px] font-semibold text-white/[0.55] placeholder:text-white/10"
                          style={{
                            fontSize: scaledFs(rawValue, isMobile),
                            fontWeight: 200,
                            letterSpacing: "-0.04em",
                            lineHeight: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        />
                      );
                    })()}
                  </div>
                  {quoteError && (
                    <p className="text-[10px] text-white/[0.22] text-normal uppercase mt-2 text-right">
                      Could not fetch quote. Please check inputs.
                    </p>
                  )}
                </div>
              </div>
              {bridgeFeeLabel ? (
                <div className="flex justify-between py-[4px] border-b border-white/[0.04]">
                  <span className="text-[10px] text-white/[0.22]">
                    Bridge Fee
                  </span>
                  <span className="text-[10px] font-semibold text-white/[0.55]">
                    {bridgeFeeLabel}
                  </span>
                </div>
              ) : null}

              {/* <div className="flex justify-between py-[4px] border-b border-white/[0.04]">
                <span className="text-[10px] text-white/[0.22]">
                  Estimated Time
                </span>
                <span className="text-[10px] font-semibold text-white/[0.55]">
                  ~8 min
                </span>
              </div>

              <div className="flex justify-between py-[4px] border-b border-white/[0.04]">
                <span className="text-[10px] text-white/[0.22]">
                  You Receive
                </span>
                <span className="text-[10px] font-semibold text-white/[0.55]">
                  233.719200 ETH
                </span>
              </div> */}
              <div className="flex justify-between py-[4px]">
                <span className="text-[10px] text-white/[0.22]">Route</span>
                <span className="text-[10px] font-semibold text-white/[0.55]">
                  {chains.find((c) => c.chain === fromChainId)?.symbol} →
                  {chains.find((c) => c.chain === toChainId)?.symbol}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full">
          <div className="relative">
            <div className="relative w-full !border-t-0 bg_swap_box p-4 flex justify-between gap-2 items-center">
              <input
                type="text"
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Recipient Address"
                className="bg-transparent w-full outline-none text-white placeholder:text-white/10 md:text-xs text-[10px]"
              />
              <button
                className={`slippage-btn md:!px-5 !px-3 uppercase !py-3 hover:!text-white hover:!bg-[#FF8A00]/5 hover:border-[#FF8A00]`}
                // onClick={handleSelfButtonClick}
              >
                Self
              </button>
            </div>
          </div>
          <div className="bg-[#070710] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.7)] p-4 !border-t-0">
            <button
              onClick={handleBridgeClick}
              disabled={!quoteData || isSending || isConfirming}
              type="button"
              className="cursor-pointer gtw relative z-50 w-full uppercase md:h-12 h-11 bg-[#FF8A00] mx-auto font-bold button-trans h- flex justify-center items-center transition-all"
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
      <div className="md:max-w-[480px] mx-auto w-full md:px-0 px-1">
        <p className="text-[9px] font-bold tracking-[0.25em] text-white/20 my-[10px]">
          RECENT GAS TRANSFERS
        </p>
        <TransactionHistory />
      </div>
      {/*  */}
    </>
  );
};

export default TransferPanel;
