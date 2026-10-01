import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import WidgetSwapPage from "../pages/widget/SwapEmbed";
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
import NotFound from "../pages/NotFound";
import Landing from "../pages/landing/Home";
import LandingV2 from "../pages/landing/v2/LandingV2";
import LandingV3 from "../pages/landing/v3/LandingV3";
import LandingV4 from "../pages/landing/v4/LandingV4";
import DesignSystemPreview from "../design-system/DesignSystemPreview";
import PortfolioPageV2 from "../design-system/pages/PortfolioPage";
import SwapPageV2 from "../design-system/pages/SwapPage";
import CrossPageV2 from "../design-system/pages/CrossPage";
import MultiPageV2 from "../design-system/pages/MultiPage";
import GasPageV2 from "../design-system/pages/GasPage";
import WidgetPageV2 from "../design-system/pages/WidgetPage";
import ErrorBoundary from "../components/ErrorBoundary";
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

// One react-toastify container config for every wrapper that hosts
// utils/toastHelper toasts.
const AppToastContainer = () => (
  <ToastContainer
    position="bottom-center"
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
);

const SwapWrapper = ({ children }) => (
  <WagmiProviderWrapper appType="swap">
    <Provider store={store}>
      <ChainSwitcher>
        {children}
        <AppToastContainer />
      </ChainSwitcher>
    </Provider>
  </WagmiProviderWrapper>
);

// Minimal wrapper for V2 design-system pages — provides wagmi + RainbowKit
// context so useWalletConnection() hook works.  V2 pages manage their own
// chain-switch / nav and render the design-system <Toaster /> themselves.
// The react-toastify container is still needed: shared execution code
// (useSwapExecution, utils/contractCalls) reports approve / swap / rejection
// through utils/toastHelper, and without a container those toasts are
// silently dropped.
const V2Wrapper = ({ children }) => (
  <WagmiProviderWrapper appType="swap">
    {children}
    <AppToastContainer />
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
        <div>
          <Routes>
            {/* <Route path="/" element={<Navigate to="/landing" replace />} /> */}
            {/* v4 promoted to "/" — owner approved 2026-08-20. Prior landings
                kept reachable at their own paths for comparison/rollback. */}
            <Route path="/" element={<LandingV4 />} />
            <Route path="/landing-v2" element={<LandingV2 />} />
            <Route path="/landing-v3" element={<LandingV3 />} />
            <Route path="/landing-v4" element={<LandingV4 />} />
            {/* Old landing preserved at /landing-v1 for comparison + rollback */}
            <Route path="/landing-v1" element={<Landing />} />
            {/* Design system preview — all primitives + reference swap widget */}
            <Route path="/ds-preview" element={<DesignSystemPreview />} />
            {/* New portfolio page built from the design system */}
            <Route path="/portfolio-v2" element={<V2Wrapper><PortfolioPageV2 /></V2Wrapper>} />
            <Route path="/swap-v2" element={<V2Wrapper><SwapPageV2 /></V2Wrapper>} />
            <Route path="/cross-v2" element={<V2Wrapper><CrossPageV2 /></V2Wrapper>} />
            {/* Bridge + Ramp disabled for now (also disabled in the nav) — direct
                URLs redirect to Swap. Restore by swapping these back:
                <Route path="/bridge-v2" element={<V2Wrapper><BridgePageV2 /></V2Wrapper>} /> */}
            <Route path="/bridge-v2" element={<Navigate to="/swap-v2" replace />} />
            <Route path="/multi-v2"  element={<V2Wrapper><MultiPageV2 /></V2Wrapper>} />
            <Route path="/gas-v2"    element={<V2Wrapper><GasPageV2 /></V2Wrapper>} />
            <Route path="/widget-v2" element={<V2Wrapper><WidgetPageV2 /></V2Wrapper>} />
            {/* <Route path="/ramp-v2" element={<V2Wrapper><RampPageV2 /></V2Wrapper>} /> */}
            <Route path="/ramp-v2" element={<Navigate to="/swap-v2" replace />} />
            {/* /landing kept for backwards-compat links; redirects to /. */}
            <Route path="/landing" element={<Navigate to="/" replace />} />
            {/* Embeddable swap widget loaded in partner iframes (vercel.json
                allows framing for this path only). Must stay live. */}
            <Route
              path="/widget/swap"
              element={
                <SwapWrapper>
                  <WidgetSwapPage />
                </SwapWrapper>
              }
            />
            {/* v1 app routes (/swap, /cross, /gas, /portfolio, /widget, /bridge,
                /limit, /nft-marketplace, /item-detail, /via-bridge) removed —
                the -v2 pages replace them; old URLs fall through to 404. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        </ErrorBoundary>
      </BrowserRouter>
    </>
  );
}

export default MyRoutes;
