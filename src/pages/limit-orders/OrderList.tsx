import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { RefreshCw, ListOrdered } from "lucide-react";
import { OrderListItem } from "./OrderListItem";
import type { Order, StatusMessage } from "./schema";
import { getTokenInfo } from "./tokens";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { OrderStrategy } from "./schema";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";

const CONTRACT_ADDRESS = "0x80C12068B84d26c5359653Ba5527746bb999b8c6";
const LOCAL_STORAGE_ORDERS_KEY_PREFIX = "limit-orders-";

const loadOrdersFromLocalStorage = (userAddress: string): Order[] => {
  try {
    const storedOrders = localStorage.getItem(
      `${LOCAL_STORAGE_ORDERS_KEY_PREFIX}${userAddress}`
    );
    return storedOrders ? JSON.parse(storedOrders) : [];
  } catch (error) {
    console.error("Failed to load orders from local storage:", error);
    return [];
  }
};

const saveOrdersToLocalStorage = (userAddress: string, orders: Order[]) => {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_ORDERS_KEY_PREFIX}${userAddress}`,
      JSON.stringify(orders)
    );
  } catch (error) {
    console.error("Failed to save orders to local storage:", error);
  }
};

interface OrderListProps {
  userAddress: string;
  onStatusMessage: (message: StatusMessage) => void;
  newOrderCounter: number;
  lastCreatedOrderId?: string | null;
}

export function OrderList({
  userAddress,
  onStatusMessage,
  newOrderCounter,
  lastCreatedOrderId,
}: OrderListProps) {
  const { chainId } = useAccount();
  const isPulseChain = chainId === 369;

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const { data: writeContractHash, writeContract } = useWriteContract();
  const lastHandledTxHash = useRef<string | null>(null);


  useEffect(() => {
    setAllOrders(loadOrdersFromLocalStorage(userAddress));
  }, [userAddress]);

  const { data: activeOrderIds, refetch: refetchActiveOrderIds } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: LIMIT_ORDER_ABI,
      functionName: "getUserActiveOrders",
      args: [userAddress as `0x${string}`],
      query: { enabled: isPulseChain },
    });

  const orderIdsToFetch = useMemo(() => {
    const ids = [...(activeOrderIds || [])];
    if (lastCreatedOrderId) {
      try {
        const bigId = BigInt(lastCreatedOrderId);
        const exists = ids.find((id) => id === bigId);
        if (!exists) {
          ids.push(bigId);
          // Sort descending to keep latest at top if that's the order, or just append
        }
      } catch (e) {
        console.error("Invalid lastCreatedOrderId", lastCreatedOrderId);
      }
    }
    return ids;
  }, [activeOrderIds, lastCreatedOrderId]);

  const {
    data: activeOrdersData,
    isLoading,
    refetch: refetchActiveOrders,
    error,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    functionName: "getOrders",
    args: [orderIdsToFetch],
    query: { enabled: isPulseChain && orderIdsToFetch.length > 0 },
  });

  const activeOrders = activeOrdersData
    ? (activeOrdersData as any[]).map((order: any) => {
      const tokenOutInfo = getTokenInfo(order.tokenOut);
      return {
        id: order.id.toString(),
        user: order.user,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn.toString(),
        minAmountOut: order.minAmountOut.toString(),
        limitPrice: order.limitPrice.toString(),
        deadline: order.deadline.toString(),
        allowPartialFill: order.fillMode > 0 || order.maxSplits > 1,
        filledAmount: order.filledAmount.toString(),
        status: ["active", "fulfilled", "cancelled", "expired"][order.status] || "unknown",
        tokenOutDecimals: tokenOutInfo?.decimals || 18,
      };
    })
    : [];

  useEffect(() => {
    if (newOrderCounter > 0 && isPulseChain) {
      refetchActiveOrderIds();
    }
  }, [newOrderCounter, refetchActiveOrderIds, isPulseChain]);

  useEffect(() => {
    if (activeOrders && isPulseChain) {
      const mergedOrdersMap = new Map<string, Order>(
        allOrders.map((o) => [o.id, o])
      );

      // Handle shell order created when orderId was not immediately available
      const shellOrder = mergedOrdersMap.get("unknown");
      if (shellOrder) {
        const newActiveOrder = activeOrders.find(
          (ao) => !allOrders.some((o) => o.id === ao.id)
        );

        if (newActiveOrder) {
          const completeOrder = {
            ...newActiveOrder,
            txHash: shellOrder.txHash,
            strategy: shellOrder.strategy,
            fillMode: 0,
            maxSplits: 0,
            fillCount: 0,
          };
          mergedOrdersMap.set(newActiveOrder.id, completeOrder);
          mergedOrdersMap.delete("unknown");
        }
      }

      // Merge fresh data from contract into existing orders
      activeOrders.forEach((activeOrder) => {
        const existingOrder = (mergedOrdersMap.get(activeOrder.id) || {}) as any;

        let newStatus = activeOrder.status;
        if (existingOrder.status === 'cancelled' && activeOrder.status === 'active') {
          newStatus = 'cancelled';
        }

        mergedOrdersMap.set(activeOrder.id, {
          fillMode: 0,
          maxSplits: 0,
          fillCount: 0,
          strategy: "GreedyOrderRouter" as OrderStrategy,
          ...existingOrder,
          ...activeOrder,
          status: newStatus,
        });
      });

      // Update status for orders that are no longer active
      mergedOrdersMap.forEach((order, id) => {
        if (
          order.status === "active" &&
          !activeOrders.some((ao) => ao.id === id)
        ) {
          const deadline = parseInt(order.deadline) * 1000;
          const isExpired = deadline < Date.now();
          mergedOrdersMap.set(id, {
            ...order,
            status: isExpired ? "expired" : "inactive",
          });
        }
      });

      const newAllOrders = Array.from(mergedOrdersMap.values());
      if (JSON.stringify(newAllOrders) !== JSON.stringify(allOrders)) {
        setAllOrders(newAllOrders);
      }
    }
  }, [activeOrders, allOrders, isPulseChain]);

  useEffect(() => {
    if (userAddress && allOrders.length > 0) {
      saveOrdersToLocalStorage(userAddress, allOrders);
    }
  }, [allOrders, userAddress]);

  const handleRefresh = async () => {
    if (!isPulseChain) {
      onStatusMessage({
        type: "warning",
        message: "Please switch to PulseChain to refresh orders.",
      });
      return;
    }
    const result = await refetchActiveOrders();
    if (result.isSuccess) {
      onStatusMessage({
        type: "success",
        message: `Fetched ${(result.data as any[])?.length ?? 0
          } active order(s)`,
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: LIMIT_ORDER_ABI,
      functionName: "cancelOrder",
      args: [BigInt(orderId)],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: writeContractHash,
    });

  useEffect(() => {
    if (isConfirming) {
      onStatusMessage({
        type: "info",
        message: "Transaction confirming...",
        txHash: writeContractHash,
      });
    }
    if (isConfirmed && writeContractHash) {
      if (lastHandledTxHash.current === writeContractHash) {
        return;
      }
      lastHandledTxHash.current = writeContractHash;

      onStatusMessage({
        type: "success",
        message: "Transaction successful!",
      });
      if (isPulseChain) refetchActiveOrders();
      if (cancellingOrderId) {
        handleStatusChange(cancellingOrderId, "cancelled");
      }
      setCancellingOrderId(null);
    }
  }, [
    isConfirming,
    isConfirmed,
    isPulseChain,
    onStatusMessage,
    refetchActiveOrders,
    writeContractHash,
    cancellingOrderId,
  ]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setAllOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handleRemoveOrder = (orderId: string) => {
    setAllOrders((prevOrders) =>
      prevOrders.filter((order) => order.id !== orderId)
    );
  };

  const addClientDataToOrder = useCallback(
    (details: { orderId: string; txHash: string; strategy: OrderStrategy }) => {
      setAllOrders((prevOrders) => {
        const orderExists = prevOrders.some((o) => o.id === details.orderId);
        if (orderExists) {
          return prevOrders.map((order) =>
            order.id === details.orderId
              ? { ...order, txHash: details.txHash, strategy: details.strategy }
              : order
          );
        }
        const newOrderShell: Order = {
          id: details.orderId,
          txHash: details.txHash,
          strategy: details.strategy,
          user: userAddress,
          tokenIn: "",
          tokenOut: "",
          amountIn: "0",
          minAmountOut: "0",
          limitPrice: "0",
          deadline: "0",
          status: "none",
          allowPartialFill: false,
          filledAmount: "0",
          tokenOutDecimals: 18,
          fillMode: 0,
          maxSplits: 0,
          fillCount: 0,
        };
        return [...prevOrders, newOrderShell];
      });
    },
    [userAddress]
  );

  useEffect(() => {
    const handleOrderCreated = (event: Event) => {
      const details = (event as CustomEvent).detail;
      if (details.orderId && details.txHash && details.strategy) {
        addClientDataToOrder(details);
      }
    };
    window.addEventListener("gemini:orderCreated", handleOrderCreated);
    return () => {
      window.removeEventListener("gemini:orderCreated", handleOrderCreated);
    };
  }, [addClientDataToOrder]);

  useEffect(() => {
    if (error && isPulseChain) {
      onStatusMessage({
        type: "error",
        message: (error as Error).message,
      });
    }
  }, [error, onStatusMessage, isPulseChain]);

  const filteredOrders = allOrders.filter((order) => {
    if (filterStatus === "All") return true;
    if (filterStatus === "Active") return order.status === "active";
    if (filterStatus === "Fulfilled") return order.status === "fulfilled";
    if (filterStatus === "Expired") return order.status === "expired";
    if (filterStatus === "Cancelled") return order.status === "cancelled";
    if (filterStatus === "Inactive") return order.status === "inactive";
    return false;
  });

  return (
    <div className="text-white w-full sctable md:max-w-[1050px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <button className="font-orbitron px-6 py-2 bg-[#FF9900] text-black md:w-[220px] h-[70px] md:text-base text-sm font-extrabold border border-[#FF9900] rounded-t-[10px] font-orbitron transition-all duration-200">
          Your Orders
        </button>
        <div className="flex gap-2 items-center flex-wrap md:mb-0 mb-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] border border-[#FF9900] bg-black text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-black text-white">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Fulfilled">Fulfilled</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isLoading && isPulseChain}
            data-testid="button-fetch-orders"
            className="border border-[#FF9900]"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading && isPulseChain ? "animate-spin" : ""
                }`}
            />
            {isLoading && isPulseChain ? "Fetching..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="clip-bg1 w-full md:rounded-tr-2xl md:rounded-0 rounded-2xl rounded-b-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        {!isPulseChain ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Incorrect Network
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The limit order system is only available on PulseChain. Please
              switch your network to continue.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <RefreshCw className="mb-3 h-12 w-12 animate-spin text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Loading orders...
            </p>
          </div>
        ) : allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <ListOrdered className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              No Orders Found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your wallet and create some orders!
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-orders">
            {filteredOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onCancel={handleCancelOrder}
                isCancelling={cancellingOrderId === order.id}
                userAddress={userAddress}
                onStatusChange={handleStatusChange}
                onRemove={handleRemoveOrder}
                tokenOutDecimals={order.tokenOutDecimals ?? 18}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
