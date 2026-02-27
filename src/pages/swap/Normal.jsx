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
      <div className="md:pt-3 pb-10 relative">
        <img
          src={BG}
          alt="Background"
          className="w-full h-full fixed top-0 left-0 -z-10"
        />
        <div className="mx-auto w-full px-4 flex flex-col justify-start xl:gap-4 gap-4 items-start 2xl:pt-1 py-2 md:flex-nowrap flex-wrap">
          <div className="w-full">
            <div className="md:block block">
              <Wallet onTabChange={handleTabChange} />
            </div>
            <Emp
              setPadding={setPadding}
              setBestRoute={setBestRoute}
              onTokensChange={handleTokensChange}
              activeTab={activeTab}
            />
            {/* <Routing /> */}
          </div>
          <div className="md:max-w-[474px] w-full">
            {/* <div className="md:block hidden">
              <Wallet onTabChange={handleTabChange} />
            </div> */}
            <div className="mt-3 lg:fixed absolute md:left-0 lefts lefts01 2xl:bottom-[32%] lg:bottom-[33%] md:bottom-[27%] bottom-[312px]">
              {/* <RoutingButton
                bestRoute={bestRoute}
                tokenA={tokenA}
                tokenB={tokenB}
              /> */}
            </div>
            {/* <div className="mt-3 hidden">
              <Graph padding={padding} />
            </div> */}
          </div>
        </div>
        {/* Social buttons */}
        {/* <div className="md:flex hidden md:justify-end justify-center gap-4 items-center md:max-w-[300px] w-full ml-auto px-4 z-1 md:pr-10">
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={X} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={L} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={Y} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
        </div> */}
      </div>
    </>
  );
};

export default Normal;
