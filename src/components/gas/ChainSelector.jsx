// import { useState, useEffect, useRef } from "react";
// import { useGetChains } from "../../hooks/useGasBridgeAPI";
// import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
// import { ChevronDown, Search, ArrowUpDown } from "lucide-react";

// const ChainDropdown = ({
//   chains,
//   selectedChainId,
//   onSelectChain,
//   label,
//   bgColor = "bg-black",
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const dropdownRef = useRef(null);

//   const selectedChain = chains.find((c) => c.chain === selectedChainId);
//   const filteredChains = chains.filter(
//     (c) =>
//       c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleSelect = (chainId) => {
//     onSelectChain(chainId);
//     setIsOpen(false);
//     setSearchTerm("");
//   };

//   const renderChain = (chain, isSelected = false) => {
//     const githubLogoUrl = `https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/${chain.name
//       .toLowerCase()
//       .replace(/\s+/g, "")}.svg`;
//     const defiLlamaUrl = `https://defillama.com/chain-icons/rsz/${chain.name.toLowerCase()}.jpg`;

//     const handleImageError = (e) => {
//       const currentSrc = e.target.src;
//       if (currentSrc === githubLogoUrl) {
//         e.target.src = defiLlamaUrl; // Fallback to DefiLlama if GitHub URL fails
//       } else {
//         e.target.style.display = "none"; // Hide image if all fallbacks fail
//       }
//     };

//     return (
//       <div
//         key={chain.chain}
//         className={`flex items-center space-x-3 ${isSelected ? "" : "p-2"}`}
//       >
//         <img
//           src={chain.logoURI || githubLogoUrl}
//           alt={chain.name}
//           className="md:w-6 md:h-6 w-4 h-4 rounded-full"
//           onError={handleImageError}
//         />
//         <span>{chain.name}</span>
//       </div>
//     );
//   };

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <button
//         onClick={() => setIsOpen(!isOpen)}
//         className={`${bgColor} border border-white rounded-lg md:px-3 px-2 md:py-4 py-2 flex gap-1 items-center transition-all duration-200`}
//       >
//         {(() => {
//           const text = selectedChain
//             ? selectedChain.name || selectedChain
//             : "Select Chain";

//           const length = text.toString().length;

//           const fontSizeClass =
//             length > 11 ? "text-xs" : length > 14 ? "text-sm" : "text-base";

//           return (
//             <span className={`whitespace-nowrap ${fontSizeClass}`}>
//               {selectedChain ? renderChain(selectedChain, true) : text}
//             </span>
//           );
//         })()}

//         <ChevronDown
//           size={20}
//           className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
//         />
//       </button>

//       {isOpen && (
//         <div className="absolute z-10 mt-1 w-full bg-black rounded-lg shadow-lg max-h-60 flex flex-col">
//           <div className="p-2 border-b border-gray-700">
//             <div className="relative">
//               <Search
//                 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Search chain..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full bg-black text-white rounded-md pl-10 pr-4 py-2 focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="overflow-y-auto flex-grow">
//             {filteredChains.map((chain) => (
//               <div
//                 key={chain.chain}
//                 onClick={() => handleSelect(chain.chain)}
//                 className="p-2 hover:bg-[#FF9900]/10 cursor-pointer text-white"
//               >
//                 {renderChain(chain)}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const ChainSelector = ({ onSwitch }) => {
//   const { data: chains, isLoading, error } = useGetChains();
//   const { fromChainId, toChainId, setFromChain, setToChain } =
//     useGasBridgeStore();

//   useEffect(() => {
//     if (onSwitch) {
//       onSwitch(() => {
//         const currentFrom = fromChainId;
//         const currentTo = toChainId;
//         setFromChain(currentTo);
//         setToChain(currentFrom);
//       });
//     }
//   }, [fromChainId, toChainId]);

//   if (isLoading)
//     return <div className="text-center text-gray-400">Loading chains...</div>;
//   if (error)
//     return (
//       <div className="text-center text-red-500">Error fetching chains.</div>
//     );

//   // The API response for chains is missing a logoURI, so I'm adding one for display purposes.
//   // Also, the chain ID is under the `chain` property, not `id`.
//   const formattedChains = chains.map((c) => ({
//     ...c,
//     id: c.chain,
//     logoURI: c.logo,
//   }));

//   return (
//     <div className="space-y-4 md:h-[455px] h-[400px] flex justify-between flex-col">
//       {/* <h2 className="text-xl font-semibold text-white">Select Chains</h2> */}
//       <ChainDropdown
//         chains={formattedChains}
//         selectedChainId={fromChainId}
//         onSelectChain={setFromChain}
//         bgColor="bg-black text-white"
//       />
//       {/* <div className="flex justify-center items-center -my-2">
//         <button
//           onClick={handleSwitch}
//           disabled={!fromChainId && !toChainId}
//           className="z-10 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//           aria-label="Switch from and to chains"
//         >
//           <ArrowUpDown size={18} />
//         </button>
//       </div> */}
//       <ChainDropdown
//         chains={formattedChains.filter((c) => c.chain !== fromChainId)}
//         selectedChainId={toChainId}
//         onSelectChain={setToChain}
//         bgColor="bg-[#FFE6C0] text-black border-black"
//       />
//     </div>
//   );
// };

// export default ChainSelector;

import { useState, useEffect, useRef } from "react";
import { useGetChains } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { Search } from "lucide-react";

/* ---------------------------------
   Chain Logo Component
---------------------------------- */
const ChainLogo = ({ chain, className }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    chain.logoURI,
    `https://icons.llamao.fi/icons/chains/rsz_${chain.shortName}`,
    `https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/128/${chain.symbol?.toLowerCase()}.png`,
  ].filter(Boolean);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    }
  };

  return (
    <img
      src={sources[srcIndex]}
      alt={chain.name}
      className={className}
      onError={handleError}
    />
  );
};

/* ---------------------------------
   Reusable Modal
---------------------------------- */
const ChainModal = ({
  isOpen,
  onClose,
  chains,
  selectedChainId,
  onSelectChain,
  title = "Select Chain",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  if (!isOpen) return null;

  const isTestnet = (chain) => {
    if (chain.testnet) return true;

    const testnetKeywords = [
      "test",
      "goerli",
      "sepolia",
      "mumbai",
      "fuji",
      "chapel",
      "alfajores",
      "dev",
    ];

    return testnetKeywords.some((k) => chain.name?.toLowerCase().includes(k));
  };
  const filteredChains = chains.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainnets = filteredChains.filter((c) => !isTestnet(c));
  const testnets = filteredChains.filter((c) => isTestnet(c));

  const renderChain = (chain) => {
    return (
      <div
        key={chain.chain}
        onClick={() => {
          onSelectChain(chain.chain);
          setSearchTerm("");
          onClose();
        }}
        className="flex items-center gap-3 rounded-lg hoverclip my-3 px-3 py-3 cursor-pointer"
      >
        <ChainLogo chain={chain} className="md:w-6 md:h-6 w-4 h-4 rounded-full" />
        <span className="text-white">{chain.name}</span>
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
      <div
        ref={modalRef}
        className="relative w-full max-w-[650px] rounded-3xl bg-black py-6 md:px-10 md:py-12 px-6 clip-bg"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute md:top-10 top-7 md:right-10 right-7 text-white hover:opacity-80 text-2xl tilt"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="md:text-2xl capitalize text-lg font-medium text-white roboto text-center tracking-widest">
          {title}
        </h2>

        {/* Search */}
        {/* bg-search */}
        <div className="mt-10 relative px-[10px] h-[54px] w-full flex gap-2 items-center border border-[#FF9900] rounded-xl">
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search chain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent rounded-[4.83px] h-[43px] text-white md:max-w-[490px] w-full px-5 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
          />
        </div>

        {/* Chains */}
        <div className="mt-4 max-h-[350px] overflow-y-auto px-2">
          {/* MAINNETS */}
          {mainnets.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                Mainnets
              </p>
              {mainnets.map(renderChain)}
            </>
          )}
          {/* TESTNETS */}
          {testnets.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-6 mb-2">
                Testnets
              </p>
              {testnets.map(renderChain)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------
   Main Selector Component
---------------------------------- */
const ChainSelector = ({ onSwitch }) => {
  const { data: chains, isLoading, error } = useGetChains();
  const { fromChainId, toChainId, setFromChain, setToChain } =
    useGasBridgeStore();

  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    if (onSwitch) {
      onSwitch(() => {
        setFromChain(toChainId);
        setToChain(fromChainId);
      });
    }
  }, [fromChainId, toChainId]);

  if (isLoading)
    return <div className="text-center text-gray-400">Loading chains...</div>;

  if (error)
    return (
      <div className="text-center text-red-500">Error fetching chains.</div>
    );

  /* ---------------------------------
     Format Chains
  ---------------------------------- */
  const formattedChains = chains.map((c) => {
    const shortName =
      c.name
        ?.match(/^\w+/)?.[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") ?? "";

    return {
      ...c,
      id: c.chain,
      logoURI: c.logo,
      shortName,
    };
  });

  const fromChain = formattedChains.find((c) => c.chain === fromChainId);
  const toChain = formattedChains.find((c) => c.chain === toChainId);

  const getFontSizeClass = (text) => {
    const length = text?.toString().length || 0;
    if (length > 11) return "text-xs md:text-lg";
    if (length > 11) return "text-xs md:text-xl";
    return "text-xs md:text-xl";
  };

  return (
    <>
      <div className="space-y-4 lg:h-[350px] h_cs md:h-[420px] h-[280px] flex flex-col justify-between">
        {/* FROM */}
        <button
          onClick={() => setActiveModal("from")}
          className="bg-black border-2 border-white rounded-lg md:px-4 px-2 flex items-center justify-center gap-2 md:h-[70px] h-12 lg:w-[250px] md:w-[220px] w-[130px]"
        >
          {fromChain ? (
            <>
              <ChainLogo chain={fromChain} className="md:w-6 md:h-6 w-4 h-4 rounded-full" />
              <span
                className={`text-white whitespace-nowrap ${getFontSizeClass(
                  fromChain.name
                )}`}
              >
                {fromChain.name}
              </span>
            </>
          ) : (
            <span className="!text-[#FF9900] font-bold font-orbitron lg:text-3xl md:text-base text-sm">
              Select Chain
            </span>
          )}
        </button>

        {/* TO */}
        <button
          onClick={() => setActiveModal("to")}
          className="bg-[#FFE6C0] border-2 border-white rounded-lg md:px-4 px-2 py-4 flex items-center justify-center gap-2 md:h-[70px] h-12 lg:w-[250px] md:w-[220px] w-[130px]"
        >
          {toChain ? (
            <>
              <ChainLogo chain={toChain} className="md:w-6 md:h-6 w-4 h-4 rounded-full" />
              <span
                className={`text-black whitespace-nowrap ${getFontSizeClass(
                  toChain.name
                )}`}
              >
                {toChain.name}
              </span>
            </>
          ) : (
            <span className="!text-black font-bold font-orbitron lg:text-3xl md:text-base text-sm">
              Select Chain
            </span>
          )}
        </button>
      </div>

      {/* FROM MODAL */}
      <ChainModal
        isOpen={activeModal === "from"}
        onClose={() => setActiveModal(null)}
        chains={formattedChains}
        selectedChainId={fromChainId}
        onSelectChain={setFromChain}
        title="Select Source Chain"
      />

      {/* TO MODAL */}
      <ChainModal
        isOpen={activeModal === "to"}
        onClose={() => setActiveModal(null)}
        chains={formattedChains.filter((c) => c.chain !== fromChainId)}
        selectedChainId={toChainId}
        onSelectChain={setToChain}
        title="Select Destination Chain"
      />
    </>
  );
};

export default ChainSelector;
