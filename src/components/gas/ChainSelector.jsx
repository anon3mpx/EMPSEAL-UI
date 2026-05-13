import { useState, useEffect, useRef } from "react";
import { useGetChains } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import EL from "../../assets/images/emp-logo.png";
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
      c.symbol?.toLowerCase().includes(searchTerm.toLowerCase()),
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
        className="flex items-center gap-3 cursor-pointer hover:bg-[#FF8A00]/5 uppercase my-3 px-3 py-3"
      >
        <ChainLogo
          chain={chain}
          className="md:w-5 md:h-5 w-4 h-4 rounded-full"
        />
        <span className="text-sm font-semibold">{chain.name}</span>
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
      <div
        ref={modalRef}
        className="relative md:max-w-[550px] w-full py-4 mx-auto clip-bg"
      >
        <div className="flex justify-between gap-2 items-center px-4 pb-2">
          <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
            <img src={EL} alt="EL" className="w-10 object-contain" />
            {title}
          </h2>
          <button onClick={onClose} className="close-btn">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 border-top border-bottom">
          <div className="search-wrapper py-4">
            <svg
              className="search-icon"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search chain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {/* Chains */}
        <div className="px-3">
          <div className="mt-4 max-h-[350px] overflow-y-auto px-2 chain_scroll">
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
    </div>
  );
};

/* ---------------------------------
   Main Selector Component
---------------------------------- */
const ChainSelector = ({ onSwitch, setIsChainModalOpen }) => {
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
    return (
      <div className="text-white md:text-xs text-[10px] uppercase">
        Loading chains...
      </div>
    );

  if (error)
    return (
      <div className="md:text-xs text-[10px] text-white uppercase">
        Error fetching chains.
      </div>
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
    if (length > 10) return "text-[10px] md:text-xs";
    // if (length > 10) return "text-xs md:text-xl";
    return "text-[10px] md:text-xs";
  };

  return (
    <>
      <div className="space-y-4 lg:h-[220px] md:h-[200px] h-[190px] flex flex-col justify-between">
        <button
          onClick={() => {
            setActiveModal("from");
            setIsChainModalOpen(true);
          }}
          className="flex items-center gap-2 shrink-0 transition-opacity duration-150 hover:opacity-60 select_token"
        >
          {fromChain ? (
            <>
              <ChainLogo
                chain={fromChain}
                className="md:w-5 md:h-5 w-4 h-4 rounded-full"
              />
              {/* lg:text-xl text-sm */}
              <span
                className={`text-white font-bold  leading-normal bg-black appearance-none outline-none ${getFontSizeClass(
                  fromChain.name,
                )}`}
              >
                {fromChain.name}
              </span>
            </>
          ) : (
            <span className="text-white font-extrabold  md:text-xs text-[10px] capitalize">
              Select Chain
            </span>
          )}
        </button>
        {/* TO */}
        <button
          onClick={() => {
            setActiveModal("to");
            setIsChainModalOpen(true);
          }}
          className="flex items-center gap-2 shrink-0 transition-opacity duration-150 hover:opacity-60 select_token"
        >
          {toChain ? (
            <>
              <ChainLogo
                chain={toChain}
                className="md:w-5 md:h-5 w-4 h-4 rounded-full"
              />
              <span
                className={`text-white font-bold  leading-normal bg-black appearance-none outline-none ${getFontSizeClass(
                  toChain.name,
                )}`}
              >
                {toChain.name}
              </span>
            </>
          ) : (
            <span className="text-white font-extrabold  md:text-xs text-[10px] capitalize">
              Select Chain
            </span>
          )}
        </button>
      </div>

      {/* FROM MODAL */}
      <ChainModal
        isOpen={activeModal === "from"}
        onClose={() => {
          setActiveModal(null);
          setIsChainModalOpen(false);
        }}
        chains={formattedChains}
        selectedChainId={fromChainId}
        onSelectChain={setFromChain}
        title="Select Source Chain"
      />

      {/* TO MODAL */}
      <ChainModal
        isOpen={activeModal === "to"}
        onClose={() => {
          setActiveModal(null);
          setIsChainModalOpen(false);
        }}
        chains={formattedChains.filter((c) => c.chain !== fromChainId)}
        selectedChainId={toChainId}
        onSelectChain={setToChain}
        title="Select Destination Chain"
      />
    </>
  );
};

export default ChainSelector;
