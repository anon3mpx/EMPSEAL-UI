import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetUserHistory } from "../../hooks/useGasBridgeAPI";
import { ExternalLink, Trash2 } from "lucide-react";
// const dummyTransactions = [
//   {
//     deposit: {
//       hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
//       seen: Date.now() / 1000 - 300, // 5 min ago (unix seconds like your API)
//       status: "completed",
//       value: "0.5 ETH",
//     },
//     txs: [
//       {
//         chain: "Arbitrum",
//       },
//     ],
//   },
//   {
//     deposit: {
//       hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
//       seen: Date.now() / 1000 - 3600,
//       status: "pending",
//       value: "1.2 ETH",
//     },
//     txs: [
//       {
//         chain: "Optimism",
//       },
//     ],
//   },
//   {
//     deposit: {
//       hash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
//       seen: Date.now() / 1000 - 86400,
//       status: "failed",
//       value: "0.03 ETH",
//     },
//     txs: [
//       {
//         chain: "Base",
//       },
//     ],
//   },
// ];
const TransactionHistory = () => {
  const { address } = useAccount();
  const {
    data: initialHistory,
    isLoading,
    error,
  } = useGetUserHistory({ address });
  // const USE_DUMMY = true;
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (initialHistory) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);
  // useEffect(() => {
  //   if (initialHistory && initialHistory.length > 0) {
  //     setHistory(initialHistory);
  //   } else {
  //     setHistory(dummyTransactions); // fallback for testing
  //   }
  // }, [initialHistory]);

  // useEffect(() => {
  //   if (USE_DUMMY) {
  //     setHistory(dummyTransactions);
  //     return;
  //   }

  //   if (initialHistory) {
  //     setHistory(initialHistory);
  //   }
  // }, [initialHistory]);
  const handleRemoveTx = (hash) => {
    setHistory((currentHistory) =>
      currentHistory.filter((tx) => tx.deposit.hash !== hash),
    );
  };

  return (
    <div className="text-white w-full pb-4">
      <div className="mt-4 clip-bg w-full lg:py-4 lg:px-4 md:px-3 px-2 py-4 space-y-3 max-h-[350px] overflow-y-auto chain_scroll">
        <>
          {isOpen && (
            <>
              {!address ? (
                <p className="text-xs py-8 text-white/20 text-center">
                  Connect your wallet to view your history.
                </p>
              ) : isLoading ? (
                <p className="text-xs py-8 text-white/20 text-center">
                  Loading history...
                </p>
              ) : error ? (
                <p className="text-xs py-8 text-white/20 text-center">
                  Could not fetch transaction history.
                </p>
              ) : history.length === 0 ? (
                <p className="text-xs py-8 text-white/20 text-center">
                  You have no past bridge transactions.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto uppercase">
                  <div className="min-w-full space-y-1">
                    <div className="md:grid hidden grid-cols-6 text-xs font-bold text-white/50 px-1 py-1">
                      <div>Deposit Hash</div>
                      <div>Date</div>
                      <div>Status</div>
                      <div>Value</div>
                      <div>Destination</div>
                      <div className="text-right">Remove</div>
                    </div>
                    {history.map((tx) => (
                      <div
                        key={tx.deposit.hash}
                        className="grid md:grid-cols-6 md:gap-4 gap-2 md:items-center px-1 py-2 text-[11px] text-white hover:bg-[#FF8A00]/5 transition"
                      >
                        <div className="font-medium text-white">
                          <a
                            href={`https://etherscan.io/tx/${tx.deposit.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-[#FF8A00]"
                          >
                            {`${tx.deposit.hash.slice(
                              0,
                              6,
                            )}...${tx.deposit.hash.slice(-4)}`}
                            <ExternalLink size={14} className="ml-2" />
                          </a>
                        </div>
                        <div>
                          {tx.deposit.seen
                            ? new Date(
                                tx.deposit.seen * 1000,
                              ).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div>{tx.deposit.status}</div>
                        <div
                          className="truncate cursor-help"
                          title={tx.deposit.value}
                        >
                          {tx.deposit.value}
                        </div>

                        <div>{tx.txs?.[0]?.chain || "N/A"}</div>
                        <div className="text-right">
                          <button
                            onClick={() => handleRemoveTx(tx.deposit.hash)}
                            className="text-gray-200 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      </div>
    </div>
  );
};

export default TransactionHistory;
