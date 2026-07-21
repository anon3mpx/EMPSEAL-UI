import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "../../components/ui/button";
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
import type { OrderGroup } from "./schema";
import { GroupType } from "./schema";
import { CONTRACT_ADDRESS } from "./create-order-form/constants";

const LOCAL_STORAGE_ORDERS_KEY_PREFIX = "limit-orders-";

const loadOrdersFromLocalStorage = (userAddress: string): Order[] => {
  try {
    const storedOrders = localStorage.getItem(
      `${LOCAL_STORAGE_ORDERS_KEY_PREFIX}${userAddress}`,
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
      JSON.stringify(orders),
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
    null,
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const { data: writeContractHash, writeContract } = useWriteContract();
  const lastHandledTxHash = useRef<string | null>(null);

  //
  const [sortBy, setSortBy] = useState<"id" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const handleSort = (column: "id" | "status") => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  //

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
        const statusMap: Record<number, string> = {
          0: "active",
          1: "active", // PartiallyFilled
          2: "fulfilled",
          3: "cancelled",
          4: "expired",
          5: "pending",
        };
        const orderType = Number(order.orderType);
        const strategy =
          orderType === 0 ? OrderStrategy.SELL : OrderStrategy.BUY;

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
          status: statusMap[Number(order.status)] || "unknown",
          tokenOutDecimals: tokenOutInfo?.decimals || 18,
          groupId: order.groupId?.toString(),
          groupRole: order.groupRole,
          fundsDeposited: order.fundsDeposited,
          orderType,
          strategy,
        };
      })
    : [];

  useEffect(() => {
    if (newOrderCounter > 0 && isPulseChain) {
      const syncNewOrder = async () => {
        await refetchActiveOrderIds();
        await refetchActiveOrders();
      };
      syncNewOrder();
    }
  }, [
    newOrderCounter,
    refetchActiveOrderIds,
    refetchActiveOrders,
    isPulseChain,
  ]);

  useEffect(() => {
    if (activeOrders && isPulseChain) {
      const mergedOrdersMap = new Map<string, Order>(
        allOrders.map((o) => [o.id, o]),
      );

      // Handle shell order created when orderId was not immediately available
      const shellOrder = mergedOrdersMap.get("unknown");
      if (shellOrder) {
        const newActiveOrder = activeOrders.find(
          (ao) => !allOrders.some((o) => o.id === ao.id),
        );

        if (newActiveOrder) {
          const completeOrder = {
            ...newActiveOrder,
            txHash: shellOrder.txHash,
            strategy: shellOrder.strategy,
            fillMode: 0,
            maxSplits: 0,
            fillCount: 0,
            groupId: "0",
            groupRole: GroupType.None,
            fundsDeposited: false,
          };
          mergedOrdersMap.set(newActiveOrder.id, completeOrder);
          mergedOrdersMap.delete("unknown");
        }
      }

      // Merge fresh data from contract into existing orders
      activeOrders.forEach((activeOrder) => {
        const existingOrder = (mergedOrdersMap.get(activeOrder.id) ||
          {}) as any;

        let newStatus = activeOrder.status;
        if (
          existingOrder.status === "cancelled" &&
          activeOrder.status === "active"
        ) {
          newStatus = "cancelled";
        }

        mergedOrdersMap.set(activeOrder.id, {
          fillMode: 0,
          maxSplits: 0,
          fillCount: 0,
          strategy:
            activeOrder.orderType === 0 ? OrderStrategy.SELL : OrderStrategy.BUY,
          ...existingOrder,
          ...activeOrder,
          status: newStatus,
          groupId: activeOrder.groupId,
          groupRole: activeOrder.groupRole,
          fundsDeposited: activeOrder.fundsDeposited,
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
    await refetchActiveOrderIds();
    const result = await refetchActiveOrders();
    if (result.isSuccess || result.status === "success") {
      onStatusMessage({
        type: "success",
        message: `Fetched ${
          (result.data as any[])?.length ?? 0
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
        order.id === orderId ? { ...order, status: newStatus } : order,
      ),
    );
  };

  const handleRemoveOrder = (orderId: string) => {
    setAllOrders((prevOrders) =>
      prevOrders.filter((order) => order.id !== orderId),
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
              : order,
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
          groupId: "0",
          groupRole: GroupType.None,
          fundsDeposited: false,
        };
        return [...prevOrders, newOrderShell];
      });
    },
    [userAddress],
  );

  useEffect(() => {
    const handleOrderCreated = (event: Event) => {
      const details = (event as CustomEvent).detail;
      if (details.orderId && details.txHash && details.strategy) {
        addClientDataToOrder(details);
      }
    };
    window.addEventListener("orderCreated", handleOrderCreated);
    return () => {
      window.removeEventListener("orderCreated", handleOrderCreated);
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

  const filteredOrders = allOrders
    .filter((order) => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Active") return order.status === "active";
      if (filterStatus === "Fulfilled") return order.status === "fulfilled";
      if (filterStatus === "Expired") return order.status === "expired";
      if (filterStatus === "Cancelled") return order.status === "cancelled";
      if (filterStatus === "Inactive") return order.status === "inactive";
      return false;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;

      let valueA: any = a[sortBy];
      let valueB: any = b[sortBy];

      if (sortBy === "id") {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const SortArrow = ({ column }: { column: "id" | "status" }) => {
    if (sortBy !== column) return <span className="ml-1 opacity-70">↕</span>;
    return (
      <span className="ml-1 text-[#FF8A00]">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    // sctable
    <div className="text-white lg:max-w-[1200px] md:max-w-[1200px] mx-auto w-full pt-5">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-5 w-full">
        <div className=" md:text-4xl text-2xl font-extrabold text-[#FF8A00]">
          Your Orders
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] border border-[#FF8A00] bg-black text-white">
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
            className="border border-[#FF8A00]"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isLoading && isPulseChain ? "animate-spin" : ""
              }`}
            />
            {isLoading && isPulseChain ? "Fetching..." : "Refresh"}
          </Button>
        </div>
      </div>
      <div className="clip-bg1 w-full md:rounded-tr-2xl md:rounded-0 rounded-2xl rounded-b-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        {!isPulseChain ? (
          <div className="flex flex-col items-center justify-center  border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Incorrect Network
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The limit order system is only available on PulseChain. Please
              switch your network to continue.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center  border border-dashed border-border bg-muted/20 p-8 text-center">
            <RefreshCw className="mb-3 h-12 w-12 animate-spin text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Loading orders...
            </p>
          </div>
        ) : allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center  border border-dashed border-border bg-muted/20 p-8 text-center">
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
            <div className="md:grid hidden lg:grid-cols-8 grid-cols-8 gap-8 items-center w-full">
              <div
                onClick={() => handleSort("id")}
                className="font-semibold text-base text-[#FF8A00] cursor-pointer"
              >
                Order ID <SortArrow column="id" />
              </div>
              <div
                onClick={() => handleSort("status")}
                className="font-semibold text-base text-[#FF8A00] cursor-pointer"
              >
                Status <SortArrow column="status" />
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Limit Price
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Token In/Amount
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Token Out/Amount
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Progress
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Date/Time
              </div>
              <div className="font-semibold text-base text-[#FF8A00]">
                Action
              </div>
            </div>
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
