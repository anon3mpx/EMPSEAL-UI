import BridgeInterface from "./BridgeInterface";
import Wallet from "./components/Wallet";
// import BridgeStats from "./BridgeStats";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import BG from "../../assets/images/empx-bg1.webp";

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
      <img
        src={BG}
        alt="Background"
        className="w-full h-full fixed top-0 left-0 -z-10"
      />
      <div className="block">
        <Wallet />
      </div>
      <div
        className={`w-full scales-b rounded-xl lg:pt-1 pt-2 2xl:px-16 lg:px-12 md:px-8 px-1 md:mt-0 mt-1 lg:pb-0 pb-5`}
      >
        <div className="w-full">
          <div className="md:max-w-[800px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap px-3 pb-4 lg:mt-0 mt-1">
            <h1 className="2xl:text-[43px] 2xl:leading-[40px] font40 text-2xl text-center text-[#FF9900] font-orbitron font-bold mb-1">
              EMPX <span className="text-white">X</span> VIA <br />
              <span className="text-white">BRIDGE</span>
            </h1>
            <div className="flex justify-center gap-4 md:mt-7 mt-2 md:flex-nowrap md:max-w-[600px] w-full mx-auto md:px-0 px-1">
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
                  className={`border-2 ${
                    activeTab === "native" ? "border-[#FF9900]" : "border-black bg-black"
                  } 
      px-3 py-2 w-full md:h-10 h-[28px] flex justify-center items-center 
      rounded-md border text-white md:text-[15px] text-xs font-bold font-orbitron`}
                >
                  Native Bridge
                </div>
              </Link>

              {/* Via Bridge */}
              <Link to="/via-bridge" className="w-full">
                <div
                  className={`border-2 ${
                    activeTab === "viabridge"
                      ? "border-[#FF9900] bg-black"
                      : "border-white"
                  } 
      px-3 py-2 w-full md:h-10 h-[28px] flex justify-center items-center 
      rounded-md border text-white md:text-[15px] text-xs font-bold font-orbitron`}
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
