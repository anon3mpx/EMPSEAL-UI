import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// import Base from "../layout/base/Base";
import Home from "../pages/Home/Main";
import Swap from "../pages/swap/Main";
import BreadCrumb from "../components/BreadCrumb";
import NFTMarketplace from "../pages/Home/NFTMarketPlace";
import CollectionDetail from "../components/CollectionDetail";
import ItemDetail from "../pages/Home/ItemDetail";
import Bridge from "../pages/bridge/Main";
import NativeBridge from "../pages/nativeBridge";
import BridgeWrapper from "../components/BridgeWrapper";
import WagmiProviderWrapper from "../Wagmi/WagmiProvider";
import { Provider } from "react-redux";
import store from "../redux/store/store";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { pulsechain, sonic } from "wagmi/chains";
import ViaBridge from "../pages/via-bridge/BridgePage";

const GasBridgePage = lazy(() => import("../pages/GasBridgePage"));

// This component will be rendered inside WagmiProvider
const ChainSwitcher = ({ children }) => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && chainId) {
      const swapChainIds = [pulsechain.id, 10001, sonic.id]; // pulsechain, ethw, sonic
      if (!swapChainIds.includes(chainId)) {
        switchChain({ chainId: pulsechain.id });
      }
    }
  }, [chainId, isConnected, switchChain]);

  return children;
};

const SwapWrapper = ({ children }) => (
  <WagmiProviderWrapper appType="swap">
    <Provider store={store}>
      <ChainSwitcher>
        {children}
        <ToastContainer position="top-right" theme="dark" autoClose={5000} />
      </ChainSwitcher>
    </Provider>
  </WagmiProviderWrapper>
);

const ViaBridgeWrapper = ({ children }) => (
  <WagmiProviderWrapper appType="via-bridge">
    <Provider store={store}>
      {children}
      <ToastContainer position="top-right" theme="dark" autoClose={5000} />
    </Provider>
  </WagmiProviderWrapper>
);

function MyRoutes() {
  return (
    <>
      <BrowserRouter>
        {/* <Base> */}
        <div>
          <BreadCrumb />
          <Routes>
            <Route path="/" element={<Home />} />
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
            {/* <Route
              path="/bridge"
              element={
                <BridgeWrapper>
                  <Bridge />
                </BridgeWrapper>
              }
            /> */}
            <Route
              path="/native-bridge"
              element={
                <BridgeWrapper>
                  <NativeBridge />
                </BridgeWrapper>
              }
            />
            <Route
              path="/via-bridge"
              element={
                <ViaBridgeWrapper>
                  <ViaBridge />
                </ViaBridgeWrapper>
              }
            />
            <Route
              path="/gas"
              element={
                <BridgeWrapper>
                  <Suspense fallback={<div>Loading...</div>}>
                    <GasBridgePage />
                  </Suspense>
                </BridgeWrapper>
              }
            />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
        </div>
        {/* </Base> */}
      </BrowserRouter>
    </>
  );
}

export default MyRoutes;
