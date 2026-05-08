import React, { useEffect, useState } from "react";
// import Arrow from "../../assets/images/arrow-2.svg";
import LoadingIcon from "../../assets/icons/loading.svg";
import FallbackTokenIcon from "../../assets/images/emp-icon.svg";
import { useChainConfig } from "../../hooks/useChainConfig";
import { useStore } from "../../redux/store/routeStore";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

const Routing = ({ routing, isLoading }) => {
  const [tokenImages, setTokenImages] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const route = useStore((state) => state.route);
  const adapter = useStore((state) => state.adapter);
  const { chainId, tokenList, adapters, isSupported, wethAddress } =
    useChainConfig();

  const getLocalTokenImage = (address) => {
    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase(),
    );
    return token ? token.logoURI || token.image : null;
  };

  const getGithubTokenImage = (address) => {
    return `https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/${address}.png`;
  };

  const getTokenImage = (address) => {
    if (address === "0x0000000000000000000000000000000000000000") {
      return getLocalTokenImage(wethAddress);
    }
    if (tokenImages[address]) {
      return tokenImages[address];
    }

    const localImage = getLocalTokenImage(address);
    if (localImage) {
      setTokenImages((prev) => ({
        ...prev,
        [address]: localImage,
      }));
      return localImage;
    }

    if (chainId === 369) {
      const githubImage = getGithubTokenImage(address);
      setTokenImages((prev) => ({
        ...prev,
        [address]: githubImage,
      }));
      return githubImage;
    }
  };

  const handleTokenImageError = (event) => {
    const imageElement = event.currentTarget;
    imageElement.onerror = null;
    imageElement.src = FallbackTokenIcon;
  };

  useEffect(() => {
    if (route && route.length > 0) {
      const newTokenImages = {};
      route.forEach((address) => {
        if (address) {
          newTokenImages[address] = getTokenImage(address);
        }
      });
      setTokenImages((prev) => ({
        ...prev,
        ...newTokenImages,
      }));
    }
  }, [route, chainId]);

  const getAdapter = (address) => {
    if (!address) return "Unknown";
    const foundAdapter = adapters.find(
      (a) => a?.address?.toLowerCase() === address?.toLowerCase(),
    );
    return foundAdapter ? foundAdapter.name : "Unknown";
  };
  const getTokenSymbol = (address) => {
    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase(),
    );
    return token ? token.symbol || token.ticker : "Unknown";
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-center items-center gap-5 py-4">
          <div className="w-8 h-8 bg-white/10  animate-pulse"></div>
          <div className="w-8 h-8 bg-white/10  animate-pulse"></div>
          <div className="w-8 h-8 bg-white/10  animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="w-full">
        <span className="text-[9px] text-white/20 tracking-[0.04em]">
          Please switch to a supported chain
        </span>
      </div>
    );
  }

  if (!route || route.length === 0) {
    return (
      <div className="w-full">
        <div className="text-[9px] text-white/20 tracking-[0.04em] py-4">
          No route available
        </div>
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-0 my-2 flex-wrap space-y-1">
        {route.map((address, index) => {
          const symbol = getTokenSymbol(address);
          return (
            <React.Fragment key={`${address}-${index}`}>
              <span className="flex-shrink-0 inline-flex items-center gap-[3px] px-2 py-[3px] bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-white/70">
                  {symbol === "ETH" ? "Ξ" : symbol === "USDC" ? "$" : ""}
                </span>
                <span className="text-[9px] font-semibold text-white/50">
                  {symbol}
                </span>
              </span>
              {index < route.length - 1 && (
                <>
                  <div className="flex-shrink-0 w-[14px] h-[1px] bg-white/20" />
                  {adapter && adapter[index] && (
                    <>
                      <span className="flex-shrink-0 px-2 py-[3px] bg-[#FF8A00]/10 border border-[#FF8A00]/30 text-[9px] font-bold text-[#FF8A00] tracking-[0.06em]">
                        {getAdapter(adapter[index])}
                      </span>
                      <div className="flex-shrink-0 w-[14px] h-[1px] bg-white/20" />
                    </>
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
  // return (
  //   <div className="w-full">
  //     <div className="relative">
  //       <div
  //         onMouseEnter={() => setIsHovered(true)}
  //         onMouseLeave={() => setIsHovered(false)}
  //         className="w-full flex justify-between items-center gap-5 py-4 relative"
  //       >
  //         <div className="w-full h-2  bg-[#FF8A00] absolute"></div>
  //         {route.map((address, index) => (
  //           <React.Fragment key={`${address}-${index}`}>
  //             <div className="flex items-center group relative">
  //               <img
  //                 className="w-8 h-8 object-contain  p-1 slippage-btn1"
  //                 src={tokenImages[address] || FallbackTokenIcon}
  //                 alt={getTokenSymbol(address)}
  //                 onError={handleTokenImageError}
  //               />
  //             </div>
  //           </React.Fragment>
  //         ))}
  //       </div>
  //       {isHovered && route.length > 1 && (
  //         <div
  //           className="absolute top-full left-0 right-0 mt-2 bg-black border-2 border-[#FF8A00]  p-4 z-50"
  //           onMouseEnter={() => setIsHovered(true)}
  //           onMouseLeave={() => setIsHovered(false)}
  //         >
  //           <div className="text-[#FF8A00] font-bold text-xs  mb-2">
  //             Route Details
  //           </div>
  //           <div className="flex flex-wrap items-center gap-2">
  //             {route.map((address, index) => (
  //               <React.Fragment key={`hover-${address}-${index}`}>
  //                 <div className="flex items-center gap-2">
  //                   <img
  //                     className="w-6 h-6 object-contain "
  //                     src={tokenImages[address] || FallbackTokenIcon}
  //                     alt={getTokenSymbol(address)}
  //                     onError={handleTokenImageError}
  //                   />
  //                   <span className="text-white text-xs">
  //                     {getTokenSymbol(address)}
  //                   </span>
  //                 </div>
  //                 {index < route.length - 1 && (
  //                   <>
  //                     <span className="text-[#FF8A00] text-xs">
  //                       <ChevronRight />
  //                     </span>
  //                     {adapter && adapter[index] && (
  //                       <span className="text-[#FF8A00] text-xs bg-[#FF8A00]/20 px-2 py-1 rounded">
  //                         {getAdapter(adapter[index])}
  //                       </span>
  //                     )}
  //                   </>
  //                 )}
  //               </React.Fragment>
  //             ))}
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // );
};

export default Routing;
