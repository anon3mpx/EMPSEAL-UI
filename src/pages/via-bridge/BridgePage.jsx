import BridgeInterface from "./BridgeInterface";
import Wallet from "./components/Wallet";
// import BridgeStats from "./BridgeStats";
// import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { useLocation } from "react-router-dom";
import BG from "../../assets/images/empx-bg1.webp";
import { Helmet } from "react-helmet";
import BreadCrumb from "../../components/BreadCrumb";

const BridgePage = () => {
  // const [activeTab, setActiveTab] = useState("via-bridge");

  // const location = useLocation();
  // const path = location.pathname;

  // useEffect(() => {
  //   if (path === "/") setActiveTab("cross");
  //   if (path === "/native-bridge") setActiveTab("native");
  //   if (path === "/via-bridge") setActiveTab("viabridge");
  // }, [path]);

  return (
    <>
      <Helmet>
        <title>EMPX | Via Bridge - Cross-Chain Asset Bridge</title>
        <meta
          name="description"
          content="Bridge assets across multiple blockchains seamlessly with EMPX Via Bridge. Secure, fast cross-chain transfers with optimal routing and competitive rates."
        />
        <meta
          name="keywords"
          content="EMPX, DeFi, decentralized finance, crypto trading, multi-chain bridge, DEX aggregator, limit orders, Web3, blockchain, cryptocurrency, on-chain trading"
        />
      </Helmet>
      <BreadCrumb />
      <div className="relative">
        <BridgeInterface />
      </div>
    </>
  );
};

export default BridgePage;
