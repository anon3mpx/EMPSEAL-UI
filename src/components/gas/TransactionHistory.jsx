import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetUserHistory } from "../../hooks/useGasBridgeAPI";
import { ExternalLink, Trash2, ChevronUp, ChevronDown } from "lucide-react";

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
      currentHistory.filter((tx) => tx.deposit.hash !== hash)
    );
  };

  return (
    <div className="text-white w-full sctable pb-10">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <button className="font-orbitron px-6 py-2 bg-[#FF9900] text-black md:w-[250px] h-[70px] md:text-base text-sm font-extrabold border border-[#FF9900] rounded-t-[10px] font-orbitron transition-all duration-200">
          Transaction History
        </button>

        {/* <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#FF9900] hover:text-[#FF9900]/80 transition-all"
        >
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button> */}
      </div>
      <div className="clip-bg1 w-full rounded-tr-2xl rounded-b-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        <>
          {/* <div className="flex items-center gap-4 w-full md:flex-nowrap flex-wrap">
            <div className="flex items-center bg-[#3A2E1F] rounded-xl px-4 w-full h-[65px] roboto">
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-transparent placeholder-neutral-500 outline-none text-white text-base font-medium"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-neutral-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
                />
              </svg>
            </div>
            <div className="flex md:max-w-[300px] w-full gap-2 items-center">
              <button className="h-[65px] md:w-[160px] w-full px-2 rounded-xl border border-[#FF9900] text-[#FF9900] text-base font-medium font-orbitron hover:bg-[#FF99001a] transition">
                Add Chain
              </button>
              <button className="h-[65px] md:w-[160px] w-full px-2 rounded-xl bg-[#FF9900] text-black font-orbitron text-base font-medium hover:opacity-90 transition">
                Explorer
              </button>
            </div>
          </div> */}
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
                <div className="max-h-96 overflow-y-auto roboto">
                  <div className="min-w-full space-y-2">
                    <div className="md:grid hidden grid-cols-6 text-sm font-semibold text-white px-6 py-3 text-center">
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
                        className="grid md:grid-cols-6 md:gap-4 gap-2 md:items-center md:text-center border border-[#FF9900] rounded-xl px-6 py-5 text-sm text-gray-300 hover:bg-[#FF9900]/10 transition"
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
                              6
                            )}...${tx.deposit.hash.slice(-4)}`}
                            <ExternalLink size={14} className="ml-2" />
                          </a>
                        </div>
                        <div>
                          {tx.deposit.seen
                            ? new Date(
                                tx.deposit.seen * 1000
                              ).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div>{tx.deposit.status}</div>
                        <div>{tx.deposit.value}</div>
                        <div>{tx.txs?.[0]?.chain || "N/A"}</div>
                        <div className="text-right">
                          <button
                            onClick={() => handleRemoveTx(tx.deposit.hash)}
                            className="text-white hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                // <div className="max-h-96 overflow-y-auto roboto">
                //   <div className="overflow-x-auto">
                //     <table className="min-w-full divide-y divide-white">
                //       <thead className="w-full">
                //         <tr>
                //           <th
                //             scope="col"
                //             className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6"
                //           >
                //             Deposit Hash
                //           </th>
                //           <th
                //             scope="col"
                //             className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                //           >
                //             Date
                //           </th>
                //           <th
                //             scope="col"
                //             className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                //           >
                //             Status
                //           </th>
                //           <th
                //             scope="col"
                //             className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                //           >
                //             Value
                //           </th>
                //           <th
                //             scope="col"
                //             className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                //           >
                //             Destination
                //           </th>
                //           <th
                //             scope="col"
                //             className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                //           >
                //             <span className="sr-only">Remove</span>
                //           </th>
                //         </tr>
                //       </thead>
                //       <tbody className="divide-y divide-white">
                //         {history.map((tx) => {
                //           return (
                //             <tr
                //               key={tx.deposit.hash}
                //               className="border border-[#FF9900] rounded-l-2xl md:px-6 md:py-6 px-4 py-4 hover:bg-[#FF9900]/10 transition"
                //             >
                //               <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 rounded-l-2xl">
                //                 <a
                //                   href={`https://etherscan.io/tx/${tx.deposit.hash}`}
                //                   target="_blank"
                //                   rel="noopener noreferrer"
                //                   className="flex items-center hover:text-indigo-400"
                //                 >
                //                   {`${tx.deposit.hash.slice(
                //                     0,
                //                     6
                //                   )}...${tx.deposit.hash.slice(-4)}`}
                //                   <ExternalLink size={14} className="ml-2" />
                //                 </a>
                //               </td>
                //               <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                //                 {tx.deposit.seen
                //                   ? new Date(
                //                       tx.deposit.seen * 1000
                //                     ).toLocaleDateString()
                //                   : "N/A"}
                //               </td>
                //               <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                //                 {tx.deposit.status}
                //               </td>
                //               <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                //                 {tx.deposit.value}
                //               </td>
                //               <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                //                 {tx.txs?.[0]?.chain || "N/A"}
                //               </td>
                //               <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                //                 <button
                //                   onClick={() =>
                //                     handleRemoveTx(tx.deposit.hash)
                //                   }
                //                   className="text-white hover:text-red-500"
                //                 >
                //                   <Trash2 size={16} />
                //                 </button>
                //               </td>
                //             </tr>
                //           );
                //         })}
                //       </tbody>
                //     </table>
                //   </div>
                // </div>
              )}
            </>
          )}
        </>
      </div>
    </div>
  );
};

export default TransactionHistory;
