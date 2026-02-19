import React, { useEffect, useState } from "react";
// import Arrow from "../../assets/images/arrow-2.svg";
import LoadingIcon from "../../assets/icons/loading.svg";
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
        <div className="flex justify-between gap-2 items-start">
          <p className="text-[#FFE3BA] text-lg font-bold font-orbitron">
            DETAILS
          </p>
          <div className="flex gap-2 items-center">
            <div className="text-right text-[#FF9900] text-2xl font-extrabold font-orbitron">
              SPLIT
              <p className="text-right text-[#FF9900] text-sm font-normal font-orbitron">
                Routing
              </p>
            </div>
            <img
              src={LoadingIcon}
              alt="Loading"
              className="w-7 h-7 animate-spin"
            />
          </div>
        </div>
        <div className="flex justify-center items-center gap-5 py-4">
          <div className="w-8 h-8 bg-[#FF9900]/10 rounded-full animate-pulse"></div>
          <div className="w-8 h-8 bg-[#FF9900]/10 rounded-full animate-pulse"></div>
          <div className="w-8 h-8 bg-[#FF9900]/10 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="w-full">
        <div className="flex justify-between gap-2 items-start">
          <p className="text-[#FFE3BA] text-lg font-bold font-orbitron">
            DETAILS
          </p>
          <div className="flex gap-2 items-center">
            <div className="text-right text-[#FF9900] text-2xl font-extrabold font-orbitron">
              SPLIT
              <p className="text-right text-[#FF9900] text-sm font-normal font-orbitron">
                Routing
              </p>
            </div>
          </div>
        </div>
        <span className="text-white text-center flex justify-center roboto mt-2">
          Please switch to a supported chain
        </span>
      </div>
    );
  }

  if (!route || route.length === 0) {
    return (
      <div className="w-full">
        <div className="flex justify-between gap-2 items-start">
          <p className="text-[#FFE3BA] text-lg font-bold font-orbitron">
            DETAILS
          </p>
          <div className="flex gap-2 items-center">
            <div className="text-right text-[#FF9900] text-2xl font-extrabold font-orbitron">
              SPLIT
              <p className="text-right text-[#FF9900] text-sm font-normal font-orbitron">
                Routing
              </p>
            </div>
          </div>
        </div>
        <div className="text-center text-gray-400 py-4">No route available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between gap-2 items-start">
        <p className="text-[#FFE3BA] text-lg font-bold font-orbitron">
          DETAILS
        </p>
        <div className="flex gap-2 items-center">
          <div className="text-right text-[#FF9900] text-2xl font-extrabold font-orbitron">
            SPLIT
            <p className="text-right text-[#FF9900] text-sm font-normal font-orbitron">
              Routing
            </p>
          </div>
          <Check size="30" className="text-green-500" />
        </div>
      </div>
      <div className="relative">
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full flex justify-between items-center gap-5 py-4 relative"
        >
          <div className="w-full h-2 rounded-full bg-[#FF9900] absolute"></div>
          {route.map((address, index) => (
            <React.Fragment key={`${address}-${index}`}>
              <div className="flex items-center group relative">
                <img
                  className="w-8 h-8 object-contain rounded-full p-1 bg-white"
                  src={tokenImages[address] || "/path/to/fallback.png"}
                  alt={getTokenSymbol(address)}
                  onError={(e) => {
                    e.target.src = "/path/to/fallback/image.png";
                  }}
                />
                {/* <span className="text-white text-xs mt-1 font-orbitron">
                  {getTokenSymbol(address)}
                </span> */}

                {/* Hover tooltip for adapter name */}
                {/* {adapter && adapter[index] && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black border border-[#FF9900] text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {getAdapter(adapter[index])}
                  </div>
                )} */}
              </div>

              {/* {index < route.length - 1 && (
                <div className="flex items-center">
                  <img 
                    className="w-6 h-6 object-contain" 
                    src={Arrow} 
                    alt="Arrow" 
                    style={{ filter: "invert(58%) sepia(98%) saturate(1358%) hue-rotate(1deg) brightness(103%) contrast(106%)" }}
                  />
                </div>
              )} */}
            </React.Fragment>
          ))}
        </div>
        {isHovered && route.length > 1 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-black border-2 border-[#FF9900] rounded-lg p-4 z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="text-[#FF9900] font-bold text-sm font-orbitron mb-2">
              Route Details
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {route.map((address, index) => (
                <React.Fragment key={`hover-${address}-${index}`}>
                  <div className="flex items-center gap-2">
                    <img
                      className="w-6 h-6 object-contain rounded-full"
                      src={tokenImages[address]}
                      alt={getTokenSymbol(address)}
                    />
                    <span className="text-white text-xs">
                      {getTokenSymbol(address)}
                    </span>
                  </div>
                  {index < route.length - 1 && (
                    <>
                      <span className="text-[#FF9900] text-xs"><ChevronRight/></span>
                      {adapter && adapter[index] && (
                        <span className="text-[#FF9900] text-xs bg-[#FF9900]/20 px-2 py-1 rounded">
                          {getAdapter(adapter[index])}
                        </span>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Routing;
