// NEW
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import ChainPopup from "./Chainpopup";
import dummyImage from "../../../assets/images/emp-logo.png";
import Eth from "../../../assets/icons/eth.svg";
import Pulse from "../../../assets/icons/pls.svg";
import Sonic from "../../../assets/icons/sonic.png";
import Base from "../../../assets/icons/base.svg";
import Arbitrum from "../../../assets/icons/arbitrum.svg";
import BSC from "../../../assets/icons/binance.svg";
import Avalanche from "../../../assets/icons/avalanche.svg";
import Polygon from "../../../assets/icons/polygon.svg";
import OP from "../../../assets/icons/op.svg";
import EL from "../../../assets/images/emp-logo.png";
import Berachain from "../../../assets/icons/berachain.svg";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChains,
} from "wagmi";
import AddressCard from "./AddressCard";
import TermsModal from "../TermsModal";
import {
  useSelectedChainId,
  useSetSelectedChainId,
} from "../../../hooks/ChainContext";
import { SUPPORTED_CHAINS } from "../../../config/chains";
import { useConnectPopup } from "../../../hooks/ConnectPopupContext";

const truncateAddress = (address) =>
  `${address?.slice(0, 6)}...${address?.slice(-4)}`;

const ChainChangeHandler = ({
  chain,
  onChainChange,
  chains,
  switchChain,
  allowUnsupported,
}) => {
  useEffect(() => {
    if (onChainChange) {
      onChainChange(chain?.iconUrl, chain?.name);
    }
  }, [chain, onChainChange]);

  useEffect(() => {
    if (!allowUnsupported && chain?.unsupported && chains?.length > 0) {
      switchChain({ chainId: chains[0].id });
    }
  }, [chain, chains, switchChain, allowUnsupported]);

  return null; // This component doesn't render anything visible
};

export default function WalletConnect({
  onChainChange,
  allowUnsupported = false,
  allowedChainIds,
  onSelectChain,
}) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const availableChains = useChains();
  const { connect, connectors } = useConnect();
  const selectedChainId = useSelectedChainId();
  const setSelectedChainId = useSetSelectedChainId();
  const selectableChains = allowedChainIds?.length
    ? availableChains.filter((chain) => allowedChainIds.includes(chain.id))
    : availableChains;

  const handleSelectChain = (chainId) => {
    setSelectedChainId(chainId);
    onSelectChain?.(chainId);
    if (address) {
      switchChain?.({ chainId });
    }
  };

  const [showPopup, setShowPopup] = useState(false);
  const [showChainPopup, setShowChainPopup] = useState(false);
  const { showConnectPopup, openConnectPopup, closeConnectPopup } =
    useConnectPopup();

  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  // Filter connectors by search term (case-insensitive)
  const filteredConnectors = connectors
    .slice(0, 6) // keep the limit if needed
    .filter((connector) =>
      connector.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  useEffect(() => {
    if (address && !sessionStorage.getItem("walletReloaded")) {
      sessionStorage.setItem("walletReloaded", "true");
      window.location.reload();
    }
  }, [address]);

  const chainIcons = {
    ethereum: Eth,
    ethereumpow: Eth,
    pulse: Pulse,
    pulsechain: Pulse,
    sonic: Sonic,
    berachain: Berachain,
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
    sei: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6fwxNLN1-so5tXQr4z_Z-VcgryIoKU2iaFw&s",
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
    rootstock: "https://icons.llamao.fi/icons/chains/rsz_rsk.jpg",
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
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account;

        // Effects moved inside render prop to correctly access `chain`
        // and avoid infinite loops.

        if (!ready) return null;
        if (!connected) {
          // Find the currently selected chain info for the icon
          const selectedChainInfo = SUPPORTED_CHAINS[selectedChainId];
          const selectedChainName =
            selectedChainInfo?.name?.toLowerCase() || "pulsechain";
          const selectedChainIcon = chainIcons[selectedChainName] || dummyImage;

          return (
            <>
              <button
                className="v1-connect-btn"
                onClick={() => setShowChainPopup(true)}
                type="button"
              >
                <img
                  src={selectedChainIcon}
                  alt={selectedChainInfo?.name || "Chain"}
                  className="md:w-4 md:h-4 w-2 h-3 object-contain "
                  onError={(e) => (e.currentTarget.src = dummyImage)}
                />
              </button>
              <button
                className="v1-connect-btn"
                onClick={() => openConnectPopup()}
                type="button"
              >
                Connect Wallet
              </button>
              {showChainPopup && (
                <ChainPopup
                  setShowChainPopup={setShowChainPopup}
                  availableChains={selectableChains}
                  chain={{ id: selectedChainId, name: selectedChainInfo?.name }}
                  switchChain={switchChain}
                  onSelectChain={handleSelectChain}
                />
              )}
              {showConnectPopup && (
                <div
                  className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4 backdrop-blur-sm"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closeConnectPopup();
                  }}
                >
                  <div className="relative text-white p-4 rounded-2xl md:max-w-[560px] w-full clip-bg">
                    <div className="flex justify-between gap-2 items-center px-4 pb-2">
                      <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
                        <img
                          src={EL}
                          alt="EL"
                          className="w-10 object-contain"
                        />
                        Connect Wallet
                      </h2>
                      <button
                        onClick={() => closeConnectPopup()}
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
                    <p className="text-[10px] tracking-widest text-[#ff8a0066] mb-3 px-4">
                      POPULAR
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-2 px-4">
                      {filteredConnectors.slice(0, 2).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4 px-3 border border-[#FFFFFF20] transition-all hover:bg-[#FF8A00]/5"
                          onClick={() => {
                            connect({ connector });
                            closeConnectPopup();
                          }}
                        >
                          <div className="slippage-btn1 p-2">
                            <img
                              src={
                                connector.name.includes("MetaMask")
                                  ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ymr3UNKopfI0NmUY95Dr-0589vG-91KuAA&s"
                                  : connector.name.includes("WalletConnect")
                                    ? "https://avatars.githubusercontent.com/u/37784886?s=200&v=4"
                                    : connector.name.includes("Coinbase")
                                      ? "https://avatars.githubusercontent.com/u/18060234?s=200&v=4"
                                      : "https://rainbowkit.com/icons/wallet.svg"
                              }
                              alt={connector.name}
                              className="w-6 h-6 object-contain "
                            />
                          </div>

                          <p className="text-[11px] text-white font-bold uppercase">
                            {connector.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] font-bold tracking-[0.25em] text-white/20 mb-2 px-4 pt-4">
                      MORE OPTIONS
                    </p>
                    <div className="flex flex-col gap-2 mt-4 px-2">
                      {filteredConnectors.slice(2, 6).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex items-center gap-4 cursor-pointer py-3 px-3 transition-all hover:bg-[#FF8A00]/5"
                          onClick={() => {
                            connect({ connector });
                            closeConnectPopup();
                          }}
                        >
                          <div className="slippage-btn1 p-1">
                            <img
                              src={
                                connector.name.includes("MetaMask")
                                  ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ymr3UNKopfI0NmUY95Dr-0589vG-91KuAA&s"
                                  : connector.name.includes("WalletConnect")
                                    ? "https://avatars.githubusercontent.com/u/37784886?s=200&v=4"
                                    : connector.name.includes("Coinbase")
                                      ? "https://avatars.githubusercontent.com/u/18060234?s=200&v=4"
                                      : "https://rainbowkit.com/icons/wallet.svg"
                              }
                              alt={connector.name}
                              className="w-4 h-4 object-contain "
                            />
                          </div>

                          <p className="md:text-xs uppercase text-[10px] text-white font-bold">
                            {connector.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* <div className="grid md:grid-cols-2 grid-cols-1 gap-x-2 gap-y-4 mt-2 px-2">
                      {filteredConnectors.slice(0, 6).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex items-center justify-start gap-4 cursor-pointer  md:py-3 py-2 px-3 transition-all hover:bg-[#FF8A00]/5"
                          onClick={() => {
                            connect({ connector });
                            closeConnectPopup();
                          }}
                        >
                          <div className="relative">
                            <div className="slippage-btn1 p-1">
                              <img
                                src={
                                  connector.name.includes("MetaMask")
                                    ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ymr3UNKopfI0NmUY95Dr-0589vG-91KuAA&s"
                                    : // "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
                                      connector.name.includes("WalletConnect")
                                      ? "https://avatars.githubusercontent.com/u/37784886?s=200&v=4"
                                      : connector.name.includes("Coinbase")
                                        ? "https://avatars.githubusercontent.com/u/18060234?s=200&v=4"
                                        : "https://rainbowkit.com/icons/wallet.svg"
                                }
                                alt={connector.name}
                                className="w-4 h-4 relative z-10 flex flex-shrink-0 object-contain "
                              />
                            </div>
                          </div>
                          <p className="md:text-xs uppercase text-[10px] text-white font-bold">
                            {connector.name}
                          </p>
                        </div>
                      ))}
                    </div> */}
                    <div className="bg-[#444444] w-full h-[1px] mb-4 mt-10"></div>
                    <div className="text-white md:text-xs text-xs uppercase mt-4  font-bold text-center">
                      By connecting, you agree to
                      <span
                        onClick={() => {
                          setShowTermsPopup(true);
                          closeConnectPopup();
                        }}
                        className="ml-1 text-[#FF8A00] cursor-pointer hover:underline md:text-xs text-xs font-bold underline"
                      >
                        Terms & Privacy Policy
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {showTermsPopup && (
                <div
                  className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setShowTermsPopup(false);
                  }}
                >
                  <TermsModal onClose={() => setShowTermsPopup(false)} />
                </div>
              )}
            </>
          );
        }
        const isChainOutsideAllowedList =
          allowedChainIds?.length &&
          chain?.id &&
          !allowedChainIds.includes(chain.id);

        if (
          (chain?.unsupported || isChainOutsideAllowedList) &&
          !allowUnsupported
        ) {
          return (
            <>
              <button
                className="v1-connect-btn"
                onClick={() => setShowChainPopup(true)}
                type="button"
              >
                Wrong Network
              </button>
              {showChainPopup && (
                <ChainPopup
                  setShowChainPopup={setShowChainPopup}
                  availableChains={selectableChains}
                  chain={chain}
                  switchChain={switchChain}
                  onSelectChain={handleSelectChain}
                />
              )}
            </>
          );
        }
        return (
          <>
            <ChainChangeHandler
              chain={chain}
              onChainChange={onChainChange}
              chains={selectableChains}
              switchChain={switchChain}
              allowUnsupported={allowUnsupported}
            />
            <button
              className="v1-connect-btn"
              onClick={() => setShowChainPopup(true)}
              type="button"
            >
              {chain ? (
                <>
                  <img
                    src={
                      chainIcons[chain.name.toLowerCase()] ||
                      chain.iconUrl ||
                      dummyImage
                    }
                    alt={chain.name}
                    className="md:w-4 md:h-4 w-2 h-3 object-contain "
                    onError={(e) => (e.currentTarget.src = dummyImage)}
                  />
                </>
              ) : (
                "Select Chain"
              )}
            </button>
            <div className="flex justify-center items-center md:gap-4 gap-2">
              <button
                className="v1-connect-btn md:text-[11px] !text-[8px]"
                onClick={() => setShowPopup(true)}
                type="button"
              >
                {account?.address
                  ? truncateAddress(account.address)
                  : "Connected"}
              </button>
              <button
                className="v1-connect-btn md:text-[11px] !text-[8px]"
                onClick={() => disconnect()}
                type="button"
              >
                Disconnect
              </button>
            </div>

            {/* Address popup */}
            {showPopup && (
              <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
                <AddressCard
                  address={address || ""}
                  onCopy={() => navigator.clipboard.writeText(address || "")}
                  onDisconnect={() => {
                    disconnect();
                    setShowPopup(false);
                  }}
                  onClose={() => setShowPopup(false)}
                />
              </div>
            )}

            {/* Chain popup */}
            {showChainPopup && (
              <ChainPopup
                setShowChainPopup={setShowChainPopup}
                availableChains={selectableChains}
                chain={chain}
                switchChain={switchChain}
                onSelectChain={handleSelectChain}
              />
            )}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
