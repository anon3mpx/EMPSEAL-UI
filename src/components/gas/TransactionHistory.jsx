import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetUserHistory } from "../../hooks/useGasBridgeAPI";
import { ExternalLink, Trash2 } from "lucide-react";

const TransactionHistory = () => {
  const { address } = useAccount();
  const {
    data: initialHistory,
    isLoading,
    error,
  } = useGetUserHistory({ address });
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (initialHistory) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  const handleRemoveTx = (hash) => {
    setHistory((currentHistory) =>
      currentHistory.filter((tx) => tx.deposit.hash !== hash),
    );
  };

  return (
    <div className="text-white w-full sctable pb-10">
      <h2 className="font-extrabold text-center text-[#FF9900] md:text-3xl text-lg font-orbitron transition-all duration-200">
        Transaction History
      </h2>
      <div className="mt-6 clip-bg1 w-full rounded-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        <>
          {isOpen && (
            <>
              {!address ? (
                <p className="text-center text-white">
                  Connect your wallet to view your history.
                </p>
              ) : isLoading ? (
                <p className="text-center text-white">Loading history...</p>
              ) : error ? (
                <p className="text-center text-[#FF9900]">
                  Could not fetch transaction history.
                </p>
              ) : history.length === 0 ? (
                <p className="text-center text-white">
                  You have no past bridge transactions.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto font-orbitron">
                  <div className="min-w-full space-y-2">
                    <div className="md:grid hidden grid-cols-6 text-sm font-semibold text-[#FF9900] px-6 py-3 text-center">
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
                        className="grid md:grid-cols-6 md:gap-4 gap-2 md:items-center md:text-center border border-[#FF9900] rounded-xl px-6 py-5 md:text-sm text-xs text-white hover:bg-[#FF9900]/10 transition"
                      >
                        <div className="font-medium text-white">
                          <a
                            href={`https://etherscan.io/tx/${tx.deposit.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-[#FF9900]"
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
                          className="max-w-[110px] md:mx-auto truncate cursor-help"
                          title={tx.deposit.value}
                        >
                          {tx.deposit.value}
                        </div>

                        <div>{tx.txs?.[0]?.chain || "N/A"}</div>
                        <div className="text-right">
                          <button
                            onClick={() => handleRemoveTx(tx.deposit.hash)}
                            className="text-[#FF9900] hover:text-red-500"
                          >
                            <Trash2 size={20} />
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
