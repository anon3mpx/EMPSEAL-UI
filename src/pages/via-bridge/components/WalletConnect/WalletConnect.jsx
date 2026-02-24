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
                className="new_shad !bg-black !rounded-2xl !text-[#FF9900] transition-all text-center font-extrabold"
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
                  <div className="relative text-white md:p-8 p-4 rounded-2xl md:max-w-[560px] w-full clip-bg font-orbitron">
                    <svg
                      onClick={() => setShowConnectPopup(false)}
                      className="absolute cursor-pointer md:right-10 right-4 md:top-10 top-4 tilt"
                      width={18}
                      height={19}
                      viewBox="0 0 18 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                        stroke="#fff"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h2 className="mt-4 md:text-lg capitalize text-base font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
                      <img src={EL} alt="EL" className="w-10 object-contain" />
                      Wallet Connect
                    </h2>
                    <div className="relative my-5">
                      <svg
                        className="flex flex-shrink-0 cursor-pointer absolute left-3 top-3"
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
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#382B19] h-12 rounded-lg text-[#FF9900] w-full pr-3 pl-12 outline-none border-none placeholder:text-[#FF9900] text-sm font-normal roboto leading-tight tracking-wide"
                      />
                    </div>

                    {/* Wallet options */}
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-x-2 gap-y-4 mt-2">
                      {filteredConnectors.slice(0, 6).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex items-center justify-start gap-4 cursor-pointer rounded-lg d:py-3 py-2 px-3 transition-all hoverclip_1"
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
                              className="w-5 h-5 relative z-10 flex flex-shrink-0 object-contain rounded-full"
                            />
                          </div>
                          <p className="md:text-base text-[10px] text-[#FF9900] font-orbitron font-bold">
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
                className="new_shad !bg-black !rounded-2xl hover:opacity-80 transition-all !text-[#FF494A] font-extrabold"
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
              className="new_shad !bg-black !rounded-2xl transition-all flex items-center justify-center gap-2 px-2"
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
                className="new_shad !bg-black !text-[#FF9900] !rounded-2xl transition-all text-center font-extrabold font-orbitron"
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
