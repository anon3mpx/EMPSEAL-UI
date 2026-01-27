const RecentTransactions = ({ transactions, clearTransactions }) => {
  if (transactions.length === 0) return null;

  return (
    <div className="lg:mt-20 mt-10 text-white">
      <div className="flex justify-between items-center">
        <button className="font-orbitron px-6 py-2 bg-[#FF9900] text-black md:w-[260px] h-[70px] md:text-base text-sm font-extrabold border border-[#FF9900] rounded-t-[10px] font-orbitron transition-all duration-200">
          Recent Transactions
        </button>
        <button
          onClick={clearTransactions}
          className="text-sm text-[#FF4C4C] hover:text-red-300 font-orbitron"
        >
          Clear recent txs
        </button>
      </div>

      <div className="clip-bg1 w-full rounded-tr-2xl rounded-b-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        {transactions.map((tx, idx) => (
          <div
            key={tx.hash}
            className="border border-[#FF9900] bg-black rounded-xl px-5 py-5 hover:bg-[#FF9900]/10 transition-all"
          >
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4 md:max-w-[350px]">
                <div className="flex items-center gap-3 bg-[#1b1a17] px-3 py-1 rounded-full">
                  <span className="text-sm text-[#FF9900]">
                    {`${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`}
                  </span>
                </div>

                <a
                  href={`${tx.explorerUrl}/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF9900] hover:underline text-xs"
                >
                  View on Explorer
                </a>
              </div>

              <span className="text-sm text-gray-400 whitespace-nowrap">
                {new Date(tx.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="mt-3 text-sm text-gray-300 flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-[#402806] border border-[#FF9900]">
                From: {tx.fromChainName}
              </span>

              <span className="px-3 py-1 rounded-full bg-[#402806] border border-[#FF9900]">
                To: {tx.toChainName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;

// const RecentTransactions = ({ transactions, clearTransactions }) => {
//   if (transactions.length === 0) {
//     return null;
//   }

//   return (
//     <div className="mt-8">
//       <div className="flex justify-between items-center mb-4">
//         <h3 className="text-lg font-bold text-gray-900 dark:text-white">
//           Recent Transactions
//         </h3>
//         <button
//           onClick={clearTransactions}
//           className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
//         >
//           Clear recent txs
//         </button>
//       </div>
//       <div className="space-y-4">
//         {transactions.map((tx) => (
//           <div
//             key={tx.hash}
//             className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
//           >
//             <div className="flex justify-between items-center">
//               <a
//                 href={`${tx.explorerUrl}/tx/${tx.hash}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
//               >
//                 {`${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`}
//               </a>
//               <span className="text-xs text-gray-500 dark:text-gray-400">
//                 {new Date(tx.timestamp).toLocaleString()}
//               </span>
//             </div>
//             <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
//               {`From ${tx.fromChainName} to ${tx.toChainName}`}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default RecentTransactions;
