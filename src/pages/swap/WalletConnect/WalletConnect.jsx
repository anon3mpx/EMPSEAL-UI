// NEW
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import ChainPopup from "./Chainpopup";

import dummyImage from "../../../assets/images/emp-logo.png";
import Eth from "../../../assets/icons/eth.svg";
import Pulse from "../../../assets/icons/pls.svg";
import Sonic from "../../../assets/icons/sonic.png";
import Base from "../../../assets/icons/base.svg";
// import Pulse from "../../../assets/icons/pls.svg";
import Arbitrum from "../../../assets/icons/arbitrum.svg";
import Ethereum from "../../../assets/icons/eth.svg";
import BNB from "../../../assets/icons/binance.svg";
import Avalanche from "../../../assets/icons/avalanche.svg";
import Polygon from "../../../assets/icons/polygon.svg";
import OP from "../../../assets/icons/op.svg";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChains,
} from "wagmi";
import AddressCard from "./AddressCard";
import TermsModal from "../TermsModal";
// import Dis from "../../../assets/images/dis.png";
// import Copy from "../../../assets/images/copy.png";
// import Sbg from "../../../assets/images/sbg.png";

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
}) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
  const availableChains = useChains();
  const { connect, connectors } = useConnect();

  const [showPopup, setShowPopup] = useState(false);
  const [showChainPopup, setShowChainPopup] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  // Filter connectors by search term (case-insensitive)
  const filteredConnectors = connectors
    .slice(0, 6) // keep the limit if needed
    .filter((connector) =>
      connector.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain;

        // Effects moved inside render prop to correctly access `chain`
        // and avoid infinite loops.

        if (!ready) return null;
        if (!connected) {
          return (
            <>
              <button
                className="wallet-bg-bridge1 gtw transition-all text-center font-extrabold"
                onClick={() => setShowConnectPopup(true)}
                type="button"
              >
                Connect
              </button>
              {/* <button
                className="wallet-bg-bridge1 gtw transition-all text-center font-extrabold"
                onClick={() => setShowChainPopup(true)}
                type="button"
              >
                Select Chain
              </button> */}
              {showChainPopup && (
                <ChainPopup
                  setShowChainPopup={setShowChainPopup}
                  availableChains={availableChains}
                  chain={chain}
                  switchChain={switchChain}
                />
              )}
              {showConnectPopup && (
                <div
                  className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      setShowConnectPopup(false);
                  }}
                >
                  <div className="relative text-white md:p-12 p-6 rounded-2xl md:max-w-[520px] w-full clip-bg font-orbitron">
                    <svg
                      onClick={() => setShowConnectPopup(false)}
                      className="absolute cursor-pointer md:right-10 right-4 md:top-11 top-4 tilt"
                      width={18}
                      height={19}
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

                    <h2 className="md:text-2xl text-xl font-bold text-white mb-2 text-center">
                      Connect a wallet to EmpX
                    </h2>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="my-5 border border-[#FF9900] rounded-xl bg-transparent h-[48px] text-white md:max-w-[490px] w-full px-5 outline-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
                    />

                    {/* Wallet options */}
                    <div className="grid md:grid-cols-1 grid-cols-1 gap-x-2 gap-y-2 mt-2">
                      {filteredConnectors.slice(0, 6).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex items-center justify-start gap-4 cursor-pointer rounded-lg d:py-3 py-2 px-3 transition-all hoverclip"
                          onClick={() => {
                            connect({ connector });
                            setShowConnectPopup(false);
                          }}
                        >
                          <div className="relative">
                            {/* <img
                              src={Sbg}
                              alt="sbg"
                              className="absolute z-0 left-[-1.5px] top-0 bottom-0 my-auto min-w-[20px] h-[20px]"
                            /> */}
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
                              className="w-8 h-8 relative z-10 flex flex-shrink-0 object-contain rounded-full"
                            />
                          </div>
                          <p className="md:text-lg text-[10px] text-white font-orbitron font-extrabold">
                            {connector.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#444444] w-full h-[1px] mb-4 mt-10"></div>
                    <div className="text-white md:text-base text-sm mt-4 font-orbitron font-bold text-center">
                      By logging in I agree to the
                      <span
                        onClick={() => {
                          setShowTermsPopup(true);
                          setShowConnectPopup(false);
                        }}
                        className="ml-1 text-[#FF9900] cursor-pointer hover:underline md:text-base text-sm font-orbitron font-bold"
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
        if (chain.unsupported && !allowUnsupported) {
          return (
            <>
              <button
                className="wallet-bg-bridge1 hover:opacity-80 transition-all text-[#FF494A] font-extrabold"
                onClick={() => setShowChainPopup(true)}
                type="button"
              >
                Wrong Network
              </button>
              {showChainPopup && (
                <ChainPopup
                  setShowChainPopup={setShowChainPopup}
                  availableChains={availableChains}
                  chain={chain}
                  switchChain={switchChain}
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
              chains={chains}
              switchChain={switchChain}
              allowUnsupported={allowUnsupported}
            />
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                className="wallet-bg-bridge1 gtw transition-all text-center font-extrabold"
                onClick={() => setShowPopup(true)}
                type="button"
              >
                Disconnect
              </button>
            </div>

            <button
              className="wallet-bg-bridge1 gtw transition-all font-extrabold flex items-center justify-center gap-2 px-4"
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
                    className="w-5 h-5 object-contain rounded-full"
                    onError={(e) => (e.currentTarget.src = dummyImage)}
                  />
                  <span
                    className={
                      chain.name.length > 11
                        ? "truncate md:w-[150px] w-[110px]"
                        : ""
                    }
                  >
                    {chain.name}
                  </span>
                </>
              ) : (
                "Select Chain"
              )}
            </button>

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
                availableChains={availableChains}
                chain={chain}
                switchChain={switchChain}
              />
            )}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
