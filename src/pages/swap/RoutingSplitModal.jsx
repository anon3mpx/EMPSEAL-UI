// import React from "react";

// export default function RoutingSplitModal({ isOpen, onClose }) {
//   if (!isOpen) return null;

//   return (
//     <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
//       {/* Modal Container */}
//       <div className="relative md:max-w-[750px] w-full rounded-2xl clip-bg py-10 lg:px-10 md:px-7 px-2 font-orbitron">
//         {/* Close Button */}
//         <button
//           onClick={onClose}
//           className="absolute right-4 top-4 text-white tilt"
//         >
//           ✕
//         </button>
//         {/* Title */}
//         <h2 className="mb-8 text-center tracking-wide text-[#FF9900] text-xl font-bold font-orbitron">
//           Routing <br /> Split
//         </h2>
//         {/* Grid */}
//         <div className="flex lg:flex-nowrap w-full flex-wrap lg:gap-8 md:gap-6 gap-3 justify-center md:pt-8">
//           <PercentBox value="50.52%" />
//           <TideBox />
//           <TideBox />
//           <TideBox />
//           <PercentBox value="50.52%" />
//         </div>
//         {/* Grid */}
//         <div className="flex lg:flex-nowrap w-full flex-wrap lg:gap-8 md:gap-6 gap-3 justify-center pt-10">
//           <PercentBox value="50.52%" />
//           <TideBox />
//           <TideBox />
//           <TideBox />
//           <PercentBox value="50.52%" />
//         </div>
//       </div>
//     </div>
//   );
// }

// function TideBox() {
//   return (
//     <div className="flex flex-col items-center justify-center rounded border border-[#FF9900] bg-black py-2 text-center">
//       <span className="mb-1 md:text-xs text-[8px] font-semibold text-black py-1 bg-[#FF9900] w-full">
//         TIDE
//       </span>
//       <div className="md:text-[10px] text-[6px] font-bold text-[#FF9900] md:px-4 px-1 md:pb-2 pb-1 pt-1 flex gap-1 items-center">
//         PLSX
//         <svg
//           className="mt-[-1px] md:w-[10px] w-[5px]"
//           width={10}
//           height={10}
//           viewBox="0 0 12 12"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             d="M4.24268 2.48291L7.71843 5.95867L4.24268 9.43443"
//             stroke="#FF9900"
//             strokeWidth="3.43231"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>
//         CST
//       </div>
//     </div>
//   );
// }

// function PercentBox({ value }) {
//   return (
//     <div className="flex flex-col items-center justify-center rounded border border-[#FF9900] bg-black md:px-2 px-1 py-1">
//       <div className="mb-1 md:h-7 md:w-7 w-5 h-5 rounded-full bg-[#363636] flex justify-center items-center">
//         <svg
//           width={20}
//           height={20}
//           viewBox="0 0 20 20"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             d="M11.5182 4.28168L9.71434 2.43433L5.17202 7.02011L6.97591 8.82399L11.5182 4.28168Z"
//             fill="#F0B90B"
//           />
//           <path
//             d="M14.2567 7.02011L12.4528 5.17275L5.17202 12.497L6.97591 14.3008L14.2567 7.02011Z"
//             fill="#F0B90B"
//           />
//           <path
//             d="M4.23748 7.91118L6.04137 9.75854L4.23748 11.5624L2.43359 9.75854L4.23748 7.91118Z"
//             fill="#F0B90B"
//           />
//           <path
//             d="M16.9951 9.75853L15.1912 7.91118L7.91045 15.2354L9.71433 17.0393L16.9951 9.75853Z"
//             fill="#F0B90B"
//           />
//           <path
//             d="M11.5182 4.28168L9.71434 2.43433L5.17202 7.02011L6.97591 8.82399L11.5182 4.28168Z"
//             stroke="#F0B90B"
//             strokeWidth="0.994602"
//           />
//           <path
//             d="M14.2567 7.02011L12.4528 5.17275L5.17202 12.497L6.97591 14.3008L14.2567 7.02011Z"
//             stroke="#F0B90B"
//             strokeWidth="0.994602"
//           />
//           <path
//             d="M4.23748 7.91118L6.04137 9.75854L4.23748 11.5624L2.43359 9.75854L4.23748 7.91118Z"
//             stroke="#F0B90B"
//             strokeWidth="0.994602"
//           />
//           <path
//             d="M16.9951 9.75853L15.1912 7.91118L7.91045 15.2354L9.71433 17.0393L16.9951 9.75853Z"
//             stroke="#F0B90B"
//             strokeWidth="0.994602"
//           />
//         </svg>
//       </div>
//       <span className="md:text-[10.42px] text-[7px] font-medium text-[#FF9900]">{value}</span>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { useChainConfig } from "../../hooks/useChainConfig";

export default function RoutingSplitModal({ isOpen, onClose, bestRoute, tokenA, tokenB }) {
  // if (!isOpen || !bestRoute || bestRoute.type !== "SPLIT") return null;
  if (!isOpen || !bestRoute) return null;

  const [tokenImages, setTokenImages] = useState({});
  const { chainId, tokenList, adapters, wethAddress } = useChainConfig();

  // Function to get token image from tokenList.json
  const getLocalTokenImage = (address) => {
    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase()
    );
    return token ? token.logoURI || token.image : null;
  };

  // Function to get token image from GitHub
  const getGithubTokenImage = (address) => {
    return `https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/${address}.png`;
  };

  // Combined function to get token image from any source
  const getTokenImage = (address) => {
    // Check if the address is the native token address
    if (address === "0x0000000000000000000000000000000000000000") {
      return getLocalTokenImage(wethAddress);
    }

    // First check if we already have it cached
    if (tokenImages[address]) {
      return tokenImages[address];
    }

    // Check passed tokens first for custom tokens
    if (tokenA && tokenA.address.toLowerCase() === address.toLowerCase()) {
      return tokenA.image || tokenA.logoURI;
    }
    if (tokenB && tokenB.address.toLowerCase() === address.toLowerCase()) {
      return tokenB.image || tokenB.logoURI;
    }

    // Then check tokenList from current chain
    const localImage = getLocalTokenImage(address);
    if (localImage) {
      setTokenImages((prev) => ({
        ...prev,
        [address]: localImage,
      }));
      return localImage;
    }

    // Finally try GitHub
    if (chainId === 369) {
      const githubImage = getGithubTokenImage(address);
      setTokenImages((prev) => ({
        ...prev,
        [address]: githubImage,
      }));
      return githubImage;
    }

    return null;
  };

  // Get token symbol from chain-specific tokenList
  const getTokenSymbol = (address) => {
    if (address === "0x0000000000000000000000000000000000000000") {
      const wrappedToken = tokenList.find(
        (token) => token?.address?.toLowerCase() === wethAddress?.toLowerCase()
      );
      return wrappedToken ? wrappedToken.symbol || wrappedToken.ticker : "WETH";
    }

    // Check passed tokens
    if (tokenA && tokenA.address.toLowerCase() === address.toLowerCase()) {
      return tokenA.ticker || tokenA.symbol;
    }
    if (tokenB && tokenB.address.toLowerCase() === address.toLowerCase()) {
      return tokenB.ticker || tokenB.symbol;
    }

    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase()
    );
    return token ? token.symbol || token.ticker : "Unknown";
  };

  // Get adapter name from address
  const getAdapterName = (address) => {
    const adapter = adapters.find(
      (a) => a?.address?.toLowerCase() === address?.toLowerCase()
    );
    return adapter ? adapter.name : "Unknown";
  };

  // Format proportion to percentage
  const formatProportion = (proportion) => {
    // proportion is likely in basis points (e.g., 10000 = 100%)
    return proportion / 100;
  };

  // Initialize token images for all paths
  // useEffect(() => {
  //   if (bestRoute?.payload) {
  //     const newTokenImages = {};
  //     bestRoute.payload.forEach((pathObj) => {
  //       pathObj.path.forEach((address) => {
  //         if (address && !newTokenImages[address]) {
  //           const image = getTokenImage(address);
  //           if (image) {
  //             newTokenImages[address] = image;
  //           }
  //         }
  //       });
  //     });
  //     setTokenImages(newTokenImages);
  //   }
  // }, [bestRoute, chainId]);
  useEffect(() => {
    if (!bestRoute?.payload) return;

    const newTokenImages = {};

    if (bestRoute.type === "SPLIT" || bestRoute.type === "NOSPLIT") {
      bestRoute.payload.forEach((pathObj) => {
        pathObj.path.forEach((address) => {
          if (address && !newTokenImages[address]) {
            const img = getTokenImage(address);
            if (img) newTokenImages[address] = img;
          }
        });
      });
    }

    if (bestRoute.type === "CONVERGE") {
      const { tokenIn, tokenOut, intermediate } = bestRoute.payload;
      [tokenIn, tokenOut, intermediate].forEach((addr) => {
        if (addr && !newTokenImages[addr]) {
          const img = getTokenImage(addr);
          if (img) newTokenImages[addr] = img;
        }
      });
    }

    setTokenImages(newTokenImages);
  }, [bestRoute, chainId]);

  return (
    <div
      onClick={onClose}
      className="bg-black bg-opacity-40 mt-10 xl:py-12 lg:py-20 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[999999] fade-in-out fade-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="!bg-[#FFE6C0] relative md:max-w-[750px] w-full rounded-2xl clip-bg_r py-10 mt30 lg:px-5 md:px-4 px-2 font-orbitron  whitespace-nowrap"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 md:top-8 md:right-8 text-black tilt font-black text-xl"
        >
          ✕
        </button>
        <h2 className="mb-8 text-center tracking-wide text-black text-xl font-bold font-orbitron">
          Routing <br /> {bestRoute.type}
        </h2>
        {/* Split Type */}
        {(bestRoute.type === "SPLIT" || bestRoute.type === "NOSPLIT") && (
          <div className="flex flex-col gap-6 bg-black rounded-md md:px-10 px-5 md:py-16 py-8">
            {bestRoute.payload.map((pathObj, index) => {
              const firstToken = pathObj.path[0];
              const lastToken = pathObj.path[pathObj.path.length - 1];
              const firstTokenSymbol = getTokenSymbol(firstToken);
              const lastTokenSymbol = getTokenSymbol(lastToken);
              const proportion = formatProportion(pathObj.proportion);

              return (
                <div
                  key={index}
                  className="flex flex-wrap lg:flex-nowrap w-full lg:gap-8 md:gap-6 gap-3 justify-center items-center"
                >
                  {/* First PercentBox with token in */}
                  <PercentBox
                    value={`${proportion}%`}
                    tokenAddress={firstToken}
                    tokenSymbol={firstTokenSymbol}
                    tokenImage={tokenImages[firstToken]}
                    isStart={true}
                  />

                  {/* Middle section with adapters and path */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    {pathObj.adapters.map((adapterAddress, adapterIndex) => (
                      <AdapterBox
                        key={adapterIndex}
                        adapterAddress={adapterAddress}
                        adapterName={getAdapterName(adapterAddress)}
                        path={pathObj.path}
                        adapterIndex={adapterIndex}
                        tokenImages={tokenImages}
                        getTokenSymbol={getTokenSymbol}
                      />
                    ))}
                  </div>

                  {/* Last PercentBox with token out */}
                  <PercentBox
                    value={`${proportion}%`}
                    tokenAddress={lastToken}
                    tokenSymbol={lastTokenSymbol}
                    tokenImage={tokenImages[lastToken]}
                    isStart={false}
                  />
                </div>
              );
            })}
          </div>
        )}
        {/* Converge Type */}
        {bestRoute.type === "CONVERGE" &&
          (() => {
            const { tokenIn, tokenOut, intermediate, inputHops, outputHop } =
              bestRoute.payload;

            return (
              <div className="flex md:gap-10 gap-4 items-center md:justify-center md:pr-0 pr-5 bg-black rounded-md md:px-10 px-5 md:py-20 py-10">
                <div className="flex items-center md:gap-6 gap-3 justify-center">
                  <div className="flex flex-col gap-14">
                    {inputHops.map((hop, i) => (
                      <PercentBox
                        key={i}
                        value={`${formatProportion(hop.proportion)}%`}
                        tokenAddress={tokenIn}
                        tokenSymbol={getTokenSymbol(tokenIn)}
                        tokenImage={tokenImages[tokenIn]}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 flex-col">
                    {inputHops.map((hop, i) => (
                      <AdapterBox
                        key={i}
                        adapterName={getAdapterName(hop.adapter)}
                        path={[tokenIn, intermediate]}
                        adapterIndex={0}
                        tokenImages={tokenImages}
                        getTokenSymbol={getTokenSymbol}
                      />
                    ))}
                  </div>
                  <PercentBox
                    value="100%"
                    tokenAddress={intermediate}
                    tokenSymbol={getTokenSymbol(intermediate)}
                    tokenImage={tokenImages[intermediate]}
                  />
                </div>
                <div className="flex items-center md:gap-6 gap-3 justify-center">
                  <AdapterBox
                    adapterName={getAdapterName(outputHop.adapter)}
                    path={[intermediate, tokenOut]}
                    adapterIndex={0}
                    tokenImages={tokenImages}
                    getTokenSymbol={getTokenSymbol}
                  />
                  <PercentBox
                    value={`${formatProportion(outputHop.proportion)}%`}
                    tokenAddress={tokenOut}
                    tokenSymbol={getTokenSymbol(tokenOut)}
                    tokenImage={tokenImages[tokenOut]}
                  />
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function AdapterBox({
  adapterName,
  path,
  adapterIndex,
  tokenImages,
  getTokenSymbol,
}) {
  // Determine which tokens to show for this adapter
  const tokenIn = path[adapterIndex];
  const tokenOut = path[adapterIndex + 1] || path[path.length - 1];

  return (
    <div className="flex flex-col items-center justify-center rounded border border-[#FF9900] bg-black md:py-2 py-1 md:h-[73px] text-center md:min-w-[100px] min-w-20">
      <span className="mb-1 md:text-xs text-[8px] font-semibold text-black py-1 bg-[#FF9900] w-full">
        {adapterName}
      </span>
      <div className="md:text-[10px] text-[6px] font-bold text-[#FF9900] md:px-4 px-1 md:pb-2 pb-1 pt-1 flex gap-1 items-center">
        {getTokenSymbol(tokenIn)}
        <svg
          className="mt-[-1px] md:w-[10px] w-[5px]"
          width={10}
          height={10}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.24268 2.48291L7.71843 5.95867L4.24268 9.43443"
            stroke="#FF9900"
            strokeWidth="3.43231"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {getTokenSymbol(tokenOut)}
      </div>
    </div>
  );
}

function PercentBox({ value, tokenAddress, tokenSymbol, tokenImage, isStart }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-[#FF9900] bg-black md:px-3 px-2 py-1 md:h-[73px] md:min-w-[65px] min-w-[50px]">
      <div className="mb-1 flex justify-center items-center overflow-hidden">
        {tokenImage ? (
          <img
            src={tokenImage}
            alt={tokenSymbol}
            className="w-6 h-6 object-cover"
          />
        ) : (
          <div className="w-6 h-6 bg-[#FF9900] flex justify-center items-center text-white text-xs"></div>
        )}
      </div>
      {/* <span className="md:text-sm text-xs font-medium text-[#FF9900] mb-1">
        {isStart ? "Token In" : "Token Out"}
      </span> */}
      {/* <span className="md:text-xs text-[10px] font-bold text-white">
        {tokenSymbol}
      </span> */}
      <span className="md:text-[10.42px] text-[7px] font-medium text-[#FF9900]">
        {value}
      </span>
    </div>
  );
}
