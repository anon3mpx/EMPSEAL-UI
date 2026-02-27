const RecentTransactions = ({ transactions, clearTransactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="lg:mt-4 mt-4 text-white">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
          <div className="font-orbitron md:text-4xl text-2xl font-extrabold text-[#FF9900]">
            Bridge Transactions
          </div>
        </div>

        <div className="bg_swap_box_chain w-full rounded-2xl px-4 !py-10 text-center">
          <p className="text-white">You have no past Via Bridge transactions.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in flight":
        return "text-yellow-500";
      case "delivered":
        return "text-green-500";
      case "fulfilled":
        return "text-green-500";
      case "active":
        return "text-blue-500";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getProgressFromStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "in flight":
        return "50%";
      case "delivered":
      case "fulfilled":
        return "100%";
      case "active":
        return "30%";
      case "cancelled":
        return "0%";
      default:
        return "0%";
    }
  };

  return (
    <div className="lg:mt-4 mt-4 text-white">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
        <div className="font-orbitron md:text-4xl text-2xl font-extrabold text-[#FF9900]">
          Bridge Transactions
        </div>
        <button
          onClick={clearTransactions}
          className="text-sm text-white hover:text-[#FF9900] font-orbitron"
        >
          Clear recent txs
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg_swap_box_chain w-full rounded-tr-2xl rounded-2xl lg:p-7 overflow-x-auto font-orbitron">
        <div className="max-h-[350px] overflow-y-auto px-2 chain_scroll">
        <table className="w-full text-sm ">
          <thead>
            <tr className="border-b border-[#FF9900]/30">
              {/* <th className="font-semibold text-base text-[#FF9900]">Status</th> */}
              <th className="font-semibold text-base text-[#FF9900]">
                Source Chain
              </th>
              <th className="font-semibold text-base text-[#FF9900]">
                Source Hash
              </th>
              <th className="font-semibold text-base text-[#FF9900]">From</th>
              <th className="font-semibold text-base text-[#FF9900]">
                Destination Chain
              </th>
              <th className="font-semibold text-base text-[#FF9900]">
                Date/Time
              </th>
              <th className="font-semibold text-base text-[#FF9900]">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr
                key={tx.hash || idx}
                className="border-b border-[#FF9900]/10 hover:bg-[#FF9900]/5 transition-all font-orbitron"
              >
                <td className="py-4 px-4">
                  <span
                    className={`${getStatusColor(tx.status)} font-medium font-orbitron text-white`}
                  >
                    {tx.fromChainName || "In Flight"}
                  </span>
                  {/* Progress bar for visual indication */}
                  {/* <div className="w-20 h-1 bg-gray-700 rounded-full mt-1">
                    <div 
                      className="h-full bg-[#FF9900] rounded-full" 
                      style={{ width: tx.progress || getProgressFromStatus(tx.status) }}
                    />
                  </div> */}
                </td>
                <td className="py-4 px-4">
                  <a
                    href={`${tx.explorerUrl || "https://scan.vialabs.io"}/tx/${tx.hash || tx.sourceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] hover:underline  "
                  >
                    {`${(tx.hash || tx.sourceHash || "").slice(0, 6)}...${(tx.hash || tx.sourceHash || "").slice(-8)}`}
                  </a>
                </td>
                <td className="py-4 px-4">
                  <span className="  text-white">
                    {tx.fromAddress
                      ? `${tx.fromAddress.slice(0, 6)}...${tx.fromAddress.slice(-4)}`
                      : tx.from
                        ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                        : "--"}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`${getStatusColor(tx.status)} font-medium font-orbitron text-white`}
                  >
                    {tx.toChainName || "In Flight"}
                  </span>
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-white">
                  {tx.date ? (
                    <span>{tx.date}</span>
                  ) : (
                    <span>
                      {new Date(tx.timestamp || Date.now()).toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <a
                    href={`https://scan.vialabs.io/transaction/${tx.hash || tx.sourceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#FF9900] hover:text-[#FFB84D] transition-colors"
                  >
                    <span>Track</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {transactions.map((tx, idx) => (
          <div
            key={tx.hash || idx}
            className="border border-[#FF9900] bg-black rounded-xl px-5 py-5 hover:bg-[#FF9900]/10 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              {/* <span className={`${getStatusColor(tx.status)} text-white font-medium px-3 py-1 rounded-full bg-[#402806] border border-[#FF9900]`}>
                {tx.status || 'In Flight'}
              </span> */}
              <a
                href={`https://scan.vialabs.io/transaction/${tx.hash || tx.sourceHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF9900] hover:text-[#FFB84D] text-sm flex items-center gap-1"
              >
                Track
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Source Chain:</span>
                <span className="text-white">{tx.fromChainName || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Source Hash:</span>
                <a
                  href={`${tx.explorerUrl || "https://scan.vialabs.io"}/tx/${tx.hash || tx.sourceHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF9900] hover:underline "
                >
                  {`${(tx.hash || tx.sourceHash || "").slice(0, 6)}...${(tx.hash || tx.sourceHash || "").slice(-4)}`}
                </a>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">From:</span>
                <span className="text-white">
                  {tx.fromAddress
                    ? `${tx.fromAddress.slice(0, 6)}...${tx.fromAddress.slice(-4)}`
                    : tx.from
                      ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                      : "--"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Destination Chain:</span>
                <span className="text-white">{tx.toChainName || "--"}</span>
              </div>

              {tx.destinationHash && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Destination Hash:</span>
                  <a
                    href={`https://scan.vialabs.io/transaction/${tx.destinationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] hover:underline "
                  >
                    {`${tx.destinationHash.slice(0, 6)}...${tx.destinationHash.slice(-4)}`}
                  </a>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-400">Date/Time:</span>
                <span className="text-white">
                  {tx.date ||
                    new Date(tx.timestamp || Date.now()).toLocaleString()}
                </span>
              </div>

              {/* Progress bar for mobile */}
              {/* <div className="mt-2">
                <div className="flex justify-between  mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-[#FF9900]">{tx.progress || getProgressFromStatus(tx.status)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-[#FF9900] rounded-full"
                    style={{ width: tx.progress || getProgressFromStatus(tx.status) }}
                  />
                </div>
              </div> */}
            </div>
          </div>
        ))}
      </div>

      {/* Bridge Transaction Submitted Banner */}
      {transactions.some((tx) => tx.status === "In Flight") && (
        <div className="mt-4 bg_swap_box_chain p-4 w-full font-orbitron rounded-xl">
          <p className="text-lg text-[#FBB025] font-bold mb-2">
            Bridge transaction submitted!
          </p>
          <p className="text-sm text-[#FBB025] mb-2">
            Your tokens will arrive in 2-10 minutes
          </p>
          <a
            href={`https://scan.vialabs.io/transaction/${transactions.find((tx) => tx.status === "In Flight")?.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className=" font-bold text-white hover:underline"
          >
            Track on VIA Scanner →
          </a>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
