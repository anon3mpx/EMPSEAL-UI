import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import Sellbox from "../../assets/images/sell-box.png";
// import LimitBg from "../../assets/images/buy-bg.png";
// import LimitBg from "../../assets/images/limit-bg.png";
import Ar from "../../assets/images/reverse.svg";
// import Swapbutton from "../../assets/images/swap-button.svg";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Loader2,
  FileText,
  Coins,
  ArrowLeftRight,
  ArrowLeft,
  ArrowUpDown,
  Settings,
  Cog,
  Info,
  X,
  InfoIcon,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useAccount, useBalance } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
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
const CONTRACT_ADDRESS = "0x80C12068B84d26c5359653Ba5527746bb999b8c6";

interface CreateOrderFormProps {
  onStatusMessage: (message: StatusMessage) => void;
  onOrderCreated: (details: {
    orderId: string;
    txHash: string;
    strategy: OrderStrategy;
  }) => void;
  slippage: number;
}

export function CreateOrderForm({
  onStatusMessage,
  onOrderCreated,
  slippage,
}: CreateOrderFormProps) {
  const { address: userAddress } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [tokenInMode, setTokenInMode] = useState<"select" | "custom">("select");
  const [tokenOutMode, setTokenOutMode] = useState<"select" | "custom">(
    "select"
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
        "Warning: Trading between two custom tokens is not supported."
      );
    } else {
      setTradeError(null);
    }
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode]);

  useEffect(() => {
    const fetchTokenData = async (
      tokenAddress: string,
      setCustomToken: (token: any) => void
    ) => {
      try {
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/pulsechain/tokens/${tokenAddress}`
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

  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        amountIn &&
        !isNaN(parseFloat(amountIn)) &&
        currentLimitPrice &&
        !isNaN(parseFloat(currentLimitPrice))
      ) {
        const amountInFloat = parseFloat(amountIn);
        const limitPriceFloat = parseFloat(currentLimitPrice);
        const expectedAmountOut = amountInFloat * limitPriceFloat;

        // Apply slippage
        const numericSlippage = typeof slippage === "number" ? slippage : 0.5;
        const slippageAdjustedAmount =
          expectedAmountOut * (1 - numericSlippage / 100);

        form.setValue("minAmountOut", slippageAdjustedAmount.toFixed(6));
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [amountIn, currentLimitPrice, slippage, form]);

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
            ","
          )}`
        );
        const data = await response.json();

        // Update Token In Price
        if (selectedTokenIn && isAddress(selectedTokenIn)) {
          const tokenInPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenIn.toLowerCase()]
          );
          setTokenInUSDPrice(tokenInPrice || null);
        } else {
          setTokenInUSDPrice(null);
        }

        // Update Token Out Price
        if (selectedTokenOut && isAddress(selectedTokenOut)) {
          const tokenOutPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenOut.toLowerCase()]
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
            data.data.attributes.token_prices[selectedTokenIn.toLowerCase()]
          );
          const tokenOutPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenOut.toLowerCase()]
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
          error
        );
        setMarketPrice(null);
        setTokenInUSDPrice(null);
        setTokenOutUSDPrice(null);
      }
    };

    fetchMarketPrice();
  }, [selectedTokenIn, selectedTokenOut]);

  // useEffect(() => {
  //   if (amountIn && tokenInUSDPrice) {
  //     const amount = parseFloat(amountIn);
  //     if (!isNaN(amount)) {
  //       const totalValueUSD = amount * tokenInUSDPrice;
  //       if (totalValueUSD < 30) {
  //         setMinValueError("Amount in must be greater than $30");
  //       } else {
  //         setMinValueError(null);
  //       }
  //     } else {
  //       setMinValueError(null);
  //     }
  //   } else {
  //     setMinValueError(null);
  //   }
  // }, [amountIn, tokenInUSDPrice]);

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
            "For Exit Strategy (Sell), limit price should be greater than market price."
          );
        } else {
          setLimitPriceError(null);
        }
      } else if (currentStrategy === OrderStrategy.BUY) {
        // For Buy orders, limit price should be less than market price
        if (limit > market) {
          setLimitPriceError(
            "For Accumulation Strategy (Buy), limit price should be less than market price."
          );
        } else {
          setLimitPriceError(null);
        }
      }
    } else {
      setLimitPriceError(null);
    }
  }, [currentLimitPrice, marketPrice, currentStrategy]);

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

  const onSubmit = async (data: CreateOrderInput) => {
    setIsCreating(true);
    onStatusMessage({ type: "info", message: "Creating order..." });

    try {
      const amountIn = parseUnits(data.amountIn, tokenInInfo?.decimals || 18);
      const minAmountOut = parseUnits(
        data.minAmountOut,
        tokenOutInfo?.decimals || 18
      );
      const limitPrice = parseUnits(data.limitPrice, 18);
      const deadline = BigInt(
        Math.floor(new Date(data.deadline).getTime() / 1000)
      );
      const mode = partialFillEnabled ? fillMode : 0;
      const orderType = data.strategy === OrderStrategy.SELL ? 0 : 1; // 0 for SELL, 1 for BUY

      const hash = await writeContract(config, {
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

  // const [isModalOpen, setIsModalOpen] = useState(false);

  // const [isPartialFill, setIsPartialFill] = useState(false);
  // Toggle function
  // const togglePartialFill = () => {
  //   setIsPartialFill((prev) => !prev);
  // };

  // For Limit Price
  // Apply limit price by +/- percentage from market
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
    null
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
  //
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

  //
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputEl?.showPicker?.(); // Safely trigger calendar
  };

  const { ref: formRef, ...rest } = form.register("deadline");

  const mergedRef = (el: HTMLInputElement | null) => {
    setInputEl(el); // Save to state
    formRef(el); // Register with React Hook Form
  };

  //
  const [dollarinfo, setDollarInfo] = useState(false);
  const [dollarinfo1, setDollarInfo1] = useState(false);

  return (
    <>
      <div
        data-testid="card-create-order"
        className="lg:max-w-[700px] md:max-w-[600px] mx-auto w-full"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Strategy Selection */}
          <div className="flex gap-2 items-start">
            <div>
              <Label className="md:text-base text-sm font-medium mb-5 block">
                Order Strategy
              </Label>
              <RadioGroup
                onValueChange={(value: OrderStrategy) =>
                  form.setValue("strategy", value)
                }
                defaultValue={form.getValues("strategy") || OrderStrategy.SELL}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={OrderStrategy.SELL}
                    id="strategy-sell"
                  />
                  <Label
                    className="md:text-base text-sm"
                    htmlFor="strategy-sell"
                  >
                    Exit (Sell High)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={OrderStrategy.BUY} id="strategy-buy" />
                  <Label
                    className="md:text-base text-sm"
                    htmlFor="strategy-buy"
                  >
                    Accumulation (Buy Low)
                  </Label>
                </div>
              </RadioGroup>
              {form.formState.errors.strategy && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.strategy.message}
                </p>
              )}
            </div>
          </div>
          {/*  */}
          <div className="relative bg_swap_box">
            {/* <img className="bg-sell w-full" src={Sellbox} alt="sellbox" /> */}
            <div className="flex justify-between gap-3 items-center">
              <div className="font-orbitron text-dark-400 md:text-2xl text-xs font-semibold leading-normal text-black">
                In Address
              </div>
              <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2 text-black">
                <span className="font-extrabold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className="rigamesh leading-normal">
                  {tokenInMode === "select"
                    ? tokenInBalance && (
                      <span className="rigamesh leading-normal">
                        {parseFloat(tokenInBalance).toFixed(4)}{" "}
                        {/* {tokenInInfo?.symbol || "Tokens"} */}
                      </span>
                    )
                    : tokenInBalance && (
                      <span className="rigamesh leading-normal">
                        {parseFloat(tokenInBalance).toFixed(4)}{" "}
                        {/* {customTokenIn?.symbol || "Tokens"} */}
                      </span>
                    )}
                </span>
              </div>
            </div>
            <div className="flex w-full">
              <div className="md:w-[25%] w-[40%]">
                <div className="flex justify-between gap-4 items-center cursor-pointer">
                  <div className="flex gap-2 items-center md:mt-5 mt-6">
                    {/* md:w-[220px] w-[160px] */}
                    <div className="flex md:gap-4 gap-1 items-center bg-black md:border-2 border border-white md:rounded-xl rounded-lg md:px-6 px-3 md:py-3 margin_left lg:w-[280px] md:w-[220px] w-[125px] justify-center">
                      {tokenInMode === "select" ? (
                        <div className="space-y-2 w-full">
                          <Select
                            onValueChange={handleTokenInSelect}
                            value={selectedTokenIn || undefined}
                          // disabled={
                          //   tokenOutMode === "custom" &&
                          //   !getTokenInfo(selectedTokenOut) &&
                          //   isAddress(selectedTokenOut)
                          // }
                          >
                            <SelectTrigger
                              className="h-12 border-none text-center bg-black focus:none px-0 !w-full outline-none !text-[#FF9900] font-bold font-orbitron lg:text-3xl md:text-base text-xs"
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
                                        className="md:h-10 md:w-10 w-8 h-8"
                                      />
                                      <span className="lg:text-2xl text-sm font-bold font-orbitron">
                                        {token.symbol}
                                      </span>
                                    </div>
                                  </SelectItem>
                                )
                              )}
                              <SelectItem value="custom">
                                <span className="font-medium text-primary font-orbitron cursor-pointer">
                                  Custom Address..
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {/* <div className="flex justify-between">
                            {tokenInBalance && (
                              <p className="text-xs text-muted-foreground text-right">
                                Balance: {parseFloat(tokenInBalance).toFixed(4)}{" "}
                                {tokenInInfo?.symbol || "Tokens"}
                              </p>
                            )}
                          </div> */}
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
                                  {/* <span className="text-white font-medium text-sm">{customTokenIn.name}</span> */}
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
                              // disabled={
                              //   tokenOutMode === "custom" &&
                              //   !getTokenInfo(selectedTokenOut) &&
                              //   isAddress(selectedTokenOut)
                              // }
                              />
                            </div>
                          )}
                          <Button
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
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-[75%] w-[60%]">
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex gap-2 md:ml-0 ml-[-40px] justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-black bg-black text-white flex justify-center items-center rounded-xl md:text-[12px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
      ${selectedPercentage === value
                          ? "text-white bg-black"
                          : "bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                        }`}
                      onClick={() => handlePercentageChange(value)}
                    // disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                {(() => {
                  const inputLength =
                    formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
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
                  const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 5;
                  const SHRINK_RATE = 3;

                  const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE
                  );
                  return (
                    <input
                      id="amountIn"
                      {...form.register("amountIn")}
                      placeholder="0.0"
                      type="text"
                      className="text-[#000000] text-sh py-2 text-end w-full leading-7 outline-none border-none bg-transparent token_input rigamesh placeholder-black transition-all duration-200 ease-in-out"
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
                <p className="mt-1 md:text-xs text-[10px] text-black text-right font-extrabold">
                  {tokenInInfo
                    ? `In ${tokenInInfo.symbol} (${tokenInInfo.decimals} decimals)`
                    : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
                </p>
                <div className="text-right relative text-black md:text-base text-[10px] usd-spacing truncate rigamesh text-sh1 flex justify-end gap-1">
                  {tokenInUSDPrice &&
                    amountIn &&
                    !isNaN(parseFloat(amountIn)) && (
                      <div className="flex items-center gap-1">
                        <div className="relative inline-block">
                          <InfoIcon
                            size={18}
                            className="md:mt-[1.5px] mt-[-1px] cursor-pointer"
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
                              cases. For accuracy, please check the output
                              units.
                            </div>
                          )}
                        </div>
                        <span>
                          $
                          {formatNumber(
                            (parseFloat(amountIn) * tokenInUSDPrice).toFixed(2)
                          )}
                        </span>
                      </div>
                    )}

                  {/* {tokenInUSDPrice && amountIn && !isNaN(parseFloat(amountIn))
                    ? `$${formatNumber(
                        (parseFloat(amountIn) * tokenInUSDPrice).toFixed(2)
                      )}`
                    : ""} */}
                </div>
              </div>
            </div>
            <div className="text-right text-white font-extrabold text-sm relative roboto truncate">
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
          {/*  */}
          <div className="relative pb-7 bg_swap_box_black">
            {/* <img className="bg-sell-1 w-full" src={LimitBg} alt="LimitBg" /> */}
            <div className="flex justify-between gap-3 items-center lg:px-2">
              <div className="font-orbitron text-dark-400 md:text-2xl text-xs font-semibold leading-normal text-white">
                Out Address
              </div>
              <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2 text-black">
                <span className="font-extrabold leading-normal">BAL</span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className="rigamesh leading-normal">
                  {tokenOutBalance === "select"
                    ? tokenOutBalance && (
                      <span className="rigamesh leading-normal">
                        {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                      </span>
                    )
                    : tokenOutBalance && (
                      <span className="rigamesh leading-normal">
                        {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                        {/* {customTokenOut?.symbol || "Tokens"} */}
                      </span>
                    )}
                </span>
              </div>
            </div>
            <div className="flex w-full">
              <div className="md:w-[25%] w-[40%]">
                <div className="flex justify-between gap-4 items-center cursor-pointer">
                  <div className="flex gap-2 items-center mt-5">
                    <div className="flex md:gap-4 gap-1 items-center justify-center bg-[#FFE6C0] md:border-2 border border-white rounded-lg md:px-4 px-3 md:py-3 lg:w-[280px] md:w-[220px] w-[125px] margin_left">
                      {tokenOutMode === "select" ? (
                        <div className="space-y-2 w-full">
                          <Select
                            onValueChange={handleTokenOutSelect}
                            value={selectedTokenOut || undefined}
                          // disabled={
                          //   tokenInMode === "custom" &&
                          //   !getTokenInfo(selectedTokenIn) &&
                          //   isAddress(selectedTokenIn)
                          // }
                          >
                            <SelectTrigger
                              className="h-12 border-none text-center !bg-[#FFE6C0] focus:none px-0 !w-full outline-none !text-black font-bold font-orbitron lg:text-3xl md:text-base text-xs"
                              data-testid="select-token-out"
                            >
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                            <SelectContent className="!bg-[#FFE6C0] text-black">
                              {Object.entries(TOKENS).map(
                                ([address, token]) => (
                                  <SelectItem key={address} value={address}>
                                    <div className="flex items-center gap-2 text-black">
                                      {/* <Coins className="h-4 w-4" /> */}
                                      <TokenLogo
                                        chainId={369}
                                        tokenAddress={address}
                                        symbol={token.symbol}
                                        className="md:h-10 md:w-10 w-8 h-8"
                                      />
                                      <span className="lg:text-2xl text-sm font-bold font-orbitron">
                                        {token.symbol}
                                      </span>
                                    </div>
                                  </SelectItem>
                                )
                              )}
                              <SelectItem value="custom">
                                <span className="font-medium text-black font-orbitron cursor-pointer">
                                  Custom Address..
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {/* <div className="flex justify-between">
                            {tokenOutBalance && (
                              <p className="text-xs text-muted-foreground text-right">
                                Balance: {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                                {tokenOutInfo?.symbol || "Tokens"}
                              </p>
                            )}
                          </div> */}
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
                                  {/* <span className="text-black font-medium text-sm">{customTokenOut.name}</span> */}
                                  <span className="text-black md:text-xl text-xs font-bold">
                                    {customTokenOut.symbol}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => form.setValue("tokenOut", "")}
                                className="text-black md:text-xl text-xs font-bold tilt"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Input
                                {...form.register("tokenOut")}
                                placeholder="0x..."
                                className="h-12 bg-transparent !focus:none !outline-0 !border-none md:text-xl text-base !font-bold !font-orbitron !text-black"
                                data-testid="input-token-out-custom"
                              // disabled={
                              //   tokenInMode === "custom" &&
                              //   !getTokenInfo(selectedTokenIn) &&
                              //   isAddress(selectedTokenIn)
                              // }
                              />
                            </div>
                          )}
                          <Button
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
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-[75%] w-[60%]">
                {(() => {
                  const value = form.watch("minAmountOut") || "";

                  const inputLength = value.replace(/\D/g, "").length;

                  const defaultFontSize =
                    window.innerWidth >= 1024
                      ? 48
                      : window.innerWidth >= 768
                        ? 40
                        : 32;

                  const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 6;
                  const SHRINK_RATE = 2;

                  const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                  const dynamicFontSize = Math.max(
                    10,
                    defaultFontSize - excessDigits * SHRINK_RATE
                  );
                  return (
                    <input
                      id="minAmountOut"
                      {...form.register("minAmountOut")}
                      placeholder="0.0"
                      type="text"
                      className="!text-white py-2 text-end w-full leading-7 outline-none border-none bg-transparent rigamesh !placeholder-white transition-all duration-200 ease-in-out"
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
            <div className="text-right text-white font-bold text-sm relative roboto truncate">
              {form.formState.errors.minAmountOut && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.minAmountOut.message}
                </p>
              )}
            </div>
            <div className="md:mt-8 mt-8">
              {/* Limit Price */}
              <div className="font-orbitron relative flex gap-2 items-center">
                <input
                  id="limitPrice"
                  {...form.register("limitPrice")}
                  placeholder="Limit Price"
                  type="text"
                  className="!border !border-[#FF9900] rigamesh md:h-[54px] h-12 flex gap-2 items-center !bg-transparent bgs rounded-lg w-full px-4 outline-none text-white/opacity-70 md:text-xl text-sm font-normal leading-tight tracking-wide"
                  data-testid="input-limit-price"
                />
                {marketPrice && tokenInInfo && tokenOutInfo && (
                  <button
                    onClick={() => setQuoteReversed((prev) => !prev)}
                    className="w-[54px] md:h-[54px] h-12 shrink-0 flex items-center justify-center rounded-lg !border !border-[#FF9900]"
                  >
                    <svg
                      width={38}
                      height={38}
                      viewBox="0 0 38 38"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M18.0574 30.8637C17.6264 31.3581 16.8763 31.4094 16.3819 30.9785L7.13591 22.9179C6.76272 22.5925 6.63068 22.0697 6.80437 21.6061C6.97806 21.1425 7.42123 20.8353 7.91634 20.8353L30.083 20.8353C30.7388 20.8353 31.2705 21.367 31.2705 22.0228C31.2705 22.6786 30.7388 23.2103 30.083 23.2103L11.0855 23.2103L17.9426 29.1883C18.437 29.6192 18.4884 30.3694 18.0574 30.8637Z"
                        fill="#FF9900"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M19.9419 7.13644C20.3728 6.64196 21.123 6.59066 21.6173 7.02165L30.8633 15.0822C31.2365 15.4076 31.3687 15.9304 31.195 16.394C31.0212 16.8576 30.5781 17.1648 30.083 17.1648L7.91628 17.1648C7.26047 17.1648 6.72878 16.6331 6.72878 15.9773C6.72878 15.3215 7.26047 14.7898 7.91628 14.7898L26.9137 14.7898L20.0567 8.81176C19.5623 8.38078 19.5109 7.63076 19.9419 7.13644Z"
                        fill="#FF9900"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex justify-between gap-4 items-center flex-wrap">
                <div className="mt-1 md:text-lg text-xs text-muted-foreground flex items-center justify-left">
                  <span className="text-white font-orbitron">
                    {marketPrice && tokenInInfo && tokenOutInfo ? (
                      quoteReversed ? (
                        <>
                          Market: <span className="rigamesh">1</span>{" "}
                          {tokenOutInfo.symbol} ≈{" "}
                          <span className="rigamesh">
                            {(1 / parseFloat(marketPrice)).toFixed(8)}
                          </span>{" "}
                          {tokenInInfo.symbol}
                        </>
                      ) : (
                        <>
                          Market: <span className="rigamesh">1</span>{" "}
                          {tokenInInfo.symbol} ≈{" "}
                          <span className="rigamesh">{marketPrice}</span>{" "}
                          {tokenOutInfo.symbol}
                        </>
                      )
                    ) : (
                      "Price per token (decimal value)"
                    )}
                  </span>

                  {/* <span className="text-white font-orbitron">
                    {marketPrice && tokenInInfo && tokenOutInfo
                      ? quoteReversed
                        ? `Market: 1 ${tokenOutInfo.symbol} ≈ ${(
                            1 / parseFloat(marketPrice)
                          ).toFixed(8)} ${tokenInInfo.symbol}`
                        : `Market: 1 ${tokenInInfo.symbol} ≈ ${marketPrice} ${tokenOutInfo.symbol}`
                      : "Price per token (decimal value)"}
                  </span> */}
                  {/* {marketPrice && tokenInInfo && tokenOutInfo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => setQuoteReversed((prev) => !prev)}
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                  )} */}
                </div>
                {form.formState.errors.limitPrice && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.limitPrice.message}
                  </p>
                )}
                {limitPriceError && (
                  <p className="mt-1 text-sm text-destructive">
                    {limitPriceError}
                  </p>
                )}
              </div>
              {/* Limit Price Ends Here */}
              <div className="mt-6 flex lg:gap-6 gap-2 lg:flex-nowrap flex-wrap md:justify-between font-orbitron md:px-2">
                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent("market")}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  Market
                </button>

                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent(15)}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  15%
                </button>

                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent(25)}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  25%
                </button>

                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent(50)}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  50%
                </button>

                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent(75)}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  75%
                </button>

                <button
                  type="button"
                  onClick={() => applyLimitPriceByPercent(100)}
                  className="md:px-5 px-2 md:py-2 py-1.5 rounded-full bg-[#FFE6C0] md:text-xs text-[9px] font-extrabold text-black"
                >
                  100%
                </button>
              </div>

              <div className="px-3">
                <hr className="my-5 border border-white border-opacity-30" />
              </div>
              <div className="flex justify-between gap-2 items-center mt-4 px-4">
                <div className="flex gap-2 items-center">
                  Expiry{" "}
                  <span title="Expired">
                    <Info size={18} className="text-[#FF9900] mt-1" />
                  </span>
                </div>
                {/* Deadline */}
                <div onClick={handleClick} className="inline-block">
                  <input
                    id="deadline"
                    {...rest}
                    ref={mergedRef}
                    type="datetime-local"
                    className="cursor bg-[#604824] md:w-[210px] w-[180px] text-right rounded-[4.83px] h-[43px] text-white px-2 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
                    placeholder="Deadline"
                    data-testid="input-deadline"
                    min={minDeadline}
                    max={maxDeadline}
                  />
                </div>
              </div>
            </div>
          </div>
          {form.formState.errors.tokenOut && (
            <div className="pb-10">
              <p className="mt-1 text-sm text-destructive text-white">
                {form.formState.errors.tokenOut.message}
              </p>
            </div>
          )}

          {/* Deadline */}
          {/* <div className="mt-6 relative px-[54px] h-[54px] flex gap-2 items-center bg-search !w-full">
            <input
              id="deadline"
              {...form.register("deadline")}
              type="datetime-local"
              className="bg-transparent text-right rounded-[4.83px] h-[43px] text-white w-full px-5 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
              placeholder="Deadline"
              data-testid="input-deadline"
              min={minDeadline}
              max={maxDeadline}
            />
          </div> */}
          {form.formState.errors.deadline && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.deadline.message}
            </p>
          )}

          {/* Action Buttons */}
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
          <div className="flex flex-col gap-8 lg:pt-2 md:pt-[250px] pt-[200px] md:pb-20 pb-10">
            <button
              type="button"
              onClick={handleApproveTokens}
              disabled={isApproving || isCreating || !!tradeError} // || !!minValueError
              className="gtw relative md:w-[360px] w-[270px] md:h-[68px] h-12 bg-[#FF9900] md:rounded-[10px] rounded-md mx-auto button-trans mt-8 h- flex justify-center text-center items-center transition-all lg:text-[28px] text-xl font-extrabold"
              data-testid="button-approve-tokens"
            >
              <div className="w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[#FF9900] md:rounded-[10px] rounded-md md:h-[68px] h-12"></div>
              {/* <img
                className="absolute swap-button"
                src={Swapbutton}
                alt="Swap"
              /> */}
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Tokens"
              )}
            </button>
            <button
              type="submit"
              disabled={
                isApproving || isCreating || !!tradeError || !!limitPriceError // || !!minValueError
              }
              className="gtw relative md:w-[360px] w-[270px] md:h-[68px] h-12 bg-[#FF9900] md:rounded-[10px] rounded-md mx-auto button-trans mt-4 h- flex justify-center text-center items-center transition-all lg:text-[28px] text-xl font-extrabold"
              data-testid="button-create-order"
            >
              <div className="w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[#FF9900] md:rounded-[10px] rounded-md md:h-[68px] h-12"></div>
              {/* <img
                className="absolute swap-button"
                src={Swapbutton}
                alt="Swap"
              /> */}
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Order"
              )}
            </button>
          </div>
          <div className="md:pt-4 pt-2 font-extrabold">
            {form.formState.errors.tokenIn && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.tokenIn.message}
              </p>
            )}
          </div>
          {/*  */}
          <div
            className={`${partialFillEnabled ? "w-[240px]" : "w-[240px]"
              } absolute 2xl:right-[3vw] xl:right-[2vw] md:right-[32vw] flex flex-col lefts11 2xl:top-[25%] xl:top-[30%] md:top-[40%] mdlg top-[44%] bg-[#FF9900] rounded-lg font-orbitron shadow-md border borer-white`}
          >
            <div className="text-black p-4">
              <div className="flex gap-2 justify-center items-center">
                <p className="font-orbitron text-[15px] font-extrabold">
                  Partial Fill :
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
                <div className="h-full w-full bg-white flex gap-2 flex-wrap justify-center items-center pt-3">
                  <button
                    type="button"
                    onClick={() => setFillMode(1)}
                    className={`${fillMode === 1 ? "bg-[#FF9900]" : "bg-[#F4AC3F]"
                      } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                  >
                    Split 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillMode(2)}
                    className={`${fillMode === 2 ? "bg-[#FF9900]" : "bg-[#F4AC3F]"
                      } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                  >
                    Split 5
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillMode(3)}
                    className={`${fillMode === 3 ? "bg-[#FF9900]" : "bg-[#F4AC3F]"
                      } text-black text-sm font-medium px-4 py-1 rounded-full hover:opacity-90 transition`}
                  >
                    Split 10
                  </button>
                </div>
                <div className="text-[15px] text-center font-medium text-black pt-5 pb-2 bg-white rounded-b-lg">
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
        </form>
      </div>
    </>
  );
}
