// import ChainSelector from "../components/gas/ChainSelector";
import TransferPanel from "../components/gas/TransferPanel";
import TransactionHistory from "../components/gas/TransactionHistory";
import Wallet from "./swap/Wallet";
import BG from "../assets/images/empx-bg1.webp";
import { useState } from "react";
import { Helmet } from "react-helmet";
import BreadCrumb from "../components/BreadCrumb";
import { motion } from "framer-motion";

export default function GasBridgePage() {
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>EMPX | Gas Bridge - Gasless Cross-Chain Transfers</title>
        <meta
          name="description"
          content="Send gas tokens across chains with EMPX Gas Bridge. Seamless gas token bridging with optimal routing, low fees, and fast confirmations."
        />
        <meta
          name="keywords"
          content="EMPX, DeFi, decentralized finance, crypto trading, multi-chain bridge, DEX aggregator, limit orders, Web3, blockchain, cryptocurrency, on-chain trading"
        />
      </Helmet>
      <BreadCrumb />
      <div className="min-h-[calc(100vh-52px)] flex flex-col items-center px-4 py-20 bg-gradient max-w-[960px] mx-auto">
        <div className="md:max-w-[1100px] w-full mx-auto p-4 text-white">
          {/* <Wallet allowUnsupported={true} /> */}
          <div className={!isChainModalOpen ? "scales8 top70" : ""}>
            <p className="text-[9px] font-bold tracking-[0.4em] text-[rgba(255,138,0,0.45)] mb-2">
              GAS MANAGEMENT
            </p>
            <h1 className="text-[26px] text-[#FF8A00] font-bold md:mb-2">
              <span className="text-white mr-2">Gas Prices.</span>
              Real Time.
            </h1>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <TransferPanel setIsChainModalOpen={setIsChainModalOpen} />
            </motion.div>
            {/* <div className="md:mt-5 mt-4 md:max-w-[1000px] w-full mx-auto p-4">
              <TransactionHistory />
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
}
