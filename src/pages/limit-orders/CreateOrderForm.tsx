import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import Ar from "../../assets/images/reverse.svg";
import MarketTargetChart from "./MarketGraph";
import {
  createOrderSchema,
  type CreateOrderInput,
  OrderStrategy,
} from "./schema";
import { EMPSEAL_ROUTER_ABI } from "../../utils/abis/dexRouterABI";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
import { TOKENS, getTokenInfo } from "./tokens";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { X, InfoIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useAccount, useBalance } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
  readContract,
} from "@wagmi/core";
import { config } from "../../Wagmi/config";
import {
  isAddress,
  parseUnits,
  formatUnits,
  zeroAddress,
  decodeEventLog,
  parseEventLogs,
  erc20Abi,
} from "viem";
import { formatErrorMessage } from "../../utils/utils";
import { TokenLogo } from "../../components/TokenLogo.tsx";
import { LogoService } from "../../services/LogoService";
import {
  BRACKET_ORDER_TYPE,
  CONTRACT_ADDRESS,
  STOP_LOSS_MAX_ABOVE_PERCENT,
  STOP_LOSS_MAX_BELOW_PERCENT,
} from "./create-order-form/constants";
import { MainActionButton } from "./create-order-form/MainActionButton";
// import { StrategySelector } from "./create-order-form/StrategySelector";
import { OrderMode, type CreateOrderFormProps } from "./create-order-form/types";
import {
  formatNumber,
  getDeadlineBounds,
  getStopLossPercentFromSlider,
  getStopLossSliderPosition,
  limitDecimalPlaces,
  sanitizeNumericInput,
} from "./create-order-form/utils";

type ExpiryPreset =
  | "5m"
  | "30m"
  | "1h"
  | "1d"
  | "3d"
  | "7d"
  | "1mo"
  | "3mo"
  | "custom";

const EXPIRY_PRESET_OPTIONS: Array<{ value: ExpiryPreset; label: string }> = [
  { value: "5m", label: "5 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "1mo", label: "1 month" },
  { value: "3mo", label: "3 months (max)" },
  { value: "custom", label: "Custom" },
];

const formatLocalDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getPresetDeadline = (preset: ExpiryPreset) => {
  if (preset === "custom") return null;

  const next = new Date();
  next.setSeconds(0, 0);

  switch (preset) {
    case "5m":
      next.setMinutes(next.getMinutes() + 5);
      break;
    case "30m":
      next.setMinutes(next.getMinutes() + 30);
      break;
    case "1h":
      next.setHours(next.getHours() + 1);
      break;
    case "1d":
      next.setDate(next.getDate() + 1);
      break;
    case "3d":
      next.setDate(next.getDate() + 3);
      break;
    case "7d":
      next.setDate(next.getDate() + 7);
      break;
    case "1mo":
      next.setMonth(next.getMonth() + 1);
      break;
    case "3mo":
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      return null;
  }

  return next;
};

export function CreateOrderForm({
  onStatusMessage,
  onOrderCreated,
  slippage,
  onOpenSlippage = () => { },
}: CreateOrderFormProps) {
  const [percent, setPercent] = useState<number>(0);
  const [showBracketSettings, setShowBracketSettings] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [calculatedMarketPrice, setCalculatedMarketPrice] = useState<string | null>(null);
  const [stopLossDeadline, setStopLossDeadline] = useState<string>("");
  const [takeProfitDeadline, setTakeProfitDeadline] = useState<string>("");
  const [exitTokenAddress, setExitTokenAddress] = useState<string>("");
  const [orderMode, setOrderMode] = useState<OrderMode>(OrderMode.STANDARD);

  const { address: userAddress } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isApproved, setIsApproved] = useState(false); // New state for approval status
  const [checkingApproval, setCheckingApproval] = useState(false); // New state for checking approval
  const [tokenInMode, setTokenInMode] = useState<"select" | "custom">("select");
  const [tokenOutMode, setTokenOutMode] = useState<"select" | "custom">(
    "select",
  );
  const [exitTokenMode, setExitTokenMode] = useState<"select" | "custom">(
    "select",
  );
  const [customTokenIn, setCustomTokenIn] = useState<any>(null);
  const [customTokenOut, setCustomTokenOut] = useState<any>(null);
  const [customExitToken, setCustomExitToken] = useState<any>(null);
  const [partialFillEnabled, setPartialFillEnabled] = useState(false);
  const [fillMode, setFillMode] = useState(1); // 1: Split3, 2: Split5, 3: Split10, 4: Flexible
  const [marketPrice, setMarketPrice] = useState<string | null>(null);
  const [quoteReversed, setQuoteReversed] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [limitPriceError, setLimitPriceError] = useState<string | null>(null);
  // const [minValueError, setMinValueError] = useState<string | null>(null); // state for minimum value error for amount in with USD check $30
  const [tokenInUSDPrice, setTokenInUSDPrice] = useState<number | null>(null);
  const [tokenOutUSDPrice, setTokenOutUSDPrice] = useState<number | null>(null);
  const [standardSide, setStandardSide] = useState<OrderStrategy>(OrderStrategy.SELL);
  const [deadlinePreset, setDeadlinePreset] = useState<ExpiryPreset>("30m");
  const [selectedInPercentage, setSelectedInPercentage] = useState<number | null>(
    null,
  );
  const [selectedOutPercentage, setSelectedOutPercentage] = useState<number | null>(
    null,
  );

  // bracket
  const [takeProfitPercent, setTakeProfitPercent] = useState<number | string>(0);
  const [stopLossPercent, setStopLossPercent] = useState<number | string>(0);
  // bracket

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as any,
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
      amountIn: "",
      minAmountOut: "",
      limitPrice: "",
      deadline: "",
      strategy: OrderStrategy.SELL,
    },
  });

  const amountIn = form.watch("amountIn");
  const selectedTokenIn = form.watch("tokenIn");
  const selectedTokenOut = form.watch("tokenOut");
  const currentLimitPrice = form.watch("limitPrice");
  const currentMinAmountOut = form.watch("minAmountOut");
  const currentStrategy = form.watch("strategy");
  const normalizedCurrentLimitPrice = useMemo(() => {
    const parsedLimitPrice = Number(currentLimitPrice);
    if (!Number.isFinite(parsedLimitPrice) || parsedLimitPrice <= 0) return null;
    const normalized = quoteReversed ? 1 / parsedLimitPrice : parsedLimitPrice;
    if (!Number.isFinite(normalized) || normalized <= 0) return null;
    return normalized;
  }, [currentLimitPrice, quoteReversed]);

  // Legacy auto-derivation from limit vs market kept for reference (disabled intentionally).
  // const derivedStandardStrategy = useMemo(() => {
  //   const limit = normalizedCurrentLimitPrice;
  //   const market = Number(marketPrice);
  //   if (!Number.isFinite(limit) || !Number.isFinite(market) || market <= 0) {
  //     return currentStrategy === OrderStrategy.BUY ? OrderStrategy.BUY : OrderStrategy.SELL;
  //   }
  //   return limit >= market ? OrderStrategy.SELL : OrderStrategy.BUY;
  // }, [normalizedCurrentLimitPrice, currentStrategy, marketPrice]);

  const effectiveStrategy =
    orderMode === OrderMode.STANDARD ? standardSide : currentStrategy;

  const isSellLikeStrategy = effectiveStrategy === OrderStrategy.SELL;
  const isBuyLikeStrategy = effectiveStrategy === OrderStrategy.BUY;
  const normalizedExitToken = exitTokenAddress.trim();
  const hasExitTokenInput = normalizedExitToken.length > 0;
  const exitTokenValidationError = hasExitTokenInput
    ? !isAddress(normalizedExitToken)
      ? "Exit token must be a valid EVM address"
      : normalizedExitToken.toLowerCase() === zeroAddress
        ? "Exit token cannot be the zero address when explicitly provided"
        : null
    : null;
  const tokenInInfo =
    customTokenIn && customTokenIn.address === selectedTokenIn
      ? customTokenIn
      : getTokenInfo(selectedTokenIn);
  const tokenOutInfo =
    customTokenOut && customTokenOut.address === selectedTokenOut
      ? customTokenOut
      : getTokenInfo(selectedTokenOut);
  const primaryBaseSymbol = tokenInInfo?.symbol || "Token In";
  const primaryQuoteSymbol = tokenOutInfo?.symbol || "Token Out";
  const displayedBaseSymbol = quoteReversed ? primaryQuoteSymbol : primaryBaseSymbol;
  const displayedQuoteSymbol = quoteReversed ? primaryBaseSymbol : primaryQuoteSymbol;
  const displayedMarketPrice = useMemo(() => {
    const parsedMarket = Number(marketPrice);
    if (!Number.isFinite(parsedMarket) || parsedMarket <= 0) return null;
    const displayValue = quoteReversed ? 1 / parsedMarket : parsedMarket;
    if (!Number.isFinite(displayValue) || displayValue <= 0) return null;
    return displayValue.toFixed(6);
  }, [marketPrice, quoteReversed]);

  const { data: tokenInBalanceData } = useBalance({
    address: userAddress,
    token:
      selectedTokenIn && isAddress(selectedTokenIn)
        ? selectedTokenIn
        : undefined,
  });
  const tokenInBalance = tokenInBalanceData?.formatted;

  const hasInsufficientBalance =
    !!tokenInBalance &&
    !!amountIn &&
    !isNaN(parseFloat(amountIn)) &&
    parseFloat(amountIn) > parseFloat(tokenInBalance);

  const { data: tokenOutBalanceData } = useBalance({
    address: userAddress,
    token:
      selectedTokenOut && isAddress(selectedTokenOut)
        ? selectedTokenOut
        : undefined,
  });
  const tokenOutBalance = tokenOutBalanceData?.formatted;

  // Check if tokens are approved whenever tokenIn or amountIn changes
  useEffect(() => {
    const checkApproval = async () => {
      if (!userAddress || !selectedTokenIn || !amountIn || !tokenInInfo) {
        setIsApproved(false);
        return;
      }

      setCheckingApproval(true);
      try {
        const amount = parseUnits(amountIn, tokenInInfo.decimals || 18);

        const allowance = await readContract(config, {
          address: selectedTokenIn as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [userAddress, CONTRACT_ADDRESS],
        });

        setIsApproved(allowance >= amount);
      } catch (error) {
        console.error("Error checking allowance:", error);
        setIsApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    };

    checkApproval();
  }, [selectedTokenIn, amountIn, userAddress, tokenInInfo]);

  useEffect(() => {
    const isTokenInWhitelisted = !!getTokenInfo(selectedTokenIn);
    const isTokenOutWhitelisted = !!getTokenInfo(selectedTokenOut);

    if (
      tokenInMode === "custom" &&
      tokenOutMode === "custom" &&
      !isTokenInWhitelisted &&
      !isTokenOutWhitelisted &&
      isAddress(selectedTokenIn) &&
      isAddress(selectedTokenOut)
    ) {
      setTradeError(
        "Warning: Trading between two custom tokens is not supported.",
      );
    } else {
      setTradeError(null);
    }
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode]);

  useEffect(() => {
    const fetchTokenData = async (
      tokenAddress: string,
      setCustomToken: (token: any) => void,
    ) => {
      let fetchSuccess = false;
      try {
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/pulsechain/tokens/${tokenAddress}`,
        );
        if (!response.ok) throw new Error("GeckoTerminal API failed");
        const data = await response.json();

        if (data?.data?.attributes) {
          const { name, symbol, decimals, image_url } = data.data.attributes;

          // Cache the logo if found
          if (image_url) {
          }

          setCustomToken({
            address: tokenAddress,
            name,
            symbol,
            decimals,
            logoURI: image_url,
          });
          fetchSuccess = true;
        }
      } catch (error) {
        console.warn("GeckoTerminal fetch failed, falling back to DexScreener:", error);
      }

      if (!fetchSuccess) {
        try {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
          );
          if (!response.ok) throw new Error("DexScreener API failed");
          const data = await response.json();

          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs.find(
              (p: any) => p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()
            ) || data.pairs[0]; // fallback to first pair if exact base token match isn't found

            if (pair) {
              setCustomToken({
                address: tokenAddress,
                name: pair.baseToken.name,
                symbol: pair.baseToken.symbol,
                decimals: 18, // DexScreener doesn't provide decimals, defaulting to 18
                logoURI: pair.info?.imageUrl || "",
              });
              fetchSuccess = true;
            }
          }
        } catch (error) {
          console.error("DexScreener fetch also failed:", error);
        }
      }

      if (!fetchSuccess) {
        setCustomToken(null);
      }
    };

    if (tokenInMode === "custom" && isAddress(selectedTokenIn)) {
      fetchTokenData(selectedTokenIn, setCustomTokenIn);
    } else {
      setCustomTokenIn(null);
    }

    if (tokenOutMode === "custom" && isAddress(selectedTokenOut)) {
      fetchTokenData(selectedTokenOut, setCustomTokenOut);
    } else {
      setCustomTokenOut(null);
    }

    if (exitTokenMode === "custom" && isAddress(exitTokenAddress)) {
      fetchTokenData(exitTokenAddress, setCustomExitToken);
    } else {
      setCustomExitToken(null);
    }
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode, exitTokenMode, exitTokenAddress]);

  // Calculate minAmountOut when amountIn, limitPrice, or slippage changes
  useEffect(() => {
    if (!currentLimitPrice || Number.isNaN(parseFloat(currentLimitPrice))) return;

    const enteredLimitPriceFloat = parseFloat(currentLimitPrice);
    const limitPriceFloat = quoteReversed
      ? 1 / enteredLimitPriceFloat
      : enteredLimitPriceFloat;
    if (!Number.isFinite(limitPriceFloat) || limitPriceFloat <= 0) return;

    if (isSellLikeStrategy) {
      if (!amountIn || Number.isNaN(parseFloat(amountIn))) return;
      const amountInFloat = parseFloat(amountIn);
      const expectedAmountOut = amountInFloat * limitPriceFloat;

      // Preview should reflect raw limit-price output (no slippage buffer).
      form.setValue("minAmountOut", expectedAmountOut.toFixed(6), {
        shouldValidate: false,
        shouldDirty: true,
      });
      return;
    }

    if (!currentMinAmountOut || Number.isNaN(parseFloat(currentMinAmountOut))) {
      return;
    }

    const minOutFloat = parseFloat(currentMinAmountOut);
    const maxInput = minOutFloat / limitPriceFloat;

    form.setValue("amountIn", maxInput.toFixed(6), {
      shouldValidate: false,
      shouldDirty: true,
    });
  }, [
    amountIn,
    currentLimitPrice,
    form,
    isSellLikeStrategy,
    quoteReversed,
    slippage,
    currentMinAmountOut,
  ]);

  useEffect(() => {
    setQuoteReversed(false);
    const fetchMarketPrice = async () => {
      // Collect addresses to fetch
      const addresses = [];
      if (selectedTokenIn && isAddress(selectedTokenIn))
        addresses.push(selectedTokenIn);
      if (selectedTokenOut && isAddress(selectedTokenOut))
        addresses.push(selectedTokenOut);

      if (addresses.length === 0) {
        setTokenInUSDPrice(null);
        setTokenOutUSDPrice(null);
        setMarketPrice(null);
        return;
      }

      try {
        let tokenInPrice: number | null = null;
        let tokenOutPrice: number | null = null;
        let fetchSuccess = false;

        try {
          const response = await fetch(
            `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addresses.join(
              ",",
            )}`,
          );
          if (!response.ok) throw new Error("GeckoTerminal API failed");
          const data = await response.json();

          if (data?.data?.attributes?.token_prices) {
            if (selectedTokenIn && isAddress(selectedTokenIn)) {
              tokenInPrice = parseFloat(
                data.data.attributes.token_prices[selectedTokenIn.toLowerCase()],
              );
              if (isNaN(tokenInPrice)) tokenInPrice = null;
            }
            if (selectedTokenOut && isAddress(selectedTokenOut)) {
              tokenOutPrice = parseFloat(
                data.data.attributes.token_prices[selectedTokenOut.toLowerCase()],
              );
              if (isNaN(tokenOutPrice)) tokenOutPrice = null;
            }
            fetchSuccess = true;
          }
        } catch (error) {
          console.warn("GeckoTerminal failed, falling back to DexScreener:", error);
        }

        if (!fetchSuccess) {
          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`
            );
            if (!response.ok) throw new Error("DexScreener API failed");
            const data = await response.json();

            if (data.pairs && data.pairs.length > 0) {
              if (selectedTokenIn && isAddress(selectedTokenIn)) {
                // Find most liquid pair where baseToken matches selectedTokenIn
                const pair = data.pairs.find(
                  (p: any) => p.baseToken.address.toLowerCase() === selectedTokenIn.toLowerCase()
                );
                if (pair && pair.priceUsd) {
                  tokenInPrice = parseFloat(pair.priceUsd);
                }
              }
              if (selectedTokenOut && isAddress(selectedTokenOut)) {
                // Find most liquid pair where baseToken matches selectedTokenOut
                const pair = data.pairs.find(
                  (p: any) => p.baseToken.address.toLowerCase() === selectedTokenOut.toLowerCase()
                );
                if (pair && pair.priceUsd) {
                  tokenOutPrice = parseFloat(pair.priceUsd);
                }
              }
              fetchSuccess = true;
            }
          } catch (error) {
            console.error("DexScreener API also failed:", error);
          }
        }

        // Apply state updates
        setTokenInUSDPrice(tokenInPrice || null);
        setTokenOutUSDPrice(tokenOutPrice || null);

        if (
          tokenInPrice &&
          tokenOutPrice &&
          selectedTokenIn &&
          selectedTokenOut &&
          isAddress(selectedTokenIn) &&
          isAddress(selectedTokenOut)
        ) {
          const price = tokenInPrice / tokenOutPrice;
          setMarketPrice(price.toFixed(8));
        } else {
          setMarketPrice(null);
        }
      } catch (error) {
        console.error(
          "Failed to fetch market price from APIs:",
          error,
        );
        setMarketPrice(null);
        setTokenInUSDPrice(null);
        setTokenOutUSDPrice(null);
      }
    };

    fetchMarketPrice();
  }, [selectedTokenIn, selectedTokenOut]);

  useEffect(() => {
    if (!currentLimitPrice || !marketPrice) {
      setLimitPriceError(null);
      return;
    }

    const enteredLimit = parseFloat(currentLimitPrice);
    const limit = quoteReversed ? 1 / enteredLimit : enteredLimit;
    const market = parseFloat(marketPrice);
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(market)) {
      setLimitPriceError(null);
      return;
    }

    if (orderMode === OrderMode.BRACKET || orderMode === OrderMode.POSITION) {
      setLimitPriceError(null);
      return;
    }

    // Informational warning only, based on derived side:
    // SELL expects target above market, BUY expects target below market.
    if (effectiveStrategy === OrderStrategy.SELL && limit < market) {
      // setLimitPriceError("Sell limit is below market; this behaves like a BUY-style target.");
      setLimitPriceError(null);
      return;
    }

    if (effectiveStrategy === OrderStrategy.BUY && limit > market) {
      // setLimitPriceError("Buy limit is above market; this behaves like a SELL-style target.");
      setLimitPriceError(null);
      return;
    }

    setLimitPriceError(null);
  }, [currentLimitPrice, effectiveStrategy, marketPrice, orderMode, quoteReversed]);

  // Validate that the order value is at least $30
  // useEffect(() => {
  //   if (tokenInUSDPrice && amountIn && !isNaN(parseFloat(amountIn))) {
  //     const usdValue = parseFloat(amountIn) * tokenInUSDPrice;
  //     if (usdValue < 30) {
  //       setMinValueError(`Minimum order value is $30`);
  //     } else {
  //       setMinValueError(null);
  //     }
  //   } else {
  //     setMinValueError(null);
  //   }
  // }, [amountIn, tokenInUSDPrice]);

  // Reset bracket settings when strategy changes from BRACKET
  useEffect(() => {
    if (currentStrategy !== OrderStrategy.BRACKET) {
      setShowBracketSettings(false);
      setTakeProfitPrice("");
      setStopLossPrice("");
      setTakeProfitDeadline("");
      setTakeProfitPercent(0);
      setStopLossPercent(0);
      setExitTokenMode("select");
      setExitTokenAddress("");
    }
  }, [currentStrategy]);

  const handleTokenInSelect = (value: string) => {
    if (value === "custom") {
      setTokenInMode("custom");
      form.setValue("tokenIn", "");
    } else {
      setTokenInMode("select");
      form.setValue("tokenIn", value);
    }
  };

  const handleTokenOutSelect = (value: string) => {
    if (value === "custom") {
      setTokenOutMode("custom");
      form.setValue("tokenOut", "");
    } else {
      setTokenOutMode("select");
      form.setValue("tokenOut", value);
    }
  };

  const handleExitTokenSelect = (value: string) => {
    if (value === "custom") {
      setExitTokenMode("custom");
      setExitTokenAddress("");
    } else {
      setExitTokenMode("select");
      setExitTokenAddress(value);
    }
  };

  const handleSwapTokens = () => {
    const tokenIn = form.getValues("tokenIn");
    const tokenOut = form.getValues("tokenOut");
    const amountIn = form.getValues("amountIn");
    const minAmountOut = form.getValues("minAmountOut");

    form.setValue("tokenIn", tokenOut);
    form.setValue("tokenOut", tokenIn);
    form.setValue("amountIn", minAmountOut);
    form.setValue("minAmountOut", amountIn);
    form.setValue("limitPrice", "");
    setCalculatedMarketPrice(null);

    const currentTokenInMode = tokenInMode;
    setTokenInMode(tokenOutMode);
    setTokenOutMode(currentTokenInMode);

    const currentCustomTokenIn = customTokenIn;
    setCustomTokenIn(customTokenOut);
    setCustomTokenOut(currentCustomTokenIn);
    setSelectedInPercentage(null);
    setSelectedOutPercentage(null);

    // Swapping the pair toggles user intent between sell-style and buy-style entry.
    setStandardSide((prev) =>
      prev === OrderStrategy.SELL ? OrderStrategy.BUY : OrderStrategy.SELL,
    );
  };

  const handleApproveTokens = async () => {
    const tokenIn = form.getValues("tokenIn");
    const amountIn = form.getValues("amountIn");

    if (!tokenIn || !amountIn) {
      onStatusMessage({
        type: "error",
        message: "Please enter Token In address and Amount In",
      });
      return;
    }

    setIsApproving(true);
    onStatusMessage({ type: "info", message: "Requesting approval..." });

    try {
      const decimals = tokenInInfo?.decimals || 18;
      const amount = parseUnits(amountIn, decimals);

      const hash = await writeContract(config, {
        address: tokenIn as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amount],
      });

      onStatusMessage({
        type: "info",
        message: "Approval transaction sent, waiting for confirmation...",
        txHash: hash,
      });

      await waitForTransactionReceipt(config, { hash });

      // Set approved state to true after successful approval
      setIsApproved(true);

      onStatusMessage({
        type: "success",
        message: "Tokens approved successfully!",
      });
    } catch (error: any) {
      console.error("Approval failed:", error);
      onStatusMessage({
        type: "error",
        message: formatErrorMessage(error, "Failed to approve tokens"),
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Combined function that handles both approval and order creation
  const handleMainAction = async () => {
    // If not approved, handle approval first
    // // Block action if order value is below $30
    // if (minValueError) {
    //   onStatusMessage({ type: "error", message: minValueError });
    //   return;
    // }

    if (!isApproved) {
      await handleApproveTokens();
    } else {
      // If already approved, proceed with order creation
      await form.handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (data: CreateOrderInput) => {
    setIsCreating(true);
    onStatusMessage({ type: "info", message: "Creating order..." });

    try {
      const submittedLimitPrice = Number(data.limitPrice);
      const normalizedLimitPrice = quoteReversed
        ? 1 / submittedLimitPrice
        : submittedLimitPrice;
      if (!Number.isFinite(normalizedLimitPrice) || normalizedLimitPrice <= 0) {
        onStatusMessage({
          type: "error",
          message: "Please enter a valid limit price",
        });
        setIsCreating(false);
        return;
      }
      const normalizedLimitPriceString =
        normalizedLimitPrice.toFixed(18).replace(/\.?0+$/, "") || "0";

      const amountIn = parseUnits(data.amountIn, tokenInInfo?.decimals || 18);
      const minAmountOut = parseUnits(
        data.minAmountOut,
        tokenOutInfo?.decimals || 18,
      );
      const limitPrice = parseUnits(normalizedLimitPriceString, 18);
      const deadline = BigInt(
        Math.floor(new Date(data.deadline).getTime() / 1000),
      );
      const mode = partialFillEnabled ? fillMode : 0;
      const standardStrategy =
        orderMode === OrderMode.STANDARD ? standardSide : data.strategy;
      const orderType = standardStrategy === OrderStrategy.SELL ? 0 : 1; // 0 for SELL, 1 for BUY
      const bracketOrderType = BRACKET_ORDER_TYPE; // Bracket/OCO is hard-forced to BUY
      const hasValidCustomExitToken =
        hasExitTokenInput && !exitTokenValidationError;
      const defaultBracketExitToken =
        data.tokenOut && isAddress(data.tokenOut)
          ? (data.tokenOut as `0x${string}`)
          : zeroAddress;
      const bracketExitToken = hasValidCustomExitToken
        ? (normalizedExitToken as `0x${string}`)
        : defaultBracketExitToken;

      let hash: `0x${string}`;

      if (orderMode === OrderMode.BRACKET && exitTokenValidationError) {
        onStatusMessage({
          type: "error",
          message: exitTokenValidationError,
        });
        setIsCreating(false);
        return;
      }

      // Validation for bracket orders (BUY only)
      if (orderMode === OrderMode.BRACKET) {
        const sl = parseFloat(stopLossPrice);
        const tp = parseFloat(takeProfitPrice);

        if (!stopLossPrice || !takeProfitPrice || isNaN(sl) || isNaN(tp)) {
          onStatusMessage({
            type: "error",
            message: "Please enter valid Stop Loss and Take Profit prices",
          });
          setIsCreating(false);
          return;
        }

        if (!takeProfitDeadline) {
          onStatusMessage({
            type: "error",
            message: "Please set SL/TP expiry",
          });
          setIsCreating(false);
          return;
        }

        const slTpExpiry = new Date(takeProfitDeadline).getTime();
        if (!Number.isFinite(slTpExpiry) || slTpExpiry <= Date.now()) {
          onStatusMessage({
            type: "error",
            message: "SL/TP expiry must be a future date and time",
          });
          setIsCreating(false);
          return;
        }

        // BUY OCO: stop loss must be below take profit
        if (sl >= tp) {
          onStatusMessage({
            type: "error",
            message: "Stop Loss Price must be LOWER than Take Profit Price",
          });
          setIsCreating(false);
          return;
        }
      }

      if (orderMode === OrderMode.POSITION) {
        if (!data.tokenOut || data.tokenOut === zeroAddress) {
          onStatusMessage({
            type: "error",
            message: "Please select a Token to Protect Into (Exit Token)",
          });
          setIsCreating(false);
          return;
        }

        const sl = parseFloat(stopLossPrice);
        const tp = parseFloat(takeProfitPrice);

        if (!stopLossPrice || !takeProfitPrice || isNaN(sl) || isNaN(tp)) {
          onStatusMessage({
            type: "error",
            message: "Please enter valid Stop Loss and Take Profit prices",
          });
          setIsCreating(false);
          return;
        }

        if (!takeProfitDeadline) {
          onStatusMessage({
            type: "error",
            message: "Please set SL/TP expiry",
          });
          setIsCreating(false);
          return;
        }

        const slTpExpiry = new Date(takeProfitDeadline).getTime();
        if (!Number.isFinite(slTpExpiry) || slTpExpiry <= Date.now()) {
          onStatusMessage({
            type: "error",
            message: "SL/TP expiry must be a future date and time",
          });
          setIsCreating(false);
          return;
        }

        // Position orders are always SELL protection: enforce SL > TP
        if (sl <= tp) {
          onStatusMessage({
            type: "error",
            message:
              "For Position Protection, Stop Loss Price must be GREATER than Take Profit Price",
          });
          setIsCreating(false);
          return;
        }
      }

      if (orderMode === OrderMode.STANDARD) {
        hash = await writeContract(config, {
          address: CONTRACT_ADDRESS,
          abi: LIMIT_ORDER_ABI,
          functionName: "createOrder",
          args: [
            data.tokenIn as `0x${string}`,
            data.tokenOut as `0x${string}`,
            amountIn,
            minAmountOut,
            limitPrice,
            deadline,
            mode,
            orderType,
          ],
        });
      } else if (orderMode === OrderMode.BRACKET) {
        const slPrice = parseUnits(stopLossPrice, 18);
        const tpPrice = parseUnits(takeProfitPrice, 18);

        // Helper to calc min out
        const calcMinOut = (amount: bigint, price: bigint) => {
          return (amount * price) / BigInt(1e18);
        };

        const slMinOut = calcMinOut(amountIn, slPrice);
        const tpMinOut = calcMinOut(amountIn, tpPrice);

        // Single expiry for both SL and TP
        const bracketExpiry = BigInt(
          Math.floor(new Date(takeProfitDeadline).getTime() / 1000),
        );

        hash = await writeContract(config, {
          address: CONTRACT_ADDRESS,
          abi: LIMIT_ORDER_ABI,
          functionName: "createBracketOrder",
          args: [
            data.tokenIn as `0x${string}`,
            data.tokenOut as `0x${string}`,
            amountIn,
            minAmountOut, // Entry Min Out
            limitPrice, // Entry Limit Price
            deadline, // Entry Deadline
            bracketOrderType, // Entry Order Type
            bracketExitToken, // Exit Token (defaults to entry tokenOut when empty)
            slPrice,
            slMinOut,
            bracketExpiry,
            tpPrice,
            tpMinOut,
            bracketExpiry,
          ],
        });
      } else {
        // Position Bracket
        const slPrice = parseUnits(stopLossPrice, 18);
        const tpPrice = parseUnits(takeProfitPrice, 18);

        const calcMinOut = (amount: bigint, price: bigint) => {
          return (amount * price) / BigInt(1e18);
        };

        const slMinOut = calcMinOut(amountIn, slPrice);
        const tpMinOut = calcMinOut(amountIn, tpPrice);

        // Single expiry for both SL and TP
        const bracketExpiry = BigInt(
          Math.floor(new Date(takeProfitDeadline).getTime() / 1000),
        );

        hash = await writeContract(config, {
          address: CONTRACT_ADDRESS,
          abi: LIMIT_ORDER_ABI,
          functionName: "createPositionBracket",
          args: [
            data.tokenIn as `0x${string}`,
            data.tokenOut as `0x${string}`, // Exit Token
            amountIn,
            slPrice,
            slMinOut,
            bracketExpiry,
            tpPrice,
            tpMinOut,
            bracketExpiry,
          ],
        });
      }

      onStatusMessage({
        type: "info",
        message: "Order creation transaction sent, waiting for confirmation...",
        txHash: hash,
      });

      const receipt = await waitForTransactionReceipt(config, { hash });

      let newOrderId = "new";
      try {
        const logs = parseEventLogs({
          abi: LIMIT_ORDER_ABI,
          logs: receipt.logs,
        });

        const createdEvent = logs.find((l) => l.eventName === "OrderCreated");
        if (createdEvent) {
          newOrderId = (createdEvent.args as any).orderId.toString();
        }
      } catch (e) {
        console.error("Error decoding event log", e);
      }

      onStatusMessage({
        type: "success",
        message: "Order created successfully!",
      });

      form.reset();
      setTokenInMode("select");
      setTokenOutMode("select");
      setShowBracketSettings(false);
      setTakeProfitPrice("");
      setStopLossPrice("");
      setTakeProfitDeadline("");
      setDeadlinePreset("30m");
      setSelectedInPercentage(null);
      setSelectedOutPercentage(null);
      setOrderMode(OrderMode.STANDARD);
      setStandardSide(OrderStrategy.SELL);
      setExitTokenMode("select");
      setExitTokenAddress("");
      setIsApproved(false); // Reset approval state after order creation

      // Only trigger the client update if we actually found a valid ID
      if (newOrderId !== "new") {
        onOrderCreated({
          orderId: newOrderId,
          txHash: hash,
          strategy:
            orderMode === OrderMode.STANDARD ? standardSide : data.strategy,
        });
      }
    } catch (error: any) {
      console.error("Order creation failed:", error);
      onStatusMessage({
        type: "error",
        message: formatErrorMessage(error, "Failed to create order"),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const { minDeadline, maxDeadline } = getDeadlineBounds();
  const minDeadlineDate = useMemo(() => new Date(minDeadline), [minDeadline]);
  const maxDeadlineDate = useMemo(() => new Date(maxDeadline), [maxDeadline]);

  const applyPresetDeadline = (
    preset: Exclude<ExpiryPreset, "custom">,
    shouldMarkDirty: boolean,
  ) => {
    const presetDeadline = getPresetDeadline(preset);
    if (!presetDeadline) return;

    const boundedDeadline =
      presetDeadline < minDeadlineDate
        ? minDeadlineDate
        : presetDeadline > maxDeadlineDate
          ? maxDeadlineDate
          : presetDeadline;

    form.setValue("deadline", formatLocalDateTime(boundedDeadline), {
      shouldValidate: true,
      shouldDirty: shouldMarkDirty,
      shouldTouch: shouldMarkDirty,
    });
  };

  const handleDeadlinePresetChange = (value: string) => {
    const preset = value as ExpiryPreset;
    setDeadlinePreset(preset);

    if (preset === "custom") return;

    applyPresetDeadline(preset, true);
  };

  useEffect(() => {
    if (deadlinePreset === "custom") return;

    const currentDeadline = form.getValues("deadline");
    if (currentDeadline) return;

    applyPresetDeadline(deadlinePreset, false);
  }, [deadlinePreset, form, minDeadlineDate, maxDeadlineDate]);

  // For Limit Price
  // Apply limit price by +/- percentage from market
  useEffect(() => {
    if (!marketPrice) return;
    // Do not overwrite user-entered limit price while typing.
    const existingLimitPrice = form.getValues("limitPrice");
    if (percent === 0 && existingLimitPrice && existingLimitPrice.trim() !== "") return;
    if (percent === 0) {
      applyLimitPriceByPercent("market");
    } else {
      applyLimitPriceByPercent(percent);
    }
  }, [form, marketPrice, percent]);

  const applyLimitPriceByPercent = (percent: number | "market") => {
    if (!marketPrice) return;

    const market = Number(marketPrice);
    if (!Number.isFinite(market) || market <= 0) return;

    let newPrice = market;

    if (percent !== "market") {
      if (isSellLikeStrategy) {
        newPrice = market * (1 + percent / 100);
      } else {
        newPrice = market / (1 + percent / 100);
      }
    }

    const displayPrice = quoteReversed ? 1 / newPrice : newPrice;
    if (!Number.isFinite(displayPrice) || displayPrice <= 0) return;

    form.setValue("limitPrice", displayPrice.toFixed(6), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleToggleQuoteDirection = () => {
    const currentPrice = Number(form.getValues("limitPrice"));
    if (Number.isFinite(currentPrice) && currentPrice > 0) {
      const invertedPrice = 1 / currentPrice;
      if (Number.isFinite(invertedPrice) && invertedPrice > 0) {
        const formattedPrice = invertedPrice.toFixed(6);
        form.setValue("limitPrice", formattedPrice, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setCalculatedMarketPrice(formattedPrice);
      }
    }
    setQuoteReversed((prev) => !prev);
  };

  const handleSetLimitPriceToMarket = () => {
    if (!displayedMarketPrice) return;
    form.setValue("limitPrice", displayedMarketPrice, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setCalculatedMarketPrice(displayedMarketPrice);
  };

  const handleTokenInPercentageChange = (value: number) => {
    if (selectedInPercentage === value) {
      setSelectedInPercentage(null);
      return;
    }

    if (!tokenInBalance) return;
    const balance = parseFloat(tokenInBalance);
    if (!Number.isFinite(balance)) return;

    const percentValue = (balance * value) / 100;
    setSelectedInPercentage(value);

    // Update input visually
    form.setValue("amountIn", percentValue.toFixed(4), {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (orderMode === OrderMode.STANDARD) {
      setStandardSide(OrderStrategy.SELL);
    }
  };

  const handleTokenOutPercentageChange = (value: number) => {
    if (selectedOutPercentage === value) {
      setSelectedOutPercentage(null);
      return;
    }

    if (!tokenOutBalance) return;
    const balance = parseFloat(tokenOutBalance);
    if (!Number.isFinite(balance)) return;

    const percentValue = (balance * value) / 100;
    setSelectedOutPercentage(value);

    form.setValue("minAmountOut", percentValue.toFixed(4), {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (orderMode === OrderMode.STANDARD) {
      setStandardSide(OrderStrategy.BUY);
    }
  };

  useEffect(() => {
    setSelectedInPercentage(null);
  }, [selectedTokenIn]);

  useEffect(() => {
    setSelectedOutPercentage(null);
  }, [selectedTokenOut]);

  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputEl?.showPicker?.(); // Safely trigger calendar
  };

  const {
    ref: formRef,
    onChange: onDeadlineInputChange,
    ...rest
  } = form.register("deadline");

  const mergedRef = (el: HTMLInputElement | null) => {
    setInputEl(el); // Save to state
    formRef(el); // Register with React Hook Form
  };

  const [dollarinfo, setDollarInfo] = useState(false);
  const [dollarinfo1, setDollarInfo1] = useState(false);

  // Add this state near your other useState declarations
  const [customPercentage, setCustomPercentage] = useState<string>("");

  // Add this function to handle custom percentage changes
  const handleCustomPercentageChange = (value: string) => {
    // Sanitize and limit decimal places to 6
    let sanitized = limitDecimalPlaces(value.replace(/[^0-9.]/g, ""), 6);
    if (sanitized !== "" && Number(sanitized) > 10000) {
      sanitized = "10000";
    }
    // console.log("Sanitized percentage input:", sanitized);
    // Always preserve the raw string to allow typing decimals like "0."
    setCustomPercentage(sanitized);
    const percentValue = parseFloat(sanitized);

    // Only calculate if it's a valid number and market price exists
    if (!isNaN(percentValue) && marketPrice) {
      const market = parseFloat(marketPrice);
      let newLimitPrice: number;

      if (isSellLikeStrategy) {
        // For SELL: price above market by X%
        newLimitPrice = market * (1 + percentValue / 100);
      } else {
        // For BUY: lower target below market by X%.
        newLimitPrice = market / (1 + percentValue / 100);
      }

      const formattedPrice = newLimitPrice.toFixed(6);
      setCalculatedMarketPrice(formattedPrice);

      form.setValue("limitPrice", formattedPrice, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const applyStopLossPercent = (
    percent: number,
    updateState: boolean = true,
  ) => {
    const safePercent = Math.min(
      STOP_LOSS_MAX_ABOVE_PERCENT,
      Math.max(-STOP_LOSS_MAX_BELOW_PERCENT, percent),
    );
    if (updateState) {
      setStopLossPercent(safePercent);
    }
    if (marketPrice) {
      const market = Number(marketPrice);
      const stopLossValue =
        safePercent >= 0
          ? market * (1 + safePercent / 100)
          : market / (1 + Math.abs(safePercent) / 100);
      setStopLossPrice(stopLossValue.toFixed(8));
    }
  };

  const applyTakeProfitPercent = (percent: number, updateState: boolean = true) => {
    const safePercent = Math.min(10000, Math.max(0, percent));
    if (updateState) {
      setTakeProfitPercent(safePercent);
    }
    if (marketPrice) {
      const market = Number(marketPrice);
      const takeProfitValue =
        orderMode === OrderMode.BRACKET
          ? market * (1 + safePercent / 100)
          : market / (1 + safePercent / 100);
      setTakeProfitPrice(takeProfitValue.toFixed(8));
    }
  };

  const deriveLimitPercentFromPrice = (limitPriceValue: number, market: number) => {
    if (isSellLikeStrategy) {
      return Math.min(10000, Math.max(0, ((limitPriceValue - market) / market) * 100));
    }

    const percentBelow = ((market / limitPriceValue) - 1) * 100;
    return Math.min(10000, Math.max(0, percentBelow));
  };

  const deriveStopLossPercentFromPrice = (stopLossPriceValue: number, market: number) => {
    if (stopLossPriceValue >= market) {
      return ((stopLossPriceValue / market) - 1) * 100;
    }
    return -((market / stopLossPriceValue) - 1) * 100;
  };

  const deriveTakeProfitPercentFromPrice = (takeProfitPriceValue: number, market: number) => {
    if (orderMode === OrderMode.BRACKET) {
      return ((takeProfitPriceValue / market) - 1) * 100;
    }
    return ((market / takeProfitPriceValue) - 1) * 100;
  };

  return (
    <>
      <div className="lg:max-w-[1200px] md:max-w-[1200px] mx-auto w-full md:mt-10 mt-2">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 flex 2xl:gap-12 lg:gap-8 gap-5 justify-center lg:flex-nowrap flex-wrap"
        >
          <div className="md:max-w-[700px] w-full">
            {/* Strategy Selection (commented out intentionally; order side is now derived from price inputs) */}
            {/* <StrategySelector
              selectedStrategy={form.watch("strategy")}
              orderMode={orderMode}
              onSelectSell={() => {
                form.setValue("strategy", OrderStrategy.SELL);
                setOrderMode(OrderMode.STANDARD);
                setShowBracketSettings(false);
                setExitTokenMode("select");
                setExitTokenAddress("");
              }}
              onSelectBuy={() => {
                form.setValue("strategy", OrderStrategy.BUY);
                setOrderMode(OrderMode.STANDARD);
                setShowBracketSettings(false);
                setExitTokenMode("select");
                setExitTokenAddress("");
              }}
              onSelectBracket={() => {
                setOrderMode(OrderMode.BRACKET);
                setShowBracketSettings(true);
                setExitTokenMode("select");
                setExitTokenAddress("");
                form.setValue("strategy", OrderStrategy.BRACKET);
              }}
              onSelectPosition={() => {
                setOrderMode(OrderMode.POSITION);
                setShowBracketSettings(true);
                setExitTokenMode("select");
                setExitTokenAddress("");
                form.setValue("strategy", OrderStrategy.BRACKET);
              }}
            /> */}

            {/* Error Message */}
            {/* {form.formState.errors.strategy && (
              <p className="mt-2 text-sm text-destructive text-center">
                {form.formState.errors.strategy.message}
              </p>
            )} */}
            {/* <div className="mb-3 text-center">
              <span className="inline-flex items-center rounded-full border border-[#FF8A00] px-3 py-1 text-[11px] font-bold  text-[#FF8A00]">
                {isSellLikeStrategy ? "Derived: Sell Limit" : "Derived: Buy Limit"}
              </span>
            </div> */}
            {/*  */}
            <div className="relative bg_swap_box">
              <div className="flex justify-between gap-3 items-center">
                <div className="you_pay_heading">
                  {orderMode === OrderMode.POSITION
                    ? "Protected Token"
                    : isSellLikeStrategy
                      ? "Sell"
                      : "You sell at most"}
                </div>
                <div className="md:text-xs text-[10px] ">
                  <span className="font-normal leading-normal text-[#FF8A00]">
                    BAL
                  </span>
                  <span className="font-normal leading-normal text-[#FF8A00]">
                    {" "}
                    :{" "}
                  </span>
                  <span className="leading-normal">
                    {tokenInMode === "select"
                      ? tokenInBalance && (
                        <span className="leading-normal">
                          {parseFloat(tokenInBalance).toFixed(4)}{" "}
                        </span>
                      )
                      : tokenInBalance && (
                        <span className="leading-normal">
                          {parseFloat(tokenInBalance).toFixed(4)}{" "}
                        </span>
                      )}
                  </span>
                </div>
              </div>
              <div className="flex w-full mt-3 md:gap-5 gap-2 items-center">
                <div className="lg:md:max-w-[200px] w-full">
                  <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                    <div className="flex gap-2 items-center w-full">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF8A00] md:rounded-[7px]  md:px-5 px-3 py-[1px] justify-center w-full">
                        {tokenInMode === "select" ? (
                          <div className="space-y-2 w-full">
                            <Select
                              onValueChange={handleTokenInSelect}
                              value={selectedTokenIn || undefined}
                            >
                              <SelectTrigger
                                className="md:h-8 h-7 border-none text-center bg-black focus:none px-0 !w-full outline-none text-white font-semibold md:text-xs text-xs capitalize"
                                data-testid="select-token-in"
                              >
                                <SelectValue placeholder="Select token" />
                              </SelectTrigger>
                              <SelectContent className="bg-black text-white text-center">
                                {Object.entries(TOKENS).map(
                                  ([address, token]) => (
                                    <SelectItem key={address} value={address}>
                                      <div className="flex items-center gap-2 !justify-center">
                                        {/* <Coins className="h-4 w-4" /> */}
                                        <TokenLogo
                                          chainId={369}
                                          tokenAddress={address}
                                          symbol={token.symbol}
                                          className="md:h-5 md:w-5 w-4 h-4"
                                        />
                                        <span className="md:text-sm text-sm font-extrabold  text-white">
                                          {token.symbol}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ),
                                )}
                                <SelectItem value="custom">
                                  <span className="font-medium !text-sm  cursor-pointer text-white">
                                    Custom Address..
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customTokenIn ? (
                              <div className="flex items-center justify-center relative w-full md:h-8 h-7">
                                <div className="flex items-center gap-2 text-white">
                                  {customTokenIn.logoURI && (
                                    <img
                                      src={customTokenIn.logoURI}
                                      alt="token logo"
                                      className="md:h-5 md:w-5 w-4 h-4 rounded-full"
                                    />
                                  )}
                                  <span className=" md:text-sm text-sm font-extrabold !text-white">
                                    {customTokenIn.symbol}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("tokenIn", "")}
                                  className="absolute md:-right-10 -right-10  !text-white tilt z-10"
                                >
                                  <X size={16} className="!text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  {...form.register("tokenIn")}
                                  placeholder="0x..."
                                  className="h-12 bg-transparent !focus:none !outline-0 !border-none md:text-sm text-sm !font-bold !" // Added padding for logo
                                  data-testid="input-token-in-custom"
                                />
                                <X
                                  onClick={() => {
                                    setTokenInMode("select");
                                    form.setValue("tokenIn", "");
                                  }}
                                  size={20}
                                  className="!text-white absolute md:-right-4 -right-3 top-3"
                                />
                              </div>
                            )}
                            {/* <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTokenInMode("select");
                                form.setValue("tokenIn", "");
                              }}
                              className="md:text-base text-xs border-none "
                            >
                              Back to token list
                            </Button> */}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const inputLength =
                      formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 28
                        : window.innerWidth >= 768
                          ? 24
                          : 20;
                    const FREE_DIGITS = window.innerWidth >= 768 ? 12 : 5;
                    const SHRINK_RATE = 3;

                    const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );
                    return (
                      <input
                        id="amountIn"
                        {...form.register("amountIn")}
                        placeholder="0.0"
                        type="text"
                        className=" font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black space"
                        data-testid="input-amount-in"
                        onChange={(e) => {
                          const sanitized = sanitizeNumericInput(
                            e.target.value,
                          );
                          setSelectedInPercentage(null);
                          form.setValue("amountIn", sanitized);
                          if (orderMode === OrderMode.STANDARD) {
                            setStandardSide(OrderStrategy.SELL);
                          }
                        }}
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    );
                  })()}
                  <p className="mt-1 md:text-xs text-[7px] text-white text-right">
                    {tokenInInfo
                      ? `In ${tokenInInfo.symbol} (${tokenInInfo.decimals} decimals)`
                      : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                <div className="you_pay_heading flex flex-col relative top-2">
                  {selectedTokenIn ? (
                    tokenInUSDPrice ? (
                      `$${tokenInUSDPrice.toFixed(6)}`
                    ) : (
                      <span className="animate-pulse">Loading...</span>
                    )
                  ) : (
                    "--"
                  )}
                  <span className="mt-1">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal  leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[10px] text-[8px] font-medium  md:w-12 w-11 px-2
      ${selectedInPercentage === value
                          ? "!text-black !bg-[#FF8A00] border-[#FF8A00]"
                          : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF8A00] hover:text-black"
                        }`}
                      onClick={() => handleTokenInPercentageChange(value)}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-right relative text-white md:text-base text-[10px] usd-spacing truncate  text-sh1 flex justify-end gap-1">
                {tokenInUSDPrice &&
                  amountIn &&
                  !isNaN(parseFloat(amountIn)) && (
                    <div className="flex items-center gap-1">
                      <div className="relative inline-block">
                        <InfoIcon
                          size={18}
                          className="md:mt-[0.1px] mt-[-1px] cursor-pointer"
                          onMouseEnter={() => setDollarInfo(true)}
                          onMouseLeave={() => setDollarInfo(false)}
                          onClick={() => setDollarInfo((prev) => !prev)}
                        />

                        {dollarinfo && (
                          <div
                            className=" fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap  bg-black px-4 py-3 text-center md:text-xs text-[10px] font-bold text-white shadow-lg"
                            onMouseEnter={() => setDollarInfo(true)}
                            onMouseLeave={() => setDollarInfo(false)}
                          >
                            Dollar value display <br />
                            The dollar value displayed is fetched from a
                            3rd-party API. It may not be 100% accurate in some
                            cases. For accuracy, please check the output units.
                          </div>
                        )}
                      </div>
                      <span className=" font-bold">
                        $
                        {formatNumber(
                          (parseFloat(amountIn) * tokenInUSDPrice).toFixed(2),
                        )}
                      </span>
                    </div>
                  )}
              </div>
              <div className="text-right text-white font-extrabold text-sm relative  truncate">
                {form.formState.errors.amountIn && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.amountIn.message}
                  </p>
                )}
                {/* {minValueError && (
                  <p className="mt-1 text-sm text-destructive">
                    {minValueError}
                  </p>
                )} */}
              </div>
            </div>

            {/*  */}
            <div
              className="cursor-pointer relative mx-auto !mt-4 mb-4 md:w-[50px] w-12"
              onClick={handleSwapTokens}
              data-testid="button-swap-tokens"
            >
              <svg
                className="hoverswap transition-all  md:w-[50px] w-12"
                width={50}
                height={50}
                viewBox="0 0 70 70"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width={70} height={70} rx={12} fill="#F59216" />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M48.7375 36.0911C49.3099 36.5901 49.3694 37.4588 48.8704 38.0311L39.5371 48.7371C39.1603 49.1692 38.5549 49.3221 38.0181 49.121C37.4813 48.9198 37.1257 48.4067 37.1257 47.8334L37.1257 22.1667C37.1257 21.4074 37.7413 20.7917 38.5007 20.7917C39.26 20.7917 39.8756 21.4074 39.8756 22.1667L39.8756 44.1638L46.7975 36.224C47.2965 35.6516 48.1651 35.5921 48.7375 36.0911Z"
                  fill="black"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M21.2632 33.9089C20.6907 33.4099 20.6313 32.5412 21.1303 31.9689L30.4636 21.263C30.8404 20.8309 31.4457 20.6778 31.9825 20.879C32.5193 21.0802 32.875 21.5933 32.875 22.1666L32.875 47.8332C32.875 48.5926 32.2594 49.2082 31.5 49.2082C30.7406 49.2082 30.125 48.5926 30.125 47.8332L30.125 25.8362L23.2031 33.776C22.704 34.3483 21.8356 34.4079 21.2632 33.9089Z"
                  fill="black"
                />
              </svg>
            </div>
            {/*  */}
            <div className="relative pb-4 bg_swap_box_black">
              <div className="flex justify-between gap-3 items-center lg:px-2">
                <div className="you_pay_heading">
                  {orderMode === OrderMode.POSITION
                    ? "Exit Token"
                    : isSellLikeStrategy
                      ? "Receive at least"
                      : "Buy exactly"}
                </div>
                <div className="md:text-xs text-[10px] ">
                  <span className="font-normal leading-normal text-[#FF8A00]">
                    BAL
                  </span>{" "}
                  <span className="font-normal leading-normal text-[#FF8A00]">
                    {" "}
                    :{" "}
                  </span>
                  <span className="text-white leading-normal">
                    {tokenOutBalance === "select"
                      ? tokenOutBalance && (
                        <span className="leading-normal">
                          {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                        </span>
                      )
                      : tokenOutBalance && (
                        <span className="leading-normal">
                          {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                        </span>
                      )}
                  </span>
                </div>
              </div>
              <div className="flex w-full mt-3 md:gap-5 gap-2 items-center">
                <div className="lg:md:max-w-[200px] w-full">
                  <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                    <div className="flex gap-2 items-center w-full">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF8A00] md:rounded-[7px]  md:px-5 px-3 py-[1px] justify-center w-full">
                        {tokenOutMode === "select" ? (
                          <div className="space-y-2 w-full">
                            <Select
                              onValueChange={handleTokenOutSelect}
                              value={selectedTokenOut || undefined}
                            >
                              <SelectTrigger
                                className="md:h-8 h-7 border-none text-center focus:none px-0 !w-full outline-none !text-white font-semibold md:text-xs text-xs capitalize"
                                data-testid="select-token-out"
                              >
                                <SelectValue placeholder="Select token" />
                              </SelectTrigger>
                              <SelectContent className="!bg-black text-white">
                                {Object.entries(TOKENS).map(
                                  ([address, token]) => (
                                    <SelectItem key={address} value={address}>
                                      <div className="flex items-center gap-2 text-white">
                                        <TokenLogo
                                          chainId={369}
                                          tokenAddress={address}
                                          symbol={token.symbol}
                                          className="md:h-5 md:w-5 w-4 h-4"
                                        />
                                        <span className=" md:text-sm text-sm font-extrabold !text-white">
                                          {token.symbol}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ),
                                )}
                                <SelectItem value="custom">
                                  <span className="font-medium text-white  cursor-pointer !text-sm">
                                    Custom Address..
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customTokenOut ? (
                              <div className="flex items-center justify-center relative w-full md:h-8 h-7">
                                <div className="flex items-center gap-2 text-white">
                                  {customTokenOut.logoURI && (
                                    <img
                                      src={customTokenOut.logoURI}
                                      alt="token logo"
                                      className="md:h-5 md:w-5 w-4 h-4 rounded-full"
                                    />
                                  )}
                                  <span className=" md:text-sm text-sm font-extrabold !text-white">
                                    {customTokenOut.symbol}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("tokenOut", "")}
                                  className="absolute md:-right-10 -right-10  !text-white tilt z-10"
                                >
                                  <X size={16} className="!text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  {...form.register("tokenOut")}
                                  placeholder="0x..."
                                  className="h-12 bg-transparent !focus:none !outline-0 !border-none md:text-sm text-sm !font-bold ! !text-white"
                                  data-testid="input-token-out-custom"
                                />
                                <X
                                  onClick={() => {
                                    setTokenOutMode("select");
                                    form.setValue("tokenOut", "");
                                  }}
                                  size={20}
                                  className="!text-white absolute md:-right-4 -right-3 top-3"
                                />
                              </div>
                            )}
                            {/* <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTokenOutMode("select");
                                form.setValue("tokenOut", "");
                              }}
                              className="md:text-base text-xs border-none text-black "
                            >
                              Back to token list
                            </Button> */}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const value = form.watch("minAmountOut") || "";

                    const inputLength = value.replace(/\D/g, "").length;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 28
                        : window.innerWidth >= 768
                          ? 24
                          : 20;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 12 : 6;
                    const SHRINK_RATE = 2;

                    const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );
                    return (
                      <input
                        id="minAmountOut"
                        {...form.register("minAmountOut")}
                        placeholder="0.0"
                        type="text"
                        className=" font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black space"
                        data-testid="input-amount-in"
                        onChange={(e) => {
                          const sanitized = sanitizeNumericInput(
                            e.target.value,
                          );
                          setSelectedOutPercentage(null);
                          form.setValue("minAmountOut", sanitized);
                          if (orderMode === OrderMode.STANDARD) {
                            setStandardSide(OrderStrategy.BUY);
                          }
                        }}
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    );
                  })()}
                  <p className="mt-1 md:text-xs text-[7px] text-white text-right">
                    {tokenOutInfo
                      ? `In ${tokenOutInfo.symbol} (${tokenOutInfo.decimals} decimals)`
                      : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                <div className="you_pay_heading flex flex-col relative top-2">
                  {selectedTokenOut ? (
                    tokenOutUSDPrice ? (
                      `$${tokenOutUSDPrice.toFixed(6)}`
                    ) : (
                      <span className="animate-pulse">Loading...</span>
                    )
                  ) : (
                    "--"
                  )}
                  <span className="mt-1">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal  leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[10px] text-[8px] font-medium  md:w-12 w-11 px-2
            ${selectedOutPercentage === value
                          ? "!text-black !bg-[#FF8A00] border-[#FF8A00]"
                          : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF8A00] hover:text-black"
                        }`}
                      onClick={() => handleTokenOutPercentageChange(value)}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-right relative text-white md:text-base text-[10px] usd-spacing truncate  text-sh1 flex justify-end gap-1">
                {tokenOutUSDPrice &&
                  currentMinAmountOut &&
                  !isNaN(parseFloat(currentMinAmountOut)) && (
                    <div className="flex items-center gap-1">
                      <div className="relative inline-block">
                        <InfoIcon
                          size={18}
                          className="md:mt-[0.1px] mt-[-1px] cursor-pointer"
                          onMouseEnter={() => setDollarInfo1(true)}
                          onMouseLeave={() => setDollarInfo1(false)}
                          onClick={() => setDollarInfo1((prev) => !prev)}
                        />

                        {dollarinfo1 && (
                          <div
                            className=" fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap  bg-black px-4 py-3 text-center md:text-xs text-[10px] font-bold text-white shadow-lg"
                            onMouseEnter={() => setDollarInfo1(true)}
                            onMouseLeave={() => setDollarInfo1(false)}
                          >
                            Dollar value display <br />
                            The dollar value displayed is fetched from a
                            3rd-party API. It may not be 100% accurate in some
                            cases. For accuracy, please check the output units.
                          </div>
                        )}
                      </div>
                      <span className=" font-bold">
                        $
                        {formatNumber(
                          (
                            parseFloat(currentMinAmountOut) * tokenOutUSDPrice
                          ).toFixed(2),
                        )}
                      </span>
                    </div>
                  )}
              </div>

              {/* Partial Fill */}
              <div className="text-right text-white font-bold text-sm relative  truncate">
                {form.formState.errors.minAmountOut && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.minAmountOut.message}
                  </p>
                )}
              </div>
            </div>
            {form.formState.errors.tokenOut && (
              <div className="pb-2">
                <p className="mt-1 text-sm text-destructive text-white">
                  {form.formState.errors.tokenOut.message}
                </p>
              </div>
            )}
            {form.formState.errors.deadline && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.deadline.message}
              </p>
            )}
            {tradeError && (
              <div
                className="my-3  border border-red-500/50 bg-black p-3 text-center shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                data-testid="trade-error-message"
              >
                <div className="flex items-center justify-center gap-2">
                  <InfoIcon size={16} className="text-red-500" />
                  <p className="text-sm font-semibold text-red-400 ">
                    {tradeError}
                  </p>
                </div>
              </div>
            )}
            {/*  */}
            {/* For Bracket */}
            {showBracketSettings && (
              <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mt-5">
                <div className="text-center text-[#FF8A00] text-base font-bold ">
                  Advanced Settings
                </div>
                {/* Partial Fill */}
                <div className={`flex flex-col  `}>
                  <div className="text-white p-4">
                    <div className="flex gap-4 justify-center items-center">
                      <p className="text-[#FF8A00]  md:text-[26px] text-xl font-extrabold ">
                        Partial Fill
                      </p>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={partialFillEnabled}
                          onChange={() => {
                            const newEnabled = !partialFillEnabled;
                            setPartialFillEnabled(newEnabled);
                            if (newEnabled) {
                              setFillMode(1); // Default to Split 3
                            } else {
                              setFillMode(0); // Reset to None
                            }
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {partialFillEnabled && (
                    <>
                      <div className="h-full w-full flex gap-2 flex-wrap justify-center items-center pt-3">
                        <button
                          type="button"
                          onClick={() => setFillMode(1)}
                          className={`${fillMode === 1 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(2)}
                          className={`${fillMode === 2 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 5
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(3)}
                          className={`${fillMode === 3 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 10
                        </button>
                      </div>
                      <div className="text-[15px] text-center font-medium text-[#FFE6C0] pt-3 pb-2 rounded-b-lg">
                        Selected:{" "}
                        {fillMode === 1
                          ? "Split 3"
                          : fillMode === 2
                            ? "Split 5"
                            : fillMode === 3
                              ? "Split 10"
                              : "None"}
                      </div>
                    </>
                  )}
                </div>
                <div className="md:px-2 px-2">
                  <hr className="border-[#FF8A00]/30 my-2" />
                  {/* Partial Fill */}
                  <div className="flex gap-4 items-center mt-4 px-4 md:flex-nowrap flex-wrap justify-center">
                    <div className="md:text-xl font-bold text-base text-[#FF8A00]">
                      Expiry{" "}
                    </div>
                    {/* Deadline */}
                    <div className="inline-block">
                      <Select
                        value={deadlinePreset}
                        onValueChange={handleDeadlinePresetChange}
                      >
                        <SelectTrigger className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF8A00] text-sm font-normal leading-tight tracking-wide">
                          <SelectValue placeholder="Select expiry" />
                        </SelectTrigger>
                        <SelectContent className="!bg-black text-white border border-[#FF8A00]">
                          {EXPIRY_PRESET_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {deadlinePreset === "custom" && (
                        <div onClick={handleClick} className="inline-block mt-2">
                          <input
                            id="deadline"
                            {...rest}
                            ref={mergedRef}
                            onChange={(e) => {
                              setDeadlinePreset("custom");
                              onDeadlineInputChange(e);
                            }}
                            type="datetime-local"
                            className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF8A00] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
                            placeholder="Deadline"
                            data-testid="input-deadline"
                            min={minDeadline}
                            max={maxDeadline}
                          />
                        </div>
                      )}
                    </div>
                    {/* Slip */}
                    <div className="flex">
                      <div
                        onClick={onOpenSlippage}
                        className="shrink-0 bg-black px-6 py-3 border border-white  flex justify-center items-center hoverswap transition-all cursor-pointer group"
                      >
                        <p className="text-[#FF8A00] text-sm font-extrabold ">
                          SLIPPAGE
                        </p>
                      </div>
                    </div>
                    {/* Slip */}
                  </div>
                </div>
              </div>
            )}
            {/*  */}
            {/* For Desktop - Single Button */}
            <div className="lg:flex hidden flex-col gap-8 pb-1 mt-4">
              <MainActionButton
                onClick={handleMainAction}
                disabled={
                  isApproving ||
                  isCreating ||
                  checkingApproval ||
                  !!tradeError ||
                  !!limitPriceError ||
                  // !!minValueError ||
                  hasInsufficientBalance ||
                  (orderMode === OrderMode.BRACKET &&
                    !!exitTokenValidationError) ||
                  (showBracketSettings &&
                    (!takeProfitPrice || !stopLossPrice || !takeProfitDeadline))
                }
                className={`gtw cursor-pointer relative w-full md:h-12 h-11 md:rounded-[10px] rounded-md mx-auto button-trans flex justify-center text-center items-center transition-all text-xs ${isApproved
                  ? "bg-[#F59216] hover:bg-[#e08a15 hover:text-white"
                  : "bg-[#F59216] hover:bg-[#e08a15]"
                  } ${hasInsufficientBalance ? "opacity-50 cursor-not-allowed" : ""}`}
                testId="button-main-action"
                isApproving={isApproving}
                isCreating={isCreating}
                checkingApproval={checkingApproval}
                isApproved={isApproved}
                orderMode={orderMode}
                // minValueError={minValueError}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            </div>
            <div className="md:pt-1 pt-1 font-extrabold lg:block hidden">
              {form.formState.errors.tokenIn && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.tokenIn.message}
                </p>
              )}
            </div>
          </div>
          {/*  */}
          <div className="lg:max-w-[550px] md:max-w-[700px] w-full !mt-0">
            {/* Entry Price - Hidden for Position orders */}

            {orderMode !== OrderMode.POSITION && (
              <div className="relative bg_swap_box_black md:!py-4 md:!px-5 mb-5">
                <div className="flex justify-between gap-2 items-center mt-1">
                  <button
                    type="button"
                    onClick={handleToggleQuoteDirection}
                    className="text-[#FF8A00] md:text-[15px] text-xs font-extrabold leading-normal  text-left hover:opacity-90 transition-opacity"
                  >
                    {`When 1 ${displayedBaseSymbol} is worth`}
                    {(() => {
                      const market = displayedMarketPrice ? Number(displayedMarketPrice) : 0;
                      const limit = currentLimitPrice ? Number(currentLimitPrice) : 0;
                      if (!Number.isFinite(market) || market <= 0 || !Number.isFinite(limit) || limit <= 0) {
                        return null;
                      }
                      const diff =
                        isSellLikeStrategy
                          ? ((limit / market) - 1) * 100
                          : ((market / limit) - 1) * 100;
                      const sign = diff >= 0 ? "+" : "";
                      const diffClass = diff >= 0 ? "text-[#13F2B2]" : "text-[#FF5A5A]";
                      return (
                        <span className={`ml-2 md:text-xs text-[10px] ${diffClass}`}>
                          ({`${sign}${diff.toFixed(1)}%`})
                        </span>
                      );
                    })()}
                  </button>
                  <div className="text-right text-[#FF8A00] md:text-xs text-[10px]  whitespace-nowrap">
                    <button
                      type="button"
                      onClick={handleSetLimitPriceToMarket}
                      disabled={!displayedMarketPrice}
                      className="hover:text-[#FF8A00] transition-colors disabled:hover:text-[#FF8A00] disabled:cursor-default"
                    >
                      Market:{" "}
                      <span className="font-bold text-white underline decoration-dotted underline-offset-2">
                        {displayedMarketPrice || "--"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex gap-3 items-center">
                  <div className="flex-1">
                    {(() => {
                      const value = form.watch("limitPrice") || "";
                      const inputLength = value.replace(/\D/g, "").length;
                      const defaultFontSize =
                        window.innerWidth >= 1024
                          ? 28
                          : window.innerWidth >= 768
                            ? 24
                            : 20;
                      const FREE_DIGITS = window.innerWidth >= 768 ? 12 : 6;
                      const SHRINK_RATE = 2;
                      const excessDigits = Math.max(0, inputLength - FREE_DIGITS);
                      const dynamicFontSize = Math.max(
                        10,
                        defaultFontSize - excessDigits * SHRINK_RATE,
                      );

                      return (
                        <input
                          id="limitPrice"
                          {...form.register("limitPrice")}
                          placeholder="00.000"
                          type="text"
                          className="w-full bg-transparent focus:none !outline-0 !border-0 text-left text-white placeholder:text-white/60 leading-none font-extrabold "
                          data-testid="input-limit-price"
                          onChange={(e) => {
                            const sanitized = limitDecimalPlaces(
                              sanitizeNumericInput(e.target.value),
                              6,
                            );
                            // console.log("Setting limitPrice to:", sanitized);
                            setCalculatedMarketPrice(sanitized);
                            form.setValue("limitPrice", sanitized, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });

                            const limitPriceValue = Number(sanitized);
                            const market = marketPrice ? Number(marketPrice) : 0;
                            const normalizedLimitPriceValue = quoteReversed
                              ? 1 / limitPriceValue
                              : limitPriceValue;
                            if (
                              sanitized !== "" &&
                              Number.isFinite(normalizedLimitPriceValue) &&
                              normalizedLimitPriceValue > 0 &&
                              Number.isFinite(market) &&
                              market > 0
                            ) {
                              const derivedPercent = deriveLimitPercentFromPrice(
                                normalizedLimitPriceValue,
                                market,
                              );
                              // setCustomPercentage(derivedPercent.toFixed(2));
                            } else if (sanitized === "") {
                              // setCustomPercentage("");
                            }
                          }}
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex items-center bg-black border border-[#FF8A00]  overflow-hidden">
                    {marketPrice && tokenInInfo && tokenOutInfo && (
                      <button
                        type="button"
                        onClick={handleToggleQuoteDirection}
                        className="w-[28px] md:h-[40px] h-[34px] shrink-0 flex items-center justify-center rounded-none border-r border-[#FF8A00] bg-[#F59216]"
                      >
                        <svg
                          width={16}
                          height={16}
                          viewBox="0 0 38 38"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M18.0574 30.8637C17.6264 31.3581 16.8763 31.4094 16.3819 30.9785L7.13591 22.9179C6.76272 22.5925 6.63068 22.0697 6.80437 21.6061C6.97806 21.1425 7.42123 20.8353 7.91634 20.8353L30.083 20.8353C30.7388 20.8353 31.2705 21.367 31.2705 22.0228C31.2705 22.6786 30.7388 23.2103 30.083 23.2103L11.0855 23.2103L17.9426 29.1883C18.437 29.6192 18.4884 30.3694 18.0574 30.8637Z"
                            fill="#FFFFFF"
                          />
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M19.9419 7.13644C20.3728 6.64196 21.123 6.59066 21.6173 7.02165L30.8633 15.0822C31.2365 15.4076 31.3687 15.9304 31.195 16.394C31.0212 16.8576 30.5781 17.1648 30.083 17.1648L7.91628 17.1648C7.26047 17.1648 6.72878 16.6331 6.72878 15.9773C6.72878 15.3215 7.26047 14.7898 7.91628 14.7898L26.9137 14.7898L20.0567 8.81176C19.5623 8.38078 19.5109 7.63076 19.9419 7.13644Z"
                            fill="#FFFFFF"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleQuoteDirection}
                      className="px-4 md:h-[40px] h-[34px] inline-flex items-center text-white font-extrabold  md:text-sm text-xs"
                    >
                      {displayedQuoteSymbol}
                    </button>
                    {/* <button
                      type="button"
                      onClick={handleToggleQuoteDirection}
                      className="px-3 md:h-[40px] h-[34px] inline-flex items-center text-[#FFE3BA]/70 font-bold  border-l border-[#FF8A00]/40"
                    >
                      $
                    </button> */}
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center rounded-[12px] border border-[#FF8A00] bg-black px-4 py-3">
                  <span className="text-white md:text-[20px] text-[16px] font-extrabold ">
                    ≈{" "}
                    {(
                      isSellLikeStrategy
                        ? Number(form.watch("minAmountOut") || 0)
                        : Number(form.watch("amountIn") || 0)
                    ).toFixed(4)}{" "}
                    {isSellLikeStrategy
                      ? tokenOutInfo?.symbol || "TOKEN"
                      : tokenInInfo?.symbol || "TOKEN"}
                  </span>
                  <span className="text-[#FF8A00] md:text-xs text-[10px] ">
                    Est. partial fill price
                  </span>
                </div>

                {/* Legacy slider + percentage controls intentionally commented out per UX update.
                    Keep this block for potential reuse in future versions. */}
                {/*
                <div className="mt-2 ">
                  <input type="range" min="0" max="100" step="0.01" value={0} readOnly />
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPercentage}
                      onChange={(e) => handleCustomPercentageChange(e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </div>
                */}

                <div className="flex justify-between gap-4 items-center flex-wrap mt-3">
                  <div className="mt-1 md:text-xs text-[10px] text-muted-foreground flex items-center justify-left">
                    <span className="text-[#FF8A00] ">
                      {marketPrice && tokenInInfo && tokenOutInfo ? (
                        <>
                          Market:{" "}
                          <span className=" font-bold">1</span>{" "}
                          {displayedBaseSymbol} ≈{" "}
                          <span className=" font-bold">
                            {displayedMarketPrice || "--"}
                          </span>{" "}
                          {displayedQuoteSymbol}
                        </>
                      ) : (
                        "Price per token (decimal value)"
                      )}
                    </span>
                  </div>
                  {form.formState.errors.limitPrice && (
                    <p className="mt-1 text-[#FFE3BA] text-sm text-destructive">
                      {form.formState.errors.limitPrice.message}
                    </p>
                  )}
                  {limitPriceError && (
                    <p className="mt-1 text-[#FFE3BA] text-sm text-destructive">
                      {limitPriceError}
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Bracket Settings */}
            {showBracketSettings && (
              <>
                {orderMode === OrderMode.BRACKET && (
                  <div className="relative bg_swap_box_black md:!py-4 md:!px-5 mb-4">
                    <div className="flex justify-between items-center gap-3">
                      <h2 className="text-[#FF8A00] md:text-lg text-sm font-bold ">
                        Exit Token (Optional)
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            selectedTokenIn &&
                            getTokenInfo(selectedTokenIn)
                          ) {
                            setExitTokenMode("select");
                            setExitTokenAddress(selectedTokenIn);
                          } else {
                            setExitTokenMode("custom");
                            setExitTokenAddress(selectedTokenIn || "");
                          }
                        }}
                        className="px-3 py-1 text-[10px] md:text-xs bg-[#FFE3BA] text-black rounded-full font-bold "
                      >
                        Use in token
                      </button>
                    </div>
                    <div className="mt-3 flex md:gap-4 gap-1 items-center bg-black border border-[#FF8A00] md:rounded-[7px]  md:px-5 px-3 py-[1px] justify-center w-full">
                      {exitTokenMode === "select" ? (
                        <div className="space-y-2 w-full">
                          <Select
                            onValueChange={handleExitTokenSelect}
                            value={exitTokenAddress || undefined}
                          >
                            <div className="relative group">
                              <SelectTrigger
                                className="md:h-8 h-7 border-none text-center focus:none px-0 !w-full outline-none !text-white font-semibold md:text-xs text-xs capitalize"
                                data-testid="select-exit-token"
                              >
                                <SelectValue placeholder="Select token" />
                              </SelectTrigger>
                              <div className="hidden group-hover:block  absolute z-50 mt-2 top-10 w-max whitespace-nowrap  bg-black px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg">
                                If empty, exits back to your token in.
                              </div>
                            </div>
                            <SelectContent className="!bg-black text-white">
                              {Object.entries(TOKENS).map(
                                ([address, token]) => (
                                  <SelectItem key={address} value={address}>
                                    <div className="flex items-center gap-2 text-white">
                                      <TokenLogo
                                        chainId={369}
                                        tokenAddress={address}
                                        symbol={token.symbol}
                                        className="md:h-5 md:w-5 w-4 h-4"
                                      />
                                      <span className=" md:text-sm text-sm font-extrabold !text-white">
                                        {token.symbol}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ),
                              )}
                              <SelectItem value="custom">
                                <span className="font-medium text-white  cursor-pointer !text-sm">
                                  Custom Address..
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2 w-full">
                          {customExitToken ? (
                            <div className="flex items-center justify-center relative w-full md:h-8 h-7">
                              <div className="flex items-center gap-2 text-white">
                                {customExitToken.logoURI && (
                                  <img
                                    src={customExitToken.logoURI}
                                    alt="token logo"
                                    className="md:h-5 md:w-5 w-4 h-4 rounded-full"
                                  />
                                )}
                                <span className=" md:text-sm text-sm font-extrabold !text-white">
                                  {customExitToken.symbol}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setExitTokenMode("select");
                                  setExitTokenAddress("");
                                  setCustomExitToken(null);
                                }}
                                className="absolute right-0 md:right-2 !text-white tilt"
                              >
                                <X size={16} className="!text-white" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Input
                                value={exitTokenAddress}
                                onChange={(e) =>
                                  setExitTokenAddress(e.target.value)
                                }
                                placeholder="0x..."
                                className="h-12 bg-transparent !focus:none !outline-0 !border-none md:text-sm text-sm !font-bold ! !text-white"
                                data-testid="input-exit-token-custom"
                              />
                              <X
                                onClick={() => {
                                  setExitTokenMode("select");
                                  setExitTokenAddress("");
                                }}
                                size={20}
                                className="!text-white absolute md:-right-4 -right-3 top-3"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {exitTokenValidationError && (
                      <p className="mt-1 text-sm text-destructive">
                        {exitTokenValidationError}
                      </p>
                    )}
                  </div>
                )}

                {/* Bracket Direction Helper */}
                {/* {orderMode === OrderMode.BRACKET && (
                  <div className="mb-4 p-3 bg-black border-4 border-[#FF8A00] ">
                    <p className="text-white text-sm text-center ">
                      Bracket Order: Set Stop Loss ABOVE and Take Profit BELOW
                      entry price
                    </p>
                  </div>
                )} */}

                <div className="relative bg_swap_box_black md:!py-4 md:!px-5 mb-4">
                  {/* Stop Loss Section */}
                  <div className="w-full">
                    <div className="flex justify-between gap-2 items-center mt-1">
                      <h2 className="text-[#FF8A00] md:text-lg text-sm font-bold  whitespace-nowrap">
                        Stop Loss
                      </h2>
                      <div className="flex justify-center gap-2 items-center relative w-full">
                        <div className="flex gap-1 items-center w-full">
                          <input
                            type="text"
                            placeholder="00.000"
                            value={stopLossPrice}
                            onChange={(e) => {
                              const sanitized = sanitizeNumericInput(e.target.value);
                              setStopLossPrice(sanitized);

                              const stopLossPriceValue = Number(sanitized);
                              const market = marketPrice ? Number(marketPrice) : 0;
                              if (
                                sanitized !== "" &&
                                Number.isFinite(stopLossPriceValue) &&
                                stopLossPriceValue > 0 &&
                                Number.isFinite(market) &&
                                market > 0
                              ) {
                                const derivedPercent = deriveStopLossPercentFromPrice(
                                  stopLossPriceValue,
                                  market,
                                );
                                const clamped = Math.min(
                                  STOP_LOSS_MAX_ABOVE_PERCENT,
                                  Math.max(-STOP_LOSS_MAX_BELOW_PERCENT, derivedPercent),
                                );
                                setStopLossPercent(clamped.toFixed(2));
                              } else if (sanitized === "") {
                                setStopLossPercent("");
                              }
                            }}
                            className="w-full flex justify-center items-center mx-auto bg-transparent focus:none !outline-0 !border-0 text-right text-white placeholder:text-white md:text-xl text-base font-semibold "
                          />
                          {/* <span className="text-[#FF8A00] md:text-4xl text-2xl font-extrabold ">
                            {tokenOutInfo?.symbol || "USDT"}
                          </span> */}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[#FF8A00] text-xl font-normal ">
                      <span className="text-[#FF8A00] md:text-lg text-base  font-bold">
                        ${tokenInInfo?.symbol || "USDT"}{" "}
                        <span className="font-normal">per</span> $LINK
                        {/* {tokenInInfo?.symbol || "USDT"} */}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] mb-3 text-gray-400">
                      <span className="text-[#FF8A00] font-bold">
                        Target
                      </span>
                      <span className="text-[#FF8A00] font-bold">
                        Market
                      </span>
                    </div>

                    {/* Stop Loss Slider */}
                    <div className="mt-3 ">
                      <div className="relative h-2 bg-[#352E25] rounded-full">
                        {(() => {
                          const stopLossSliderPosition = getStopLossSliderPosition(
                            Number(stopLossPercent) || 0,
                          );
                          return (
                            <>
                              <div
                                className="absolute h-2 bg-[#F59216] rounded-full transition-all duration-200"
                                style={{
                                  width: `${100 - stopLossSliderPosition}%`,
                                  left: `${stopLossSliderPosition}%`,
                                }}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-[#F59216] rounded-full shadow-lg transition-all duration-200"
                                style={{
                                  left: `calc(${stopLossSliderPosition}% - 10px)`,
                                }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.01"
                                value={stopLossSliderPosition}
                                onChange={(e) => {
                                  const sliderPosition = Number(e.target.value);
                                  const percent =
                                    getStopLossPercentFromSlider(sliderPosition);
                                  applyStopLossPercent(percent);
                                }}
                                className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                              />
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between text-[10px] mt-3 text-gray-400">
                        <span>-10000%</span>
                        <span>-7500%</span>
                        <span>-5000%</span>
                        <span>-2500%</span>
                        <span>+1000%</span>
                      </div>
                    </div>

                    {/* Stop Loss Market Info */}
                    <div className="mt-2 flex justify-between gap-3 items-center">
                      <div className="flex flex-col justify-center gap-2 items-center">
                        <button
                          type="button"
                          disabled={!marketPrice}
                          onClick={() => {
                            if (!marketPrice) return;
                            setStopLossPrice(
                              parseFloat(marketPrice).toFixed(4),
                            );
                            setStopLossPercent(0);
                          }}
                          className="py-1 px-2 bg-[#FFE3BA]  text-center text-black md:text-base text-sm font-normal  disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Market Price
                        </button>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-xs text-[#FFE6C0]">
                        <div className="py-1 px-2 bg-[#FFE3BA]  text-center text-black md:text-base text-sm font-normal  flex items-center gap-1">
                          <input
                            type="text"
                            value={stopLossPercent}
                            placeholder="0"
                            onChange={(e) => {
                              let value = limitDecimalPlaces(
                                e.target.value.replace(/[^0-9.-]/g, ""),
                                8,
                              );
                              // Allow only a single leading "-" sign
                              value = value.replace(/(?!^)-/g, "");
                              const parts = value.split(".");
                              if (parts.length > 2) {
                                value = parts[0] + "." + parts.slice(1).join("");
                              }

                              if (
                                value !== "" &&
                                value !== "-" &&
                                Number(value) > STOP_LOSS_MAX_ABOVE_PERCENT
                              ) {
                                value = `${STOP_LOSS_MAX_ABOVE_PERCENT}`;
                              }
                              if (
                                value !== "" &&
                                value !== "-" &&
                                Number(value) < -STOP_LOSS_MAX_BELOW_PERCENT
                              ) {
                                value = `${-STOP_LOSS_MAX_BELOW_PERCENT}`;
                              }
                              setStopLossPercent(value);
                              if (value === "" || value === "-") {
                                applyStopLossPercent(0, false);
                                return;
                              }
                              const percent = Number(value);
                              if (!Number.isNaN(percent)) {
                                applyStopLossPercent(percent, false);
                              }
                            }}
                            className="md:w-24 w-20 text-center bg-transparent text-black outline-none "
                          />
                          <span className="text-black font-bold">%</span>
                        </div>
                        <span>Stop Loss</span>
                      </div>
                      {/* <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA]  text-center text-black text-base font-normal ">
                          {marketPrice && tokenInInfo && tokenOutInfo ? (
                            <>
                              <span>1</span> {tokenInInfo.symbol} ≈{" "}
                              <span>{marketPrice}</span> {tokenOutInfo.symbol}
                            </>
                          ) : (
                            "0%"
                          )}
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal ">
                          Market
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
                <div className="relative bg_swap_box_black md:!py-4 md:!px-5 mb-4 mt-5">
                  {/* Take Profit Section */}
                  <div className="mb-4">
                    <div className="flex justify-between gap-2 items-center mt-1">
                      <h2 className="text-[#FF8A00] md:text-lg text-sm font-bold ">
                        Take Profit
                      </h2>
                      <div className="flex justify-center gap-2 items-center relative">
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            placeholder="00.000"
                            value={takeProfitPrice}
                            onChange={(e) => {
                              const sanitized = sanitizeNumericInput(e.target.value);
                              setTakeProfitPrice(sanitized);

                              const takeProfitPriceValue = Number(sanitized);
                              const market = marketPrice ? Number(marketPrice) : 0;
                              if (
                                sanitized !== "" &&
                                Number.isFinite(takeProfitPriceValue) &&
                                takeProfitPriceValue > 0 &&
                                Number.isFinite(market) &&
                                market > 0
                              ) {
                                const derivedPercent = deriveTakeProfitPercentFromPrice(
                                  takeProfitPriceValue,
                                  market,
                                );
                                const clamped = Math.min(10000, Math.max(0, derivedPercent));
                                setTakeProfitPercent(clamped.toFixed(2));
                              } else if (sanitized === "") {
                                setTakeProfitPercent("");
                              }
                            }}
                            className="w-full flex justify-center items-center mx-auto bg-transparent focus:none !outline-0 !border-0 text-right text-white placeholder:text-white md:text-xl text-base font-semibold "
                          />
                          {/* <span className="text-[#FF8A00] md:text-4xl text-2xl font-extrabold ">
                            {tokenOutInfo?.symbol || "USDT"}
                          </span> */}
                        </div>
                      </div>
                    </div>
                    <p className="text-[#FF8A00] text-right md:text-lg text-base  font-bold">
                      ${tokenInInfo?.symbol || "USDT"}{" "}
                      <span className="font-normal">per</span> $LINK
                      {/* {tokenInInfo?.symbol || "USDT"} */}
                    </p>
                    <div className="flex justify-between text-[10px] mb-3 text-gray-400">
                      <span className="text-[#FF8A00] font-bold">
                        Market
                      </span>
                      <span className="text-[#FF8A00] font-bold">
                        Target
                      </span>
                    </div>

                    {/* Take Profit Slider */}
                    <div className="mt-3 ">
                      <div className="relative h-2 bg-[#352E25] rounded-full">
                        {(() => {
                          const takeProfitSliderPosition = Math.min(
                            100,
                            Math.max(0, (Number(takeProfitPercent) || 0) / 100),
                          );
                          return (
                            <>
                              <div
                                className="absolute h-2 bg-[#F59216] rounded-full transition-all duration-200"
                                style={{
                                  width: `${takeProfitSliderPosition}%`,
                                }}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-[#F59216] rounded-full shadow-lg transition-all duration-200"
                                style={{
                                  left: `calc(${takeProfitSliderPosition}% - 10px)`,
                                }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.01"
                                value={takeProfitSliderPosition}
                                onChange={(e) => {
                                  const sliderPosition = Number(e.target.value);
                                  const percent = sliderPosition * 100;
                                  applyTakeProfitPercent(percent);
                                }}
                                className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                              />
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between text-[10px] mt-3 text-gray-400">
                        <span>0%</span>
                        <span>2500%</span>
                        <span>5000%</span>
                        <span>7500%</span>
                        <span>10000%</span>
                      </div>
                    </div>

                    {/* Take Profit Market Info */}
                    <div className="mt-2 flex justify-between gap-3 items-center">
                      <div className="flex flex-col justify-center gap-2 items-center">
                        <button
                          type="button"
                          disabled={!marketPrice}
                          onClick={() => {
                            if (!marketPrice) return;
                            setTakeProfitPrice(
                              parseFloat(marketPrice).toFixed(4),
                            );
                            setTakeProfitPercent(0);
                          }}
                          className="py-1 px-2 bg-[#FFE3BA]  text-center text-black md:text-base text-sm font-normal  disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Market Price
                        </button>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-xs mb-2 mt-4 text-[#FFE6C0]">
                        <div className="py-1 px-2 bg-[#FFE3BA]  text-center text-black md:text-base text-sm font-normal  flex items-center gap-1">
                          <input
                            type="text"
                            value={takeProfitPercent}
                            placeholder="0"
                            onChange={(e) => {
                              let value = limitDecimalPlaces(
                                e.target.value.replace(/[^0-9.]/g, ""),
                                8,
                              );
                              if (value !== "" && Number(value) > 10000) {
                                value = "10000";
                              }
                              setTakeProfitPercent(value);
                              if (value === "") {
                                applyTakeProfitPercent(0, false);
                                return;
                              }
                              const percent = Number(value);
                              if (!Number.isNaN(percent)) {
                                applyTakeProfitPercent(percent, false);
                              }
                            }}
                            className="md:w-24 w-20 text-center bg-transparent text-black outline-none "
                          />
                          <span className="text-black font-bold">%</span>
                        </div>
                        <span>Entry Price</span>
                      </div>
                      {/* <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA]  text-center text-black text-base font-normal ">
                          {marketPrice && tokenInInfo && tokenOutInfo ? (
                            <>
                              <span className="">1</span>{" "}
                              {tokenInInfo.symbol} ≈{" "}
                              <span className="">{marketPrice}</span>{" "}
                              {tokenOutInfo.symbol}
                            </>
                          ) : (
                            "0%"
                          )}
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal ">
                          Target Price
                        </div>
                      </div> */}
                    </div>

                    {/* SL/TP Expiry */}
                    <div className="mt-4">
                      <div className="flex gap-4 items-center px-4 md:flex-nowrap flex-wrap">
                        <div className="md:text-lg text-base font-bold text-[#FF8A00]">
                          SL/TP Expiry{" "}
                        </div>
                        <div>
                          <input
                            type="datetime-local"
                            value={takeProfitDeadline}
                            onChange={(e) =>
                              setTakeProfitDeadline(e.target.value)
                            }
                            className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF8A00] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
                            min={minDeadline}
                            max={maxDeadline}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* For Buy Sell */}
            {!showBracketSettings && (
              <div className="relative bg_swap_box_black md:!py-4 md:!px-5 mb-4">
                <div className="text-center text-[#FF8A00] md:text-lg text-base font-black ">
                  Advanced Settings
                </div>
                {/* Partial Fill */}
                <div className={`flex flex-col  `}>
                  <div className="text-white p-4">
                    <div className="flex gap-4 justify-center items-center">
                      <p className="text-[#FF8A00]  md:text-xl text-lg font-extrabold ">
                        Partial Fill
                      </p>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={partialFillEnabled}
                          onChange={() => {
                            const newEnabled = !partialFillEnabled;
                            setPartialFillEnabled(newEnabled);
                            if (newEnabled) {
                              setFillMode(1); // Default to Split 3
                            } else {
                              setFillMode(0); // Reset to None
                            }
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {partialFillEnabled && (
                    <>
                      <div className="h-full w-full flex gap-2 flex-wrap justify-center items-center pt-3">
                        <button
                          type="button"
                          onClick={() => setFillMode(1)}
                          className={`${fillMode === 1 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black md:text-sm text-xs font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(2)}
                          className={`${fillMode === 2 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black md:text-sm text-xs font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 5
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(3)}
                          className={`${fillMode === 3 ? "bg-[#FF8A00]" : "bg-[#EEC485]"
                            } text-black md:text-sm text-xs font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 10
                        </button>
                      </div>
                      <div className="text-[15px] text-center font-medium text-[#FFE6C0] pt-3 pb-2 rounded-b-lg">
                        Selected:{" "}
                        {fillMode === 1
                          ? "Split 3"
                          : fillMode === 2
                            ? "Split 5"
                            : fillMode === 3
                              ? "Split 10"
                              : "None"}
                      </div>
                    </>
                  )}
                </div>
                <div className="md:px-2 px-2">
                  <hr className="border-[#FF8A00]/30 my-2" />
                  {/* Partial Fill */}
                  <div className="flex gap-4 items-center mt-4 md:px-4 md:flex-nowrap flex-wrap">
                    <div className="md:text-xl font-bold text-base text-[#FF8A00]">
                      Expiry{" "}
                    </div>
                    {/* Deadline */}
                    <div className="inline-block">
                      <Select
                        value={deadlinePreset}
                        onValueChange={handleDeadlinePresetChange}
                      >
                        <SelectTrigger className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF8A00] text-sm font-normal leading-tight tracking-wide">
                          <SelectValue placeholder="Select expiry" />
                        </SelectTrigger>
                        <SelectContent className="!bg-black text-white border border-[#FF8A00]">
                          {EXPIRY_PRESET_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {deadlinePreset === "custom" && (
                        <div onClick={handleClick} className="inline-block mt-2">
                          <input
                            id="deadline"
                            {...rest}
                            ref={mergedRef}
                            onChange={(e) => {
                              setDeadlinePreset("custom");
                              onDeadlineInputChange(e);
                            }}
                            type="datetime-local"
                            className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF8A00] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
                            placeholder="Deadline"
                            data-testid="input-deadline"
                            min={minDeadline}
                            max={maxDeadline}
                          />
                        </div>
                      )}
                    </div>
                    {/* Slip */}
                    <div className="flex w-full">
                      <div
                        onClick={onOpenSlippage}
                        className="w-full shrink-0 bg-black px-6 py-2 border border-white  flex justify-center items-center hoverswap transition-all cursor-pointer group"
                      >
                        <p className="text-[#FF8A00] text-sm font-extrabold ">
                          SLIPPAGE
                        </p>
                      </div>
                    </div>
                    {/* Slip */}
                  </div>
                </div>
              </div>
            )}
            {/*  */}
            <div className="relative bg_swap_box_black md:!py-4">
              <div className="text-center text-[#F59216]  md:text-lg text-base font-extrabold">
                Order Details
              </div>
              <div className="md:px-5 px-2">
                <div className="flex justify-between gap-3 items-center mt-2 ">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {orderMode === OrderMode.BRACKET
                        ? "Bracket Order"
                        : isSellLikeStrategy
                          ? "Sell Limit"
                          : "Buy Limit"}
                    </div>
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      Order Type
                    </div>
                  </div>
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {orderMode === OrderMode.BRACKET
                        ? "TP/SL"
                        : isSellLikeStrategy
                          ? "Token Sold"
                          : "Token Bought"}
                    </div>
                    {/* <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      {form.watch("strategy") === OrderStrategy.SELL
                        ? "Token Sold"
                        : form.watch("strategy") === OrderStrategy.BRACKET
                          ? `${takeProfitPrice || "0"}/${stopLossPrice || "0"}`
                          : "Token Bought"}
                    </div> */}
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      {orderMode === OrderMode.BRACKET
                        ? `${Number(takeProfitPrice || 0).toFixed(2)}/${Number(stopLossPrice || 0).toFixed(2)}`
                        : isSellLikeStrategy
                          ? "Receive at least target"
                          : "Sell at most for target buy"}
                    </div>
                  </div>
                </div>
                <hr className="border border-[#7B653C] my-2" />
                <div className="flex justify-between gap-3 items-center mt-2 ">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {form.watch("deadline")
                        ? new Date(form.watch("deadline")).toLocaleDateString()
                        : "Not set"}
                    </div>
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      Expiry
                    </div>
                  </div>
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {partialFillEnabled
                        ? fillMode === 1
                          ? "Split 3"
                          : fillMode === 2
                            ? "Split 5"
                            : fillMode === 3
                              ? "Split 10"
                              : "None"
                        : "None"}
                    </div>
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      Order Split
                    </div>
                  </div>
                </div>
                <hr className="border border-[#7B653C] my-2" />
                <div className="flex justify-between gap-3 items-center mt-2 ">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {/* {form.watch("minAmountOut") || "0"} */}
                      {Number(form.watch("minAmountOut") || 0).toFixed(2)}
                    </div>
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      Output estimated
                    </div>
                  </div>
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {/* {currentStrategy === OrderStrategy.BRACKET &&
                      takeProfitPrice &&
                      marketPrice
                        ? `${(((parseFloat(takeProfitPrice) - parseFloat(marketPrice)) / parseFloat(marketPrice)) * 100).toFixed(2)}%`
                        : "80%"} */}
                      {(() => {
                        const market =
                          orderMode === OrderMode.STANDARD
                            ? displayedMarketPrice
                              ? parseFloat(displayedMarketPrice)
                              : 0
                            : marketPrice
                              ? parseFloat(marketPrice)
                              : 0;
                        const limit =
                          orderMode === OrderMode.STANDARD
                            ? currentLimitPrice
                              ? parseFloat(currentLimitPrice)
                              : 0
                            : normalizedCurrentLimitPrice || 0;

                        if (market > 0) {
                          if (isSellLikeStrategy && limit > 0) {
                            const priceDiffPercent = ((limit / market) - 1) * 100;
                            const sign = priceDiffPercent >= 0 ? "+" : "";
                            return `${sign}${priceDiffPercent.toFixed(2)}%`;
                          } else if (isBuyLikeStrategy && limit > 0) {
                            const entryDeltaPercent = ((market / limit) - 1) * 100;
                            const sign = entryDeltaPercent >= 0 ? "+" : "";
                            return `${sign}${entryDeltaPercent.toFixed(2)}%`;
                          } else if (orderMode === OrderMode.BRACKET && limit > 0) {
                            const priceDiffPercent = ((limit - market) / market) * 100;
                            return priceDiffPercent > 0 ? `${priceDiffPercent.toFixed(2)}%` : "0%";
                          } else if (orderMode === OrderMode.POSITION && takeProfitPrice) {
                            const tp = parseFloat(takeProfitPrice);
                            if (tp > 0) {
                              const priceDiffPercent = Math.abs(((tp - market) / market) * 100);
                              return priceDiffPercent > 0 ? `${priceDiffPercent.toFixed(2)}%` : "0%";
                            }
                          }
                        }
                        return "0%";
                      })()}
                    </div>
                    <div className="text-white md:text-[11px] mt-1 text-[9px] font-semibold">
                      {orderMode === OrderMode.BRACKET || orderMode === OrderMode.POSITION
                        ? "Potential Profit"
                        : isBuyLikeStrategy
                          ? "Entry Delta"
                          : "Profit"}
                    </div>
                  </div>
                </div>
                <MarketTargetChart
                  strategy={effectiveStrategy}
                  stopLossPrice={stopLossPrice}
                  takeProfitPrice={takeProfitPrice}
                  currentMarketPrice={
                    displayedMarketPrice || marketPrice || undefined
                  }
                  marketPrice={marketPrice || undefined}
                  limitPrice={currentLimitPrice || undefined}
                />
              </div>
            </div>

            {/* ForMobile - Single Button */}
            <div className="lg:hidden flex flex-col gap-8 pb-1 mt-5">
              <MainActionButton
                onClick={handleMainAction}
                disabled={
                  isApproving ||
                  isCreating ||
                  checkingApproval ||
                  !!tradeError ||
                  !!limitPriceError ||
                  // !!minValueError ||
                  hasInsufficientBalance ||
                  (orderMode === OrderMode.BRACKET &&
                    !!exitTokenValidationError) ||
                  (showBracketSettings &&
                    (!takeProfitPrice || !stopLossPrice || !takeProfitDeadline))
                }
                className={`gtw cursor-pointer relative w-full md:h-[68px] h-12 md:rounded-[10px] rounded-md mx-auto button-trans flex justify-center text-center items-center transition-all lg:text-[28px] text-xl font-extrabold ${isApproved
                  ? "bg-[#F59216] hover:bg-[#e08a15 hover:text-white"
                  : "bg-[#F59216] hover:bg-[#e08a15] hover:text-white"
                  }${ hasInsufficientBalance ? "opacity-50 cursor-not-allowed" : ""}`}
                testId="button-main-action-mobile"
                isApproving={isApproving}
                isCreating={isCreating}
                checkingApproval={checkingApproval}
                isApproved={isApproved}
                orderMode={orderMode}
                // minValueError={minValueError}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            </div>
            <div className="md:pt-1 pt-1 font-extrabold lg:hidden flex">
              {form.formState.errors.tokenIn && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.tokenIn.message}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
