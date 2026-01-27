import React, { useEffect, useState } from "react";
import Logo from "../../assets/images/swap-emp.png";
import Sett from "../../assets/images/setting.png";
import UpDownAr from "../../assets/images/reverse.svg";
import Usdc from "../../assets/images/usdc.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { Link } from "react-router-dom";
import Ar from "../../assets/images/reverse.svg";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";
import CPatch from "../../assets/images/rec-token.svg";
import Arrow2 from "../../assets/images/arrow-2.svg";
import Ci from "../../assets/icons/ci.png";
import Amount from "./Amount";
import TokensChains from "./TokensChains";
import { formatEther } from "viem";
import {
  useAccount,
  useSwitchChain,
  useReadContract,
  useWatchBlocks,
  useBalance,
} from "wagmi";
import { RouterABI } from "./routerAbi";
import { formatUnits } from "viem";
import Tokens from "../tokenList.json";
import { useStore } from "../../redux/store/routeStore";
import Transcation from "./Transcation";
import { Copy, Check } from "lucide-react";
import TradeDataCard from "./TradeDataCard";
import Routing from "../swap/Routing";

const Emp = ({
  setPadding,
  quoteAll,
  loading,
  selectedRoute,
  quoteData,
  setQuoteData,
}) => {
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  const [order, setOrder] = useState(false);
  const [tokenList, setTokenList] = useState([]);
  const [selectedTokenA, setSelectedTokenA] = useState([]);
  const [selectedTokenB, setSelectedTokenB] = useState([]);
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState("0");
  const [amountIn, setAmountIn] = useState("0");
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [tradeInfo, setTradeInfo] = useState(undefined);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const { address, chain } = useAccount();
  const [balanceAddress, setBalanceAddress] = useState(null);
  const { data: datas } = useBalance({ address });
  const [fees, setFees] = useState(0);
  const [minAmountOut, setMinAmountOut] = useState("0");
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  const [usdValue, setUsdValue] = useState("0.00");
  const [usdValueTokenB, setUsdValueTokenB] = useState("0.00");
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const [selfAddress, setSelfAddress] = useState("");
  const [selectedChainA, setSelectedChainA] = useState([]);
  const [selectedChainB, setSelectedChainB] = useState([]);
  // const [loading, setLoading] = useState(false);

  const handleCloseSuccessModal = () => {
    setSwapStatus("IDLE"); // Reset status when closing modal
  };
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();

  // console.log('selected Token A: ', selectedTokenA);
  // console.log('selectedRoute: ', selectedRoute);

  useEffect(() => {
    async function getTokens() {
      try {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/tokens/?network=PULSECHAIN&pageSize=10`
        );
        const data = await response.json();
        if (data?.results) {
          // setSelectedTokenA(data.results[0]);
          setSelectedTokenA(data.results);
          // setTokenList(data.results);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
      }
      try {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/tokens/?network=ETH&pageSize=10`
        );
        const data = await response.json();
        if (data?.results) {
          // setSelectedTokenB(data.results[0]);
          setSelectedTokenB(data.results);
          // setTokenList(data.results);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
      }
    }

    getTokens();
  }, []);

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress("0.00");
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(3)}`
    : "0.00";

  function setRoute(path) {
    useStore.setState({ route: path });
  }

  function setPath(path) {
    useStore.setState({ path: path });
  }

  function setAdapter(adapter) {
    useStore.setState({ adapter: adapter });
  }

  const { data: tokenBalance, isLoading } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenA.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(3) // Format to 6 decimal places
    : "0.000";

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(3) // Format to 6 decimal places
    : "0.000";

  const handlePercentageChange = (e) => {
    const percentage = e === "" ? "" : parseInt(e);
    setSelectedPercentage(percentage);
    const calculatedAmount = calculateAmount(percentage);
    setAmountIn(calculatedAmount);
  };

  // Calculate the amount based on the selected percentage
  const calculateAmount = (percentage) => {
    if (!percentage) return "";

    let balance;
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000"
    ) {
      // For native token (EMPTY_ADDRESS)
      balance = parseFloat(formattedBalance || 0);
    } else {
      // For other tokens
      balance = parseFloat(tokenBalance?.formatted || 0);
    }
    const calculatedAmount = balance * (percentage / 100);
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000" &&
      percentage === 100
    ) {
      // Leave some balance for gas fees (e.g., 0.01 units)
      return Math.max(0, calculatedAmount - 0.01).toFixed(3);
    }

    return calculatedAmount.toFixed(3);
  };

  const WETH_ADDRESS = "0xa1077a294dde1b09bb078844df40758a5d0f9a27";
  const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

  const handleTokenSelect = (token) => {
    if (isSelectingTokenA) {
      // console.log('selectedTokenA', token);

      setSelectedTokenA(token);
    } else {
      setSelectedTokenB(token);
    }

    setTokenVisible(false);
  };

  const getProvider = async () => {
    const provider = window.phantom?.solana || window.solana;

    if (provider) {
      return provider;
    } else {
      // console.log("❌ Solana provider not found. Please install Phantom Wallet: https://phantom.app/");
      window.open("https://phantom.app/", "_blank");
      return null;
    }
  };

  const handleChainSelect = async (chain) => {
    if (isSelectingTokenA) {
      // console.log('Selected Chain A:', chain);
      setSelectedChainA(chain); // Set Chain A when Token A is selected

      if (chain.name === "SOLANA") {
        const provider = await getProvider();
        if (!provider) {
          console.error("❌ Phantom provider not found.");
          return;
        }

        try {
          // Connecting to Solana with Phantom
          const response = await provider.connect({ onlyIfTrusted: false }); // Forces the pop-up
          return response.publicKey;
        } catch (error) {
          console.error("❌ Failed to connect to Phantom:", error);
        }
      }

      if (!isConnected) {
        console.error("❌ Wallet not connected!");
        return;
      }

      try {
        // Switching to the selected chain
        switchChain({ chainId: chain.chainId });
      } catch (error) {
        console.error(`❌ Failed to switch to ${chain.name}:`, error);
      }
    } else {
      // console.log('Selected Chain B:', chain);
      setSelectedChainB(chain); // Set Chain B when Token B is selected

      if (chain.name === "SOLANA") {
        const provider = await getProvider();
        if (!provider) {
          console.error("❌ Phantom provider not found.");
          return;
        }

        try {
          // Connecting to Solana with Phantom
          const response = await provider.connect({ onlyIfTrusted: false }); // Forces the pop-up
          return response.publicKey;
        } catch (error) {
          console.error("❌ Failed to connect to Phantom:", error);
        }
      }

      if (!isConnected) {
        console.error("❌ Wallet not connected!");
        return;
      }
    }
  };

  const convertToBigInt = (amount, decimals) => {
    // Add input validation
    if (!amount || isNaN(amount) || !decimals || isNaN(decimals)) {
      return BigInt(0);
    }

    try {
      const parsedAmount = parseFloat(amount);
      const parsedAmountIn = BigInt(Math.floor(parsedAmount * Math.pow(10, 6)));

      if (decimals >= 6) {
        return parsedAmountIn * BigInt(10) ** BigInt(decimals - 6);
      } else {
        return parsedAmountIn / BigInt(10) ** BigInt(6 - decimals);
      }
    } catch (error) {
      console.error("Error converting to BigInt:", error);
      return BigInt(0);
    }
  };

  // const {
  //   data,
  //   isLoading: quoteLoading,
  //   refetch: quoteRefresh,
  //   error,
  // } = useReadContract({
  //   abi: RouterABI,
  //   address: '',
  //   functionName: 'findBestPath',
  //   args: [
  //     // Add validation for amountIn and selectedTokenA
  //     amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
  //       ? convertToBigInt(
  //         parseFloat(amountIn),
  //         parseInt(selectedTokenA.decimal) || 18 // Provide default decimal if missing
  //       )
  //       : BigInt(0),
  //     selectedTokenA?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenA?.address || EMPTY_ADDRESS,
  //     selectedTokenB?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenB?.address || EMPTY_ADDRESS,
  //     BigInt('3'),
  //   ],
  // });

  // const { data: singleToken, refetch: singleTokenRefresh } = useReadContract({
  //   abi: RouterABI,
  //   address: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
  //   functionName: 'findBestPath',
  //   args: [
  //     selectedTokenA?.decimal
  //       ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
  //       : BigInt(0),
  //     selectedTokenA?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenA?.address || EMPTY_ADDRESS,
  //     selectedTokenB?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenB?.address || EMPTY_ADDRESS,
  //     BigInt('3'),
  //   ],
  // });

  // useWatchBlocks({
  //   onBlock(block) {
  //     singleTokenRefresh();
  //     quoteRefresh();
  //   },
  // });

  // const { data: feeData } = useReadContract({
  //   abi: RouterABI,
  //   address: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
  //   functionName: 'findBestPath',
  //   args: [
  //     amountIn && selectedTokenA && parseFloat(amountIn)
  //       ? convertToBigInt(parseFloat(amountIn) * 0.0028, 18)
  //       : BigInt(0),
  //     selectedTokenA?.address,
  //     selectedTokenB?.address,
  //     BigInt('3'),
  //   ],
  // });

  // useEffect(() => {
  //   const fetchConversionRateTokenA = async () => {
  //     try {
  //       // Determine which address to use for the API call
  //       const addressToFetch =
  //         selectedTokenA.address === EMPTY_ADDRESS
  //           ? WETH_ADDRESS.toLowerCase()
  //           : selectedTokenA.address.toLowerCase();

  //       const response = await fetch(
  //         `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
  //       );

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();

  //       // Validate and extract token prices
  //       const tokenPrices = data?.data?.attributes?.token_prices;
  //       if (!tokenPrices) {
  //         throw new Error('Token prices not found');
  //       }

  //       // Use the correct address to look up the price
  //       const tokenPrice =
  //         selectedTokenA.address === EMPTY_ADDRESS
  //           ? tokenPrices[WETH_ADDRESS.toLowerCase()]
  //           : tokenPrices[addressToFetch];

  //       setConversionRate(tokenPrice);
  //     } catch (error) {
  //       console.error('Error fetching token price:', error.message);
  //     }
  //   };

  //   fetchConversionRateTokenA();
  // }, [selectedTokenA.address]);

  // useEffect(() => {
  //   const fetchConversionRateTokenB = async () => {
  //     try {
  //       const addressToFetch =
  //         selectedTokenB.address === EMPTY_ADDRESS
  //           ? WETH_ADDRESS.toLowerCase()
  //           : selectedTokenB.address.toLowerCase();

  //       const response = await fetch(
  //         `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
  //       );

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();

  //       // Validate and extract token prices
  //       const tokenPrices = data?.data?.attributes?.token_prices;
  //       if (!tokenPrices) {
  //         throw new Error('Token prices not found');
  //       }

  //       // Use the correct address to look up the price
  //       const tokenPrice =
  //         selectedTokenB.address === EMPTY_ADDRESS
  //           ? tokenPrices[WETH_ADDRESS.toLowerCase()]
  //           : tokenPrices[addressToFetch];

  //       setConversionRateTokenB(tokenPrice);
  //     } catch (error) {
  //       console.error('Error fetching token price:', error.message);
  //     }
  //   };

  //   fetchConversionRateTokenB();
  // }, [selectedTokenB.address]);

  // console.log("data debug: ", data);

  // useEffect(() => {
  //   if (!data || !data.amounts || data.amounts.length === 0) {
  //     handleEmptyData();
  //     return;
  //   }

  //   if (!selectedTokenB) {
  //     setAmountOut('0');
  //     setTradeInfo(undefined);
  //     return;
  //   }

  //   // handleValidData();
  // }, [data, selectedTokenA, selectedTokenB, amountIn]);

  // Helper Functions
  // const handleEmptyData = () => {
  //   setAmountOut('0');
  //   setTradeInfo(undefined);
  //   setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  // };

  // const handleValidData = () => {
  //   const isDirectRoute =
  //     (selectedTokenA?.address === EMPTY_ADDRESS &&
  //       selectedTokenB?.address === WETH_ADDRESS) ||
  //     (selectedTokenA?.address === WETH_ADDRESS &&
  //       selectedTokenB?.address === EMPTY_ADDRESS);

  //   if (isDirectRoute) {
  //     setDirectRoute();
  //   } else {
  //     // setCalculatedRoute();
  //   }
  // };

  // const setDirectRoute = () => {
  //   setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  //   setAdapter([]);
  //   // setAmountOut(amountIn);
  // };

  // const setCalculatedRoute = () => {
  //   const amountOutValue = formatUnits(
  //     data.amounts[data.amounts.length - 1],
  //     parseInt(selectedTokenB.decimal)
  //   );
  //   const amountOutToTrimmed = (amountOutValue * 975) / 1000;
  //   // setAmountOut(amountOutToTrimmed);
  //   setAmountOut(amountOutValue);

  //   const trade = {
  //     amountIn: data.amounts[0],
  //     amountOut:
  //       (data.amounts[data.amounts.length - 1] * BigInt(98)) / BigInt(100),
  //     // data.amounts[data.amounts.length - 1],
  //     amounts: data.amounts,
  //     path: data.path,
  //     pathTokens: data.path.map(
  //       (pathAddress) =>
  //         Tokens.find((token) => token.address === pathAddress) || Tokens[0]
  //     ),
  //     adapters: data.adapters,
  //   };
  //   setRoute(data.path);
  //   setAdapter(data.adapters);
  //   setTradeInfo(trade);
  //   setIsSlippageApplied(false);
  // };

  useEffect(() => {
    setTimeout(() => {
      setPath([selectedTokenA.address, selectedTokenB.address]);
    }, 9000);
    setQuoteData(null);
    setAmountOut(null);
  }, [amountIn, selectedTokenA, selectedTokenB, selfAddress]);

  // useEffect(() => {
  //   if (conversionRate && !isNaN(conversionRate)) {
  //     const valueInUSD = (
  //       parseFloat(amountIn || 0) * parseFloat(conversionRate)
  //     ).toFixed(3);
  //     setUsdValue(valueInUSD);
  //   } else {
  //     console.error('Missing or invalid conversion rate:', conversionRate);
  //   }
  // }, [amountIn, conversionRate]);

  // useEffect(() => {
  //   if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
  //     const valueInUSD = (
  //       parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
  //     ).toFixed(3);
  //     setUsdValueTokenB(valueInUSD);
  //   } else {
  //     console.error(
  //       'Missing or invalid conversion rate:',
  //       conversionRateTokenB
  //     );
  //   }
  // }, [amountOut, conversionRateTokenB]);

  // const confirmSwap = async () => {
  //   if (selectedTokenA.address == selectedTokenB.address) {
  //     return null;
  //   }
  //   await swapTokens(
  //     (_swapStatus) => {
  //       setSwapStatus(_swapStatus);
  //     },
  //     (hash) => {
  //       setSwapHash(hash);
  //     },
  //     selectedTokenA?.address,
  //     selectedTokenB?.address,
  //     address,
  //     tradeInfo
  //   )
  //     .then(() => {
  //       setSwapSuccess(true); // Set success on transaction completion
  //       setAmountVisible(false);
  //     })
  //     .catch((error) => {
  //       console.error('Swap failed', error);
  //       setSwapSuccess(false);
  //     });
  // };
  // const getRateDisplay = () => {
  //   if (!singleToken?.amounts?.[singleToken.amounts.length - 1]) return '0';

  //   const rate = parseFloat(
  //     formatUnits(
  //       singleToken.amounts[singleToken.amounts.length - 1],
  //       parseInt(selectedTokenB.decimal)
  //     )
  //   );

  //   return isRateReversed ? (1 / rate).toFixed(3) : rate.toFixed(3);
  // };

  useEffect(() => {
    setSelectedPercentage("");
    setAmountIn("");
  }, [selectedTokenA]);

  const symbiosisRoute = selectedRoute?.type === "evm";
  // console.log("symbiosisRouteCheck", symbiosisRoute);

  const rangoRoute = typeof selectedRoute?.requestId === "string";
  // console.log("rangoRouteCheck:", rangoRoute);

  const rubicRoute = selectedRoute?.swapType === "cross-chain" || "on-chain";
  // console.log("rubicRouteCheck: ", rubicRoute);

  const formatTokenAmount = (amount, decimals) => {
    return (parseFloat(amount) / 10 ** decimals).toFixed(3);
  };

  // useEffect(() => {
  //   // console.log('selectedRoute', selectedRoute);
  //   if (selectedRoute !== null) {
  //     setAmountOut(selectedRoute?.estimate?.destinationTokenAmount);
  //   }
  // }, [selectedRoute]);

  useEffect(() => {
    if (selectedRoute) {
      let amountOutValue;

      if (symbiosisRoute) {
        // Symbiosis route
        amountOutValue = formatTokenAmount(
          selectedRoute?.tokenAmountOut?.amount,
          selectedRoute?.tokenAmountOut?.decimals
        );
      } else if (rangoRoute) {
        // Rango route
        amountOutValue = selectedRoute?.outputAmount;
      } else if (rubicRoute) {
        // Rubic route
        amountOutValue = selectedRoute?.estimate?.destinationTokenAmount;
      }
      setAmountOut(amountOutValue);
    }
  }, [selectedRoute]);

  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setActiveTokenAddress(address);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setActiveTokenAddress(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amountIn) || 0;
    if (selectedTokenA.address === EMPTY_ADDRESS) {
      return inputAmount > parseFloat(formattedBalance);
    } else {
      return inputAmount > parseFloat(tokenBalance?.formatted || "0");
    }
  };

  const getButtonText = () => {
    if (isInsufficientBalance()) {
      return "Insufficient Balance";
    }
    if (!amountOut || amountOut === "0") {
      return "Select the provider";
    }
    return "Swap";
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

  // Function to handle input changes
  const handleInputChange = (value) => {
    // Remove commas before updating state
    const rawValue = value.replace(/,/g, "");
    setAmountIn(rawValue); // Update the state with the raw number
  };

  const handleSelfButtonClick = () => {
    setSelfAddress(address); // Set the wallet address to the input field
  };

  // const minToReceive = amountOut * 0.0024;
  // const minToReceiveAfterFee = amountOut - minToReceive;
  // const receiver = '0xCa397C293789F97d77c6bc665DaF7aaAF3336BE3';

  // const quoteAll = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch(
  //       'https://api-v2.rubic.exchange/api/routes/quoteAll',
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           dstTokenAddress: selectedTokenB.address,
  //           dstTokenBlockchain:
  //             selectedTokenB?.blockchainNetwork?.toUpperCase(),
  //           referrer: 'rubic.exchange',
  //           srcTokenAddress: selectedTokenA.address,
  //           srcTokenAmount: amountIn,
  //           srcTokenBlockchain:
  //             selectedTokenA?.blockchainNetwork?.toUpperCase(),
  //           receiver: receiver,
  //         }),
  //       }
  //     );

  //     if (!response.ok) {
  //       console.error(`HTTP error! Status: ${response.status}`);
  //       return;
  //     }

  //     const data = await response.json();
  //     console.log('API Response:', data);
  //   } catch (error) {
  //     console.error('Error calling API:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <>
      <div
        className={`w-full rounded-xl xl:pb-10 lg:pt-1 md:mt-0 mt-4 relative ${
          order ? "pb-[0px]" : "2xl:pb-20 xl:pb-10 lg:pb-0 pb-[350px]"
        }`}
      >
        <div className="scales8">
          <div className="relative bg_swap_box">
            {/* <img className="bg-sell" src={Sellbox} alt="sellbox" /> */}
            <div className="flex justify-between gap-3 items-center lg:px-2">
              <div className="font-orbitron text-dark-400 md:text-2xl text-xs font-semibold leading-normal">
                You Sell
              </div>
              <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2">
                <span className="font-extrabold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className="rigamesh leading-normal">
                  {isLoading
                    ? "Loading.."
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedBalance)}`
                    : `${
                        tokenBalance
                          ? formatNumber(
                              parseFloat(tokenBalance.formatted).toFixed(3)
                            )
                          : "0.00"
                      }`}
                </span>
              </div>
            </div>
            <div className="flex w-full">
              <div className="flex md:max-w-1/2 w-full justify-between rounded-2xl py-4 md:mt-0 mt-3">
                <div
                  onClick={() => {
                    setIsSelectingTokenA(true);
                    setTokenVisible(true);
                    setSelectedPercentage("");
                    setAmountIn("");
                  }}
                  className="relative cursor-pointer flex md:gap-4 gap-1 items-center bg-black text-white md:border-2 border border-white md:rounded-xl rounded-lg md:h-20 h-12 md:px-6 px-3 md:py-2 py-2.5 margin_left_1 lg:w-[280px] md:w-[220px] w-[120px] justify-center"
                >
                  <div
                    className={`relatve flex gap-2 items-center ${
                      selectedChainA.image ? "pe-0" : ""
                    }`}
                  >
                    {selectedChainA.image && (
                      <div className="absolute md:px-3 px-1 left-0 right-0 mx-auto flex items-center gap-3 z-10 justify-center text-center">
                        <img
                          className={`${
                            selectedTokenA?.name?.length > 10
                              ? "w-3 md:w-6"
                              : selectedTokenA?.name?.length > 6
                              ? "w-4 md:w-7"
                              : "w-4 md:w-8"
                          }`}
                          src={selectedTokenA?.image}
                          alt={selectedTokenA?.name}
                        />
                        <h3
                          className={`font-bold font-orbitron text-center ${
                            selectedTokenA?.name?.length > 8
                              ? "text-[8px] lg:text-[20px]"
                              : selectedTokenA?.name?.length > 6
                              ? "text-[14px] lg:text-xl"
                              : "text-xs lg:text-base"
                          }`}
                        >
                          {selectedTokenA?.name}
                        </h3>

                        {/* <h3
                          className={`font-bold font-orbitron text-center ${
                            selectedChainA?.name?.length > 10
                              ? "text-[8px] lg:text-[12px]"
                              : selectedChainA?.name?.length > 6
                              ? "text-[10px] lg:text-sm"
                              : "text-xs lg:text-base"
                          }`}
                        >
                          {selectedChainA?.name}
                        </h3> */}
                      </div>
                    )}
                    {!selectedTokenA?.name && (
                      <span className="absolute md:px-3 px-1 lg:left-4 left-2 lg:right-0 mx-auto flex items-center justify-center !text-[#FF9900] font-bold font-orbitron lg:text-3xl md:text-base text-sm">
                        Select token
                      </span>
                    )}{" "}
                    {/* <img
                      src={CPatch}
                      className="md:w-[25px] md:h-[65px] w-[12px] h-[40px] left-bg-ele-none md:left-[168px] left-[122px] md:rotate-[60deg] rotate-[70deg] absolute z-[-1]"
                    /> */}
                    {/* {selectedChainA.image && ( */}
                    <div
                      className={`relative bg-black md:h-20 md:w-[70px] w-11 h-12 md:px-1.5 px-1 flex justify-center items-center border-2 border-white rounded-lg z-10 lg:!left-[11.5rem] md:!left-[9.5rem] !left-[5.4rem] ${
                        selectedChainA.image ? "left-40-box " : "left-40-box"
                      }`}
                    >
                      {selectedChainA?.image ? (
                        <img
                          className="md:h-12 h-7 md:p-2 p-1"
                          src={selectedChainA.image}
                          alt={selectedChainA.name || "Chain logo"}
                        />
                      ) : (
                        <img
                          src={Ci}
                          alt="ci"
                          className="md:w-14 md:h-10 h-7 object-contain"
                        />
                      )}
                    </div>
                    {/* )} */}
                  </div>
                </div>
              </div>
              {/* </div>
                </div>
              </div> */}
              <div className="md:max-w-1/2 w-full">
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[12px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
                ${
                  selectedPercentage === value
                    ? " text-white bg-black"
                    : "bg-black text-white hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                {(() => {
                  const inputLength =
                    formatNumber(parseFloat(amountIn).toFixed(0))?.replace(
                      /\D/g,
                      ""
                    ).length || 0;

                  const defaultFontSize =
                    window.innerWidth >= 1024
                      ? 48
                      : window.innerWidth >= 768
                      ? 40
                      : 32;

                  // const dynamicFontSize = Math.max(
                  //   12,
                  //   defaultFontSize - inputLength * 1.5
                  // );
                  const FREE_DIGITS = window.innerWidth >= 768 ? 6 : 5;
                  const SHRINK_RATE = 3;

                  const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE
                  );
                  return (
                    <input
                      type="text"
                      placeholder={
                        formattedChainBalance === "0.00"
                          ? "0"
                          : calculateAmount(selectedPercentage)
                      }
                      value={formatNumber(amountIn)}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className="text-[#000000] text-sh py-2 rigamesh text-end w-full leading-7 outline-none border-none bg-transparent token_input px-1 placeholder-black transition-all duration-200 ease-in-out"
                      style={{
                        fontSize: `${dynamicFontSize}px`,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
            {/* <div className="text-right text-black font-bold text-sm -mt-[14px] pe-8 roboto truncate">
              {conversionRate
                ? `$${formatNumber(usdValue)}`
                : "Fetching Rate..."}
            </div> */}
          </div>
          <div
            className="cursor-pointer"
            onClick={() => {
              const _tokenA = selectedTokenA;
              const _tokenB = selectedTokenB;
              setSelectedTokenA(_tokenB);
              setSelectedTokenB(_tokenA);
              setAmountOut("0");
            }}
          >
            <div
              className="cursor-pointer mx-auto my-4 md:pt-7 relative md:top-[-14px] top-[-10px] pt-[20px] md:w-[70px] w-12"
              onClick={() => {
                const _tokenA = selectedTokenA;
                const _tokenB = selectedTokenB;
                const _chainA = selectedChainA;
                const _chainB = selectedChainB;
                setSelectedTokenA(_tokenB);
                setSelectedTokenB(_tokenA);
                setSelectedChainA(_chainB);
                setSelectedChainB(_chainA);
              }}
            >
              <img
                src={UpDownAr}
                alt="Ar"
                className="hoverswap transition-all rounded-xl"
              />
            </div>
          </div>
          <div className="relative bg_swap_box_black">
            {/* <img className="bg-sell" src={Buybox} alt="Buybox" /> */}
            <div className="flex justify-between gap-3 items-center">
              <div className="font-orbitron text-white md:text-2xl text-xs font-semibold leading-normal">
                You Buy
              </div>
              <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2">
                <span className="font-bold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className="rigamesh leading-normal">
                  {isLoading
                    ? "Loading.."
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedChainBalanceTokenB)}`
                    : `${
                        tokenBBalance
                          ? formatNumber(
                              parseFloat(tokenBBalance.formatted).toFixed(3)
                            )
                          : "0.00"
                      }`}
                </span>
              </div>
            </div>
            <div className="flex w-full">
              <div className="w-1/2">
                <div className="flex justify-between gap-4 items-center cursor-pointer">
                  <div className="flex w-full justify-between rounded-2xl mt-4 py-4">
                    <div
                      onClick={() => {
                        setIsSelectingTokenA(false);
                        setTokenVisible(true);
                      }}
                      className="flex md:gap-4 gap-1 relative items-center justify-center bg-[#FFE6C0] text-black md:border-2 md:h-20 h-12 border border-white rounded-lg md:px-6 px-3 md:py-2 py-2.5 lg:w-[280px] md:w-[220px] w-[120px] margin_left_1"
                    >
                      <div
                        className={` flex gap-2 items-center ${
                          selectedChainB.image ? "pe-0" : ""
                        }`}
                      >
                        {/* Chain Image */}
                        {selectedTokenB.image && (
                          <div className="absolute px-3 left-0 right-0 mx-auto flex items-center justify-center gap-3 z-10">
                            <img
                              className={`${
                                selectedTokenB?.name?.length > 10
                                  ? "w-3 md:w-6"
                                  : selectedTokenB?.name?.length > 6
                                  ? "w-4 md:w-7"
                                  : "w-4 md:w-8"
                              }`}
                              src={selectedTokenB?.image}
                              alt={selectedTokenB?.name}
                            />
                            <h3
                              className={`font-bold font-orbitron text-center ${
                                selectedTokenB?.name?.length > 10
                                  ? "text-[8px] lg:text-[20px]"
                                  : selectedTokenB?.name?.length > 6
                                  ? "text-[14px] lg:text-xl"
                                  : "text-xs lg:text-base"
                              }`}
                            >
                              {selectedTokenB?.name}
                            </h3>
                          </div>
                        )}
                        {!selectedTokenB?.name && (
                          <span className="absolute md:px-3 px-1 lg:left-4 left-2 lg:right-0 mx-auto flex items-center justify-center !text-black font-bold font-orbitron lg:text-3xl md:text-base text-sm">
                            Select token
                          </span>
                        )}{" "}
                        {/* <img
                          src={CPatch}
                          className="md:w-[25px] md:h-[65px] w-[12px] h-[40px] left-bg-ele-none md:left-[168px] left-[122px] md:rotate-[60deg] rotate-[70deg] absolute z-[-1]"
                        /> */}
                        {/* {selectedChainB.image && ( */}
                        <div
                          className={`relative bg-black border md:h-20 md:w-[70px] w-11 h-12 md:px-1.5 px-1 flex justify-center items-center border-white rounded-lg z-10 lg:!left-[11.5rem] md:!left-[9.5rem] !left-[5.4rem] ${
                            selectedChainB.image
                              ? "left-40-box "
                              : "left-40-box"
                          }`}
                        >
                          {selectedChainB?.image ? (
                            <img
                              className="md:h-12 h-7 md:p-2 p-1"
                              src={selectedChainB.image}
                              alt={selectedChainB.name || "Chain logo"}
                            />
                          ) : (
                            <img
                              src={Ci}
                              alt="ci"
                              className="md:w-14 md:h-10 h-7 object-contain"
                            />
                          )}
                          {/* <img
                              className={`${
                                selectedChainB?.name?.length > 10
                                  ? "md:h-10 h-8 md:p-2 p-1"
                                  : selectedChainB?.name?.length > 6
                                  ? "md:h-10 h-8 md:p-2 p-1"
                                  : "md:h-10 h-8 md:p-2 p-1"
                              }`}
                              src={selectedChainB?.image}
                              alt={selectedChainB?.name}
                            /> */}
                        </div>
                        {/* // )} */}
                      </div>
                      {/* <svg
                    className='pointer-events-none'
                    width={11}
                    height={7}
                    viewBox='0 0 11 7'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M1.5 1.56934L5.5 5.56934L9.5 1.56934'
                      stroke='white'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg> */}
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:max-w-1/2 w-full flex items-center">
                {/* <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-10px] mb-2 md:ml-0 ml-[-40px] justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={` py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] md:w-[70px] w-11 font-medium font-orbitron px-2
                ${
                  selectedPercentage === value
                    ? " text-white bg-black"
                    : "bg-[#FF9900] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div> */}
                {(() => {
                  const inputLength =
                    formatNumber(parseFloat(amountOut).toFixed(3))?.replace(
                      /\D/g,
                      ""
                    ).length || 0;

                  const defaultFontSize =
                    window.innerWidth >= 1024
                      ? 48
                      : window.innerWidth >= 768
                      ? 40
                      : 32;

                  // const dynamicFontSize = Math.max(
                  //   12,
                  //   defaultFontSize - inputLength * 1.5
                  // );
                  const FREE_DIGITS = window.innerWidth >= 768 ? 6 : 5;
                  const SHRINK_RATE = 3;

                  const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE
                  );
                  return (
                    <input
                      type="text"
                      placeholder="0"
                      value={
                        amountOut === "0" || !amountOut
                          ? ""
                          : parseFloat(amountOut).toFixed(3)
                      }
                      readOnly
                      className="truncate text-white font-bold rigamesh text_sh text-end placeholder:text-white w-full leading-7 outline-none border-none bg-transparent ps-0 transition-all duration-200 ease-in-out"
                      style={{
                        fontSize: `${dynamicFontSize}px`,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
            {/* <div className="text-right text-white font-bold text-sm -mt-[0px] pe-8 roboto truncate">
              {conversionRateTokenB
                ? `$${formatNumber(usdValueTokenB)}`
                : "Fetching Rate..."}
            </div> */}
          </div>
          {/* grid grid-cols-[65%_30%] justify-between  */}
          {/* wallet-bg-bridge */}
          <div className="w-full md:my-9 my-4 pt-4">
            <div className="w-full border border-[#FF9900] py-7 rounded-[40px] relative">
              <input
                type="text"
                placeholder="To Address"
                value={selfAddress}
                // value={address} // Bind the input field to the state
                onChange={(e) => setSelfAddress(e.target.value)}
                className="text-white text-sm font-bold roboto text-start w-full leading-7 outline-none border-none bg-transparent md:pl-10 pl-4 pr-32"
              />
              <button
                className={`!absolute !bg-transparent w-[100px] bg-black h-12 hover:opacity-70 !border !border-white top-4 right-4 flex justify-center items-center rounded-xl px-2 roboto !text-[#FF9900] text-base font-bold`}
                onClick={handleSelfButtonClick}
              >
                Self
              </button>
            </div>
          </div>
          <div
            className={`relative flex justify-center flex-row md:mt-12 mt-11 xl:pt-0 ${
              order
                ? "xl:pt-[0px] lg:pt-[20px] pt-[550px] ttt xl:top-0 lg:top-[-140px] top-[-315px]"
                : "pt-0 top-0"
            }`}
          >
            <div className="wallet-bg-brige button">
              {/* <div className="relative flex  justify-center flex-row mt-28">

          <button
            onClick={() => setAmountVisible(true)}
            disabled={isInsufficientBalance()}
            className={`w-full button-trans mt-12 h- flex justify-center items-center rounded-xl ${isInsufficientBalance()
              ? "opacity-50 cursor-not-allowed"
              : " hover:text-black hover:bg-transparent"
              } font-orbitron text-black text-3xl font-bold`}
          >
            <img className="absolute swap-button" src={Swapbutton} />
            <span className="ps-7">{getButtonText()}</span>
          </button>
        </div> */}
              <button
                onClick={() =>
                  quoteAll(
                    selectedTokenA,
                    selectedTokenB,
                    amountIn,
                    selfAddress,
                    address
                  )
                }
                disabled={
                  loading || amountIn === "0" || !amountIn || !selfAddress
                }
                className={`gtw relative md:w-[360px] w-[250px] md:h-[68px] h-11 bg-[#FF9900] md:rounded-[10px] rounded-md mx-auto button-trans md:mt-12 mt-4 h- flex justify-center items-center  ${
                  loading || amountIn === "0" || !amountIn || !selfAddress
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } font-orbitron lg:text-2xl text-base font-extrabold`}
              >
                <div className="group-hover:opacity-80 w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[#FF9900] md:rounded-[10px] rounded-md md:h-[68px] h-11"></div>
                {/* <img className="absolute swap-button" src={Swapbutton} /> */}
                {loading ? "Processing..." : "Estimate Trade"}
              </button>
              <button
                onClick={() => setAmountVisible(true)}
                disabled={isInsufficientBalance()}
                className={`gtw relative md:w-[360px] w-[250px] md:h-[68px] h-11 bg-[#FF9900] md:rounded-[10px] rounded-md mx-auto button-trans mt-16 mb-10 h- flex justify-center items-center ${
                  isInsufficientBalance() || !amountOut || amountOut === "0"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } font-orbitron lg:text-2xl text-base font-extrabold`}
              >
                <div className="group-hover:opacity-80 w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[#FF9900] md:rounded-[10px] rounded-md md:h-[68px] h-11"></div>
                {/* <img className="absolute swap-button" src={Swapbutton} /> */}
                <span>{getButtonText()}</span>
              </button>
              {/* <img className='bg-border-img' src='src/assets/images/border-bg.svg'/> */}
            </div>
          </div>
        </div>
      </div>

      {isTokenVisible && (
        <TokensChains
          onClose={() => setTokenVisible(false)}
          onSelect={handleTokenSelect}
          onChainSelect={handleChainSelect}
        />
      )}

      <div aria-label="Modal">
        {isAmountVisible && (
          <Amount
            onClose={() => setAmountVisible(false)}
            amountIn={amountIn}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            fromAddress={address}
            selectedRoute={selectedRoute}
            quoteData={quoteData}
            toAddress={selfAddress}
          />
        )}
      </div>
      {/* Routing  */}
      {/* <div className="mt-3 lg:fixed absolute md:left-0 lefts 2xl:bottom-[31%] lg:bottom-[31%] md:bottom-[16%] bottom-[275px] z-40">
        <div className="relative">
          <div className="w-full border-3 border-white rounded-xl-view py-4 2xl:px-7 lg:px-5 px-4 bg-black min-w-[240px] scale81 relative max-w-[302px] mxauto round">
            <div className="flex justify-center gap-2 md:flex-nowrap flex-wrap absolute left-0 right-0 -top-7">
              <p className="w-[194px] h-[28px] flex justify-center items-center bg-[#FF9900] font-orbitron text-black text-base font-semibold border-2 border-white border-b-0 py-2 border-radius-w">
                Routing
              </p>
            </div>
            <div className="flex justify-center gap-5 items-center mt-1">
              <div className="flex flex-col items-center">
                <img
                  className="w-4 h-4 object-contain flex flex-shrink-0"
                  alt="PLS"
                  src="https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/0xA1077a294dDE1B09bB078844df40758a5D0f9a27.png"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <img
                    className="w-4 h-4 flex flex-shrink-0 object-contain"
                    src={Arrow2}
                    alt="Arrow"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <img
                  className="w-4 h-4 object-contain flex flex-shrink-0"
                  alt="PLSX"
                  src="https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/0x95B303987A60C71504D99Aa1b13B4DA07b0790ab.png"
                />
              </div>
            </div>
          </div>
        </div>
      </div> */}
      {/* Routing  */}
      <TradeDataCard
        amountIn={amountIn}
        tokenA={selectedTokenA}
        tokenB={selectedTokenB}
        fromAddress={address}
        selectedRoute={selectedRoute}
        quoteData={quoteData}
        toAddress={selfAddress}
      />
    </>
  );
};

export default Emp;
