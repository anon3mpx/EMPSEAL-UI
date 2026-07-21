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
    // document.body.style.backgroundColor = "black";

    // Cleanup
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundPosition = "";
      document.body.style.height = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <>
      <HelmetProvider>
        <title>EMPX | On-Chain DEX Aggregator - Multi-Chain DeFi Trading Platform</title>
        <meta
          name="description"
          content="Trade cryptocurrencies on EMPX's decentralized DEX aggregator with best price execution across multiple chains. Advanced on-chain aggregation, low slippage, and censorship-resistant trading."
        />
        <meta
          name="keywords"
          content="EMPX, DeFi, decentralized finance, crypto trading, multi-chain bridge, DEX aggregator, limit orders, Web3, blockchain, cryptocurrency, on-chain trading"
        />
      </HelmetProvider>
      <Normal />
    </>
  );
};

export default Main;
