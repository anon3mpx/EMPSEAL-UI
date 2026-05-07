import { useState } from "react";
import Emp from "./Emp";
import Wallet from "./Wallet";
// import Graph from "./Graph";
import X from "../../assets/images/x.svg";
import L from "../../assets/images/linked.svg";
import Y from "../../assets/images/youtube.svg";
import BG from "../../assets/images/empx-bg1.webp";
// import Routing from "./Routing";
import RoutingButton from "./RoutingButton";
import BreadCrumb from "../../components/BreadCrumb";
import { motion } from "framer-motion";

const Normal = () => {
  const [padding, setPadding] = useState("lg:min-h-[429px] h-full");
  const [bestRoute, setBestRoute] = useState(null);
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  const [activeTab, setActiveTab] = useState("swap");

  const handleTokensChange = (tA, tB) => {
    setTokenA(tA);
    setTokenB(tB);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className="relative">
        <BreadCrumb />
        <div className="mx-auto w-full px-4 flex flex-col justify-start xl:gap-4 gap-4 items-start 2xl:pt-1 py-2 md:flex-nowrap flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <Emp
              setPadding={setPadding}
              setBestRoute={setBestRoute}
              onTokensChange={handleTokensChange}
              activeTab={activeTab}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Normal;
