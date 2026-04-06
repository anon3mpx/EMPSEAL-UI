import { useState } from "react";
import dummyImage from "../../../assets/images/emp-logo.png";
import Eth from "../../../assets/icons/eth.svg";
import Pulse from "../../../assets/icons/pls.svg";
import Sonic from "../../../assets/icons/sonic.png";
import Arbitrum from "../../../assets/icons/arbitrum.svg";
import Ethereum from "../../../assets/icons/eth.svg";
import BSC from "../../../assets/icons/binance.svg";
import Avalanche from "../../../assets/icons/avalanche.svg";
import Polygon from "../../../assets/icons/polygon.svg";
import OP from "../../../assets/icons/op.svg";
import Base from "../../../assets/icons/base.svg";
import EL from "../../../assets/images/emp-logo.png";
import Berachain from "../../../assets/icons/berachain.svg";

const ChainPopup = ({
  setShowChainPopup,
  availableChains,
  chain,
  switchChain,
  onSelectChain,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChains = availableChains.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const chainIcons = {
    ethereum: Eth,
    ethereumpow: Eth,
    pulse: Pulse,
    pulsechain: Pulse,
    sonic: Sonic,
    bsc: BSC, // local import
    arbitrum: Arbitrum, // local import
    avalanche: Avalanche, // local import
    polygon: Polygon, // local import
    optimism: "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fcoin-images.coingecko.com%2Fcoins%2Fimages%2F25244%2Flarge%2FToken.png%3F1774456081&w=128&q=75", // local import
    "cronos mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK7JCGpwklwB4QMz4g7NoNTd1Epuyi48zgS91loU1-b2RHCK5W",
    base: Base, // local import
    monad: "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fmxy95kpjer9bgo8k4jr366qx7qyj&w=64&q=75",
    hyperevm: "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fcre8xcjrtfqah7f2sjx8whz68izg&w=64&q=75",
    berachain: Berachain,
    blast:
      "https://cdn.prod.website-files.com/65a6baa1a3f8ed336f415cb4/65a6c461965bf28af43b80bc_Logo%20Yellow%20on%20Transparent%20Background.png",
    "manta pacific mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPaO9GeImBmVNTXZVGHaNUhp1WKKObzjDKDg&s",
    zetachain:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDYhJxwXa_YkqJGPOLRh64V0J8BZkYEHlZOA&s",
    "zksync era":
      "https://s2.coinmarketcap.com/static/img/coins/200x200/24091.png",
    "sei network":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6fwxNLN1-so5tXQr4z_Z-VcgryIoKU2iaFw&s",
    "polygon zkevm":
      "https://www.alchemy.com/dapps/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Falchemy-website%2Fimage%2Fupload%2Fv1694675395%2Fdapp-store%2Fdapp-logos%2FPolygon%2520zkEVM.png&w=640&q=75",
    moonriver: "https://cryptologos.cc/logos/moonriver-movr-logo.png",
    fantom: "https://s2.coinmarketcap.com/static/img/coins/200x200/3513.png",
    aurora:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDrtG7a1CUnAO9IZwRPWThw71z_uLm1nyjyw&s",
    gnosis: "https://cryptologos.cc/logos/gnosis-gno-gno-logo.png",
    "linea mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpHUmXshY3mPDmQmpf-VMFK_i9JxdG_FEFeg&s",
    scroll:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSESM97ra0eogVU9F-jgvHWyUcFFN6ZEh9SQ&s",
    fuse: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlWRds0-tcHOYrR8jafkXU8U5Q0MFvo56Asw&s",
    moonbeam:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTekV-fnTPaXukurGta7NgI0gWy6z4-kj0hrg&s",
    celo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRADqqjgCRSQG2l648A0-x4vWeKph203JqS4w&s",
    "boba network":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTH1xnrUkBwf1Xgfsb-zcuzc0qbq4ADIdWkww&s",
    mantle:
      "https://static1.tokenterminal.com//mantle/logo.png?logo_hash=eee8c4258e118b4c7d96ac52a6f83cc9b5ea8232",
    telos: "https://s2.coinmarketcap.com/static/img/coins/200x200/4660.png",
    "kava evm":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQC931Eoyh14rn1dPlVQiMbcLLn7o7g6UtZ7w&s",
    "arbitrum nova":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCsXde41ET2SnLR9qJlY3YduFS0r5BnXR1jg&s",
    tron: "https://s2.coinmarketcap.com/static/img/coins/200x200/1958.png",
    metis:
      "https://s3.coinmarketcap.com/static-gravity/image/6cbb40029f714c00ab3103055cb4ed44.jpeg",
    bahamut:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT63y2NYI8NM_NvlrJr7BSszLAVYEBb786FIg&s",
    "mode mainnet":
      "https://s2.coinmarketcap.com/static/img/coins/200x200/31016.png",
    "rootstock mainnet": "https://icons.llamao.fi/icons/chains/rsz_rsk.jpg",
    merlin:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0Xu_YMl9FlDCmW-gvl67pGW3fo0qxjdE61g&s",
    "zklink nova":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlHmpeXv7eaK5agMtNG357V4QLPvd0APew6Q&s",
    "taiko mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDFbe84aaBvGR_nv04FGC0XHg0pM9NhHplBQ&s",
    fraxtal: "https://docs.frax.com/images/protocol/FRAX.png",
    "gravity alpha mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIKmPOe5bVW147dDpEkRGpmnceagyTOr0c-Q&s",
    morph:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTovaGDebI_0rH6JiRXIhwUnUVRV1NmyyJWHA&s",
  };

  return (
    <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div className="md:max-w-[618px] w-full rounded-3xl relative py-6 md:px-8 px-4 mx-auto clip-bg">
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
          <h2 className="mt-4 md:text-lg capitalize text-base font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
            <img src={EL} alt="EL" className="w-10 object-contain" />
            Select Chain
          </h2>

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
              // md:max-w-[490px]
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
                    if (onSelectChain) {
                      onSelectChain(c.id);
                    } else {
                      switchChain({ chainId: c.id });
                    }
                    setShowChainPopup(false);
                  }}
                  className={`group relative mt-2 flex items-center px-2 gap-2 cursor-pointer rounded-lg text-[#FFD484] hover:text-white py-3 w-full transition-all roboto hoverclip ${isActive ? "" : ""
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
                    className={`font-orbitron text-base font-semibold text-center px-2 ${isActive ? "" : ""
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
