import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { X, Trash2, ExternalLink, ChevronDown } from "lucide-react";
import type { Order } from "./schema";
import { getTokenInfo } from "./tokens";
import { OrderStrategy } from "./schema";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { formatUnits } from "viem";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
const TEST_PROGRESS = true;

const CONTRACT_ADDRESS = "0x80C12068B84d26c5359653Ba5527746bb999b8c6";

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
      : undefined
  );
  // const { data: orderProgressData } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi: LIMIT_ORDER_ABI,
  //   functionName: "getOrderProgress",
  //   args: [BigInt(order.id)],
  // });
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

  const formatAmount = (amount: string, decimals: number = 18) => {
    try {
      return parseFloat(formatUnits(BigInt(amount), decimals)).toFixed(8);
    } catch {
      return amount;
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://otter.pulsechain.com/tx/${txHash}`;
  };

  const formatExpiryDate = (deadline: string) => {
    const deadlineDate = new Date(parseInt(deadline) * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    return deadlineDate.toLocaleString(undefined, options);
  };

  const [expanded, setExpanded] = useState(false);

  const statusColorClass =
    {
      active: "bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]",
      fulfilled: "bg-green-600/20 text-green-400 border border-green-400",
      expired: "bg-red-600/20 text-red-400 border border-red-400",
      cancelled: "bg-gray-600/20 text-gray-300 border border-gray-500",
    }[order.status] || "bg-gray-600/20 text-gray-300 border border-gray-500";
  //

  // Helper of progress bar
  const progressPercent = orderProgress
    ? Number(orderProgress.percentComplete)
    : 0;

  const isStarted = orderProgress && Number(orderProgress.fills) > 0;
  const isCompleted = progressPercent === 100;

  return (
    <div
      data-testid={`card-order-${order.id}`}
      className="border border-[#FF9900] rounded-lg p-4 bg-black hover:bg-[#FF9900]/10 transition text-white w-full"
    >
      {/* Header Row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div
            data-testid={`badge-order-id-${order.id}`}
            className="text-base font-bold"
          >
            Order #{order.id}
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColorClass}`}
          >
            {order.strategy === OrderStrategy.BUY ? "Buy Order" : "Sell Order"}
          </div>
        </div>
        {/* Bottom Buttons */}
        <div className="flex justify-end gap-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex justify-center items-center ${statusColorClass}`}
          >
            {/* {order.status.toUpperCase()} */}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
          {/* Right Section */}
          <button
            className={`w-[32px] h-[32px] rounded-full border-2 flex justify-center items-center ${
              expanded ? "border-[#FF9900]" : "border-[#4a3a1a] bg-[#402806]"
            }`}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={`text-[#FF9900] transition-transform ${
                expanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-6 pt-5 border-t border-[#D4D4D4]/60 grid md:grid-cols-4 gap-6 text-sm justify-between">
          {/* Token Info */}
          <div className="space-y-2">
            <div>
              <span className="text-[#FF9900]">Token In: </span>
              <span
                className="rigamesh"
                data-testid={`text-token-in-${order.id}`}
              >
                {truncateAddress(order.tokenIn)}
              </span>
            </div>
            <div>
              <span className="text-[#FF9900]">Token Out: </span>
              <span
                className="rigamesh"
                data-testid={`text-token-out-${order.id}`}
              >
                {truncateAddress(order.tokenOut)}
              </span>
            </div>
            <div>
              <span className="text-[#FF9900]">Amount In: </span>
              <span
                className="rigamesh"
                data-testid={`text-amount-in-${order.id}`}
              >
                {formatAmount(order.amountIn, tokenInInfo?.decimals)}
              </span>
            </div>
            <div>
              <span className="text-[#FF9900]">Min Out: </span>
              <span
                className="rigamesh"
                data-testid={`text-min-out-${order.id}`}
              >
                {formatAmount(order.minAmountOut, tokenOutInfo?.decimals)}
              </span>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="space-y-2">
            <div>
              <span className="text-[#FF9900]">Limit Price: </span>
              <span className="rigamesh" data-testid={`text-price-${order.id}`}>
                {formatAmount(order.limitPrice)}
              </span>
            </div>
            <div>
              <span className="text-[#FF9900]">Expiry Date: </span>
              <span
                className="rigamesh"
                data-testid={`text-deadline-${order.id}`}
              >
                {formatExpiryDate(order.deadline)}
              </span>
            </div>

            {/* Creation Tx - Hidden as per request
            <div>
              <span className="text-[#FF9900]">Creation Tx: </span>
              {order.txHash ? (
                <a
                  href={getExplorerUrl(order.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  {truncateAddress(order.txHash)}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              ) : (
                "N/A"
              )}
            </div>
            */}

            {/* Partial Fills Tracking */}
            {/*             {order.allowPartialFill && (
              <div>
                <span className="text-[#FF9900]">Fills Completed: </span>
                <span>
                  {orderProgress ? `${orderProgress.fills}/${orderProgress.maxFills}` : "Loading..."}
                </span>
              </div>
            )} */}

            {/* Execution Tx */}
            <div>
              <span className="text-[#FF9900]">Execution Tx: </span>
              {fillTxHashes.length > 0 ? (
                <div className="flex flex-col ml-1">
                  {fillTxHashes.map((txHash, index) => (
                    <a
                      key={index}
                      href={getExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline rigamesh"
                    >
                      {truncateAddress(txHash)}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ))}
                </div>
              ) : (
                <span className="rigamesh">
                  {order.status === "active" || order.status === "none"
                    ? "Awaiting execution..."
                    : "N/A"}
                </span>
              )}
            </div>
          </div>
          {/* Partial Fill */}
          <div>
            {orderProgress && (
              <div className="w-full">
                <div className="w-full h-[14px] rounded-full bg-[#2a2a2a] overflow-hidden">
                  <div
                    className={`h-[14px] transition-all duration-500 w-full ${
                      isStarted ? "bg-[#14FF23]" : "bg-[#214D24]"
                    }`}
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* {(order.allowPartialFill ||
              (orderProgress && orderProgress.maxFills > 1)) && (
              <>
                {orderProgress && (
                  <Badge variant="outline" className="text-xs">
                    {orderProgress.fills}/{orderProgress.maxFills} (
                    {orderProgress.percentComplete}%)
                  </Badge>
                )}
              </>
            )} */}
          </div>
          <div className="ml-auto">
            {order.status === "active" || order.status === "none" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(order.id)}
                disabled={isCancelling || order.id === "unknown"}
                className="hover:bg-[#402806] rounded-full"
                data-testid={`button-cancel-${order.id}`}
              >
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(order.id)}
                className="hover:bg-[#402806] rounded-full"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
    // <div
    //   className="flex flex-col gap-4 rounded-lg transition-colors hover-elevate sm:flex-row sm:items-center sm:justify-between"
    //   data-testid={`card-order-${order.id}`}
    // >
    //   <div className="flex-1 space-y-3">
    //     <div className="flex items-center gap-2">
    //       <Badge
    //         variant="outline"
    //         className="font-mono"
    //         data-testid={`badge-order-id-${order.id}`}
    //       >
    //         Order #{order.id}
    //       </Badge>
    //       <Badge variant="secondary" className="text-xs">
    //         {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
    //       </Badge>
    //       <Badge variant="secondary" className="text-xs">
    //         {order.strategy === OrderStrategy.BUY ? "Buy Order" : "Sell Order"}
    //       </Badge>
    //       {order.allowPartialFill && (
    //         <>
    //           <Badge variant="secondary" className="text-xs">
    //             Partial Fill
    //           </Badge>
    //           {orderProgress && (
    //             <Badge variant="outline" className="text-xs">
    //               Fills: {orderProgress.fills}/{orderProgress.maxFills} (
    //               {orderProgress.percentComplete}%)
    //             </Badge>
    //           )}
    //         </>
    //       )}
    //     </div>

    //     <div className="grid gap-2 text-sm sm:grid-cols-2">
    //       <div>
    //         <span className="text-muted-foreground">Token In:</span>
    //         <code
    //           className="ml-2 font-mono text-foreground"
    //           data-testid={`text-token-in-${order.id}`}
    //         >
    //           {truncateAddress(order.tokenIn)}
    //         </code>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Token Out:</span>
    //         <code
    //           className="ml-2 font-mono text-foreground"
    //           data-testid={`text-token-out-${order.id}`}
    //         >
    //           {truncateAddress(order.tokenOut)}
    //         </code>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Amount In:</span>
    //         <span
    //           className="ml-2 font-medium"
    //           data-testid={`text-amount-in-${order.id}`}
    //         >
    //           {formatAmount(order.amountIn, tokenInInfo?.decimals)}
    //         </span>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Min Out:</span>
    //         <span
    //           className="ml-2 font-medium"
    //           data-testid={`text-min-out-${order.id}`}
    //         >
    //           {formatAmount(order.minAmountOut, tokenOutInfo?.decimals)}
    //         </span>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Limit Price:</span>
    //         <span
    //           className="ml-2 font-medium"
    //           data-testid={`text-price-${order.id}`}
    //         >
    //           {formatAmount(order.limitPrice)}
    //         </span>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Expiry Date:</span>
    //         <span
    //           className="ml-2 text-xs"
    //           data-testid={`text-deadline-${order.id}`}
    //         >
    //           {formatExpiryDate(order.deadline)}
    //         </span>
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Creation Tx:</span>
    //         {order.txHash ? (
    //           <a
    //             href={getExplorerUrl(order.txHash)}
    //             target="_blank"
    //             rel="noopener noreferrer"
    //             className="ml-2 inline-flex items-center font-mono text-primary underline-offset-4 hover:underline"
    //           >
    //             {truncateAddress(order.txHash)}
    //             <ExternalLink className="ml-1 h-3 w-3" />
    //           </a>
    //         ) : (
    //           <span className="ml-2 text-muted-foreground">N/A</span>
    //         )}
    //       </div>
    //       <div>
    //         <span className="text-muted-foreground">Execution Tx:</span>
    //         {fillTxHashes.length > 0 ? (
    //           <div className="ml-2 flex flex-col gap-1">
    //             {fillTxHashes.map((txHash, index) => (
    //               <a
    //                 key={index}
    //                 href={getExplorerUrl(txHash)}
    //                 target="_blank"
    //                 rel="noopener noreferrer"
    //                 className="inline-flex items-center font-mono text-primary underline-offset-4 hover:underline"
    //               >
    //                 {truncateAddress(txHash)}
    //                 <ExternalLink className="ml-1 h-3 w-3" />
    //               </a>
    //             ))}
    //           </div>
    //         ) : (
    //           <span className="ml-2 text-muted-foreground">
    //             {order.status === "active" || order.status === "none"
    //               ? "Awaiting execution..."
    //               : "N/A"}
    //           </span>
    //         )}
    //       </div>
    //     </div>
    //   </div>

    //   {order.status === "active" || order.status === "none" ? (
    //     <Button
    //       variant="destructive"
    //       size="sm"
    //       onClick={() => onCancel(order.id)}
    //       disabled={isCancelling || order.id === "unknown"}
    //       className="w-full sm:w-auto"
    //       data-testid={`button-cancel-${order.id}`}
    //     >
    //       <X className="mr-1 h-4 w-4" />
    //       Cancel
    //     </Button>
    //   ) : (
    //     <Button
    //       variant="ghost"
    //       size="sm"
    //       onClick={() => onRemove(order.id)}
    //       className="w-full sm:w-auto"
    //     >
    //       <Trash2 className="mr-1 h-4 w-4" />
    //       Remove
    //     </Button>
    //   )}
    // </div>
  );
}
