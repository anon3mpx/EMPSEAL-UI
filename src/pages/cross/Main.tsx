import Cross from "./Cross";
import { HelmetProvider } from "react-helmet-async";
import BreadCrumb from "../../components/BreadCrumb";

const MainPage = () => {
  return (
    <>
      <HelmetProvider>
        <title>
          EMPX — Multi-Chain DEX Aggregator | Swap, Bridge & Build on Web3
        </title>
        <meta
          name="description"
          content="EMPX is the ultimate multi-chain DEX aggregator. Instant swaps across 100+ DEXs, cross-chain bridging on 20+ networks, smart limit orders, and an AI-native Swap SDK for protocols and agents. Zero hidden fees."
        />
        <meta
          name="keywords"
          content="EMPX,DEX aggregator,multi-chain swap,cross-chain bridge,DeFi,Web3,crypto swap,PulseChain DEX,Base DEX,Monad DEX,swap API,AI swap SDK,on-chain swap,limit orders DeFi,blockchain aggregator,best swap rates,zero fee swap"
        />
      </HelmetProvider>
      <BreadCrumb />
      <div className="relative md:py-12 py-10">
        <Cross />
      </div>
    </>
  );
};

export default MainPage;
