import { useEffect, useState, useMemo, useRef } from "react";
import Routing from "./Routing";

import { useSearchParams } from "react-router-dom";
import Ar from "../../assets/images/reverse.svg";
import Amount from "./Amount";
import Token from "./Token";
import { formatEther, formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import SlippageCalculator from "./SlippageCalculator";
import { EmpsealRouterLiteV3 } from "../../utils/lite/EmpsealRouterLiteV3";
import Tokens from "../tokenList.json";
import { useStore } from "../../redux/store/routeStore";
import Transaction from "./Transaction";
import { Copy, Check, InfoIcon } from "lucide-react";
import { useChainConfig } from "../../hooks/useChainConfig";
import ProvidersListNew from "../bridge/ProvidersList-new";
// import { SmartRouter } from "../../utils/services/SmartRouter";
import {
  checkAllowance,
  callApprove,
  EMPTY_ADDRESS,
} from "../../utils/contractCalls";
import { swapTokens } from "../../utils/contractCalls";
import { useConnectPopup } from "../../hooks/ConnectPopupContext";
import {
  PLS_ROUTER_ABI,
  ETHW_ROUTER_ABI,
  SONIC_ROUTER_ABI,
  BASECHAIN_ROUTER_ABI,
  SEI_ROUTER_ABI,
  BERA_ROUTER_ABI,
  ROOTSTOCK_ROUTER_ABI,
} from "../../utils/abis/empSealRouterAbi";
import { toast } from "../../utils/toastHelper";
import { usePriceMonitor } from "../../hooks/usePriceMonitor";

import { WPLS } from "../../utils/abis/wplsABI";
import { WETHW } from "../../utils/abis/wethwABI";
import { WSONIC } from "../../utils/abis/wsonicABI";
import { WETH } from "../../utils/abis/wethBaseABI";
import { WSEI } from "../../utils/abis/wseiABI";
import { WBERA } from "../../utils/abis/wberaABI";
import { WRBTC } from "../../utils/abis/wrbtcABI";

import { SlippageCalculator as LimitOrderSlippageCalculator } from "../limit-orders/SlippageCalculator";

import OrderListItems from "../limit-orders/LimitOrder";
import { set } from "zod";

const getWrappedTokenABI = (chainId) => {
  switch (chainId) {
    case 10001:
      return WETHW;
    case 146:
      return WSONIC;
    case 8453:
      return WETH;
    case 1329:
      return WSEI;
    case 80094:
      return WBERA;
    case 30:
      return WRBTC;
    case 369:
    default:
      return WPLS;
  }
};

const getRouterABI = (chainId) => {
  switch (chainId) {
    case 10001:
      return ETHW_ROUTER_ABI;
    case 146:
      return SONIC_ROUTER_ABI;
    case 8453:
      return BASECHAIN_ROUTER_ABI;
    case 1329:
      return SEI_ROUTER_ABI;
    case 80094:
      return BERA_ROUTER_ABI;
    case 30:
      return ROOTSTOCK_ROUTER_ABI;
    case 369:
    default:
      return PLS_ROUTER_ABI;
  }
};

const Emp = ({ setPadding, setBestRoute, onTokensChange, activeTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageVisible, setSlippageVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  const [order, setOrder] = useState(false);
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [selectedTokenA, setSelectedTokenA] = useState(null);
  const [selectedTokenB, setSelectedTokenB] = useState(null);

  useEffect(() => {
    if (onTokensChange) {
      onTokensChange(selectedTokenA, selectedTokenB);
    }
  }, [selectedTokenA, selectedTokenB, onTokensChange]);

  // Handle activeTab prop changes from DotsMenu
  useEffect(() => {
    const tab = searchParams.get("tab");
    setOrder(tab === "limit");
  }, [searchParams]);

  // const [selectedTokenA, setSelectedTokenA] = useState(null);
  // const [selectedTokenB, setSelectedTokenB] = useState(null);
  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState("0");
  const [amountIn, setAmountIn] = useState("0");
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const { address, chain } = useAccount();
  const { openConnectPopup } = useConnectPopup();
  const [balanceAddress, setBalanceAddress] = useState(null);
  const { data: datas } = useBalance({ address });
  const [fees, setFees] = useState(0);
  const [minAmountOut, setMinAmountOut] = useState("0");
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  const [usdValue, setUsdValue] = useState("0.00");
  const [usdValueTokenB, setUsdValueTokenB] = useState("0.00");
  const [usdValueTokenA, setUsdValueTokenA] = useState("0.00");
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const [isPartialFill, setIsPartialFill] = useState(false);
  // const [smartRouter, setSmartRouter] = useState(null);
  // const [bestRoute, setBestRoute] = useState(null);
  // const [localBestRoute, setLocalBestRoute] = useState(null);

  const [isQuoting, setIsQuoting] = useState(false);
  const [isLoadingBetterQuote, setIsLoadingBetterQuote] = useState(false);
  const [protocolFee, setProtocolFee] = useState(28);
  const [limitOrderSlippage, setLimitOrderSlippage] = useState(0.5);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [tradeInfo, setTradeInfo] = useState(undefined);

  // Debounce and request tracking for quote fetching
  const [debouncedAmountIn, setDebouncedAmountIn] = useState("0");
  // const quoteRequestIdRef = useRef(0);
  // const lastCompletedIdRef = useRef(0); // Track last completed request

  // Price monitor state
  const [initialQuote, setInitialQuote] = useState("");
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [newQuote, setNewQuote] = useState("");
  const [percentChange, setPercentChange] = useState(0);

  // New state variables
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isSell, setIsSell] = useState(true);

  const { writeContractAsync } = useWriteContract();
  // Toggle function
  const togglePartialFill = () => {
    setIsPartialFill((prev) => !prev);
  };

  const {
    chain: currentChain,
    chainId,
    symbol,
    tokenList,
    adapters,
    routerAddress,
    wethAddress,
    featureTokens,
    blockExplorer,
    blockExplorerName,
    maxHops,
    stableTokens,
  } = useChainConfig();

  const publicClient = usePublicClient({ chainId });

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

  // Check if it's a direct route (native to wrapped or wrapped to native)
  const isDirectRoute = useMemo(() => {
    return (
      (selectedTokenA?.address === EMPTY_ADDRESS &&
        selectedTokenB?.address === wethAddress) ||
      (selectedTokenA?.address === wethAddress &&
        selectedTokenB?.address === EMPTY_ADDRESS)
    );
  }, [selectedTokenA?.address, selectedTokenB?.address, wethAddress]);

  // Get the appropriate router ABI based on chainId
  const routerABI = useMemo(() => getRouterABI(chainId), [chainId]);

  // Use findBestPath to get quotes from the router contract
  const {
    data,
    isLoading: quoteLoading,
    refetch: quoteRefresh,
    error,
  } = useReadContract({
    abi: routerABI,
    address: routerAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
        ? convertToBigInt(
          parseFloat(amountIn),
          parseInt(selectedTokenA.decimal) || 18,
        )
        : BigInt(0),
      selectedTokenA?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt(maxHops?.toString() || "3"),
    ],
    enabled:
      !isDirectRoute &&
      !!selectedTokenA &&
      !!selectedTokenB &&
      !!amountIn &&
      parseFloat(amountIn) > 0,
  });

  // Get single token price for rate display
  const { data: singleToken, refetch: singleTokenRefresh } = useReadContract({
    abi: routerABI,
    address: routerAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      selectedTokenA?.decimal
        ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
        : BigInt(0),
      selectedTokenA?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt(maxHops?.toString() || "3"),
    ],
    enabled: !isDirectRoute && !!selectedTokenA && !!selectedTokenB,
  });

  // Update quoting state based on loading
  useEffect(() => {
    setIsQuoting(quoteLoading);
  }, [quoteLoading]);

  const DEADLINE_MINUTES = 10;
  const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

  // Process findBestPath data to update quotes
  useEffect(() => {
    if (isDirectRoute) {
      setDirectRoute();
      return;
    }

    if (!data || !data.amounts || data.amounts.length === 0) {
      handleEmptyData();
      return;
    }

    // Check if router found a valid path (needs at least 2 amounts and 2 path elements)
    if (data.amounts.length < 2 || !data.path || data.path.length < 2) {
      console.warn("Router could not find a valid path for this token pair", {
        amounts: data.amounts,
        path: data.path,
        adapters: data.adapters,
        tokenIn: selectedTokenA?.address,
        tokenOut: selectedTokenB?.address,
      });
      handleEmptyData();
      return;
    }

    if (!selectedTokenB) {
      setAmountOut("0");
      setTradeInfo(undefined);
      return;
    }

    setCalculatedRoute();
  }, [data, selectedTokenA, selectedTokenB, amountIn, isDirectRoute]);

  // Refresh quotes when tokens or amount changes
  useEffect(() => {
    if (quoteRefresh) {
      quoteRefresh();
    }
    if (singleTokenRefresh) {
      singleTokenRefresh();
    }
    setPath([selectedTokenA?.address, selectedTokenB?.address]);
  }, [
    amountIn,
    selectedTokenA,
    selectedTokenB,
    quoteRefresh,
    singleTokenRefresh,
  ]);

  // Reset selected tokens and quoting state when chain changes
  useEffect(() => {
    setSelectedTokenA(null);
    setSelectedTokenB(null);
    setAmountIn("0");
    setAmountOut("0");
    setIsQuoting(false);
    setIsRoutingLoading(false);
    setTradeInfo(undefined);
  }, [chainId]);

  // Dynamic Fee Update
  useEffect(() => {
    if (selectedTokenA && selectedTokenB) {
      const isStable = (address) =>
        stableTokens?.some(
          (stable) => stable.toLowerCase() === address.toLowerCase(),
        ) || false;

      if (
        isStable(selectedTokenA.address) ||
        isStable(selectedTokenB.address)
      ) {
        setProtocolFee(15); // 0.15% for stable pairs
      } else {
        setProtocolFee(28); // 0.28% for volatile pairs
      }
    } else {
      setProtocolFee(28); // Default for other chains or if undefined
    }
  }, [chainId, selectedTokenA, selectedTokenB, stableTokens]);

  const handleCloseSuccessModal = () => {
    setSwapStatus("IDLE"); // Reset status when closing modal
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmountIn(amountIn);
    }, 600);
    return () => clearTimeout(timer);
  }, [amountIn]);

  // Helper Functions
  const handleEmptyData = () => {
    setAmountOut("0");
    setTradeInfo(undefined);
    setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  };

  // Set direct route (native to wrapped or vice versa)
  const setDirectRoute = () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut("0");
      return;
    }

    const tokenAAddress =
      selectedTokenA?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS;

    const tokenBAddress =
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS;

    // Set route with replaced native token address
    setRoute([tokenAAddress, tokenBAddress]);
    setAdapter([]); // No adapters needed for direct routes

    // For direct routes, amount out should be same as amount in
    setAmountOut(amountIn);

    // Create trade object directly without using findBestPath data
    const amountInBigInt =
      amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
        ? convertToBigInt(
          parseFloat(amountIn),
          parseInt(selectedTokenA.decimal) || 18,
        )
        : BigInt(0);

    const trade = {
      amountIn: amountInBigInt,
      amountOut: amountInBigInt, // Same as input for direct routes
      amounts: [amountInBigInt, amountInBigInt], // Only start and end amounts
      path: [tokenAAddress, tokenBAddress],
      pathTokens: [selectedTokenA, selectedTokenB],
      adapters: [], // No adapters for direct routes
    };

    setTradeInfo(trade);
    setIsSlippageApplied(false);
  };

  // Process the findBestPath result and set the calculated route
  const setCalculatedRoute = () => {
    if (isDirectRoute) return;
    if (!data || !data.amounts || data.amounts.length === 0) {
      console.error("Invalid swap data received");
      return;
    }

    const amountOutValue = formatUnits(
      data.amounts[data.amounts.length - 1],
      parseInt(selectedTokenB.decimal),
    );
    setAmountOut(amountOutValue);

    const trade = {
      amountIn: data.amounts[0],
      amountOut:
        (data.amounts[data.amounts.length - 1] * BigInt(98)) / BigInt(100),
      amounts: data.amounts,
      path: data.path,
      pathTokens: data.path.map(
        (pathAddress) =>
          tokenList.find((token) => token.address === pathAddress) ||
          tokenList[0],
      ),
      adapters: data.adapters,
    };
    setRoute(data.path);
    setAdapter(data.adapters);
    setTradeInfo(trade);
    setIsSlippageApplied(false);
  };

  // Check approval status whenever token or amount changes
  useEffect(() => {
    const checkApproval = async () => {
      if (
        !address ||
        !selectedTokenA ||
        selectedTokenA.address === EMPTY_ADDRESS ||
        !debouncedAmountIn ||
        parseFloat(debouncedAmountIn) <= 0
      ) {
        setNeedsApproval(false);
        return;
      }

      try {
        const amountInBigInt = convertToBigInt(
          debouncedAmountIn,
          selectedTokenA.decimal,
        );
        const allowance = await checkAllowance(
          chainId,
          selectedTokenA.address,
          address,
        );

        setNeedsApproval(allowance.data < amountInBigInt);
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    };

    checkApproval();
  }, [chainId, address, selectedTokenA, debouncedAmountIn]);

  const handleApprove = async () => {
    try {
      setSwapStatus("APPROVING");
      const amountInBigInt = convertToBigInt(amountIn, selectedTokenA.decimal);

      await callApprove(chainId, selectedTokenA.address, amountInBigInt);

      // Re-check allowance to update UI immediately
      const allowance = await checkAllowance(
        chainId,
        selectedTokenA.address,
        address,
      );

      if (allowance.data >= amountInBigInt) {
        setNeedsApproval(false);
        setSwapStatus("APPROVED");
        toast.success("Token approved!");

        // Show waiting for confirmation before proceeding to swap
        setSwapStatus("WAITING_FOR_CONFIRMATION");

        // Automatically proceed to swap after successful approval
        await confirmSwap();
      }
    } catch (error) {
      setSwapStatus("ERROR");
      console.error("Approval failed:", error);
      toast.error("Token approval failed");
    }
  };

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress("0.00");
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(6)}`
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
    token: selectedTokenA?.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000";

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB?.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000";

  const handlePercentageChange = (e) => {
    const percentage = e === "" ? "" : parseInt(e);
    setSelectedPercentage(percentage);
    const calculatedAmount = calculateAmount(percentage);
    setAmountIn(calculatedAmount);
  };

  // Calculate the amount based on the selected percentage
  const calculateAmount = (percentage) => {
    if (!percentage || !selectedTokenA) return "";

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
      return Math.max(0, calculatedAmount).toFixed(6);
    }
    return calculatedAmount.toFixed(6);
  };

  // const WETH_ADDRESS = "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990";
  // const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

  const handleTokenSelect = (token) => {
    if (isSelectingTokenA) {
      setSelectedTokenA(token);
    } else {
      setSelectedTokenB(token);
    }
    setTokenVisible(false);
  };

  const handleSlippageCalculated = (adjustedAmount) => {
    const tokenDecimals = selectedTokenB.decimal;
    const decimalAdjusted = Number(adjustedAmount) / 10 ** tokenDecimals;

    // Update states
    setMinAmountOut(adjustedAmount);
    setAmountOut(decimalAdjusted);

    // Reset minAmountOut if needed
    setMinAmountOut("0");
  };

  useEffect(() => {
    const fetchConversionRateTokenA = async () => {
      try {
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenA?.address) {
          console.error("Missing required data for token A price fetch");
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenA?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenA?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenA?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRate(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenA();
  }, [chainId, selectedTokenA?.address, wethAddress]);

  useEffect(() => {
    const fetchConversionRateTokenB = async () => {
      try {
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenB?.address) {
          console.error("Missing required data for token B price fetch");
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenB?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenB?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenB?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRateTokenB(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenB();
  }, [chainId, selectedTokenB?.address, wethAddress]);

  useEffect(() => {
    if (conversionRate && !isNaN(conversionRate)) {
      const valueInUSD = (
        parseFloat(amountIn || 0) * parseFloat(conversionRate)
      ).toFixed(2);
      setUsdValue(valueInUSD);
      setUsdValueTokenA(valueInUSD);
    } else {
      console.error("Missing or invalid conversion rate:", conversionRate);
    }
  }, [amountIn, conversionRate]);

  useEffect(() => {
    if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
      const valueInUSD = (
        parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
      ).toFixed(2);
      setUsdValueTokenB(valueInUSD);
    } else {
      console.error(
        "Missing or invalid conversion rate:",
        conversionRateTokenB,
      );
    }
  }, [amountOut, conversionRateTokenB]);

  const confirmSwap = async () => {
    if (selectedTokenA.address == selectedTokenB.address) {
      return null;
    }
    await swapTokens(
      (_swapStatus) => {
        setSwapStatus(_swapStatus);
      },
      (hash) => {
        setSwapHash(hash);
      },
      selectedTokenA?.address,
      selectedTokenB?.address,
      address,
      tradeInfo,
      chainId,
      protocolFee,
    )
      .then(() => {
        setSwapSuccess(true); // Set success on transaction completion
        setAmountVisible(false);
      })
      .catch((error) => {
        console.error("Swap failed", error);
        setSwapSuccess(false);
      });
  };

  // const getRateDisplay = () => {
  //   if (!singleToken?.amounts || singleToken.amounts.length < 2) {
  //     if (
  //       amountIn &&
  //       amountOut &&
  //       parseFloat(amountIn) > 0 &&
  //       parseFloat(amountOut) > 0
  //     ) {
  //       const rate = parseFloat(amountOut) / parseFloat(amountIn);
  //       return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
  //     }
  //     return "0";
  //   }

  //   const rate = parseFloat(
  //     formatUnits(
  //       singleToken.amounts[singleToken.amounts.length - 1],
  //       parseInt(selectedTokenB.decimal),
  //     ),
  //   );

  //   return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
  // };
  const getRateDisplay = () => {
    // For direct routes (native/wrapped)
    if (isDirectRoute) {
      if (selectedTokenA && selectedTokenB) {
        return isRateReversed ? "1" : "1";
      }
      return "0";
    }

    // Use the singleToken data for accurate 1 token price
    if (
      singleToken?.amounts &&
      singleToken.amounts.length >= 2 &&
      selectedTokenB
    ) {
      const rate = parseFloat(
        formatUnits(
          singleToken.amounts[singleToken.amounts.length - 1],
          parseInt(selectedTokenB.decimal),
        ),
      );

      if (!isNaN(rate) && rate > 0) {
        return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
      }
    }

    // Fallback: calculate from current amounts
    if (
      amountIn &&
      amountOut &&
      parseFloat(amountIn) > 0 &&
      parseFloat(amountOut) > 0
    ) {
      const rate = parseFloat(amountOut) / parseFloat(amountIn);
      if (!isNaN(rate) && rate > 0) {
        return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
      }
    }

    return "0";
  };

  useEffect(() => {
    setSelectedPercentage("");
    setAmountIn("");
  }, [selectedTokenA]);

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
    if (!selectedTokenA) return false;
    const inputAmount = parseFloat(amountIn) || 0;
    const balance =
      selectedTokenA.address === EMPTY_ADDRESS
        ? parseFloat(formattedBalance)
        : parseFloat(tokenBalance?.formatted || "0");

    //small precision difference
    return inputAmount > balance && Math.abs(inputAmount - balance) > 1e-6;
  };

  const getButtonText = () => {
    if (!address) return "Connect Wallet";
    if (isInsufficientBalance()) return "Insufficient Balance";
    if (isQuoting) return "Loading...";
    if (needsApproval) return "Approve";
    if (order) return "Place Order";
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

  const minToReceive = amountOut * 0.0024;
  const minToReceiveAfterFee = amountOut - minToReceive;

  // effect to clear amountOut and quotes when tokens are swapped
  useEffect(() => {
    setAmountOut("0");
    setInitialQuote("");
    setNewQuote("");
    setShowPriceAlert(false);
  }, [selectedTokenA, selectedTokenB]);

  // Use price monitor hook
  const { hasChanged } = usePriceMonitor({
    initialQuote,
    currentQuote: amountOut,
    enabled: !!initialQuote && !!amountOut && !isNaN(amountOut),
    threshold: 0.001, // Temporarily lowered for testing (normal: 0.1)
    onPriceChange: (newQ, percent) => {
      setNewQuote(newQ);
      setPercentChange(percent);
      setShowPriceAlert(true);
    },
  });

  const handleAcceptNewQuote = () => {
    setInitialQuote(newQuote);
    setShowPriceAlert(false);
  };

  const handleRejectNewQuote = () => {
    setShowPriceAlert(false);
  };

  // Market
  const calculateLimitPrice1 = () => {
    if (!selectedPercentage1) {
      return "24.277";
    }

    const priceMapping = {
      25: "18.208",
      50: "21.242",
      75: "24.277",
      100: "27.312",
    };

    return priceMapping[selectedPercentage1] || "24.277";
  };

  const calculateExpiryDays1 = () => {
    if (!selectedPercentage1) {
      return "1101";
    }
    const expiryMapping = {
      25: 275,
      50: 550,
      75: 825,
      100: 1101,
    };

    return expiryMapping[selectedPercentage1] || "1101";
  };
  const handlePercentageChange1 = (percentage1) => {
    setSelectedPercentage1(percentage1);
    const calculatedAmount = calculateAmount(percentage1);
    setAmountIn(calculatedAmount);
  };
  const [selectedPercentage1, setSelectedPercentage1] = useState("");

  // Market
  const handleOutputChange = () => {
    // This input is read-only, so we don't need an onChange handler
  };
  // For Price Impact
  const priceImpact =
    usdValueTokenA > 0
      ? (
        ((parseFloat(usdValueTokenB) - parseFloat(usdValueTokenA)) /
          parseFloat(usdValueTokenA)) *
        100
      ).toFixed(2)
      : 0;
  // Determine color based on value
  const getPriceImpactColor = (impact) => {
    const value = parseFloat(impact);
    // Green for positive (profit), Red for negative (loss)
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-black";
  };
  //
  // For Limit Tab
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) {
      setOrder(false);
    }
  }, [searchParams]);

  const [dollarinfo, setDollarInfo] = useState(false);
  const [dollarinfo1, setDollarInfo1] = useState(false);

  //
  const [selectedPercentageBuy, setSelectedPercentageBuy] = useState("");
  const handlePercentageChangeBuy = (percentage) => {
    const parsedPercentage = percentage === "" ? "" : parseInt(percentage);
    setSelectedPercentageBuy(parsedPercentage);

    // Calculate based on tokenB balance
    let balance;
    if (selectedTokenB.address === EMPTY_ADDRESS) {
      balance = parseFloat(formattedBalance || 0);
    } else {
      balance = parseFloat(tokenBBalance?.formatted || 0);
    }

    const calculatedAmount = balance * (parsedPercentage / 100);
    setAmountOut(calculatedAmount.toFixed(6));
  };
  useEffect(() => {
    setSelectedPercentageBuy("");
    setAmountIn("");
    setAmountOut("0");
  }, [selectedTokenB]);

  // In your Emp component, add loading state
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Update this when you're fetching quotes
  useEffect(() => {
    if (isQuoting) {
      setIsRoutingLoading(true);
    } else {
      // Add a small delay to show loading state smoothly
      const timer = setTimeout(() => {
        setIsRoutingLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isQuoting]);

  const getFontSizeClass = (text = "") => {
    const length = text.toString().length;

    if (length >= 6) return "text-xs md:text-xs";
    return "text-xs md:text-xs";
  };

  return (
    <>
      <div
        className={`w-full rounded-xl xl:pb-2 lg:pt-1 pt-1 2xl:px-8 lg:px-8 md:px-6 px-1 md:mt-0 mt-1 relative ${order ? "pb-[0px]" : "2xl:pb-20 xl:pb-2 lg:pb-0 pb-5"
          }`}
      >
        <div
          className={`scales8 ${order ? `scales-top ${address ? "scales-top_limit" : ""}` : "top70"
            }`}
        >
          <div className="md:max-w-[1100px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap lg:mt-1 mt-1 px-3 pb-2">
            <h1 className="2xl:text-[43px] xl:leading-[40px] font40 text-2xl text-center text-[#FF9900] font-orbitron font-bold md:mb-2">
              {!order ? (
                <>
                  Optimized <br />{" "}
                  <span className="text-white">Aggregation</span>
                </>
              ) : (
                <>
                  Limit Orders <br />{" "}
                  <span className="text-white">Optimized</span>
                </>
              )}
            </h1>
          </div>
          {/* Swap */}
          {!order ? (
            <>
              <div className="lg:max-w-[600px] md:max-w-[600px] mx-auto w-full flex gap-3 items-center md:justify-start justify-start md:flex-nowrap flex- mt-2 mb-3 lg:px-1 px-0">
                <div
                  onClick={() => setSlippageVisible(true)}
                  className="ml-auto shrink-0 bg-black md:px-6 px-3 md:py-2 py-2 border-2 border-[#FF9900] rounded-lg flex justify-center items-center hoverswap transition-all cursor-pointer group"
                >
                  <p className="text-[#FF9900] md:text-[10px] text-[10px] font-extrabold font-orbitron">
                    SETTINGS
                  </p>
                </div>
              </div>
              <div className="lg:max-w-[600px] md:max-w-[600px] mx-auto w-full">
                <div className="relative bg_swap_box">
                  <div className="flex justify-between gap-3 items-center">
                    <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[#FF9900]">
                      You Sell
                    </div>
                    <div className="md:text-xs text-[10px] font-orbitron">
                      <span className="font-normal leading-normal text-[#FF9900]">
                        BAL
                      </span>
                      <span className="font-normal leading-normal text-[#FF9900]">
                        {" "}
                        :{" "}
                      </span>
                      <span className="text-white leading-normal">
                        {!selectedTokenA
                          ? "0.00"
                          : isLoading
                            ? "Loading.."
                            : selectedTokenA.address === EMPTY_ADDRESS
                              ? `${formatNumber(formattedBalance)}`
                              : `${tokenBalance
                                ? formatNumber(
                                  parseFloat(
                                    tokenBalance.formatted,
                                  ).toFixed(6),
                                )
                                : "0.00"
                              }`}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full mt-3 mt6 md:gap-10 gap-2">
                    <div className="lg:md:max-w-[200px] w-full">
                      <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                        <div className="flex gap-2 items-center w-full">
                          <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[7px] rounded-lg md:px-3 px-3 md:py-[8px] py-2 justify-center w-full">
                            <div
                              onClick={() => {
                                setIsSelectingTokenA(true);
                                setTokenVisible(true);
                                setSelectedPercentage("");
                                setAmountIn("");
                              }}
                              className="flex items-center md:gap-4 gap-1 w-full justify-center"
                            >
                              {selectedTokenA ? (
                                <>
                                  <img
                                    className="md:w-5 md:h-5 w-4 h-4"
                                    src={
                                      selectedTokenA.image ||
                                      selectedTokenA.logoURI
                                    }
                                    alt={selectedTokenA.name}
                                  />
                                  <div
                                    className={`${getFontSizeClass(
                                      selectedTokenA.ticker ||
                                      selectedTokenA.symbol,
                                    )} text-white font-bold font-orbitron leading-normal bg-black appearance-none outline-none`}
                                  >
                                    {selectedTokenA.ticker ||
                                      selectedTokenA.symbol}
                                  </div>
                                </>
                              ) : (
                                <span className="text-white font-extrabold font-orbitron md:text-xs text-xs capitalize">
                                  Select token
                                </span>
                              )}
                            </div>
                            {selectedTokenA && (
                              <button
                                onClick={() =>
                                  handleCopyAddress(selectedTokenA.address)
                                }
                                className="rounded-md transition-colorss"
                              >
                                {copySuccess &&
                                  activeTokenAddress ===
                                  selectedTokenA.address ? (
                                  <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-white" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:h-[53px] h-9">
                      {(() => {
                        const inputLength =
                          formatNumber(amountIn)?.replace(/\D/g, "").length ||
                          0;
                        const defaultFontSize =
                          window.innerWidth >= 1024
                            ? 28
                            : window.innerWidth >= 768
                              ? 24
                              : 20;
                        const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 4;
                        const SHRINK_RATE = 3;

                        const excessDigits = Math.max(
                          0,
                          inputLength - FREE_DIGITS,
                        );

                        const dynamicFontSize = Math.max(
                          10,
                          defaultFontSize - excessDigits * SHRINK_RATE,
                        );
                        return (
                          <input
                            type="text"
                            placeholder={
                              formattedChainBalance === "0.000"
                                ? "0"
                                : calculateAmount(selectedPercentage)
                            }
                            value={formatNumber(amountIn)}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className="font-orbitron font-extrabold text-white  rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                            style={{
                              fontSize: `${dynamicFontSize}px`,
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap mt6">
                    <div className="text-[#FF9900] font-orbitron md:text-[15px] text-xs flex flex-col">
                      <span>
                        {selectedTokenA ? (
                          conversionRate ? (
                            `$${parseFloat(conversionRate).toFixed(6)}`
                          ) : (
                            <span className="animate-pulse">Loading...</span>
                          )
                        ) : (
                          "--"
                        )}
                      </span>
                      <span className="font-bold">Market Price</span>
                    </div>
                    <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                      <span></span>
                      {[25, 50, 75, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[7px] text-[7px] font-medium font-orbitron md:w-12 w-11 px-2
            ${selectedPercentage === value
                              ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                              : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                            }`}
                          onClick={() => handlePercentageChange(value)}
                          disabled={isLoading}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right relative text-white md:text-xs text-[10px] usd-spacing truncate font-orbitron mt-2 text-sh1 flex justify-end gap-1">
                    <div className="relative inline-block">
                      <InfoIcon
                        size={14}
                        className="md:mt-[1.5px] mt-[-1px] cursor-pointer"
                        onMouseEnter={() => setDollarInfo(true)}
                        onMouseLeave={() => setDollarInfo(false)}
                        onClick={() => setDollarInfo((prev) => !prev)}
                      />

                      {dollarinfo && (
                        <div
                          className="font-orbitron fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg"
                          onMouseEnter={() => setDollarInfo(true)}
                          onMouseLeave={() => setDollarInfo(false)}
                        >
                          Dollar value display <br />
                          The dollar value displayed are fetched from 3rd party
                          API. They may not be 100% accurate in some cases. For
                          accuracy please check the Output units.
                        </div>
                      )}
                    </div>
                    {selectedTokenA
                      ? conversionRate
                        ? `$${formatNumber(usdValue)}`
                        : "Fetching Rate..."
                      : "$0.00"}
                  </div>
                </div>
                <div
                  className="cursor-pointer mx-auto my-4 relative md:w-[50px] w-10"
                  onClick={() => {
                    const _tokenA = selectedTokenA;
                    const _tokenB = selectedTokenB;
                    setSelectedTokenA(_tokenB);
                    setSelectedTokenB(_tokenA);
                    setAmountOut("0");
                    setAmountIn("0");
                    setDebouncedAmountIn("0");
                  }}
                >
                  <img
                    src={Ar}
                    alt="Ar"
                    className="hoverswap transition-all rounded-xl"
                  />
                </div>
                <div className="relative bg_swap_box_black">
                  <div className="flex justify-between gap-3 items-center">
                    <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[#FF9900]">
                      You Buy
                    </div>
                    <div className="md:text-xs text-[10px] font-orbitron">
                      <span className="font-normal leading-normal text-[#FF9900]">
                        BAL
                      </span>{" "}
                      <span className="font-normal leading-normal text-[#FF9900]">
                        {" "}
                        :{" "}
                      </span>
                      <span className="text-white leading-normal">
                        {!selectedTokenB
                          ? "0.00"
                          : isLoading
                            ? "Loading.."
                            : selectedTokenB.address === EMPTY_ADDRESS
                              ? `${formatNumber(formattedChainBalanceTokenB)}`
                              : `${tokenBBalance
                                ? formatNumber(
                                  parseFloat(
                                    tokenBBalance.formatted,
                                  ).toFixed(6),
                                )
                                : "0.00"
                              }`}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full mt-3 mt6 md:gap-10 gap-2">
                    <div className="lg:md:max-w-[200px] w-full">
                      <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                        <div className="flex gap-2 items-center w-full">
                          <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[7px] rounded-lg md:px-3 px-3 md:py-[8px] py-2 justify-center w-full">
                            <div
                              onClick={() => {
                                setIsSelectingTokenA(false);
                                setTokenVisible(true);
                              }}
                              className="flex items-center justify-center md:gap-4 gap-1 w-full"
                            >
                              {selectedTokenB ? (
                                <>
                                  <img
                                    className="md:w-5 md:h-5 w-4 h-4"
                                    src={
                                      selectedTokenB.image ||
                                      selectedTokenB.logoURI
                                    }
                                    alt={selectedTokenB.name}
                                  />
                                  <div
                                    className={`${getFontSizeClass(
                                      selectedTokenB.ticker ||
                                      selectedTokenB.symbol,
                                    )} text-white font-bold font-orbitron leading-normal bg-black appearance-none outline-none`}
                                  >
                                    {selectedTokenB.ticker ||
                                      selectedTokenB.symbol}
                                  </div>
                                </>
                              ) : (
                                <span className="text-white font-extrabold font-orbitron md:text-xs text-xs capitalize">
                                  Select token
                                </span>
                              )}
                            </div>
                            {selectedTokenB && (
                              <button
                                onClick={() =>
                                  handleCopyAddress(selectedTokenB.address)
                                }
                                className="rounded-md transition-colors"
                              >
                                {copySuccess &&
                                  activeTokenAddress ===
                                  selectedTokenB.address ? (
                                  <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-white" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:h-[53px] h-9">
                      {(() => {
                        const numericValue = Number(amountOut);

                        const formattedValue = isNaN(numericValue)
                          ? ""
                          : formatNumber(numericValue.toFixed(2));

                        const outputLength =
                          formattedValue.replace(/,/g, "").length || 0;

                        const defaultFontSize =
                          window.innerWidth >= 1024
                            ? 28
                            : window.innerWidth >= 768
                              ? 24
                              : 20;
                        const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 6;
                        const SHRINK_RATE = 3;

                        const excessDigits = Math.max(
                          0,
                          outputLength - FREE_DIGITS,
                        );

                        const dynamicFontSize = Math.max(
                          10,
                          defaultFontSize - excessDigits * SHRINK_RATE,
                        );

                        return (
                          <>
                            {isQuoting ? (
                              <span className="font-orbitron text-white animate-pulse text-right w-full flex justify-end">
                                Calculating...
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="0.00"
                                value={formattedValue}
                                onChange={handleOutputChange}
                                readOnly
                                className="font-orbitron font-extrabold text-white  rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                                style={{
                                  fontSize: `${dynamicFontSize}px`,
                                }}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap mt6">
                    <div className="text-[#FF9900] font-orbitron md:text-[15px] text-xs flex flex-col">
                      <span>
                        {selectedTokenB ? (
                          conversionRateTokenB ? (
                            `$${parseFloat(conversionRateTokenB).toFixed(6)}`
                          ) : (
                            <span className="animate-pulse">Loading...</span>
                          )
                        ) : (
                          "--"
                        )}
                      </span>
                      <span className="font-bold">Market Price</span>
                    </div>
                    <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                      <span></span>
                      {[25, 50, 75, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[7px] text-[7px] font-medium font-orbitron md:w-12 w-11 px-2
            ${selectedPercentageBuy === value
                              ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                              : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                            }`}
                          onClick={() => setSelectedPercentageBuy(value)}
                          disabled={isLoading}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right relative text-white md:text-xs text-[10px] usd-spacing truncate font-orbitron mt-2 text-sh1 flex justify-end gap-1">
                    <div className="relative inline-block">
                      <InfoIcon
                        size={14}
                        className="md:mt-[1.5px] mt-[-1px] cursor-pointer"
                        onMouseEnter={() => setDollarInfo1(true)}
                        onMouseLeave={() => setDollarInfo1(false)}
                        onClick={() => setDollarInfo1((prev) => !prev)}
                      />
                      {dollarinfo1 && (
                        <div
                          className="font-orbitron fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg"
                          onMouseEnter={() => setDollarInfo1(true)}
                          onMouseLeave={() => setDollarInfo1(false)}
                        >
                          Dollar value display <br />
                          The dollar value displayed are fetched from 3rd party
                          API. They may not be 100% accurate in some cases. For
                          accuracy please check the Output units.
                        </div>
                      )}
                    </div>
                    {selectedTokenB ? (
                      conversionRateTokenB ? (
                        <span className="font-orbitron">
                          ${formatNumber(usdValueTokenB)}
                        </span>
                      ) : (
                        "Fetching Rate..."
                      )
                    ) : (
                      "$0.00"
                    )}
                  </div>
                </div>
                <div
                  className={`relative flex justify-center flex-row md:mt-5 mt-4 xl:pt-0 ${order
                    ? "xl:pt-[0px] lg:pt-[20px] pt-[350px] ttt xl:top-0 lg:top-[-140px] top-[-315px]"
                    : "pt-0 top-0"
                    }`}
                >
                  <button
                    onClick={() => {
                      if (!address) {
                        openConnectPopup();
                        return;
                      }
                      if (amountOut && parseFloat(amountOut) > 0) {
                        setInitialQuote(amountOut);
                        setAmountVisible(true);
                      }
                    }}
                    disabled={address ? isInsufficientBalance() : false}
                    className={`gtw relative z-50 w-full uppercase md:h-12 h-11 bg-[#F59216] md:rounded-[10px] rounded-md mx-auto button-trans h- flex justify-center items-center transition-all ${address && isInsufficientBalance()
                      ? "opacity-50 cursor-not-allowed"
                      : " "
                      } font-orbitron lg:text-base text-base font-extrabold`}
                  >
                    <span>{getButtonText()}</span>
                  </button>
                </div>
                {selectedTokenA && selectedTokenB && (
                  <div className="bg_swap_box mt-6 md:px-5 px-4 !py-6">
                    <Routing isLoading={isRoutingLoading} />
                    {selectedTokenA && selectedTokenB && (
                      <div className="flex justify-between gap-2 items-center md:flex-nowrap flex-wrap">
                        <div>
                          <div className="text-[#FF9900] text-xs font-orbitron">
                            Min Received :
                            <span className="text-[#FF9900] text-xs font-bold mr-1">
                              {" "}
                              {formatNumber(
                                parseFloat(minToReceiveAfterFee).toFixed(6),
                              )}
                            </span>
                            {selectedTokenB.ticker}
                          </div>
                          <div className="text-[#FF9900] text-xs font-orbitron">
                            Rate :
                            <span className="text-[#FF9900] text-xs font-bold">
                              {" "}
                              1
                            </span>
                            {isRateReversed
                              ? selectedTokenB.ticker
                              : selectedTokenA.ticker}{" "}
                            =
                            <span className="text-[#FF9900] text-xs font-bold mr-1">
                              {" "}
                              {getRateDisplay()}
                            </span>
                            {isRateReversed
                              ? selectedTokenA.ticker
                              : selectedTokenB.ticker}
                          </div>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div
                            className={`font-orbitron truncate ${getPriceImpactColor(
                              priceImpact,
                            )}`}
                          >
                            Price Impact
                          </div>
                          <div className="text-center text-black text-xs font-normal font-orbitron px-3 py-1 bg-[#FFE3BA] rounded-lg">
                            {priceImpact} %
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <OrderListItems
                slippage={limitOrderSlippage}
                onOpenSlippage={() => setSlippageVisible(true)}
              />
            </>
          )}
          {/* Ends */}
        </div>
      </div>
      {isSlippageVisible && !order && (
        <SlippageCalculator
          inputAmount={tradeInfo?.amountOut}
          onSlippageCalculated={handleSlippageCalculated}
          onClose={() => setSlippageVisible(false)}
        />
      )}

      {isSlippageVisible && order && (
        <LimitOrderSlippageCalculator
          isOpen={isSlippageVisible}
          onOpenChange={setSlippageVisible}
          slippage={limitOrderSlippage}
          onSlippageChange={setLimitOrderSlippage}
          onClose={() => setSlippageVisible(false)}
        />
      )}

      <div aria-label="Modal Success">
        {swapSuccess && (
          <Transaction
            transactionHash={swapHash}
            onClose={() => setSwapSuccess(false)}
            amountIn={amountIn}
            amountOut={parseFloat(amountOut).toFixed(6)}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            rate={getRateDisplay()}
            minReceived={parseFloat(minToReceiveAfterFee).toFixed(6)}
            usdValueTokenA={usdValueTokenA}
            usdValueTokenB={usdValueTokenB}
          />
        )}
      </div>
      <div aria-label="Modal">
        {isAmountVisible && (
          <Amount
            onClose={() => {
              setAmountVisible(false);
              setInitialQuote("");
              setNewQuote("");
              setShowPriceAlert(false);
            }}
            amountIn={amountIn}
            amountOut={parseFloat(amountOut).toFixed(6)}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            refresh={() => { }}
            confirm={confirmSwap}
            handleApprove={handleApprove}
            needsApproval={needsApproval}
            usdValueTokenA={usdValueTokenA}
            usdValueTokenB={usdValueTokenB}
            rate={getRateDisplay()}
            showPriceAlert={showPriceAlert}
            newQuote={newQuote}
            initialQuote={initialQuote}
            percentChange={percentChange}
            onAcceptNewQuote={handleAcceptNewQuote}
            onRejectNewQuote={handleRejectNewQuote}
            swapStatus={swapStatus}
          />
        )}
      </div>
      <div aria-label="Modal1">
        {isTokenVisible && (
          <Token
            onClose={() => setTokenVisible(false)}
            onSelect={handleTokenSelect}
          />
        )}
      </div>
    </>
  );
};

export default Emp;
