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
// import ProvidersListNew from "../bridge/ProvidersList-new";
// import { SmartRouter } from "../../utils/services/SmartRouter";
import {
  checkAllowance as defaultCheckAllowance,
  callApprove as defaultCallApprove,
  EMPTY_ADDRESS,
} from "../../utils/contractCalls";
import { swapTokens as defaultSwapTokens } from "../../utils/contractCalls";
import { useConnectPopup } from "../../hooks/ConnectPopupContext";
import {
  PLS_ROUTER_ABI,
  ETHW_ROUTER_ABI,
  SONIC_ROUTER_ABI,
  BASECHAIN_ROUTER_ABI,
  SEI_ROUTER_ABI,
  BERA_ROUTER_ABI,
  ROOTSTOCK_ROUTER_ABI,
  BSC_ROUTER_ABI,
  MONAD_ROUTER_ABI,
  ARBITRUM_ROUTER_ABI,
  OPTIMISM_ROUTER_ABI,
  POLYGON_ROUTER_ABI,
  AVALANCHE_ROUTER_ABI,
  HYPEREVM_ROUTER_ABI,
} from "../../utils/abis/empSealRouterAbi";
import { toast } from "../../utils/toastHelper";
import { usePriceMonitor } from "../../hooks/usePriceMonitor";
import TokenLogo from "../../components/TokenLogo.jsx";
import { fetchTokenPrice } from "../../utils/priceFetcher";
import { getQuoteHopFallbackPlan } from "../../config/quoteFallback";

import { WPLS } from "../../utils/abis/wplsABI";
import { WETHW } from "../../utils/abis/wethwABI";
import { WSONIC } from "../../utils/abis/wsonicABI";
import { WETH } from "../../utils/abis/wethBaseABI";
import { WSEI } from "../../utils/abis/wseiABI";
import { WBERA } from "../../utils/abis/wberaABI";
import { WRBTC } from "../../utils/abis/wrbtcABI";
import { WMON } from "../../utils/abis/wmonABI";
import { WPOL } from "../../utils/abis/wpolABI";
import { WAVAX } from "../../utils/abis/wavaxABI";
import { WHYPE } from "../../utils/abis/whypeABI";

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
    case 143:
      return WMON;
    case 42161:
      return WETH;
    case 10:
      return WETH;
    case 137:
      return WPOL;
    case 43114:
      return WAVAX;
    case 999:
      return WHYPE;
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
    case 56:
      return BSC_ROUTER_ABI;
    case 143:
      return MONAD_ROUTER_ABI;
    case 42161:
      return ARBITRUM_ROUTER_ABI;
    case 10:
      return OPTIMISM_ROUTER_ABI;
    case 137:
      return POLYGON_ROUTER_ABI;
    case 43114:
      return AVALANCHE_ROUTER_ABI;
    case 999:
      return HYPEREVM_ROUTER_ABI;
    case 369:
    default:
      return PLS_ROUTER_ABI;
  }
};

const defaultDisplayConfig = {
  isWidgetMode: false,
  theme: "dark",
  primaryColor: "#FF8A00",
  background: "#000000",
  borderColor: "#FF8A00",
  showSlippage: true,
  showPoweredBy: true,
};

const Emp = ({
  setPadding,
  setBestRoute,
  onTokensChange,
  activeTab,
  initialConfig = {},
  displayConfig = defaultDisplayConfig,
  runtimeConfig,
  contractApi,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageVisible, setSlippageVisible] = useState(false);
  const [selectedSlippage, setSelectedSlippage] = useState(0.5);
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

  // Keep limit orders disabled for now, even if someone hits /swap?tab=limit directly.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "limit") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("tab");
      setSearchParams(nextParams, { replace: true });
      setOrder(false);
      return;
    }
    setOrder(false);
  }, [searchParams, setSearchParams]);

  // const [selectedTokenA, setSelectedTokenA] = useState(null);
  // const [selectedTokenB, setSelectedTokenB] = useState(null);
  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState("0");
  const [amountIn, setAmountIn] = useState("0");
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const { address } = useAccount();
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

  const effectiveRouterAddress =
    runtimeConfig?.routerAddress || routerAddress;
  const effectiveWethAddress = runtimeConfig?.wethAddress || wethAddress;
  const isWidgetMode = !!displayConfig?.isWidgetMode;
  const showSlippage = displayConfig?.showSlippage ?? true;
  const showPoweredBy = displayConfig?.showPoweredBy ?? false;
  const widgetPrimaryColor = displayConfig?.primaryColor || "#FF8A00";
  const normalizedWidgetPrimary = widgetPrimaryColor.replace("#", "");
  const widgetPrimaryHex = normalizedWidgetPrimary.length >= 6
    ? normalizedWidgetPrimary.slice(0, 6)
    : "FF8A00";
  const widgetPrimaryRgb = [
    Number.parseInt(widgetPrimaryHex.slice(0, 2), 16),
    Number.parseInt(widgetPrimaryHex.slice(2, 4), 16),
    Number.parseInt(widgetPrimaryHex.slice(4, 6), 16),
  ].join(", ");
  const widgetAccentTextStyle = isWidgetMode
    ? { color: widgetPrimaryColor }
    : undefined;
  const widgetPrimaryButtonStyle = isWidgetMode
    ? {
        backgroundColor: widgetPrimaryColor,
        borderColor: widgetPrimaryColor,
        color: "#03030a",
      }
    : undefined;

  const swapContractApi = useMemo(
    () => ({
      checkAllowance: contractApi?.checkAllowance || defaultCheckAllowance,
      callApprove: contractApi?.callApprove || defaultCallApprove,
      swapTokens: contractApi?.swapTokens || defaultSwapTokens,
    }),
    [contractApi],
  );

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

  const normalizeAddress = (address) => address?.toLowerCase?.() || "";
  const isSameAddress = (a, b) => normalizeAddress(a) === normalizeAddress(b);
  const getQuoteTokenAddress = (tokenAddress) =>
    isSameAddress(tokenAddress, EMPTY_ADDRESS)
      ? effectiveWethAddress || EMPTY_ADDRESS
      : tokenAddress || EMPTY_ADDRESS;

  // Check if it's a direct route (native to wrapped or wrapped to native)
  const isDirectRoute = useMemo(() => {
    return (
      (isSameAddress(selectedTokenA?.address, EMPTY_ADDRESS) &&
        isSameAddress(selectedTokenB?.address, effectiveWethAddress)) ||
      (isSameAddress(selectedTokenA?.address, effectiveWethAddress) &&
        isSameAddress(selectedTokenB?.address, EMPTY_ADDRESS))
    );
  }, [selectedTokenA?.address, selectedTokenB?.address, effectiveWethAddress]);

  // Get the appropriate router ABI based on chainId
  const routerABI = useMemo(() => getRouterABI(chainId), [chainId]);

  const quoteRequestedMaxSteps = BigInt(maxHops?.toString() || "3");
  const quoteFallbackPlan = useMemo(
    () => getQuoteHopFallbackPlan(chainId, quoteRequestedMaxSteps),
    [chainId, quoteRequestedMaxSteps],
  );
  const quoteFallbackSecondStep =
    quoteFallbackPlan.secondStep ?? quoteRequestedMaxSteps;
  const quoteFallbackThirdStep = quoteFallbackPlan.thirdStep ?? 1n;
  const quoteEnabled =
    !isDirectRoute &&
    !!selectedTokenA &&
    !!selectedTokenB &&
    !!amountIn &&
    parseFloat(amountIn) > 0;
  const quoteAmountInWei =
    amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
      ? convertToBigInt(
          parseFloat(amountIn),
          parseInt(selectedTokenA.decimal) || 18,
        )
      : BigInt(0);
  const quoteTokenInAddress = getQuoteTokenAddress(selectedTokenA?.address);
  const quoteTokenOutAddress = getQuoteTokenAddress(selectedTokenB?.address);

  // Use findBestPath to get quotes from the router contract (with fallback max steps)
  const {
    data: primaryQuoteData,
    isLoading: primaryQuoteLoading,
    refetch: quoteRefresh,
    error: primaryQuoteError,
  } = useReadContract({
    abi: routerABI,
    address: effectiveRouterAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      quoteAmountInWei,
      quoteTokenInAddress,
      quoteTokenOutAddress,
      quoteRequestedMaxSteps,
    ],
    enabled: quoteEnabled,
  });

  const {
    data: fallbackQuoteData,
    isLoading: fallbackQuoteLoading,
    error: fallbackQuoteError,
  } = useReadContract({
    abi: routerABI,
    address: effectiveRouterAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      quoteAmountInWei,
      quoteTokenInAddress,
      quoteTokenOutAddress,
      quoteFallbackSecondStep,
    ],
    enabled:
      quoteFallbackPlan.enabled &&
      quoteEnabled &&
      !primaryQuoteData &&
      !!primaryQuoteError &&
      !!quoteFallbackPlan.secondStep,
  });

  const {
    data: fallbackQuoteDataOne,
    isLoading: fallbackQuoteLoadingOne,
    error: fallbackQuoteErrorOne,
  } = useReadContract({
    abi: routerABI,
    address: effectiveRouterAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      quoteAmountInWei,
      quoteTokenInAddress,
      quoteTokenOutAddress,
      quoteFallbackThirdStep,
    ],
    enabled:
      quoteFallbackPlan.enabled &&
      quoteEnabled &&
      !primaryQuoteData &&
      !fallbackQuoteData &&
      !!quoteFallbackPlan.thirdStep &&
      !!fallbackQuoteError,
  });

  const data = quoteFallbackPlan.enabled
    ? (primaryQuoteData ?? fallbackQuoteData ?? fallbackQuoteDataOne)
    : primaryQuoteData;
  const quoteLoading = quoteFallbackPlan.enabled
    ? primaryQuoteLoading || fallbackQuoteLoading || fallbackQuoteLoadingOne
    : primaryQuoteLoading;

  const singleTokenAmountInWei = selectedTokenA?.decimal
    ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
    : BigInt(0);
  const singleTokenEnabled =
    !isDirectRoute && !!selectedTokenA && !!selectedTokenB;

  // Get single token price for rate display (with fallback max steps)
  const {
    data: primarySingleToken,
    refetch: singleTokenRefresh,
    error: primarySingleTokenError,
  } = useReadContract({
    abi: routerABI,
    address: effectiveRouterAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      singleTokenAmountInWei,
      quoteTokenInAddress,
      quoteTokenOutAddress,
      quoteRequestedMaxSteps,
    ],
    enabled: singleTokenEnabled,
  });

  const { data: fallbackSingleToken, error: fallbackSingleTokenError } =
    useReadContract({
      abi: routerABI,
      address: effectiveRouterAddress,
      functionName: "findBestPath",
      chainId,
      args: [
        singleTokenAmountInWei,
        quoteTokenInAddress,
        quoteTokenOutAddress,
        quoteFallbackSecondStep,
      ],
      enabled:
        quoteFallbackPlan.enabled &&
        singleTokenEnabled &&
        !primarySingleToken &&
        !!primarySingleTokenError &&
        !!quoteFallbackPlan.secondStep,
    });

  const { data: fallbackSingleTokenOne } = useReadContract({
    abi: routerABI,
    address: effectiveRouterAddress,
    functionName: "findBestPath",
    chainId,
    args: [
      singleTokenAmountInWei,
      quoteTokenInAddress,
      quoteTokenOutAddress,
      quoteFallbackThirdStep,
    ],
    enabled:
      quoteFallbackPlan.enabled &&
      singleTokenEnabled &&
      !primarySingleToken &&
      !fallbackSingleToken &&
      !!quoteFallbackPlan.thirdStep &&
      !!fallbackSingleTokenError,
  });

  const singleToken = quoteFallbackPlan.enabled
    ? (primarySingleToken ?? fallbackSingleToken ?? fallbackSingleTokenOne)
    : primarySingleToken;

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

  useEffect(() => {
    if (!isWidgetMode || !tokenList || tokenList.length === 0) {
      return;
    }

    const getTokenByAddress = (address) => {
      if (!address) return null;
      return (
        tokenList.find(
          (token) => token.address.toLowerCase() === address.toLowerCase(),
        ) || null
      );
    };

    const fromConfig = getTokenByAddress(initialConfig.defaultTokenIn);
    const toConfig = getTokenByAddress(initialConfig.defaultTokenOut);

    setSelectedTokenA((prev) => {
      if (fromConfig) return fromConfig;
      if (!prev) return null;
      const stillExists = tokenList.some(
        (token) => token.address.toLowerCase() === prev.address.toLowerCase(),
      );
      return stillExists ? prev : null;
    });

    setSelectedTokenB((prev) => {
      if (toConfig) return toConfig;
      if (!prev) return null;
      const stillExists = tokenList.some(
        (token) => token.address.toLowerCase() === prev.address.toLowerCase(),
      );
      return stillExists ? prev : null;
    });
  }, [
    initialConfig.defaultTokenIn,
    initialConfig.defaultTokenOut,
    isWidgetMode,
    tokenList,
  ]);

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

  useEffect(() => {
    if (!isWidgetMode) {
      return;
    }
    setSelectedPercentage("");
    setAmountIn(initialConfig.defaultAmountIn?.trim() || "");
  }, [initialConfig.defaultAmountIn, isWidgetMode, selectedTokenA]);

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

    const tokenAAddress = getQuoteTokenAddress(selectedTokenA?.address);

    const tokenBAddress = getQuoteTokenAddress(selectedTokenB?.address);

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
          tokenList.find(
            (token) =>
              token?.address?.toLowerCase() === pathAddress?.toLowerCase(),
          ) || tokenList[0],
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
        const allowance = await swapContractApi.checkAllowance(
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
  }, [
    chainId,
    address,
    selectedTokenA,
    debouncedAmountIn,
    swapContractApi,
  ]);

  const handleApprove = async () => {
    try {
      setSwapStatus("APPROVING");
      const amountInBigInt = convertToBigInt(amountIn, selectedTokenA.decimal);

      await swapContractApi.callApprove(
        chainId,
        selectedTokenA.address,
        amountInBigInt,
      );

      // Re-check allowance to update UI immediately
      const allowance = await swapContractApi.checkAllowance(
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
    setAmountOut(decimalAdjusted.toString());

    // Reset minAmountOut if needed
    setMinAmountOut("0");
  };

  useEffect(() => {
    const fetchConversionRateTokenA = async () => {
      try {
        if (!currentChain?.name || !selectedTokenA?.address) {
          console.error("Missing required data for token A price fetch");
          return;
        }

        const addressToFetch =
          selectedTokenA?.address === EMPTY_ADDRESS && effectiveWethAddress
            ? effectiveWethAddress?.toLowerCase()
            : selectedTokenA?.address?.toLowerCase();

        const tokenPrice = await fetchTokenPrice(symbol, addressToFetch);

        if (tokenPrice) {
          setConversionRate(tokenPrice);
        } else {
          setConversionRate(null);
          console.error("Token A price could not be established.");
        }
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenA();
  }, [chainId, selectedTokenA?.address, effectiveWethAddress]);

  useEffect(() => {
    const fetchConversionRateTokenB = async () => {
      try {
        if (!currentChain?.name || !selectedTokenB?.address) {
          console.error("Missing required data for token B price fetch");
          return;
        }

        const addressToFetch =
          selectedTokenB?.address === EMPTY_ADDRESS && effectiveWethAddress
            ? effectiveWethAddress?.toLowerCase()
            : selectedTokenB?.address?.toLowerCase();

        const tokenPrice = await fetchTokenPrice(symbol, addressToFetch);

        if (tokenPrice) {
          setConversionRateTokenB(tokenPrice);
        } else {
          setConversionRateTokenB(null);
          console.error("Token B price could not be established.");
        }
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenB();
  }, [chainId, selectedTokenB?.address, effectiveWethAddress]);

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
    await swapContractApi.swapTokens(
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

    const stringValue = value.toString();

    const [integerPart, decimalPart] = stringValue.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    // If there's a decimal part, limit to 6 digits and remove non-numeric
    if (decimalPart !== undefined) {
      // Limit to 6 decimal places
      const limitedDecimal = decimalPart.replace(/\D/g, "").slice(0, 6);
      return `${formattedInteger}.${limitedDecimal}`;
    }

    return formattedInteger;
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
    if (value < 0) return "text-white";
    return "text-white";
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

  // New

  return (
    <>
      <div
        className={`w-full ${isWidgetMode ? `widget-embed-mode widget-theme-${displayConfig.theme || "dark"}` : ""}`}
        style={
          isWidgetMode
            ? {
                "--primary": widgetPrimaryColor,
                "--widget-primary": widgetPrimaryColor,
                "--widget-primary-rgb": widgetPrimaryRgb,
                "--bg-color": displayConfig.background,
                "--border-color": displayConfig.borderColor,
              }
            : undefined
        }
      >
        <div
          className={`min-h-[calc(100vh-52px)] flex flex-col items-center px-4 py-20 bg-gradient`}
        >
          <div className="md:max-w-[1100px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap lg:mt-1 mt-1 px-3 pb-2">
            <p className="text-[9px] font-bold tracking-[0.4em] text-[rgba(255,138,0,0.45)] mb-2">
              MULTI-CHAIN SWAP
            </p>
            <h1
              className="text-[26px] text-center text-[#FF8A00]  font-bold md:mb-2"
              style={widgetAccentTextStyle}
            >
              {!order ? (
                <>
                  <span className="text-white">Best Rates.</span>
                  Every Trade.
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
              <div className="lg:max-w-[450px] md:max-w-[450px] mx-auto w-full mt-4 relative">
                <div className="relative bg_swap_box">
                  <div className="swap-header">
                    <h3 className="swap-title">Swap</h3>
                    <div className="swap-right">
                      <div className="live-indicator">
                        <div className="live-dot" />
                        <span className="live-text">LIVE</span>
                      </div>
                      {showSlippage && (
                        <button
                          onClick={() => {
                            setSlippageVisible((prev) => !prev);
                            setTokenVisible(false);
                          }}
                          className="slippage-btn"
                        >
                          {selectedSlippage}% SLIP
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    {isSlippageVisible && !order && showSlippage && (
                      <SlippageCalculator
                        inputAmount={tradeInfo?.amountOut}
                        selectedSlippage={selectedSlippage}
                        onSlippageChange={setSelectedSlippage}
                        onSlippageCalculated={handleSlippageCalculated}
                        onClose={() => setSlippageVisible(false)}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between gap-3 items-center">
                      <div className="you_pay_heading">You Sell</div>
                      <div className="md:text-xs text-[10px] ">
                        <span
                          className="font-normal leading-normal text-[#FF8A00]"
                          style={widgetAccentTextStyle}
                        >
                          BAL
                        </span>
                        <span
                          className="font-normal leading-normal text-[#FF8A00]"
                          style={widgetAccentTextStyle}
                        >
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
                                : `${
                                    tokenBalance
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
                    <div className="flex w-full mt-3 md:gap-3 gap-2 items-center">
                      <div className="w-full">
                        {(() => {
                          const rawAmount = amountIn?.replace(/,/g, "") || "0";
                          const isMobile = window.innerWidth < 768;

                          return (
                            <input
                              type="text"
                              placeholder={
                                formattedChainBalance === "0.000"
                                  ? "0"
                                  : calculateAmount(selectedPercentage)
                              }
                              value={formatNumber(amountIn)}
                              onChange={(e) =>
                                handleInputChange(e.target.value)
                              }
                              className="bg-transparent w-full outline-none text-white placeholder:text-white/10"
                              style={{
                                fontSize: scaledFs(rawAmount, isMobile),
                                fontWeight: 200,
                                letterSpacing: "-0.04em",
                                lineHeight: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            />
                          );
                        })()}
                      </div>
                      <div className="lg:md:max-w-[180px] w-full">
                        <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                          <div className="flex gap-2 items-center justify-end w-full">
                            <div className="flex items-center gap-2 shrink-0 transition-opacity duration-150 hover:opacity-60 select_token">
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
                                    <TokenLogo
                                      token={selectedTokenA}
                                      className="md:w-5 md:h-5 w-4 h-4"
                                    />
                                    <div
                                      className={`${getFontSizeClass(
                                        selectedTokenA.ticker ||
                                          selectedTokenA.symbol,
                                      )} text-white font-bold  leading-normal bg-black appearance-none outline-none`}
                                    >
                                      {selectedTokenA.ticker ||
                                        selectedTokenA.symbol}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-white font-semibold md:text-xs text-xs capitalize">
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
                    </div>
                    <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap">
                      <div className="you_pay_heading flex flex-col relative top-2">
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
                        <span className="mt-1">Market Price</span>
                      </div>
                      <div className="flex md:gap-2 gap-1 justify-end">
                        <span></span>
                        {[25, 50, 75, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`slippage-btn
            ${
              selectedPercentage === value
                ? "!text-[#FF8A00]/80 !bg-[#FF8A00]/5 !border !border-[#FF8A00]/80"
                : "text-[#FF8A00]/80 hover:text-[#FF8A00]/80 hover:border-[#FF8A00]/80 hover:bg-[#FF8A00]/5"
            }`}
                            style={
                              isWidgetMode
                                ? {
                                    color: widgetPrimaryColor,
                                    borderColor:
                                      selectedPercentage === value
                                        ? widgetPrimaryColor
                                        : `rgba(${widgetPrimaryRgb}, 0.4)`,
                                    backgroundColor:
                                      selectedPercentage === value
                                        ? `rgba(${widgetPrimaryRgb}, 0.12)`
                                        : "transparent",
                                  }
                                : undefined
                            }
                            onClick={() => handlePercentageChange(value)}
                            disabled={isLoading}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-right relative text-white text-[9px] text-white/20 tracking-[0.04em] truncate mt-2 flex justify-end gap-1">
                      <div className="relative inline-block">
                        <InfoIcon
                          size={9}
                          className="md:mt-[1.5px] mt-[1.1px] cursor-pointer"
                          onMouseEnter={() => setDollarInfo(true)}
                          onMouseLeave={() => setDollarInfo(false)}
                          onClick={() => setDollarInfo((prev) => !prev)}
                        />
                      </div>

                      {selectedTokenA
                        ? conversionRate
                          ? `$${formatNumber(usdValue)}`
                          : "Fetching Rate..."
                        : "$0.00"}
                    </div>
                  </div>
                </div>
                {dollarinfo && (
                  <div
                    className="absolute right-0 z-[10000] mt-[-10px] md:w-[250px] w-[250px] whitespace-pre-wrap bg_swap_box px-3 py-3 text-center md:text-[9px] text-[8px] text-white"
                    onMouseEnter={() => setDollarInfo(true)}
                    onMouseLeave={() => setDollarInfo(false)}
                  >
                    Dollar value display <br />
                    The dollar value displayed are fetched from 3rd party API.
                    They may not be 100% accurate in some cases. For accuracy
                    please check the Output units.
                  </div>
                )}
                <div className="separator">
                  <div className="separator-inner">
                    <button
                      onClick={() => {
                        const _tokenA = selectedTokenA;
                        const _tokenB = selectedTokenB;
                        setSelectedTokenA(_tokenB);
                        setSelectedTokenB(_tokenA);
                        setAmountOut("0");
                        setAmountIn("0");
                        setDebouncedAmountIn("0");
                      }}
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
                <div className="relative bg_swap_box_black">
                  <div className="p-4">
                    <div className="flex justify-between gap-3 items-center">
                      <div className="you_pay_heading">You Buy</div>
                      <div className="md:text-xs text-[10px] ">
                        <span
                          className="font-normal leading-normal text-[#FF8A00]"
                          style={widgetAccentTextStyle}
                        >
                          BAL
                        </span>{" "}
                        <span
                          className="font-normal leading-normal text-[#FF8A00]"
                          style={widgetAccentTextStyle}
                        >
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
                                : `${
                                    tokenBBalance
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
                    <div className="flex w-full mt-3 md:gap-5 gap-2 items-center">
                      <div className="w-full">
                        {(() => {
                          const rawAmount = (amountOut?.toString() || "0").replace(/,/g, "");
                          const isMobile = window.innerWidth < 768;

                          return (
                            <>
                              {isQuoting ? (
                                <span className=" text-white animate-pulse">
                                  Calculating...
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={
                                    formattedChainBalance === "0.000"
                                      ? "0"
                                      : calculateAmount(selectedPercentage)
                                  }
                                  value={(() => {
                                    const num =
                                      (amountOut?.toString() || "").replace(/,/g, "");
                                    if (!num || isNaN(Number(num))) return "";

                                    return Number(num)
                                      .toFixed(6)
                                      .replace(/\.?0+$/, "");
                                  })()}
                                  onChange={(e) =>
                                    handleOutputChange(e.target.value)
                                  }
                                  className="bg-transparent w-full outline-none text-white placeholder:text-white/10"
                                  style={{
                                    fontSize: scaledFs(rawAmount, isMobile),
                                    fontWeight: 200,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                    transition: "font-size 0.15s ease",
                                    color: rawAmount
                                      ? "rgba(255,255,255,0.88)"
                                      : "rgba(255,255,255,0.06)",
                                    userSelect: "none",
                                    minWidth: 0,
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="lg:md:max-w-[200px] w-full">
                        <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                          <div className="flex gap-2 items-center justify-end w-full">
                            <div className="flex items-center gap-2 shrink-0 transition-opacity duration-150 hover:opacity-60 select_token">
                              <div
                                onClick={() => {
                                  setIsSelectingTokenA(false);
                                  setTokenVisible(true);
                                }}
                                className="flex items-center justify-center md:gap-4 gap-1 w-full"
                              >
                                {selectedTokenB ? (
                                  <>
                                    <TokenLogo
                                      token={selectedTokenB}
                                      className="md:w-5 md:h-5 w-4 h-4"
                                    />
                                    <div
                                      className={`${getFontSizeClass(
                                        selectedTokenB.ticker ||
                                          selectedTokenB.symbol,
                                      )} text-white font-bold  leading-normal bg-black appearance-none outline-none`}
                                    >
                                      {selectedTokenB.ticker ||
                                        selectedTokenB.symbol}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-white font-semibold md:text-xs text-xs capitalize">
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
                    </div>
                    <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap">
                      <div className="you_pay_heading flex flex-col relative top-2">
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
                        <span className="mt-1">Market Price</span>
                      </div>
                    </div>
                    <div className="text-right relative text-white text-[9px] text-white/20 tracking-[0.04em] truncate mt-2 flex justify-end gap-1">
                      <div className="relative inline-block">
                        <InfoIcon
                          size={9}
                          className="md:mt-[1.5px] mt-[1.1px] cursor-pointer"
                          onMouseEnter={() => setDollarInfo1(true)}
                          onMouseLeave={() => setDollarInfo1(false)}
                          onClick={() => setDollarInfo1((prev) => !prev)}
                        />
                      </div>

                      {selectedTokenB ? (
                        conversionRateTokenB ? (
                          <span className="">
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
                  {dollarinfo1 && (
                    <div
                      className="absolute right-0 z-[10000] mt-[-10px] md:w-[250px] w-[250px] whitespace-pre-wrap bg_swap_box px-3 py-3 text-center md:text-[9px] text-[8px] text-white"
                      onMouseEnter={() => setDollarInfo1(true)}
                      onMouseLeave={() => setDollarInfo1(false)}
                    >
                      Dollar value display <br />
                      The dollar value displayed are fetched from 3rd party API.
                      They may not be 100% accurate in some cases. For accuracy
                      please check the Output units.
                    </div>
                  )}
                  {selectedTokenA && selectedTokenB && (
                    <div className="bg_swap_box p-4 !border-b-0 !border-l-0 !border-r-0 border-t">
                      {selectedTokenA && selectedTokenB && (
                        <div className="flex justify-between gap-2 items-center md:flex-nowrap flex-wrap">
                          <div>
                            <div className="text-[9px] text-white/20 tracking-[0.04em]">
                              Rate :
                              <span className="text-[9px] text-white/20 tracking-[0.04em] font-bold">
                                {" "}
                                1
                              </span>
                              {isRateReversed
                                ? selectedTokenB.ticker
                                : selectedTokenA.ticker}{" "}
                              =
                              <span className="text-[9px] text-white/20 tracking-[0.04em] font-bold mr-1">
                                {" "}
                                {getRateDisplay()}
                              </span>
                              {isRateReversed
                                ? selectedTokenA.ticker
                                : selectedTokenB.ticker}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div
                              className={`text-[9px] text-white/20 tracking-[0.04em] truncate ${getPriceImpactColor(
                                priceImpact,
                              )}`}
                            >
                              Price Impact
                            </div>
                            <div
                              className="text-[9px] text-[#FF8A00] tracking-[0.04em]"
                              style={widgetAccentTextStyle}
                            >
                              {priceImpact} %
                            </div>
                            <div className="text-[9px] text-white/20 tracking-[0.04em]">
                              ROUTE
                            </div>
                          </div>
                        </div>
                      )}
                      <Routing isLoading={isRoutingLoading} />
                      <div className="text-[9px] text-white/20 tracking-[0.04em] text-right">
                        Min :
                        <span className="text-[9px] text-white/20 tracking-[0.04em] font-bold mr-1">
                          {" "}
                          {formatNumber(
                            parseFloat(minToReceiveAfterFee).toFixed(6),
                          )}
                        </span>
                        {selectedTokenB.ticker}
                      </div>
                    </div>
                  )}
                  <div className="bg-[#06060efa] backdrop-blur-[60px]">
                    <div
                      className={`relative flex justify-center flex-row border-top p-4`}
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
                        className={`gtw relative z-50 w-full uppercase md:h-12 h-11 bg-[#FF8A00] mx-auto font-bold button-trans h- flex justify-center items-center transition-all ${
                          address && isInsufficientBalance()
                            ? "opacity-50 cursor-not-allowed"
                            : " "
                        }  text-xs`}
                        style={widgetPrimaryButtonStyle}
                      >
                        <span>{getButtonText()}</span>
                      </button>
                    </div>
                    {showPoweredBy && (
                      <p className="text-center text-[9px] text-white/10 mb-3 font-medium tracking-[0.14em]">
                        POWERED BY EMPX · 100+ DEXS · ZERO FEES
                      </p>
                    )}
                  </div>
                </div>
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
            refresh={() => {}}
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
