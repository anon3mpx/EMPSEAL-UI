import React, { useState } from "react";
import Emp from "./Emp";
import Wallet from "./Wallet";
import ProvidersList from "./ProvidersList";
import ProvidersListNew from "./ProvidersList-new";
import { Link } from "react-router-dom";
import chainsData from "../chainsList.json";
import Routing from "../swap/Routing";
import BG from "../../assets/images/empx-bg1.webp";

const Normal = () => {
  const [padding, setPadding] = React.useState("lg:min-h-[573px] h-full");
  const [loading, setLoading] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeTab, setActiveTab] = useState("cross"); // 'cross' | 'native'

  const rangoApiKey =
    import.meta.env.VITE_RANGO_API_KEY || import.meta.env.RANGO_API_KEY || "";
  const rangoAffiKey =
    import.meta.env.VITE_RANGO_AFFI_KEY || import.meta.env.RANGO_AFFI_KEY || "";
  const integratorAddress = "0x02E6B1C1E78A7C71798262ef34386182C553bA8C";

  const quoteAll = async (
    selectedTokenA,
    selectedTokenB,
    amountIn,
    receiver,
    address,
  ) => {
    setLoading(true);
    // console.log("tokens:", selectedTokenA.address, selectedTokenB.address);

    function getChainId(token) {
      const chainInfo = chainsData.find(
        (chain) => chain.name === token.blockchainNetwork,
      );
      const chainId = chainInfo ? chainInfo.chainId : "Not Found";
      // console.log("chainId: ", chainId)
      return chainId;
    }

    // const chainInfo = chainsData.find(
    //   (chain) => chain.name === selectedTokenA.blockchainNetwork
    // );
    // const chainId = chainInfo ? chainInfo.chainId : "Not Found";
    // console.log("chainId: ", chainId)

    try {
      const amountBigInt = BigInt(
        Math.round(parseFloat(amountIn) * 10 ** selectedTokenA.decimals),
      );
      // Rubic API request
      const rubicPayload = {
        dstTokenAddress: selectedTokenB.address,
        dstTokenBlockchain: selectedTokenB?.blockchainNetwork?.toUpperCase(),
        referrer: "rubic.exchange",
        srcTokenAddress: selectedTokenA.address,
        srcTokenAmount: amountIn,
        srcTokenBlockchain: selectedTokenA?.blockchainNetwork?.toUpperCase(),
        receiver: receiver,
        integratorAddress: integratorAddress,
        fromAddress: address,
      };

      // console.log("rubicPayload:", rubicPayload);

      // Rango API request
      const rangoPayload = {
        from: {
          blockchain: selectedTokenA?.blockchainNetwork?.toUpperCase(),
          token: selectedTokenA.address,
        },
        to: {
          blockchain: selectedTokenB?.blockchainNetwork?.toUpperCase(),
          token: selectedTokenB.address,
        },
        amount: amountIn,
        affiliateRef: rangoAffiKey,
        affiliatePercent: 0.3,
      };

      // console.log("rangoPayload:", rangoPayload);

      // Symbiosis API request
      /*
        const symbiosisPayload = {
          tokenAmountIn: {
              amount: amountBigInt.toString(),
              address: selectedTokenA.address,
              symbol: selectedTokenA.symbol,
              chainId: getChainId(selectedTokenA),
              decimals: selectedTokenA.decimals,
          },
          tokenOut: {
              address: selectedTokenB.address,
              symbol: selectedTokenB.symbol,
              chainId: getChainId(selectedTokenB),
              decimals: selectedTokenB.decimals,
          },
          to: receiver,
          from: address,
          slippage: 300,
        };
        */

      // console.log("symbiosisPayload:", symbiosisPayload);

      // API calls
      const results = await Promise.allSettled([
        fetch("https://api-v2.rubic.exchange/api/routes/quoteAll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rubicPayload),
        }).then((res) =>
          res.ok ? res.json() : Promise.reject(`Rubic error: ${res.status}`),
        ),

        fetch(
          `https://api.rango.exchange/routing/bests?apiKey=${rangoApiKey}`,
          {
            method: "POST",
            headers: { Accept: "*/*", "Content-Type": "application/json" },
            body: JSON.stringify(rangoPayload),
          },
        ).then((res) =>
          res.ok ? res.json() : Promise.reject(`Rango error: ${res.status}`),
        ),

        /*
            fetch('https://api.symbiosis.finance/crosschain/v1/swap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(symbiosisPayload),
            }).then(res => res.ok ? res.json() : Promise.reject(`Symbiosis error: ${res.status}`))
            */
      ]);

      // Process results
      const combinedQuotes = {
        rubic: results[0].status === "fulfilled" ? results[0].value : null,
        rango: results[1].status === "fulfilled" ? results[1].value : null,
        // symbiosis: results[2].status === 'fulfilled' ? results[2].value : null,
      };

      // Log any errors
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const provider = ["rubic", "rango", "symbiosis"][index];
          console.warn(`${provider} API call failed:`, result.reason);
        }
      });
      // console.log("Combined quotes:", combinedQuotes);
      // console.log("quoteData Normal: ", quoteData);
      setQuoteData(combinedQuotes);
    } catch (error) {
      console.error("Error calling APIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    router.push("/hyperlane");
    // setActiveTab('native'); // Set the active tab
    // Navigate to the "/hyperlane" page
  };
  return (
    <>
      <div className="pt-3 pb-10 relative">
        <img
          src={BG}
          alt="Background"
          className="w-full h-full fixed top-0 left-0 -z-10"
        />
        <div className="md:max-w-[800px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap px-3 mb-5 md:mt-0 mt-5">
          <h1 className="lg:text-5xl md:text-[40px] text-3xl text-center text-[#FF8A00]  font-bold mb-2">
            Seamless
          </h1>
          <h2 className="lg:text-5xl md:text-[40px] text-3xl text-center text-white  font-bold">
            Cross Chain Swaps
          </h2>
          <div className="flex justify-center gap-4 w-full mt-7 md:flex-nowrap flex-wrap md:px-0 px-20">
            {/* <div
              onClick={() => setActiveTab("cross")}
              className={`${
                activeTab === "cross" ? "border-[#FF8A00]" : "border-[#3b3c4e]"
              } cursor-pointer md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
            >
              Cross Chain Swap
            </div> */}
            <Link className="md:max-w-[200px] w-full" to={"/native-bridge"}>
              <div
                className={`${
                  activeTab === "native"
                    ? "border-[#FF8A00]"
                    : "border-[#3b3c4e] "
                }   opacity-50 px-3 py-2 md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border border-white text-white text-[15px] font-bold roboto`}
              >
                Native Bridge
              </div>
            </Link>
            <Link className="md:max-w-[200px] w-full" to={"/via-bridge"}>
              <div
                className={`${
                  activeTab === "native"
                    ? "border-[#FF8A00]"
                    : "border-[#3b3c4e] "
                }   opacity-50 px-3 py-2 md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border border-white text-white text-[15px] font-bold roboto`}
              >
                Via Bridge
              </div>
            </Link>
          </div>
        </div>
        <div className="md:max-w-[710px] mx-auto w-full md:px-1 px-3 justify-center xl:gap-4 gap-4 items-start py-2">
          <div className=" w-full">
            {/* <div className="md:hidden block">
              {activeTab === "cross" ? <Wallet /> : <div></div>}
            </div> */}
            {activeTab === "cross" ? (
              <Emp
                setPadding={setPadding}
                quoteAll={quoteAll}
                loading={loading}
                selectedRoute={selectedRoute}
                quoteData={quoteData}
                setQuoteData={setQuoteData}
              />
            ) : (
              <div></div>
            )}
          </div>
        </div>
        <div className="md:block block">
          {activeTab === "cross" ? <Wallet /> : <div></div>}
        </div>
      </div>
      <div className="mt-3 absolute ">
        <Routing />
      </div>
      <div className="w-full md:pb-20 pb-10 md:max-w-[1000px] mx-auto px-4">
        <div className="mt-3">
          {activeTab === "cross" ? (
            <ProvidersList
              padding={padding}
              quoteData={quoteData}
              loading={loading}
              setSelectedRoute={setSelectedRoute}
              selectedRoute={selectedRoute}
            />
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </>
  );
};

export default Normal;
