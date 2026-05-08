import { useState } from "react";
import dummyImage from "../../../../assets/images/emp-logo.png";
import Base from "../../../../assets/icons/base.svg";
import Pulse from "../../../../assets/icons/pls.svg";
import Arbitrum from "../../../../assets/icons/arbitrum.svg";
import Polygon from "../../../../assets/icons/polygon.svg";
import OP from "../../../../assets/icons/op.svg";
import BNB from "../../../../assets/icons/binance.svg";
import Avalanche from "../../../../assets/icons/avalanche.svg";
import EL from "../../../../assets/images/emp-logo.png";

const ChainPopup = ({
  setShowChainPopup,
  availableChains,
  chain,
  switchChain,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChains = availableChains.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const chainIcons = {
    base: Base,
    pulse: Pulse,
    pulsechain: Pulse,
    "arbitrum one": Arbitrum,
    arbitrum: Arbitrum,
    polygon: Polygon,
    "op mainnet": OP,
    "bnb smart chain": BNB,
    avalanche: Avalanche,
  };

  return (
    <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div className="md:max-w-[550px] w-full relative py-4 mx-auto clip-bg">
          <div className="flex justify-between gap-2 items-center px-4 pb-2">
            <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
              <img src={EL} alt="EL" className="w-10 object-contain" />
              Select Chain
            </h2>
            <button
              onClick={() => setShowChainPopup(false)}
              className="close-btn"
            >
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
                placeholder="Search token or paste address..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Chain cards */}
          <div className="px-3">
            <div className="md:mt-3 mt-3 w-full overflow-y-auto h-[250px] chain_scroll md:px-2 px-2">
              {filteredChains.map((c) => {
                const isActive = chain?.id === c.id;
                const chainKey = c.name.toLowerCase();
                const chainIcon = chainIcons[chainKey] || dummyImage;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      switchChain({ chainId: c.id });
                      setShowChainPopup(false);
                    }}
                    className={`group relative mt-2 flex items-center px-2 gap-1 cursor-pointer  hover:bg-[#FF8A00]/5 text-white py-2 w-full transition-all hoverclip ${
                      isActive ? "" : ""
                      // sc1
                    }`}
                  >
                    <div className="w-[16px] h-[16px] flex justify-center items-center shrink-0">
                      <img
                        src={chainIcon}
                        alt={c.name}
                        className="w-full flex shrink-0 rounded-full"
                        onError={(e) => (e.currentTarget.src = dummyImage)}
                      />
                    </div>
                    <span
                      className={`text-sm font-semibold text-center px-2 uppercase ${
                        isActive ? "" : ""
                      }`}
                    >
                      {c.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChainPopup;
