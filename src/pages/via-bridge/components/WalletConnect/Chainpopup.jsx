import { useState } from "react";
import dummyImage from "../../../../assets/images/emp-logo.png";
import Base from "../../../../assets/icons/base.svg";
import Pulse from "../../../../assets/icons/pls.svg";
import Arbitrum from "../../../../assets/icons/arbitrum.svg";

const ChainPopup = ({
  setShowChainPopup,
  availableChains,
  chain,
  switchChain,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChains = availableChains.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const chainIcons = {
    base: Base,
    pulse: Pulse,
    pulsechain: Pulse,
    "arbitrum one": Arbitrum,
  };

  return (
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div className="md:max-w-[618px] w-full rounded-3xl relative py-6 md:px-10 px-4 mx-auto clip-bg">
          <svg
            onClick={() => setShowChainPopup(false)}
            className="absolute cursor-pointer md:right-10 right-7 top-14 tilt"
            width={20}
            height={20}
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Title */}
          <h2 className="md:text-2xl capitalize text-lg font-medium text-white roboto text-center tracking-widest md:mt-10 mt-5">
            Select Chain
          </h2>

          {/* Search bar */}
          {/* bg-search */}
          <div className="mt-8 relative px-[10px] h-[54px] w-full flex gap-2 items-center border border-[#FF9900] rounded-xl">
            <input
              type="text"
              placeholder="Search Chain"
              // md:max-w-[490px]
              className="bg-transparent rounded-[4.83px] h-[43px] text-white w-full px-2 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="flex flex-shrink-0 cursor-pointer"
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.8632 19.0535L13.3482 13.5375C10.8947 15.2818 7.51414 14.8552 5.57102 12.556C3.62792 10.257 3.7706 6.85254 5.89925 4.72413C8.02735 2.59479 11.4322 2.45149 13.7317 4.3945C16.0311 6.3375 16.458 9.71849 14.7137 12.1721L20.2287 17.688L18.8642 19.0526L18.8632 19.0535ZM9.99282 4.95765C8.16287 4.95724 6.58411 6.24178 6.21237 8.03356C5.84064 9.82534 6.7781 11.6319 8.45718 12.3596C10.1363 13.0871 12.0955 12.5358 13.1486 11.0392C14.2018 9.54268 14.0594 7.51235 12.8078 6.17743L13.3916 6.75644L12.7335 6.10023L12.7219 6.08865C11.9999 5.36217 11.0171 4.95489 9.99282 4.95765Z"
                fill="#5C5C5C"
              />
            </svg>
          </div>
          {/* Chain cards */}
          <div className="md:mt-6 mt-4 w-full overflow-y-auto h-[250px] chain_scroll md:px-4 px-2">
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
                  className={`group mt-4 relative flex items-center px-1 gap-2 cursor-pointer rounded-lg py-3 w-full transition-all roboto hoverclip ${
                    isActive ? "" : ""
                    // sc1
                  }`}
                >
                  {" "}
                  <div className="w-[33px] h-[33px] flex justify-center items-center shrink-0">
                    <img
                      src={chainIcon}
                      alt={c.name}
                      className="w-full flex shrink-0"
                      onError={(e) => (e.currentTarget.src = dummyImage)}
                    />
                  </div>
                  {/* <div className="w-6 h-6 rounded-full flex justify-center items-center">
                    <img
                      src={c.icon || dummyImage}
                      alt={c.name}
                      onError={(e) => (e.currentTarget.src = dummyImage)}
                      className="w-6 h-6 object-contain"
                    />
                  </div> */}
                  <span
                    className={`font-orbitron text-2xl text-center px-3 ${
                      isActive ? "text-[#fff]" : "text-[#fff]"
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
