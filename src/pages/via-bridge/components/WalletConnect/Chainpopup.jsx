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
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div className="md:max-w-[618px] w-full rounded-3xl relative py-6 md:px-10 px-4 mx-auto clip-bg">
          <svg
            onClick={() => setShowChainPopup(false)}
            className="absolute cursor-pointer md:right-10 right-7 top-14 tilt text-white hover:text-[#FF9900]"
            width={20}
            height={20}
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h2 className="mt-5 md:text-lg capitalize text-lg font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
            <img src={EL} alt="EL" className="w-10 object-contain" />
            Select Chain
          </h2>

          {/* Search bar */}
          {/* bg-search */}
          <div className="mt-8 relative px-[10px] h-[54px] w-full flex gap-2 items-center bg-[#382B19] rounded-xl">
            <svg
              className="flex flex-shrink-0 cursor-pointer"
              width={26}
              height={26}
              viewBox="0 0 26 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.9167 20.5833C16.7031 20.5833 20.5833 16.7031 20.5833 11.9167C20.5833 7.1302 16.7031 3.25 11.9167 3.25C7.1302 3.25 3.25 7.1302 3.25 11.9167C3.25 16.7031 7.1302 20.5833 11.9167 20.5833Z"
                stroke="#FF9900"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22.7496 22.7501L18.0371 18.0376"
                stroke="#FF9900"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search Chain"
              className="bg-[#382B19] rounded-lg h-11 text-[#FF9900] w-full px-3 outline-none border-none placeholder:text-[#FF9900] text-sm font-normal roboto leading-tight tracking-wide"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Chain cards */}
          <div className="md:mt-6 mt-4 w-full overflow-y-auto h-[250px] chain_scroll md:px-2 px-2">
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
                  className={`group relative mt-2 flex items-center px-2 gap-2 cursor-pointer rounded-lg text-[#FFD484] hover:text-white py-3 w-full transition-all roboto hoverclip ${
                    isActive ? "" : ""
                    // sc1
                  }`}
                >
                  <div className="w-[23px] h-[23px] flex justify-center items-center shrink-0">
                    <img
                      src={chainIcon}
                      alt={c.name}
                      className="w-full flex shrink-0 rounded-full"
                      onError={(e) => (e.currentTarget.src = dummyImage)}
                    />
                  </div>
                  <span
                    className={`font-orbitron text-base font-semibold text-center px-2 ${
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
  );
};

export default ChainPopup;
