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
    optimism:
      "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fcoin-images.coingecko.com%2Fcoins%2Fimages%2F25244%2Flarge%2FToken.png%3F1774456081&w=128&q=75", // local import
    "cronos mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK7JCGpwklwB4QMz4g7NoNTd1Epuyi48zgS91loU1-b2RHCK5W",
    base: Base, // local import
    monad:
      "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fmxy95kpjer9bgo8k4jr366qx7qyj&w=64&q=75",
    hyperevm:
      "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fcre8xcjrtfqah7f2sjx8whz68izg&w=64&q=75",
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
                      if (onSelectChain) {
                        onSelectChain(c.id);
                      } else {
                        switchChain({ chainId: c.id });
                      }
                      setShowChainPopup(false);
                    }}
                    className={`group relative mt-2 flex items-center px-2 gap-1 cursor-pointer hover:bg-[#FF8A00]/5 text-white py-2 w-full transition-all hoverclip ${
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
