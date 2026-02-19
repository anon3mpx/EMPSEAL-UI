import { useEffect } from "react";
import Normal from "./Normal";
import { Helmet } from "react-helmet";
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
      <Helmet>
        <title>
          Decentralized On-chain Aggregation, Trading & Swapping with EMPSEAL:
          On-Chain Efficiency Meets Transparency
        </title>
        <meta
          name="description"
          content="Empower your cryptocurrency trading with EMPSEAL's decentralized swap platform. Enjoy efficient, on-chain aggregation for the best prices. Trade, swap, and explore a censorship-resistant environment designed for everyone."
        />
        <meta
          name="keywords"
          content="EMPSEAL,Trading,Swapping,Cryptocurrency,Decentralized Exchange,Aggregation,Buy Sell Crypto,Onchain Aggregator,Best Prices,Censorship Resistant,Efficient Trading"
        />
      </Helmet>
      <Normal />
    </>
  );
};

export default Main;
