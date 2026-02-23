import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Ar from "../../assets/images/reverse.svg";
import MarketTargetChart from "./MarketGraph";
import {
  createOrderSchema,
  type CreateOrderInput,
  type StatusMessage,
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
import { Loader2, X, InfoIcon, CheckCircle2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useAccount, useBalance } from "wagmi";
import { writeContract, waitForTransactionReceipt, readContract } from "@wagmi/core";
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
import { TokenLogo } from "../../components/TokenLogo";
import { LogoService } from "../../services/LogoService";

const ROUTER_ADDRESS = "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52";
const CONTRACT_ADDRESS = "0xF4856ce8BE6E992819167D55C82a1Fae09Ddd9E2";

enum OrderMode {
  STANDARD = "standard",
  BRACKET = "bracket",
  POSITION = "position",
}

interface CreateOrderFormProps {
  onStatusMessage: (message: StatusMessage) => void;
  onOrderCreated: (details: {
    orderId: string;
    txHash: string;
    strategy: OrderStrategy;
  }) => void;
  slippage: number;
  onOpenSlippage?: () => void;
}

export function CreateOrderForm({
  onStatusMessage,
  onOrderCreated,
  slippage,
  onOpenSlippage = () => {},
}: CreateOrderFormProps) {
  const [percent, setPercent] = useState<number>(0);
  const [showBracketSettings, setShowBracketSettings] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [stopLossDeadline, setStopLossDeadline] = useState<string>("");
  const [takeProfitDeadline, setTakeProfitDeadline] = useState<string>("");
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
  const [customTokenIn, setCustomTokenIn] = useState<any>(null);
  const [customTokenOut, setCustomTokenOut] = useState<any>(null);
  const [partialFillEnabled, setPartialFillEnabled] = useState(false);
  const [fillMode, setFillMode] = useState(1); // 1: Split3, 2: Split5, 3: Split10, 4: Flexible
  const [marketPrice, setMarketPrice] = useState<string | null>(null);
  const [quoteReversed, setQuoteReversed] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [limitPriceError, setLimitPriceError] = useState<string | null>(null);
  // const [minValueError, setMinValueError] = useState<string | null>(null); // state for minimum value error for amount in with USD check $30
  const [tokenInUSDPrice, setTokenInUSDPrice] = useState<number | null>(null);
  const [tokenOutUSDPrice, setTokenOutUSDPrice] = useState<number | null>(null);

  // bracket
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(0);
  const [stopLossPercent, setStopLossPercent] = useState<number>(0);
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
  const currentStrategy = form.watch("strategy");
  const tokenInInfo =
    customTokenIn && customTokenIn.address === selectedTokenIn
      ? customTokenIn
      : getTokenInfo(selectedTokenIn);
  const tokenOutInfo =
    customTokenOut && customTokenOut.address === selectedTokenOut
      ? customTokenOut
      : getTokenInfo(selectedTokenOut);

  const { data: tokenInBalanceData } = useBalance({
    address: userAddress,
    token:
      selectedTokenIn && isAddress(selectedTokenIn)
        ? selectedTokenIn
        : undefined,
  });
  const tokenInBalance = tokenInBalanceData?.formatted;

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
      try {
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/pulsechain/tokens/${tokenAddress}`,
        );
        const data = await response.json();
        if (data.data.attributes) {
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
        }
      } catch (error) {
        console.error("Failed to fetch custom token data:", error);
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
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode]);

  // Calculate minAmountOut when amountIn, limitPrice, or slippage changes
  useEffect(() => {
    const calculateMinAmountOut = () => {
      const limitPriceValue = form.getValues("limitPrice");
      const amountInValue = form.getValues("amountIn");

      if (
        amountInValue &&
        !isNaN(parseFloat(amountInValue)) &&
        limitPriceValue &&
        !isNaN(parseFloat(limitPriceValue))
      ) {
        const amountInFloat = parseFloat(amountInValue);
        const limitPriceFloat = parseFloat(limitPriceValue);
        const expectedAmountOut = amountInFloat * limitPriceFloat;

        // Apply slippage
        const numericSlippage = typeof slippage === "number" ? slippage : 0.5;
        const slippageAdjustedAmount =
          expectedAmountOut * (1 - numericSlippage / 100);

        form.setValue("minAmountOut", slippageAdjustedAmount.toFixed(6), {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    };

    // Subscribe to form value changes
    const subscription = form.watch((value, { name }) => {
      if (name === "limitPrice" || name === "amountIn") {
        calculateMinAmountOut();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, slippage]);

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
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addresses.join(
            ",",
          )}`,
        );
        const data = await response.json();

        // Update Token In Price
        if (selectedTokenIn && isAddress(selectedTokenIn)) {
          const tokenInPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenIn.toLowerCase()],
          );
          setTokenInUSDPrice(tokenInPrice || null);
        } else {
          setTokenInUSDPrice(null);
        }

        // Update Token Out Price
        if (selectedTokenOut && isAddress(selectedTokenOut)) {
          const tokenOutPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenOut.toLowerCase()],
          );
          setTokenOutUSDPrice(tokenOutPrice || null);
        } else {
          setTokenOutUSDPrice(null);
        }

        // Update Market Price (Ratio)
        if (
          selectedTokenIn &&
          selectedTokenOut &&
          isAddress(selectedTokenIn) &&
          isAddress(selectedTokenOut)
        ) {
          const tokenInPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenIn.toLowerCase()],
          );
          const tokenOutPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenOut.toLowerCase()],
          );

          if (tokenInPrice && tokenOutPrice) {
            const price = tokenInPrice / tokenOutPrice;
            setMarketPrice(price.toFixed(8));
          } else {
            setMarketPrice(null);
          }
        } else {
          setMarketPrice(null);
        }
      } catch (error) {
        console.error(
          "Failed to fetch market price from GeckoTerminal:",
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
    if (currentLimitPrice && marketPrice && currentStrategy) {
      const limit = parseFloat(currentLimitPrice);
      const market = parseFloat(marketPrice);

      if (isNaN(limit) || isNaN(market)) {
        setLimitPriceError(null);
        return;
      }

      if (currentStrategy === OrderStrategy.SELL) {
        // For Sell orders, limit price should be greater than market price
        if (limit < market) {
          setLimitPriceError(
            "For Exit Strategy (Sell), limit price should be greater than market price.",
          );
        } else {
          setLimitPriceError(null);
        }
      } else if (currentStrategy === OrderStrategy.BUY) {
        // For Buy orders, limit price should be less than market price
        if (limit > market) {
          setLimitPriceError(
            "For Accumulation Strategy (Buy), limit price should be less than market price.",
          );
        } else {
          setLimitPriceError(null);
        }
      } else if (currentStrategy === OrderStrategy.BRACKET) {
        // For Bracket orders, no validation on limit price
        setLimitPriceError(null);
      }
    } else {
      setLimitPriceError(null);
    }
  }, [currentLimitPrice, marketPrice, currentStrategy]);

  // Reset bracket settings when strategy changes from BRACKET
  useEffect(() => {
    if (currentStrategy !== OrderStrategy.BRACKET) {
      setShowBracketSettings(false);
      setTakeProfitPrice("");
      setStopLossPrice("");
      setTakeProfitPercent(0);
      setStopLossPercent(0);
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

  const handleSwapTokens = () => {
    const tokenIn = form.getValues("tokenIn");
    const tokenOut = form.getValues("tokenOut");
    const amountIn = form.getValues("amountIn");
    const minAmountOut = form.getValues("minAmountOut");

    form.setValue("tokenIn", tokenOut);
    form.setValue("tokenOut", tokenIn);
    form.setValue("amountIn", minAmountOut);
    form.setValue("minAmountOut", amountIn);

    const currentTokenInMode = tokenInMode;
    setTokenInMode(tokenOutMode);
    setTokenOutMode(currentTokenInMode);

    const currentCustomTokenIn = customTokenIn;
    setCustomTokenIn(customTokenOut);
    setCustomTokenOut(currentCustomTokenIn);
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
      const amountIn = parseUnits(data.amountIn, tokenInInfo?.decimals || 18);
      const minAmountOut = parseUnits(
        data.minAmountOut,
        tokenOutInfo?.decimals || 18,
      );
      const limitPrice = parseUnits(data.limitPrice, 18);
      const deadline = BigInt(
        Math.floor(new Date(data.deadline).getTime() / 1000),
      );
      const mode = partialFillEnabled ? fillMode : 0;
      const orderType = data.strategy === OrderStrategy.SELL ? 0 : 1; // 0 for SELL, 1 for BUY

      let hash: `0x${string}`;

      // Validation for bracket orders (SELL only)
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

        // Bracket orders are SELL only: enforce SL > TP
        if (sl <= tp) {
          onStatusMessage({
            type: "error",
            message: "Stop Loss Price must be GREATER than Take Profit Price",
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
            orderType, // Entry Order Type
            data.tokenIn as `0x${string}`, // Exit Token
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
      setOrderMode(OrderMode.STANDARD);
      setIsApproved(false); // Reset approval state after order creation

      // Only trigger the client update if we actually found a valid ID
      if (newOrderId !== "new") {
        onOrderCreated({
          orderId: newOrderId,
          txHash: hash,
          strategy: data.strategy,
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

  const now = new Date();
  const threeMonthsFromNow = new Date(new Date().setMonth(now.getMonth() + 3));
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const minDeadline = new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
  const maxDeadline = new Date(threeMonthsFromNow.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);

  // For Limit Price
  // Apply limit price by +/- percentage from market
  useEffect(() => {
    if (percent === 0) {
      applyLimitPriceByPercent("market");
    } else {
      applyLimitPriceByPercent(percent);
    }
  }, [percent]);

  const applyLimitPriceByPercent = (percent: number | "market") => {
    if (!marketPrice) return;

    const market = Number(marketPrice);
    if (!Number.isFinite(market) || market <= 0) return;

    let newPrice = market;

    if (percent !== "market") {
      const multiplier =
        currentStrategy === OrderStrategy.SELL
          ? 1 + percent / 100
          : 1 - percent / 100;

      newPrice = market * multiplier;
    }

    form.setValue("limitPrice", newPrice.toFixed(8), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // For Limit Price
  // Percentage selection
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(
    null,
  );

  const handlePercentageChange = (value: number) => {
    if (!tokenInBalance) return;

    setSelectedPercentage(value);

    const balance = parseFloat(tokenInBalance);
    const percentValue = (balance * value) / 100;

    // Update input visually
    form.setValue("amountIn", percentValue.toFixed(4), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Function to format the number with commas
  const formatNumber = (value: string | undefined): string => {
    if (!value) return "";

    const [integerPart, decimalPart] = value.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "")
      .replace(/\B(?=(\d{3})+(?!\d))/g, "");

    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputEl?.showPicker?.(); // Safely trigger calendar
  };

  const { ref: formRef, ...rest } = form.register("deadline");

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
    // Limit to max 100%
    let percentValue = parseFloat(value);
    if (!isNaN(percentValue)) {
      percentValue = Math.min(100, Math.max(0, percentValue));
      setCustomPercentage(percentValue.toString());
    } else {
      setCustomPercentage(value);
    }

    // Only calculate if it's a valid number and market price exists
    if (!isNaN(percentValue) && marketPrice) {
      const market = parseFloat(marketPrice);
      let newLimitPrice: number;

      if (currentStrategy === OrderStrategy.SELL) {
        // For SELL: price above market by X%
        newLimitPrice = market * (1 + percentValue / 100);
      } else if (currentStrategy === OrderStrategy.BUY) {
        // For BUY: price below market by X%
        newLimitPrice = market * (1 - percentValue / 100);
      } else {
        // For BRACKET or other strategies
        newLimitPrice = market * (1 + percentValue / 100);
      }

      form.setValue("limitPrice", newLimitPrice.toFixed(8), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };
  
  // Determine button text and state
  const getButtonContent = () => {
    if (isApproving) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Approving...
        </>
      );
    }
    
    if (isCreating) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      );
    }

    if (checkingApproval) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking Approval...
        </>
      );
    }

    if (isApproved) {
      return (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {orderMode === OrderMode.POSITION 
            ? "Create Position Protection" 
            : orderMode === OrderMode.BRACKET 
              ? "Create Bracket Order" 
              : "Create Order"}
        </>
      );
    }

    return "Approve Tokens";
  };

  return (
    <>
      <div className="lg:max-w-[1300px] md:max-w-[1200px] mx-auto w-full md:mt-10 mt-2">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 flex 2xl:gap-12 lg:gap-8 gap-5 justify-center lg:flex-now flex-wrap"
        >
          <div className="md:max-w-[700px] w-full">
            {/* Strategy Selection */}
            <div className="mb-4 md:max-w-[850px] w-full mx-auto border-4 border-[#FFA600] rounded-lg px-4 py-2 bg-black">
              <p className="text-center text-[#FF9900] md:text-xl font-bold text-sm font-orbitron">
                Select Strategy
              </p>
              <div className="flex justify-center gap-8 md:gap-16 items-start mt-2 md:flex-nowrap flex-wrap">
                {/* Limit Orders Group */}
                <div className="flex flex-col items-center">
                  <div className="text-center text-[#FF9900] md:text-lg font-bold text-sm font-orbitron mb-2">
                    Exit/Entry
                  </div>
                  <div className="flex gap-3">
                    {/* Sell Strategy Button */}
                    <div className="flex flex-col items-center relative group cursor-pointer">
                      <button
                        type="button"
                        className={`
                          w-24 h-10 p-3 md:text-[30px] text-lg !cursor-pointer
                          rounded-2xl flex justify-center items-center
                          transition-all duration-200
                          ${
                            form.watch("strategy") === OrderStrategy.SELL &&
                            orderMode === OrderMode.STANDARD
                              ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                              : "bg-black text-white hover:bg-[#1a1a1a]"
                          }
                        `}
                        onClick={() => {
                          form.setValue("strategy", OrderStrategy.SELL);
                          setOrderMode(OrderMode.STANDARD);
                          setShowBracketSettings(false);
                        }}
                        data-testid="button-strategy-sell"
                      >
                        Sell
                      </button>
                      <div className="hidden group-hover:block font-orbitron absolute z-50 mt-2 left-0 right-0 mx-auto top-10 md:w-[500px] w-[250px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-sm text-[10px] font-bold text-white shadow-lg">
                        <span className="text-[#FF9900] font-black">
                          Sell High
                        </span>{" "}
                        <br />
                        Exit your position exactly at the price you want — above
                        the current market. Lock in your profits from price
                        appreciation and sell directly into stables or core
                        assets of your choice. Secure gains. Zero emotion. One
                        click.
                      </div>
                      <div className="mt-1 text-center text-[#FFE3BA] md:text-xs text-[11px] font-semibold font-orbitron">
                        Sell High: Exit
                      </div>
                    </div>
                    {/* Buy Strategy Button */}
                    <div className="flex flex-col items-center relative group cursor-pointer">
                      <button
                        type="button"
                        className={`
                          w-24 h-10 p-3 md:text-[30px] text-lg 
                          rounded-2xl flex justify-center items-center
                          transition-all duration-200
                          ${
                            form.watch("strategy") === OrderStrategy.BUY &&
                            orderMode === OrderMode.STANDARD
                              ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                              : "bg-black text-white hover:bg-[#1a1a1a]"
                          }
                        `}
                        onClick={() => {
                          form.setValue("strategy", OrderStrategy.BUY);
                          setOrderMode(OrderMode.STANDARD);
                          setShowBracketSettings(false);
                        }}
                        data-testid="button-strategy-buy"
                      >
                        Buy
                      </button>
                      <div className="hidden group-hover:block font-orbitron absolute z-50 mt-2 top-10 md:w-[500px] w-[250px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-sm text-[10px] font-bold text-white shadow-lg">
                        <span className="text-[#FF9900] font-black">
                          Buy Low
                        </span>{" "}
                        <br />
                        Enter your position exactly at the price you want —
                        below the current market. Perfect for buying the dip and
                        sniping optimal entries with precision and speed.
                        One-click setup. Zero guesswork.
                      </div>
                      <div className="mt-1 text-center text-[#FFE3BA] md:text-xs text-[10px] font-semibold font-orbitron">
                        Buy Low: Entry
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bracket/Protection Group */}
                <div className="flex flex-col items-center">
                  {/* <span className="text-xs text-white">Coming Soon</span> */}
                  <div className="text-center text-[#FF9900] md:text-lg font-bold text-sm font-orbitron mb-2">
                    Spot Protection
                  </div>
                  <div className="flex gap-3">
                    {/* Bracket Strategy Button */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        className={`
                          w-32 h-10 p-3 md:text-2xl text-lg
                          rounded-2xl flex justify-center items-center
                          transition-all duration-200
                          ${
                            orderMode === OrderMode.BRACKET
                              ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                              : "bg-black text-white hover:bg-[#1a1a1a]"
                          }
                        `}
                        onClick={() => {
                          setOrderMode(OrderMode.BRACKET);
                          setShowBracketSettings(true);
                          form.setValue("strategy", OrderStrategy.BRACKET);
                        }}
                        data-testid="button-bracket"
                      >
                        {/* Bracket */}
                        Full
                      </button>
                      <div className="mt-1 text-center text-[#FFE3BA] md:text-xs text-[10px] font-semibold font-orbitron">
                        Entry + SL/TP
                      </div>
                    </div>
                    {/* Position Protection Button */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        className={`
                          w-32 h-10 p-3 md:text-[30px] text-lg
                          rounded-2xl flex justify-center items-center
                          transition-all duration-200
                          ${
                            orderMode === OrderMode.POSITION
                              ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                              : "bg-black text-white hover:bg-[#1a1a1a]"
                          }
                        `}
                        onClick={() => {
                          setOrderMode(OrderMode.POSITION);
                          setShowBracketSettings(true);
                          form.setValue("strategy", OrderStrategy.BRACKET);
                        }}
                        data-testid="button-position"
                      >
                        {/* Position */}
                        Spot
                      </button>
                      <div className="mt-1 text-center text-[#FFE3BA] md:text-xs text-[10px] font-semibold font-orbitron">
                        Protect Holdings
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {form.formState.errors.strategy && (
              <p className="mt-2 text-sm text-destructive text-center">
                {form.formState.errors.strategy.message}
              </p>
            )}
            {/*  */}
            <div className="relative bg_swap_box">
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                  {orderMode === OrderMode.POSITION
                    ? "Protected Token"
                    : "In Address"}
                </div>
                <div className="md:text-xl text-[10px] font-orbitron">
                  <span className="font-normal leading-normal text-[#FF9900]">
                    BAL
                  </span>
                  <span className="font-normal leading-normal text-[#FF9900]">
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
              <div className="flex w-full mt-6 md:gap-10 gap-2">
                <div className="lg:md:max-w-[200px] w-full">
                  <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                    <div className="flex gap-2 items-center w-full">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 py-[1px] justify-center w-full">
                        {tokenInMode === "select" ? (
                          <div className="space-y-2 w-full">
                            <Select
                              onValueChange={handleTokenInSelect}
                              value={selectedTokenIn || undefined}
                            >
                              <SelectTrigger
                                className="md:h-12 border-none text-center bg-black focus:none px-0 !w-full outline-none text-white font-extrabold font-orbitron md:text-xl text-xs capitalize"
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
                                          className="md:h-7 md:w-7 w-6 h-6"
                                        />
                                        <span className=" md:text-xl text-sm font-extrabold font-orbitron text-white">
                                          {token.symbol}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ),
                                )}
                                <SelectItem value="custom">
                                  <span className="font-medium text-primary font-orbitron cursor-pointer text-white">
                                    Custom Address..
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customTokenIn ? (
                              <div className="flex items-center justify-between h-12 px-3">
                                <div className="flex items-center gap-2">
                                  {customTokenIn.logoURI && (
                                    <img
                                      src={customTokenIn.logoURI}
                                      alt="token logo"
                                      className="h-6 w-6 rounded-full"
                                    />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-white md:text-xl font-bold text-xs">
                                      {customTokenIn.symbol}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("tokenIn", "")}
                                  className="text-white md:text-xl font-bold text-xs tilt"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  {...form.register("tokenIn")}
                                  placeholder="0x..."
                                  className="h-12 bg-transparent !focus:none !outline-0  !border-none md:text-xl text-base !font-bold !font-orbitron" // Added padding for logo
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
                              className="md:text-base text-xs border-none font-orbitron"
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
                        ? 40
                        : window.innerWidth >= 768
                          ? 30
                          : 20;
                    const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 5;
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
                        className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                        data-testid="input-amount-in"
                        onChange={(e) =>
                          form.setValue("amountIn", e.target.value)
                        }
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    );
                  })()}
                  <p className="mt-1 md:text-xs text-[10px] text-white text-right font-extrabold">
                    {tokenInInfo
                      ? `In ${tokenInInfo.symbol} (${tokenInInfo.decimals} decimals)`
                      : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                  {selectedTokenIn ? (
                    tokenInUSDPrice ? (
                      `$${tokenInUSDPrice.toFixed(6)}`
                    ) : (
                      <span className="animate-pulse">Loading...</span>
                    )
                  ) : (
                    "--"
                  )}
                  <span className="font-bold">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[10px] text-[7px] font-medium font-orbitron md:w-[70px] w-11 px-2
      ${
        selectedPercentage === value
          ? "!text-black !bg-[#FF9900] border-[#FF9900]"
          : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
      }`}
                      onClick={() => handlePercentageChange(value)}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-right relative text-white md:text-base text-[10px] usd-spacing truncate rigamesh text-sh1 flex justify-end gap-1">
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
                            className="roboto fixed rt0 z-50 mt-2 md:w-[500px] w-[300px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-sm text-[10px] font-bold text-white shadow-lg"
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
                      <span>
                        $
                        {formatNumber(
                          (parseFloat(amountIn) * tokenInUSDPrice).toFixed(2),
                        )}
                      </span>
                    </div>
                  )}
              </div>
              <div className="text-right text-white font-extrabold text-sm relative roboto truncate">
                {form.formState.errors.amountIn && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.amountIn.message}
                  </p>
                )}
              </div>
            </div>

            {/*  */}
            <div
              className="cursor-pointer relative md:pb-2 mx-auto !mt-7 mb-4 md:w-[70px] w-12"
              onClick={handleSwapTokens}
              data-testid="button-swap-tokens"
            >
              <img
                src={Ar}
                alt="Ar"
                className="hoverswap transition-all rounded-xl"
              />
            </div>
            {/*  */}
            <div className="relative pb-4 bg_swap_box_black">
              <div className="flex justify-between gap-3 items-center lg:px-2">
                <div className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                  {orderMode === OrderMode.POSITION
                    ? "Exit Token"
                    : "Out Address"}
                </div>
                <div className="md:text-xl text-[10px] font-orbitron">
                  <span className="font-normal leading-normal text-[#FF9900]">
                    BAL
                  </span>{" "}
                  <span className="font-normal leading-normal text-[#FF9900]">
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
              <div className="flex w-full mt-6 md:gap-10 gap-2">
                <div className="lg:md:max-w-[200px] w-full">
                  <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                    <div className="flex gap-2 items-center w-full">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 py-[1px] justify-center w-full">
                        {tokenOutMode === "select" ? (
                          <div className="space-y-2 w-full">
                            <Select
                              onValueChange={handleTokenOutSelect}
                              value={selectedTokenOut || undefined}
                            >
                              <SelectTrigger
                                className="md:h-12 border-none text-center focus:none px-0 !w-full outline-none !text-white font-extrabold font-orbitron md:text-xl text-xs capitalize"
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
                                          className="md:h-7 md:w-7 w-6 h-6"
                                        />
                                        <span className="font-orbitron md:text-xl text-sm font-extrabold !text-white">
                                          {token.symbol}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ),
                                )}
                                <SelectItem value="custom">
                                  <span className="font-medium text-white font-orbitron cursor-pointer">
                                    Custom Address..
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customTokenOut ? (
                              <div className="flex items-center justify-between h-12 px-3">
                                <div className="flex items-center gap-2">
                                  {customTokenOut.logoURI && (
                                    <img
                                      src={customTokenOut.logoURI}
                                      alt="token logo"
                                      className="h-6 w-6 rounded-full"
                                    />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-white md:text-xl text-xs font-bold">
                                      {customTokenOut.symbol}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("tokenOut", "")}
                                  className="!text-white md:text-xl text-xs font-bold tilt"
                                >
                                  <X size={16} className="!text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  {...form.register("tokenOut")}
                                  placeholder="0x..."
                                  className="h-12 bg-transparent !focus:none !outline-0 !border-none md:text-xl text-base !font-bold !font-orbitron !text-white"
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
                              className="md:text-base text-xs border-none text-black font-orbitron"
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
                        ? 40
                        : window.innerWidth >= 768
                          ? 30
                          : 20;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 6;
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
                        className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                        data-testid="input-amount-in"
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    );
                  })()}
                  <p className="mt-1 md:text-xs text-[10px] text-white text-right font-extrabold">
                    {tokenOutInfo
                      ? `In ${tokenOutInfo.symbol} (${tokenOutInfo.decimals} decimals)`
                      : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                  {selectedTokenOut ? (
                    tokenOutUSDPrice ? (
                      `$${tokenOutUSDPrice.toFixed(6)}`
                    ) : (
                      <span className="animate-pulse">Loading...</span>
                    )
                  ) : (
                    "--"
                  )}
                  <span className="font-bold">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border bg-[#EEC485] text-black flex justify-center items-center rounded-full md:text-[10px] text-[7px] font-medium font-orbitron md:w-[70px] w-11 px-2
            ${
              selectedPercentage === value
                ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
            }`}
                      onClick={() => handlePercentageChange(value)}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Partial Fill */}
              <div className="text-right text-white font-bold text-sm relative roboto truncate">
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
                className="my-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center"
                data-testid="trade-error-message"
              >
                <p className="text-sm font-medium text-destructive">
                  {tradeError}
                </p>
              </div>
            )}
            {/*  */}
            {/* For Bracket */}
            {showBracketSettings && (
              <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mt-5">
                <div className="text-center text-[#FF9900] text-base font-bold font-orbitron">
                  Advanced Settings
                </div>
                {/* Partial Fill */}
                <div className={`flex flex-col rounded-lg font-orbitron`}>
                  <div className="text-white p-4">
                    <div className="flex gap-4 justify-center items-center">
                      <p className="text-[#FF9900] font-orbitron md:text-[26px] text-xl font-extrabold ">
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
                          className={`${
                            fillMode === 1 ? "bg-[#FF9900]" : "bg-[#EEC485]"
                          } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(2)}
                          className={`${
                            fillMode === 2 ? "bg-[#FF9900]" : "bg-[#EEC485]"
                          } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 5
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(3)}
                          className={`${
                            fillMode === 3 ? "bg-[#FF9900]" : "bg-[#EEC485]"
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
                  <hr className="border-[#FF9900]/30 my-2" />
                  {/* Partial Fill */}
                  <div className="flex gap-4 items-center mt-4 px-4 md:flex-nowrap flex-wrap justify-center">
                    <div className="md:text-xl font-bold text-base text-[#FF9900]">
                      Expiry{" "}
                    </div>
                    {/* Deadline */}
                    <div onClick={handleClick} className="inline-block">
                      <input
                        id="deadline"
                        {...rest}
                        ref={mergedRef}
                        type="datetime-local"
                        className="cursor bg-black  md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF9900] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
                        placeholder="Deadline"
                        data-testid="input-deadline"
                        min={minDeadline}
                        max={maxDeadline}
                      />
                    </div>
                    {/* Slip */}
                    <div className="flex">
                      <div
                        onClick={onOpenSlippage}
                        className="shrink-0 bg-black px-6 py-3 border border-white rounded-lg flex justify-center items-center hoverswap transition-all cursor-pointer group"
                      >
                        <p className="text-[#FF9900] text-sm font-extrabold font-orbitron">
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
            <div className="lg:flex hidden flex-col gap-8 pb-1 mt-5">
              <button
                type="button"
                onClick={handleMainAction}
                disabled={
                  isApproving ||
                  isCreating ||
                  checkingApproval ||
                  !!tradeError ||
                  !!limitPriceError ||
                  (showBracketSettings &&
                    (!takeProfitPrice || !stopLossPrice || !takeProfitDeadline))
                }
                className={`gtw cursor-pointer relative w-full md:h-[68px] h-12 md:rounded-[10px] rounded-md mx-auto button-trans flex justify-center text-center items-center transition-all lg:text-[28px] text-xl font-extrabold ${
                  isApproved
                    ? "bg-[#F59216] hover:bg-[#e08a15 hover:text-white"
                    : "bg-[#F59216] hover:bg-[#e08a15]"
                }`}
                data-testid="button-main-action"
              >
                {getButtonContent()}
              </button>
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
              <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mb-5">
                <div className="flex justify-between gap-2 items-center mt-3">
                  <h2 className="text-[#FF9900] md:text-xl text-sm font-bold font-orbitron whitespace-nowrap">
                    {currentStrategy === OrderStrategy.SELL
                      ? "Exit Price"
                      : "Entry Price"}
                  </h2>

                  <div className="flex gap-1 items-center w-full">
                    <input
                      id="limitPrice"
                      {...form.register("limitPrice")}
                      placeholder="00.000"
                      type="text"
                      className="w-full flex justify-center items-center mx-auto bg-transparent focus:none !outline-0 !border-0 text-right text-white placeholder:text-white md:text-lg text-base font-semibold font-orbitron"
                      data-testid="input-limit-price"
                    />
                  </div>
                </div>

                {/* Quote reversal button and display */}
                <div className="text-right flex gap-2 items-center justify-end mt-2">
                  {marketPrice && tokenInInfo && tokenOutInfo && (
                    <button
                      type="button"
                      onClick={() => setQuoteReversed((prev) => !prev)}
                      className="w-[24px] md:h-[24px] h-5 shrink-0 flex items-center justify-center rounded !border !border-[#FF9900] bg-[#F59216]"
                    >
                      <svg
                        width={18}
                        height={24}
                        viewBox="0 0 38 38"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M18.0574 30.8637C17.6264 31.3581 16.8763 31.4094 16.3819 30.9785L7.13591 22.9179C6.76272 22.5925 6.63068 22.0697 6.80437 21.6061C6.97806 21.1425 7.42123 20.8353 7.91634 20.8353L30.083 20.8353C30.7388 20.8353 31.2705 21.367 31.2705 22.0228C31.2705 22.6786 30.7388 23.2103 30.083 23.2103L11.0855 23.2103L17.9426 29.1883C18.437 29.6192 18.4884 30.3694 18.0574 30.8637Z"
                          fill="#000000"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M19.9419 7.13644C20.3728 6.64196 21.123 6.59066 21.6173 7.02165L30.8633 15.0822C31.2365 15.4076 31.3687 15.9304 31.195 16.394C31.0212 16.8576 30.5781 17.1648 30.083 17.1648L7.91628 17.1648C7.26047 17.1648 6.72878 16.6331 6.72878 15.9773C6.72878 15.3215 7.26047 14.7898 7.91628 14.7898L26.9137 14.7898L20.0567 8.81176C19.5623 8.38078 19.5109 7.63076 19.9419 7.13644Z"
                          fill="#000000"
                        />
                      </svg>
                    </button>
                  )}
                  <span className="text-[#FF9900] md:text-xl text-base font-orbitron font-bold">
                    {quoteReversed && tokenInInfo && tokenOutInfo
                      ? `${tokenOutInfo.symbol} per ${tokenInInfo.symbol}`
                      : `${tokenInInfo?.symbol || "Token"} per ${tokenOutInfo?.symbol || "USDT"}`}
                  </span>
                </div>

                {/* Calculate percentage difference between limit price and market price */}
                {(() => {
                  const market = marketPrice ? parseFloat(marketPrice) : 0;
                  const limit = currentLimitPrice
                    ? parseFloat(currentLimitPrice)
                    : 0;

                  let targetPosition = 0;
                  let priceDiffPercent = 0;

                  if (market > 0 && limit > 0) {
                    if (currentStrategy === OrderStrategy.SELL) {
                      // For SELL: limit higher than market
                      priceDiffPercent = ((limit - market) / market) * 100;
                      targetPosition = Math.min(
                        100,
                        Math.max(0, priceDiffPercent),
                      );
                    } else if (
                      currentStrategy === OrderStrategy.BUY ||
                      currentStrategy === OrderStrategy.BRACKET
                    ) {
                      // For BUY and BRACKET: limit lower than market
                      // Calculate percentage below market
                      priceDiffPercent = ((market - limit) / market) * 100;
                      // Map to position from right (market at right, lower prices move left)
                      targetPosition =
                        100 - Math.min(100, Math.max(0, priceDiffPercent));
                    }
                  }
                  return (
                    <div className="mt-3 font-orbitron">
                      <div className="flex justify-between text-xs mb-4 text-[#FFE6C0]">
                        <span>
                          {currentStrategy === OrderStrategy.SELL
                            ? "Market"
                            : currentStrategy === OrderStrategy.BUY ||
                                currentStrategy === OrderStrategy.BRACKET
                              ? "Target"
                              : "Market"}
                        </span>
                        {/* <span>
                          {currentStrategy === OrderStrategy.SELL &&
                          priceDiffPercent > 0
                            ? `+${priceDiffPercent.toFixed(1)}%`
                            : currentStrategy === OrderStrategy.BUY &&
                                priceDiffPercent > 0
                              ? `-${priceDiffPercent.toFixed(1)}%`
                              : `${priceDiffPercent.toFixed(1)}%`}
                        </span> */}
                      </div>
                      <div className="relative h-2 bg-[#352E25] rounded-full">
                        {/* Progress fill - depends on strategy */}
                        <div
                          className="absolute h-2 bg-[#F59216] rounded-full transition-all duration-200"
                          style={{
                            width:
                              currentStrategy === OrderStrategy.SELL
                                ? `${targetPosition}%`
                                : `${100 - targetPosition}%`,
                            left:
                              currentStrategy === OrderStrategy.SELL
                                ? "0"
                                : `${targetPosition}%`,
                          }}
                        />

                        {/* Market Price Marker - position depends on strategy */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-8 bg-[#FFE4BA] rounded z-20"
                          style={{
                            left:
                              currentStrategy === OrderStrategy.SELL
                                ? "0px"
                                : "calc(100% - 4px)",
                          }}
                          title="Market Price"
                        />

                        {/* Target Price Marker - position depends on strategy */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-[#F59216] rounded-full shadow-lg transition-all duration-200 cursor-pointer z-30"
                          style={{
                            left:
                              currentStrategy === OrderStrategy.SELL
                                ? `calc(${targetPosition}% - 16px)`
                                : `calc(${targetPosition}% - 16px)`,
                          }}
                          title="Target Price"
                        />

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={targetPosition}
                          onChange={(e) => {
                            const newTargetPosition = Number(e.target.value);
                            if (marketPrice) {
                              const market = parseFloat(marketPrice);
                              let newLimitPrice: number;

                              if (currentStrategy === OrderStrategy.SELL) {
                                // For SELL: moving right increases price (above market)
                                newLimitPrice =
                                  market * (1 + newTargetPosition / 100);
                                // Update custom percentage
                                setCustomPercentage(
                                  newTargetPosition.toString(),
                                );
                              } else {
                                // For BUY and BRACKET: moving left decreases price (below market)
                                // Convert slider position to percentage below market
                                const percentBelowMarket =
                                  100 - newTargetPosition;
                                newLimitPrice =
                                  market * (1 - percentBelowMarket / 100);
                                // Update custom percentage
                                setCustomPercentage(
                                  percentBelowMarket.toString(),
                                );
                              }

                              form.setValue(
                                "limitPrice",
                                newLimitPrice.toFixed(8),
                                {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                },
                              );
                            }
                          }}
                          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer z-40"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] mt-3 text-gray-400">
                        <span className="text-[#FF9900] font-bold">
                          {currentStrategy === OrderStrategy.SELL
                            ? "Market"
                            : "Target"}
                        </span>
                        <span className="text-[#FF9900] font-bold">
                          {currentStrategy === OrderStrategy.SELL
                            ? "Higher"
                            : "Market"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 flex justify-between gap-3 items-center">
                  <div className="flex flex-col justify-center gap-2 items-center">
                    {/* <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron">
                      {marketPrice ? (
                        <>
                          <span className="font-bold">1</span>{" "}
                          {tokenInInfo?.symbol} ≈{" "}
                          <span className="font-bold">
                            {parseFloat(marketPrice).toFixed(4)}
                          </span>{" "}
                          {tokenOutInfo?.symbol}
                        </>
                      ) : (
                        "-"
                      )}
                    </div> */}
                    <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                      Market Price
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-2 items-center">
                    <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron flex items-center gap-1">
                      <input
                        type="number"
                        value={customPercentage}
                        onChange={(e) =>
                          handleCustomPercentageChange(e.target.value)
                        }
                        placeholder="0"
                        className="w-16 text-center bg-transparent text-black outline-none font-orbitron"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-black font-bold">%</span>
                    </div>
                    <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                      Target Price
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-4 items-center flex-wrap mt-3">
                  <div className="mt-1 md:text-sm text-xs text-muted-foreground flex items-center justify-left">
                    <span className="text-[#FFE3BA] font-orbitron">
                      {marketPrice && tokenInInfo && tokenOutInfo ? (
                        quoteReversed ? (
                          <>
                            Market:{" "}
                            <span className="font-orbitron font-bold">1</span>{" "}
                            {tokenOutInfo.symbol} ≈{" "}
                            <span className="font-orbitron font-bold">
                              {(1 / parseFloat(marketPrice)).toFixed(8)}
                            </span>{" "}
                            {tokenInInfo.symbol}
                          </>
                        ) : (
                          <>
                            Market:{" "}
                            <span className="font-orbitron font-bold">1</span>{" "}
                            {tokenInInfo.symbol} ≈{" "}
                            <span className="font-orbitron font-bold">
                              {marketPrice}
                            </span>{" "}
                            {tokenOutInfo.symbol}
                          </>
                        )
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
                {/* Bracket Direction Helper */}
                {/* {orderMode === OrderMode.BRACKET && (
                  <div className="mb-4 p-3 bg-black border-4 border-[#FF9900] rounded-lg">
                    <p className="text-white text-sm text-center font-orbitron">
                      Bracket Order: Set Stop Loss ABOVE and Take Profit BELOW
                      entry price
                    </p>
                  </div>
                )} */}

                <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mb-5">
                  {/* Stop Loss Section */}
                  <div className="w-full">
                    <div className="flex justify-between gap-2 items-center mt-1">
                      <h2 className="text-[#FF9900] md:text-xl text-sm font-bold font-orbitron whitespace-nowrap">
                        Stop Loss
                      </h2>
                      <div className="flex justify-center gap-2 items-center relative w-full">
                        <div className="flex gap-1 items-center w-full">
                          <input
                            type="text"
                            placeholder="00.000"
                            value={stopLossPrice}
                            onChange={(e) => setStopLossPrice(e.target.value)}
                            className="w-full flex justify-center items-center mx-auto bg-transparent focus:none !outline-0 !border-0 text-right text-white placeholder:text-white md:text-xl text-base font-semibold font-orbitron"
                          />
                          {/* <span className="text-[#FF9900] md:text-4xl text-2xl font-extrabold font-orbitron">
                            {tokenOutInfo?.symbol || "USDT"}
                          </span> */}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[#FF9900] text-xl font-normal font-orbitron">
                      <span className="text-[#FF9900] md:text-xl text-base font-orbitron font-bold">
                        ${tokenOutInfo?.symbol || "USDT"}{" "}
                        <span className="font-normal">per</span> $LINK
                      </span>
                    </div>

                    {/* Stop Loss Slider */}
                    <div className="mt-3 font-orbitron">
                      <div className="flex justify-between text-xs mb-4 text-[#FFE6C0]">
                        <span>Market</span>
                        <span>{stopLossPercent || 0}%</span>
                      </div>
                      <div className="relative h-2 bg-[#352E25] rounded-full">
                        <div
                          className="absolute h-2 bg-[#F59216] rounded-full transition-all duration-200"
                          style={{ width: `${stopLossPercent || 0}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-[#F59216] rounded-full shadow-lg transition-all duration-200"
                          style={{
                            left: `calc(${stopLossPercent || 0}% - 10px)`,
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={stopLossPercent || 0}
                          onChange={(e) => {
                            const percent = Number(e.target.value);
                            setStopLossPercent(percent);
                            if (marketPrice) {
                              const market = Number(marketPrice);
                              // Bracket orders are SELL only: SL above market (1 + percent)
                              const stopLossValue =
                                market * (1 + percent / 100);
                              setStopLossPrice(stopLossValue.toFixed(4));
                            }
                          }}
                          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] mt-3 text-gray-400">
                        <span>0</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                      </div>
                    </div>

                    {/* Stop Loss Market Info */}
                    <div className="mt-4 flex justify-between gap-3 items-center">
                      <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron">
                          {stopLossPercent || 0}%
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                          Stop Loss
                        </div>
                      </div>
                      {/* <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron">
                          {marketPrice && tokenInInfo && tokenOutInfo ? (
                            <>
                              <span>1</span> {tokenInInfo.symbol} ≈{" "}
                              <span>{marketPrice}</span> {tokenOutInfo.symbol}
                            </>
                          ) : (
                            "0%"
                          )}
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                          Market
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
                <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mb-5 mt-5">
                  {/* Take Profit Section */}
                  <div className="mb-4">
                    <div className="flex justify-between gap-2 items-center mt-1">
                      <h2 className="text-[#FF9900] md:text-xl text-sm font-bold font-orbitron">
                        Take Profit
                      </h2>
                      <div className="flex justify-center gap-2 items-center relative">
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            placeholder="00.000"
                            value={takeProfitPrice}
                            onChange={(e) => setTakeProfitPrice(e.target.value)}
                            className="w-full flex justify-center items-center mx-auto bg-transparent focus:none !outline-0 !border-0 text-right text-white placeholder:text-white md:text-xl text-base font-semibold font-orbitron"
                          />
                          {/* <span className="text-[#FF9900] md:text-4xl text-2xl font-extrabold font-orbitron">
                            {tokenOutInfo?.symbol || "USDT"}
                          </span> */}
                        </div>
                      </div>
                    </div>
                    <p className="text-[#FF9900] text-right md:text-xl text-base font-orbitron font-bold">
                      ${tokenOutInfo?.symbol || "USDT"}{" "}
                      <span className="font-normal">per</span> $LINK
                    </p>

                    {/* Take Profit Slider */}
                    <div className="mt-3 font-orbitron">
                      <div className="flex justify-between text-xs mb-4 text-[#FFE6C0]">
                        <span>Market</span>
                        <span>{takeProfitPercent || 0}%</span>
                      </div>
                      <div className="relative h-2 bg-[#352E25] rounded-full">
                        <div
                          className="absolute h-2 bg-[#F59216] rounded-full transition-all duration-200"
                          style={{ width: `${takeProfitPercent || 0}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-[#F59216] rounded-full shadow-lg transition-all duration-200"
                          style={{
                            left: `calc(${takeProfitPercent || 0}% - 10px)`,
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={takeProfitPercent || 0}
                          onChange={(e) => {
                            const percent = Number(e.target.value);
                            setTakeProfitPercent(percent);
                            if (marketPrice) {
                              const market = Number(marketPrice);
                              // Bracket orders are SELL only: TP below market (1 - percent)
                              const takeProfitValue =
                                market * (1 - percent / 100);
                              setTakeProfitPrice(takeProfitValue.toFixed(4));
                            }
                          }}
                          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] mt-3 text-gray-400">
                        <span>0</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                      </div>
                    </div>

                    {/* Take Profit Market Info */}
                    <div className="mt-4 flex justify-between gap-3 items-center">
                      <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron">
                          {takeProfitPercent || 0}%
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                          Entry Price
                        </div>
                      </div>
                      {/* <div className="flex flex-col justify-center gap-2 items-center">
                        <div className="py-1 px-2 bg-[#FFE3BA] rounded-lg text-center text-black text-base font-normal font-orbitron">
                          {marketPrice && tokenInInfo && tokenOutInfo ? (
                            <>
                              <span className="rigamesh">1</span>{" "}
                              {tokenInInfo.symbol} ≈{" "}
                              <span className="rigamesh">{marketPrice}</span>{" "}
                              {tokenOutInfo.symbol}
                            </>
                          ) : (
                            "0%"
                          )}
                        </div>
                        <div className="text-[#FFE3BA] text-xs font-normal font-orbitron">
                          Target Price
                        </div>
                      </div> */}
                    </div>

                    {/* SL/TP Expiry */}
                    <div className="mt-4">
                      <div className="flex gap-4 items-center px-4 md:flex-nowrap flex-wrap">
                        <div className="md:text-lg text-base font-bold text-[#FF9900]">
                          SL/TP Expiry{" "}
                        </div>
                        <div>
                          <input
                            type="datetime-local"
                            value={takeProfitDeadline}
                            onChange={(e) =>
                              setTakeProfitDeadline(e.target.value)
                            }
                            className="cursor bg-black md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF9900] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
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
              <div className="relative bg_swap_box_black md:!py-5 md:!px-5 mb-5">
                <div className="text-center text-[#FF9900] text-xl font-black font-orbitron">
                  Advanced Settings
                </div>
                {/* Partial Fill */}
                <div className={`flex flex-col rounded-lg font-orbitron`}>
                  <div className="text-white p-4">
                    <div className="flex gap-4 justify-center items-center">
                      <p className="text-[#FF9900] font-orbitron md:text-3xl text-2xl font-extrabold ">
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
                          className={`${
                            fillMode === 1 ? "bg-[#FF9900]" : "bg-[#EEC485]"
                          } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(2)}
                          className={`${
                            fillMode === 2 ? "bg-[#FF9900]" : "bg-[#EEC485]"
                          } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                        >
                          Split 5
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillMode(3)}
                          className={`${
                            fillMode === 3 ? "bg-[#FF9900]" : "bg-[#EEC485]"
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
                  <hr className="border-[#FF9900]/30 my-2" />
                  {/* Partial Fill */}
                  <div className="flex gap-4 items-center mt-4 px-4 md:flex-nowrap flex-wrap">
                    <div className="md:text-xl font-bold text-base text-[#FF9900]">
                      Expiry{" "}
                    </div>
                    {/* Deadline */}
                    <div onClick={handleClick} className="inline-block">
                      <input
                        id="deadline"
                        {...rest}
                        ref={mergedRef}
                        type="datetime-local"
                        className="cursor bg-black  md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border border-[#FF9900] text-white/opacity-70 text-sm font-normal leading-tight tracking-wide"
                        placeholder="Deadline"
                        data-testid="input-deadline"
                        min={minDeadline}
                        max={maxDeadline}
                      />
                    </div>
                    {/* Slip */}
                    <div className="flex">
                      <div
                        onClick={onOpenSlippage}
                        className="shrink-0 bg-black px-6 py-3 border border-white rounded-lg flex justify-center items-center hoverswap transition-all cursor-pointer group"
                      >
                        <p className="text-[#FF9900] text-sm font-extrabold font-orbitron">
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
              <div className="text-center text-[#F59216] font-orbitron md:text-3xl text-2xl font-extrabold">
                Order Details
              </div>
              <div className="md:px-5 px-2">
                <div className="flex justify-between gap-3 items-center mt-4 font-orbitron">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {form.watch("strategy") === OrderStrategy.SELL
                        ? "Sell High"
                        : form.watch("strategy") === OrderStrategy.BUY
                          ? "Buy Low"
                          : "Bracket Order"}
                    </div>
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
                      Strategy
                    </div>
                  </div>
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {form.watch("strategy") === OrderStrategy.SELL
                        ? "$ Link"
                        : form.watch("strategy") === OrderStrategy.BRACKET
                          ? "TP/SL"
                          : "Token Purchased"}
                    </div>
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
                      {form.watch("strategy") === OrderStrategy.SELL
                        ? "Token Sold"
                        : form.watch("strategy") === OrderStrategy.BRACKET
                          ? `${takeProfitPrice || "0"}/${stopLossPrice || "0"}`
                          : "Token Bought"}
                    </div>
                  </div>
                </div>
                <hr className="border border-[#7B653C] my-4" />
                <div className="flex justify-between gap-3 items-center mt-4 font-orbitron">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {form.watch("deadline")
                        ? new Date(form.watch("deadline")).toLocaleDateString()
                        : "Not set"}
                    </div>
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
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
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
                      Order Split
                    </div>
                  </div>
                </div>
                <hr className="border border-[#7B653C] my-4" />
                <div className="flex justify-between gap-3 items-center mt-4 font-orbitron">
                  <div className="md:max-w-[155px] w-full">
                    <div className="text-[#FFD484] md:text-[15px] text-xs font-bold">
                      {form.watch("minAmountOut") || "0"}
                    </div>
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
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
                        const market = marketPrice
                          ? parseFloat(marketPrice)
                          : 0;
                        const limit = currentLimitPrice
                          ? parseFloat(currentLimitPrice)
                          : 0;

                        if (
                          market > 0 &&
                          limit > 0 &&
                          currentStrategy === OrderStrategy.SELL
                        ) {
                          const priceDiffPercent =
                            ((limit - market) / market) * 100;
                          return `${Math.min(100, Math.max(0, priceDiffPercent)).toFixed(1)}%`;
                        }
                        return "0%";
                      })()}
                    </div>
                    <div className="text-white md:text-[10px] mt-1 text-[9px] font-semibold">
                      {currentStrategy === OrderStrategy.BRACKET
                        ? "Potential Profit"
                        : "Profit"}
                    </div>
                  </div>
                </div>
                <MarketTargetChart
                  strategy={form.watch("strategy")}
                  stopLossPrice={stopLossPrice}
                  takeProfitPrice={takeProfitPrice}
                  marketPrice={marketPrice || undefined}
                />
              </div>
            </div>

            {/* ForMobile - Single Button */}
            <div className="lg:hidden flex flex-col gap-8 pb-1 mt-5">
              <button
                type="button"
                onClick={handleMainAction}
                disabled={
                  isApproving ||
                  isCreating ||
                  checkingApproval ||
                  !!tradeError ||
                  !!limitPriceError ||
                  (showBracketSettings &&
                    (!takeProfitPrice || !stopLossPrice || !takeProfitDeadline))
                }
                className={`gtw cursor-pointer relative w-full md:h-[68px] h-12 md:rounded-[10px] rounded-md mx-auto button-trans flex justify-center text-center items-center transition-all lg:text-[28px] text-xl font-extrabold ${
                  isApproved
                    ? "bg-[#F59216] hover:bg-[#e08a15 hover:text-white"
                    : "bg-[#F59216] hover:bg-[#e08a15] hover:text-white"
                }`}
                data-testid="button-main-action-mobile"
              >
                {getButtonContent()}
              </button>
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