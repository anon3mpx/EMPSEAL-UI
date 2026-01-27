import { useState } from "react";
import dummyImage from "../../../assets/images/emp-logo.png";
import Eth from "../../../assets/icons/eth.svg";
import Pulse from "../../../assets/icons/pls.svg";
import Sonic from "../../../assets/icons/sonic.png";
import Arbitrum from "../../../assets/icons/arbitrum.svg";
import Ethereum from "../../../assets/icons/eth.svg";
import BNB from "../../../assets/icons/binance.svg";
import Avalanche from "../../../assets/icons/avalanche.svg";
import Polygon from "../../../assets/icons/polygon.svg";
import OP from "../../../assets/icons/op.svg";
import Base from "../../../assets/icons/base.svg";

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
    ethereum: Eth,
    ethereumpow: Eth,
    pulse: Pulse,
    pulsechain: Pulse,
    sonic: Sonic,
    "bnb smart chain": BNB, // local import
    "arbitrum one": Arbitrum, // local import
    avalanche: Avalanche, // local import
    polygon: Polygon, // local import
    "op mainnet": OP, // local import
    "cronos mainnet":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK7JCGpwklwB4QMz4g7NoNTd1Epuyi48zgS91loU1-b2RHCK5W",
    base: Base, // local import
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
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
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
              // console.log("Chain:", {
              //   id: c.id,
              //   name: c.name,
              //   icon: c.icon,
              //   image:c.image,
              //   logo:c.logo,
              //   logoURI:c.logoURI,
              //   iconType: typeof c.icon,
              // });
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
                  className={`group relative mt-4 flex items-center px-1 gap-2 cursor-pointer rounded-lg py-3 w-full transition-all roboto hoverclip ${isActive ? "" : ""
                    // sc1
                    }`}
                >
                  <div className="w-[33px] h-[33px] flex justify-center items-center shrink-0">
                    <img
                      src={chainIcon}
                      alt={c.name}
                      className="w-full flex shrink-0 rounded-full"
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
                    className={`font-orbitron text-2xl text-center px-3 ${isActive ? "text-[#fff]" : "text-[#fff]"
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
