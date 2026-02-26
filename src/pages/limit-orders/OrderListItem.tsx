import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { Order } from "./schema";
// import { getTokenInfo } from "./tokens";
import tokens from "../../config/tokens/pulsechain.json";
import { OrderStrategy } from "./schema";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { formatUnits } from "viem";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
import { TokenLogo } from "../../components/TokenLogo.tsx";
import { Badge } from "../../components/ui/badge";

const CONTRACT_ADDRESS = "0xF4856ce8BE6E992819167D55C82a1Fae09Ddd9E2";

export type PulseToken = {
  name: string;
  ticker: string;
  address: string;
  decimal: string;
  image?: string;
};
const tokenMap: Record<string, PulseToken> = Object.fromEntries(
  (tokens as PulseToken[]).map((t) => [t.address.toLowerCase(), t]),
);

/**
 * Get token metadata from address
 */
export const getTokenInfo = (address?: string | null) => {
  if (!address) return null;

  const token = tokenMap[address.toLowerCase()];
  if (!token) return null;

  return {
    symbol: token.ticker,
    decimals: Number(token.decimal),
    name: token.name,
    logo: token.image,
  };
};
//
interface OrderListItemProps {
  order: Order;
  onCancel: (orderId: string) => void;
  isCancelling: boolean;
  userAddress: string;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onRemove: (orderId: string) => void;
  tokenOutDecimals: number;
}

export function OrderListItem({
  order,
  onCancel,
  isCancelling,
  userAddress,
  onStatusChange,
  onRemove,
  tokenOutDecimals,
}: OrderListItemProps) {
  const [fillTxHashes, setFillTxHashes] = useState<string[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const tokenInInfo = getTokenInfo(order.tokenIn);
  const tokenOutInfo = getTokenInfo(order.tokenOut);

  const validOrderId =
    order.id && !isNaN(Number(order.id)) && Number(order.id) >= 0;

  const { data: orderProgressData } = useReadContract(
    validOrderId
      ? {
          address: CONTRACT_ADDRESS,
          abi: LIMIT_ORDER_ABI,
          functionName: "getOrderProgress",
          args: [BigInt(order.id)],
        }
      : undefined,
  );
  const orderProgress = orderProgressData
    ? {
        filled: (orderProgressData as any)[0].toString(),
        total: (orderProgressData as any)[1].toString(),
        fills: (orderProgressData as any)[2],
        maxFills: (orderProgressData as any)[3],
        percentComplete: (orderProgressData as any)[4],
      }
    : null;

  useEffect(() => {
    if (
      orderProgress &&
      orderProgress.percentComplete === 100 &&
      order.status !== "fulfilled"
    ) {
      onStatusChange(order.id, "fulfilled");
    }
  }, [orderProgress, order.id, order.status, onStatusChange]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    eventName: "OrderPartiallyFilled",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.orderId?.toString() === order.id) {
          setFillTxHashes((prev) => [
            ...new Set([...prev, log.transactionHash]),
          ]);
        }
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    eventName: "OrderFullyFilled",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.orderId?.toString() === order.id) {
          setFillTxHashes((prev) => [
            ...new Set([...prev, log.transactionHash]),
          ]);
        }
      });
    },
  });

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format amount with K/M/B suffixes
  const formatLargeAmount = (amount: string, decimals: number = 18) => {
    try {
      const value = parseFloat(formatUnits(BigInt(amount), decimals));

      if (value >= 1_000_000_000) {
        return (value / 1_000_000_000).toFixed(2) + "B";
      }
      if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(2) + "M";
      }
      if (value >= 1_000) {
        return (value / 1_000).toFixed(2) + "K";
      }
      return value.toFixed(2);
    } catch {
      return amount;
    }
  };

  // Format price with 2 decimals
  const formatPrice = (amount: string, decimals: number = 18) => {
    try {
      const value = parseFloat(formatUnits(BigInt(amount), decimals));
      return value.toFixed(2);
    } catch {
      return amount;
    }
  };

  // Get full amount for hover
  const getFullAmount = (amount: string, decimals: number = 18) => {
    try {
      return formatUnits(BigInt(amount), decimals);
    } catch {
      return amount;
    }
  };

  const formatExpiryDate = (deadline: string) => {
    const deadlineDate = new Date(parseInt(deadline) * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return deadlineDate.toLocaleString(undefined, options);
  };

  const statusColorClass =
    {
      active: "bg-a text-white border border-[#2CC90D]",
      fulfilled: "bg-f white border border-[#0069FF]",
      expired: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
      cancelled: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
    }[order.status] || "bg-gray-600/20 text-gray-300 border border-gray-500";

  const progressPercent = orderProgress
    ? Number(orderProgress.percentComplete)
    : 0;

  const isStarted = orderProgress && Number(orderProgress.fills) > 0;

  // Get strategy display name
  const getStrategyName = () => {
    switch (order.strategy) {
      case OrderStrategy.SELL:
        return "Sell High";
      case OrderStrategy.BUY:
        return "Buy Low";
      case OrderStrategy.BRACKET:
        return "Bracket";
      default:
        return "Order";
    }
  };
  const isFulfilled = order.status === "fulfilled" || progressPercent >= 100;

  return (
    <div
      data-testid={`card-order-${order.id}`}
      className="text-white w-full font-orbitron"
    >
      <div className="md:mt-3 md:pt-3 md:border-t md:border-b-0 border-b border-[#D4D4D4]/60 grid lg:grid-cols-8 md:grid-cols-4 grid-cols-2 whitespace-nowrap md:gap-4 gap-1 items-center w-full text-sm justify-between">
        {/* Order ID */}
        <div
          data-testid={`badge-order-id-${order.id}`}
          className="text-base font-bold relative"
          onMouseEnter={() => setHoveredCell("id")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <span className="md:hidden">{getStrategyName()}</span> # {order.id}
          {hoveredCell === "id" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Full Order ID: {getStrategyName()} {order.id}
            </div>
          )}
          {/* {order.groupId && order.groupId !== "0" && (
            <Badge
              variant="outline"
              className="ml-2 border-[#FF9900] text-[#FF9900] text-xs"
            >
              {order.fundsDeposited ? "Active Bracket" : "Pending Bracket Leg"}
            </Badge>
          )} */}
          {order.groupRole !== undefined && order.groupRole !== 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {["None", "Entry", "StopLoss", "TakeProfit"][order.groupRole]}
            </Badge>
          )}
        </div>

        {/* Strategy Type */}
        {/* <div className="text-sm">
          {getStrategyName()}
        </div> */}

        {/* Status */}
        <div className="flex gap-3">
          <div
            className={`md:px-3 px-1.5 md:py-2 py-1.5 rounded text-xs font-bold flex justify-center items-center ${statusColorClass}`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
        </div>

        {/* Limit Price */}
        <div
          className="relative cursor-help"
          onMouseEnter={() => setHoveredCell("price")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <div className="flex gap-2 items-center">
            <span
              className="font-medium"
              data-testid={`text-price-${order.id}`}
            >
              {formatPrice(order.limitPrice)}
            </span>
            {order.strategy === OrderStrategy.SELL ? (
              <ArrowUp className="text-green-500" />
            ) : (
              <ArrowDown className="text-red-500" />
            )}
          </div>
          {hoveredCell === "price" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Full Price: {getFullAmount(order.limitPrice)}
            </div>
          )}
        </div>

        {/* Token In */}
        <div>
          <div className="flex items-center gap-2">
            <TokenLogo
              chainId={369}
              tokenAddress={order.tokenIn}
              symbol={tokenInInfo?.symbol}
              logoURI={tokenInInfo?.logo}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs text-gray-400">
              {tokenInInfo?.symbol || truncateAddress(order.tokenIn)}
            </span>
          </div>
          <div
            className="relative cursor-help mt-1"
            onMouseEnter={() => setHoveredCell("amountIn")}
            onMouseLeave={() => setHoveredCell(null)}
          >
            <span
              data-testid={`text-amount-in-${order.id}`}
              className="text-sm font-semibold"
            >
              {formatLargeAmount(order.amountIn, tokenInInfo?.decimals)}
            </span>
            {hoveredCell === "amountIn" && (
              <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
                Full Amount:{" "}
                {getFullAmount(order.amountIn, tokenInInfo?.decimals)}
              </div>
            )}
          </div>
        </div>

        {/* Token Out */}
        <div>
          <div className="flex items-center gap-2">
            <TokenLogo
              chainId={369}
              tokenAddress={order.tokenOut}
              symbol={tokenOutInfo?.symbol}
              logoURI={tokenOutInfo?.logo}
              className="w-5 h-5 rounded-full"
            />

            <span className="text-xs text-gray-400">
              {tokenOutInfo?.symbol || truncateAddress(order.tokenOut)}
            </span>
          </div>
          <div
            className="relative cursor-help mt-1"
            onMouseEnter={() => setHoveredCell("amountOut")}
            onMouseLeave={() => setHoveredCell(null)}
          >
            <span
              data-testid={`text-min-out-${order.id}`}
              className="text-sm font-semibold"
            >
              {formatLargeAmount(order.minAmountOut, tokenOutInfo?.decimals)}
            </span>
            {hoveredCell === "amountOut" && (
              <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
                Full Amount:{" "}
                {getFullAmount(order.minAmountOut, tokenOutInfo?.decimals)}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {/* Progress */}
        <div>
          {orderProgress && (
            <div className="w-full">
              <div
                className={`w-full rounded-md bg-[#2a2a2a] overflow-hidden transition-all duration-300 ${
                  isFulfilled ? "h-[12px]" : "h-[24px]"
                }`}
              >
                <div
                  className={`transition-all duration-500 ${
                    isStarted ? "bg-[#14FF23]" : "bg-[#214D24]"
                  } ${isFulfilled ? "h-[12px]" : "h-[24px]"}`}
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Date/Time */}
        <div
          className="relative cursor-help"
          onMouseEnter={() => setHoveredCell("date")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <span
            data-testid={`text-deadline-${order.id}`}
            className="text-sm w-full"
          >
            {formatExpiryDate(order.deadline)}
          </span>
          {hoveredCell === "date" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Expiry:{" "}
              {new Date(parseInt(order.deadline) * 1000).toLocaleString()}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="ml-auto">
          {order.status === "active" || order.status === "none" ? (
            <Button
              size="sm"
              onClick={() => onCancel(order.id)}
              disabled={isCancelling || order.id === "unknown"}
              className="!border-0 hover:bg-[#FF9900]/20"
              data-testid={`button-cancel-${order.id}`}
            >
              <Trash2 className="md:h-10 md:w-10 w-5 h-5 !text-2xl text-[#ff9900]" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onRemove(order.id)}
              className="!border-0 hover:bg-[#FF9900]/20"
            >
              <Trash2 className="md:h-10 md:w-10 w-5 h-5 !text-2xl text-[#ff9900]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
