// NEW
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import ChainPopup from "./Chainpopup";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChains,
} from "wagmi";
import AddressCard from "./AddressCard";
import TermsModal from "../../../swap/TermsModal";
import dummyImage from "../../../../assets/images/emp-logo.png";
import Base from "../../../../assets/icons/base.svg";
import Pulse from "../../../../assets/icons/pls.svg";
import Arbitrum from "../../../../assets/icons/arbitrum.svg";
import OP from "../../../../assets/icons/op.svg";
import BNB from "../../../../assets/icons/binance.svg";
import Polygon from "../../../../assets/icons/polygon.svg";
import Avalanche from "../../../../assets/icons/avalanche.svg";
import EL from "../../../../assets/images/emp-logo.png";

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
      connector.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  useEffect(() => {
    if (address && !sessionStorage.getItem("walletReloaded")) {
      sessionStorage.setItem("walletReloaded", "true");
      window.location.reload();
    }
  }, [address]);
  //
  const chainIcons = {
    base: Base,
    "base mainnet": Base,
    pulse: Pulse,
    pulsechain: Pulse,
    "pulsechain mainnet": Pulse,
    "arbitrum one": Arbitrum,
    arbitrum: Arbitrum,
    optimism: OP,
    "op mainnet": OP,
    "bnb smart chain": BNB,
    bnb: BNB,
    polygon: Polygon,
    avalanche: Avalanche,
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

        if (!ready) return null;
        if (!connected) {
          return (
            <>
              <button
                className="v1-connect-btn"
                onClick={() => setShowConnectPopup(true)}
                type="button"
              >
                Connect Wallet
              </button>
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
                  <div className="relative text-white p-4 rounded-2xl md:max-w-[560px] w-full clip-bg ">
                    <div className="flex justify-between gap-2 items-center px-4 pb-2">
                      <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
                        <img
                          src={EL}
                          alt="EL"
                          className="w-10 object-contain"
                        />
                        Wallet Connect
                      </h2>
                      <button
                        onClick={() => setShowConnectPopup(false)}
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
                    <div className="bg-[#444444] w-full h-[1px] mb-4 mt-10"></div>
                    <div className="text-white md:text-xs text-xs uppercase mt-4  font-bold text-center">
                      By connecting, you agree to
                      <span
                        onClick={() => {
                          setShowTermsPopup(true);
                          setShowConnectPopup(false);
                        }}
                        className="ml-1 text-[#FF8A00] cursor-pointer hover:underline md:text-xs text-xs font-bold"
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
                className="v1-connect-btn"
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
                    className="w-4 h-4 object-contain rounded-full"
                    onError={(e) => (e.currentTarget.src = dummyImage)}
                  />
                  {/* <span
                    className={
                      chain.name.length > 11
                        ? "truncate md:w-[150px] w-[110px]"
                        : ""
                    }
                  >
                    {chain.name}
                  </span> */}
                </>
              ) : (
                "Select Chain"
              )}
            </button>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                className="v1-connect-btn"
                onClick={() => setShowPopup(true)}
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
