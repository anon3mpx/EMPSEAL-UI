import { useEffect } from "react";
import Normal from "./Normal";
import { HelmetProvider } from "react-helmet-async";
import bgPattern from "@/assets/images/bg-pattern.svg";

const Main = () => {
  useEffect(() => {
    // document.body.style.backgroundImage = `url(${bgPattern})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.height = "100vh";
    document.body.style.backgroundColor = "Black";

    // Cleanup: Remove background when leaving this page
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundPosition = "";
    };
  }, []);

  return (
    <div>
    <HelmetProvider>
      <title>EMPX | Native Bridge - Cross-Chain Asset Transfers</title>
      <meta
        name="description"
        content="Seamlessly bridge assets across multiple blockchains with EMPX native bridge. Secure, fast cross-chain transfers with competitive rates and wide token support."
      />
      <meta
        name="keywords"
        content="EMPX, DeFi, decentralized finance, crypto trading, multi-chain bridge, DEX aggregator, limit orders, Web3, blockchain, cryptocurrency, on-chain trading"
      />
    </HelmetProvider>
      <Normal />
    </div>
  );
};

export default Main;
