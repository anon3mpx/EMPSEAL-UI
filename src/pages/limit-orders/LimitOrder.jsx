import { useState, useCallback } from "react";
import { CreateOrderForm } from "./CreateOrderForm";
import { OrderList } from "./OrderList";
import { useAccount } from "wagmi";
import { toast } from "../../utils/toastHelper";
import { Helmet } from "react-helmet";

const ToastContent = ({ message }) => (
  <div className="space-y-1">
    <p>{message.message}</p>
    {message.txHash && (
      <code className="block text-xs font-mono mt-1">
        Tx: {message.txHash.slice(0, 10)}...{message.txHash.slice(-8)}
      </code>
    )}
  </div>
);
export default function LimitOrder({ slippage, onOpenSlippage = () => {} }) {
  const { address, isConnected } = useAccount();

  const [newOrderCounter, setNewOrderCounter] = useState(0);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState(null);
  const handleStatusMessage = useCallback((message) => {
    switch (message.type) {
      case "success":
        toast.success(<ToastContent message={message} />);
        break;
      case "error":
        toast.error(<ToastContent message={message} />);
        break;
      case "info":
        toast.info(<ToastContent message={message} />);
        break;
      case "warning":
        toast.warn(<ToastContent message={message} />);
        break;
      default:
        toast(<ToastContent message={message} />);
    }
  }, []);

  const handleOrderCreated = (details) => {
    window.dispatchEvent(
      new CustomEvent("orderCreated", { detail: details })
    );
    setNewOrderCounter((c) => c + 1);
    setLastCreatedOrderId(details.orderId);
  };

  return (
    // lg:pb-16 pb-[20rem]
    <div className="w-full pt-2 pb-2 text-white  ">
      <Helmet>
        <title>EMPX | Limit Orders - Advanced Crypto Order Management</title>
        <meta
          name="description"
          content="Set automated limit orders on EMPX DeFi platform. Buy and sell cryptocurrencies at your target prices with advanced order management, stop-loss, and take-profit features."
        />
        <meta
          name="keywords"
          content="EMPX, DeFi, decentralized finance, crypto trading, multi-chain bridge, DEX aggregator, limit orders, Web3, blockchain, cryptocurrency, on-chain trading"
        />
      </Helmet>
      <div className="space-y-8">
        {isConnected && address ? (
          <>
            <CreateOrderForm
              onStatusMessage={handleStatusMessage}
              onOrderCreated={handleOrderCreated}
              slippage={slippage}
              onOpenSlippage={onOpenSlippage}
            />
            <OrderList
              userAddress={address}
              onStatusMessage={handleStatusMessage}
              newOrderCounter={newOrderCounter}
              lastCreatedOrderId={lastCreatedOrderId}
            />
          </>
        ) : (
          <div className=" border-4 bg-black border-[#FF8A00] bg-card px-6 py-10 text-center md:max-w-[812px] mx-auto w-full">
            <h2 className="mb-2 text-lg font-semibold">
              Welcome to Limit Orders
            </h2>
            <p className="text-sm text-muted-foreground">
              Please connect your wallet to start creating and managing limit
              orders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
