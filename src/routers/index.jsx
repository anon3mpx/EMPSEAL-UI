import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// import Base from "../layout/base/Base";
// Home page removed — root path redirects to /swap
import Swap from "../pages/swap/Main";
import BreadCrumb from "../components/BreadCrumb";
import NFTMarketplace from "../pages/Home/NFTMarketPlace";
import CollectionDetail from "../components/CollectionDetail";
import ItemDetail from "../pages/Home/ItemDetail";
import Bridge from "../pages/bridge/Main";
import NativeBridge from "../pages/nativeBridge";
import Widget from "../pages/widget/Main";
import WidgetSwapPage from "../pages/widget/SwapEmbed";
import Cross from "../pages/cross/Main";
import Limit from "../pages/limit/Main";
import BridgeWrapper from "../components/BridgeWrapper";
import WagmiProviderWrapper from "../Wagmi/WagmiProvider";
import { Provider } from "react-redux";
import store from "../redux/store/store";
import { ToastContainer, Slide, toast } from "react-toastify";
import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  pulsechain,
  sonic,
  sei,
  rootstock,
  bsc,
  arbitrum,
  optimism,
  polygon,
  avalanche,
} from "wagmi/chains";
import ViaBridge from "../pages/via-bridge/BridgePage";
import NotFound from "../pages/NotFound";
import Landing from "../pages/landing/Home";
import LandingV2 from "../pages/landing/v2/LandingV2";
import DesignSystemPreview from "../design-system/DesignSystemPreview";
import PortfolioPageV2 from "../design-system/pages/PortfolioPage";
import SwapPageV2 from "../design-system/pages/SwapPage";
import CrossPageV2 from "../design-system/pages/CrossPage";
import BridgePageV2 from "../design-system/pages/BridgePage";
import MultiPageV2 from "../design-system/pages/MultiPage";
import GasPageV2 from "../design-system/pages/GasPage";
import WidgetPageV2 from "../design-system/pages/WidgetPage";
import Portfolio from "../pages/portfolio/Portfolio";
import ErrorBoundary from "../components/ErrorBoundary";

const GasBridgePage = lazy(() => import("../pages/GasBridgePage"));
// When a user connects an unsupported chain, ChainSwitcher prompts via
// a toast with an explicit "Switch to PulseChain" action — NOT a silent
// programmatic switch (which was the prior UX).
const SUPPORTED_CHAIN_IDS = [
  pulsechain.id,     // 369
  10001,             // EthereumPOW
  sonic.id,          // 146
  8453,              // Base
  sei.id,            // 1329
  80094,             // Berachain
  rootstock.id,      // 30
  bsc.id,            // 56
  143,               // Monad
  arbitrum.id,       // 42161
  optimism.id,       // 10
  polygon.id,        // 137
  avalanche.id,      // 43114
  999,               // HyperEVM
];

// Friendly chain-name lookup for the most common "wrong-network" cases.
// Used to make the toast read "Ethereum mainnet" instead of "1".  Missing
// entries fall back to the numeric chainId — toast still works.
const CHAIN_NAMES = {
  1:      "Ethereum",
  56:     "BSC",
  137:    "Polygon",
  10:     "Optimism",
  42161:  "Arbitrum",
  43114:  "Avalanche",
  8453:   "Base",
  369:    "PulseChain",
  146:    "Sonic",
  143:    "Monad",
  1329:   "Sei",
  80094:  "Berachain",
  30:     "Rootstock",
  999:    "HyperEVM",
  10001:  "EthereumPOW",
};

// This component will be rendered inside WagmiProvider
const ChainSwitcher = ({ children }) => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();
  // Track the last chain we already prompted about so we don't spam the
  // user with duplicate toasts on every re-render or transient state change.
  const lastPromptedChainId = useRef(null);

  useEffect(() => {
    if (!isConnected || !chainId) return;
    if (SUPPORTED_CHAIN_IDS.includes(chainId)) {
      // User is on a supported chain — clear the prompt-tracking so a
      // future switch-back-to-unsupported will surface a fresh toast.
      lastPromptedChainId.current = null;
      return;
    }
    if (lastPromptedChainId.current === chainId) return;
    lastPromptedChainId.current = chainId;

    const fromName = CHAIN_NAMES[chainId] ?? `chain ${chainId}`;
    const toastId = `chain-switcher-${chainId}`;

    toast.warn(
      ({ closeToast }) => (
        <div className="flex flex-col gap-2">
          <div className="text-xs leading-relaxed">
            EMPX doesn't support <span className="font-bold text-[#FF8A00]">{fromName}</span>.
            <br />
            Switch your wallet to PulseChain to continue?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                switchChain({ chainId: pulsechain.id });
                closeToast?.();
              }}
              className="px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase bg-[#FF8A00] text-black hover:opacity-80 cursor-pointer"
              data-testid="chain-switcher-confirm"
            >
              Switch to PulseChain
            </button>
            <button
              type="button"
              onClick={() => closeToast?.()}
              className="px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase border border-white/20 text-white/70 hover:text-white cursor-pointer"
              data-testid="chain-switcher-dismiss"
            >
              Not now
            </button>
          </div>
        </div>
      ),
      {
        toastId,
        autoClose: false,            // user must click one of the buttons
        closeOnClick: false,
        draggable: false,
        closeButton: true,
      },
    );
  }, [chainId, isConnected, switchChain]);

  return children;
};

const SwapWrapper = ({ children }) => (
  <WagmiProviderWrapper appType="swap">
    <Provider store={store}>
      <ChainSwitcher>
        {children}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={true}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss={true}
          draggable={true}
          pauseOnHover={true}
          theme="dark"
          transition={Slide}
          toastClassName="empseal-toast"
          bodyClassName="empseal-toast-body"
          closeButton={false}
        />
      </ChainSwitcher>
    </Provider>
  </WagmiProviderWrapper>
);

const ViaBridgeWrapper = ({ children }) => (
  <WagmiProviderWrapper appType="via-bridge">
    <Provider store={store}>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="dark"
        transition={Slide}
        toastClassName="empseal-toast"
        bodyClassName="empseal-toast-body"
        closeButton={false}
      />
    </Provider>
  </WagmiProviderWrapper>
);

// Minimal wrapper for V2 design-system pages — provides wagmi + RainbowKit
// context so useWalletConnection() hook works.  V2 pages manage their own
// toast / chain-switch / nav, so this wrapper is intentionally lean.
const V2Wrapper = ({ children }) => (
  <WagmiProviderWrapper appType="swap">
    {children}
  </WagmiProviderWrapper>
);

function MyRoutes() {
  return (
    <>
      <BrowserRouter>
        {/* Top-level ErrorBoundary — catches uncaught render errors in any
             route so the whole app doesn't go blank.  Per-page boundaries
             can wrap sub-trees independently for finer recovery. */}
        <ErrorBoundary>
        {/* <Base> */}
        <div>
          {/* <BreadCrumb /> */}
          <Routes>
            {/* <Route path="/" element={<Navigate to="/landing" replace />} /> */}
            <Route path="/" element={<LandingV2 />} />
            {/* Old landing preserved at /landing-v1 for comparison + rollback */}
            <Route path="/landing-v1" element={<Landing />} />
            {/* Design system preview — all primitives + reference swap widget */}
            <Route path="/ds-preview" element={<DesignSystemPreview />} />
            {/* New portfolio page built from the design system */}
            <Route path="/portfolio-v2" element={<V2Wrapper><PortfolioPageV2 /></V2Wrapper>} />
            <Route path="/swap-v2" element={<V2Wrapper><SwapPageV2 /></V2Wrapper>} />
            <Route path="/cross-v2" element={<V2Wrapper><CrossPageV2 /></V2Wrapper>} />
            <Route path="/bridge-v2" element={<V2Wrapper><BridgePageV2 /></V2Wrapper>} />
            <Route path="/multi-v2"  element={<V2Wrapper><MultiPageV2 /></V2Wrapper>} />
            <Route path="/gas-v2"    element={<V2Wrapper><GasPageV2 /></V2Wrapper>} />
            <Route path="/widget-v2" element={<V2Wrapper><WidgetPageV2 /></V2Wrapper>} />
            {/* /landing kept for backwards-compat links; redirects to /. */}
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route
              path="/portfolio"
              element={
                <SwapWrapper>
                  <Portfolio />
                </SwapWrapper>
              }
            />
            <Route
              path="/widget"
              element={
                <SwapWrapper>
                  <Widget />
                </SwapWrapper>
              }
            />
            <Route
              path="/widget/swap"
              element={
                <SwapWrapper>
                  <WidgetSwapPage />
                </SwapWrapper>
              }
            />
            <Route
              path="/cross"
              element={
                <SwapWrapper>
                  <Cross />
                </SwapWrapper>
              }
            />
            <Route
              path="/limit"
              element={
                <SwapWrapper>
                  <Limit />
                </SwapWrapper>
              }
            />
            {/* <Route path="/" element={<Navigate to="/swap" replace />} /> */}
            <Route
              path="/swap"
              element={
                <SwapWrapper>
                  <Swap />
                </SwapWrapper>
              }
            />
            <Route
              path="/nft-marketplace/:name"
              element={<CollectionDetail />}
            />
            <Route path="/nft-marketplace" element={<NFTMarketplace />} />
            <Route path="/item-detail" element={<ItemDetail />} />
            <Route
              path="/bridge"
              element={
                <BridgeWrapper>
                  <Bridge />
                </BridgeWrapper>
              }
            /> 
            {/* /native-bridge — disabled; preserved for the Via Labs bridge
                 rebuild. */}
            {/* <Route
              path="/native-bridge"
              element={
                <BridgeWrapper>
                  <NativeBridge />
                </BridgeWrapper>
              }
            /> */}
            {/* via-bridge disabled — coming soon */}
            <Route
              path="/via-bridge"
              element={<Navigate to="/swap" replace />}
            />
            <Route
              path="/gas"
              element={
                <BridgeWrapper>
                  <Suspense
                    fallback={
                      <div className="w-full h-screen flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent" />
                      </div>
                    }
                  >
                    <GasBridgePage />
                  </Suspense>
                </BridgeWrapper>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {/* </Base> */}
        </ErrorBoundary>
      </BrowserRouter>
    </>
  );
}

export default MyRoutes;
