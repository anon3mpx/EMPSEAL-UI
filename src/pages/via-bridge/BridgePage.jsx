import BridgeInterface from "./BridgeInterface";
import Wallet from "./components/Wallet";
// import BridgeStats from "./BridgeStats";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

const BridgePage = () => {
  const [activeTab, setActiveTab] = useState("via-bridge");

  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    if (path === "/") setActiveTab("cross");
    if (path === "/native-bridge") setActiveTab("native");
    if (path === "/via-bridge") setActiveTab("viabridge");
  }, [path]);

  return (
    <div className="relative">
      <div className="md:hidden block">
        <Wallet />
      </div>
      <div className="md:block hidden">
        <Wallet />
      </div>
      <div
        className={`w-full scales-b rounded-xl lg:pt-1 pt-2 2xl:px-16 lg:px-12 md:px-8 px-1 md:mt-0 mt-1 lg:pb-0 pb-5`}
      >
        <div className="w-full">
          <div className="md:max-w-[800px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap px-3 pb-4 lg:mt-0 mt-[135px]">
            <h1 className="md:text-5xl text-3xl text-center text-[#FF9900] font-orbitron font-bold mb-2">
             EMPX <span className="text-white">X</span> VIA <span className="text-white">BRIDGE</span>
            </h1>
            <p className="text-lg text-gray-400 text-center">
              Seamlessly transfer tokens between PulseChain and Base
            </p>
            <div className="flex justify-center gap-4 mt-7 md:flex-nowrap flex-wrap md:max-w-[600px] w-full mx-auto md:px-0 px-20">
              {/* Cross Chain Swap */}
              {/* <Link to="/" className="w-full">
                <div
                  className={`${
                    activeTab === "cross"
                      ? "border-[#FF9900]"
                      : "border-[#3b3c4e]"
                  } 
      cursor-pointer w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
                >
                  Cross Chain Swap
                </div>
              </Link> */}

              {/* Native Bridge */}
              <Link to="/native-bridge" className="w-full">
                <div
                  className={`${
                    activeTab === "native"
                      ? "border-[#FF9900]"
                      : "border-[#3b3c4e]"
                  } 
      px-3 py-2 w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
                >
                  Native Bridge
                </div>
              </Link>

              {/* Via Bridge */}
              <Link to="/via-bridge" className="w-full">
                <div
                  className={`${
                    activeTab === "viabridge"
                      ? "border-[#FF9900]"
                      : "border-[#3b3c4e]"
                  } 
      px-3 py-2 w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
                >
                  Via Bridge
                </div>
              </Link>
            </div>
          </div>
          {/* Stats */}
          {/* <BridgeStats /> */}
          {/* Bridge Interface */}
        </div>
      </div>

      <BridgeInterface />
    </div>
  );
};

export default BridgePage;
