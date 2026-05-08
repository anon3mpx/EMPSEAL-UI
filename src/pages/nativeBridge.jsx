import React, { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import SpinnerImage from "../assets/images/spinner_middle.svg";
import { Link } from "react-router-dom";
import bgPattern from "@/assets/images/bg-pattern.svg";
import BreadCrumb from "../components/BreadCrumb";

const NativeBridge = () => {
  // useEffect(() => {
  //   document.body.style.backgroundImage = `url(${bgPattern})`;
  //   document.body.style.backgroundSize = "cover";
  //   document.body.style.backgroundRepeat = "no-repeat";
  //   document.body.style.backgroundPosition = "center";
  //   document.body.style.height = "100vh";
  //   document.body.style.backgroundColor = "Black";

  //   // Cleanup: Remove background when leaving this page
  //   return () => {
  //     document.body.style.backgroundImage = "";
  //     document.body.style.backgroundSize = "";
  //     document.body.style.backgroundRepeat = "";
  //     document.body.style.backgroundPosition = "";
  //   };
  // }, []);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("native");
  const iframeSrc =
    import.meta.env.REACT_APP_IFRAME_URL ||
    "https://native-bridge-omega.vercel.app";

  return (
    <>
      <BreadCrumb />
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div className="md:max-w-[1100px] mx-auto w-full flex justify-center gap-10 items-center md:flex-nowrap flex-wrap my-6 px-3 pt-10 ">
          {/* <Link to={"/bridge"}>
          <div
            // onClick={() => setActiveTab('cross')}
            className={` opacity-50 px-3 py-2 border-[#3b3c4e] md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
          >
            Cross Chain Swap
          </div>
        </Link> */}
          <div className="flex justify-center gap-4 mt-7 md:flex-nowrap flex-wrap md:max-w-[600px] w-full mx-auto md:px-0 px-20">
            <Link to="/native-bridge" className="w-full">
              <div
                className={`slippage-btn ${
                  activeTab === "native"
                    ? ""
                    : "border-black bg-black"
                } 
      px-3 py-2 w-full md:h-9 h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Native Bridge
              </div>
            </Link>

            {/* Via Bridge */}
            {/* <Link to="/via-bridge" className="w-full">
            <div
              className={`border-2 ${
                activeTab === "viabridge"
                  ? "border-[#FF8A00] bg-black"
                  : "border-white"
              } 
      px-3 py-2 w-full md:h-9 h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
            >
              Via Bridge
            </div>
          </Link> */}
          </div>
        </div>
        {/* Loader (Visible when iframe is loading) */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100vh",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LoadingSpinner SpinnerImage={SpinnerImage} />
          </div>
        )}
        <iframe
          src={iframeSrc}
          style={{
            width: "100%",
            height: "100vh",
            border: "none",
            background: "#000000",
            display: loading ? "none" : "block",
          }}
          onLoad={() => setLoading(false)}
        ></iframe>
      </div>
    </>
  );
};

export default NativeBridge;
