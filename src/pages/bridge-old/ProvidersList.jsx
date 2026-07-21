import { useEffect, useState } from "react";
import { useStore } from "../../redux/store/routeStore";
import ProvidersListCard from "../../components/ProviderList/ProviderListCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import SpinnerImage from "../../assets/images/spinner_middle.svg";
const ProvidersList = ({
  padding,
  quoteData,
  loading,
  setSelectedRoute,
  selectedRoute,
}) => {
  const path = useStore((state) => state.path);
  const [rubicRoutes, setRubicRoutes] = useState([]);
  const [rangoRoutes, setRangoRoutes] = useState([]);
  // const [symbiosisRoutes, setSymbiosisRoutes] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("rubic");

  useEffect(() => {
    if (quoteData) {
      setRubicRoutes(quoteData.rubic?.routes || []);
      setRangoRoutes(quoteData.rango?.results || []);
      // setSymbiosisRoutes(quoteData.symbiosis || null);

      // console.log("rubicQuoteData", quoteData.rubic?.routes || 'No Rubic routes available');
      // console.log("rangoRoutesData:", quoteData.rango?.results || 'No Rango routes available');
      // console.log("rangoRoutesData:", quoteData.rango || 'No Rango data available');
      // console.log("symbiosisRoutesData:", quoteData.symbiosis || 'No Symbiosis data available');
      // console.log("symbiosisRoutesData:", quoteData.symbiosis?.estimatedTime || 'No Symbiosis time estimate available');
    } else {
      setRubicRoutes([]);
      setRangoRoutes([]);
      // setSymbiosisRoutes(null);
    }
  }, [quoteData]);

  const formatTokenAmount = (amount, decimals) => {
    if (!amount || !decimals) return "0";
    try {
      return (parseFloat(amount) / 10 ** decimals).toFixed(6);
    } catch (error) {
      console.warn("Error formatting token amount:", error);
      return "0";
    }
  };

  const getProviderAvailability = () => {
    const available = {
      rubic: rubicRoutes?.length > 0,
      rango: rangoRoutes?.length > 0,
      // symbiosis: !!symbiosisRoutes
    };

    if (!available.rubic && !available.rango && !available.symbiosis) {
      return {
        rubic: false,
        rango: false,
        // symbiosis: false,
        allUnavailable: true,
      };
    }

    return { ...available, allUnavailable: false };
  };

  return (
    <div className="relative sctable">
      {/* Toggle Buttons */}
      <div className="flex justify-center absolute top-[-71px] z-20">
        <button
          className={`px-6 py-2 md:text-base text-sm font-extrabold border border-[#FF8A00] rounded-t-[10px]  transition-all duration-200
            ${
              selectedProvider === "rubic"
                ? "bg-[#FF8A00] text-black md:w-[220px] h-[70px]"
                : "text-orange-400 md:w-[160px] h-[70px]  "
            }
            ${
              !getProviderAvailability().rubic
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-[#FF8A00]"
            }`}
          onClick={() =>
            getProviderAvailability().rubic && setSelectedProvider("rubic")
          }
          disabled={!getProviderAvailability().rubic}
        >
          Rubic
        </button>
        <button
          className={`px-6 py-2 md:text-base text-sm font-extrabold border border-[#FF8A00] rounded-t-[10px]  transition-all duration-200
            ${
              selectedProvider === "rango"
                ? "bg-[#FF8A00] text-black md:w-[220px] h-[70px]"
                : "text-orange-400 md:w-[160px] h-[70px]  "
            }
            ${
              !getProviderAvailability().rango
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-[#FF8A00]"
            }`}
          onClick={() =>
            getProviderAvailability().rango && setSelectedProvider("rango")
          }
          disabled={!getProviderAvailability().rango}
        >
          Rango
        </button>
        {/*  <button
          className={`w-[100px] h-[35px] flex justify-center items-center rounded-md bg-black roboto text-[12px] font-bold border
            ${selectedProvider === "symbiosis" ? "border-[#FF8A00] text-[#FF8A00]" : "border-[#3b3c4e] text-white"}
            ${!getProviderAvailability().symbiosis ? "opacity-50 cursor-not-allowed" : "hover:border-[#FF8A00] hover:text-[#FF8A00]"}`}
          onClick={() => getProviderAvailability().symbiosis && setSelectedProvider("symbiosis")}
          disabled={!getProviderAvailability().symbiosis}
        >
          Symbiosis
        </button> */}
      </div>
      <div
        className={`clip-bg1 border-[2px] border-[#FF8A00] rounded-b-xl rounded-tr-xl bg-black ${padding}`}
      >
        <div className="w-full flex justify-center p-5">
          <p className="w-[100px] h-[35px] flex justify-center items-center rounded-md bg-black roboto text-[#FF8A00] text-[12px] font-bold border border-[#FF8A00]">
            Providers
          </p>
        </div>

        <div className="p-4">
          {loading ? (
            <LoadingSpinner SpinnerImage={SpinnerImage} />
          ) : getProviderAvailability().allUnavailable ? (
            <div className="text-center">
              <p className="text-gray-400 mb-2">
                No providers are currently available.
              </p>
              <p className="text-gray-500 text-sm">
                Please try again later or adjust your swap parameters.
              </p>
            </div>
          ) : selectedProvider === "rubic" ? (
            rubicRoutes?.length > 0 ? (
              <div className="max-h-[535px] overflow-y-auto flex flex-col gap-4">
                {rubicRoutes.map((route, index) => (
                  <ProvidersListCard
                    key={index}
                    tokenAmount={parseFloat(
                      route.estimate.destinationTokenAmount
                    ).toFixed(6)}
                    tokenSymbol={route.tokens.to.symbol}
                    tokenRouter={route.providerType}
                    tokenAmountUsd={parseFloat(
                      route.estimate.destinationUsdAmount
                    ).toFixed(2)}
                    protocolFee={
                      route.fees.gasTokenFees.protocol.fixedUsdAmount
                    }
                    providerFee={
                      route.fees.gasTokenFees.provider?.fixedUsdAmount
                    }
                    percentFee={route.fees.percentFees.percent}
                    fees={(
                      parseFloat(
                        route.fees.gasTokenFees.protocol.fixedUsdAmount
                      ) +
                      parseFloat(
                        route.fees.gasTokenFees.provider?.fixedUsdAmount || 0
                      )
                    ).toFixed(2)}
                    timeDuration={route.estimate.durationInMinutes}
                    onSelect={() => setSelectedRoute(route)}
                    isSelected={selectedRoute === route}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                No providers available.
              </p>
            )
          ) : selectedProvider === "rango" ? (
            rangoRoutes?.length > 0 ? (
              <div className="max-h-[535px] overflow-y-auto flex flex-col gap-4">
                {rangoRoutes.map((route, index) => {
                  const lastSwap = route.swaps[route.swaps.length - 1];

                  const totalTime = route.swaps.reduce(
                    (total, swap) => total + (swap.estimatedTimeInSeconds || 0),
                    0
                  );

                  const totalFees = route.swaps.reduce((total, swap) => {
                    const swapFees =
                      swap.fee?.reduce(
                        (acc, fee) => acc + (parseFloat(fee.amount) || 0),
                        0
                      ) || 0;
                    return total + swapFees;
                  }, 0);

                  return (
                    <ProvidersListCard
                      key={index}
                      tokenAmount={parseFloat(route.outputAmount).toFixed(6)}
                      tokenSymbol={lastSwap.to.symbol}
                      tokenRouter={route.swaps[0]?.swapperId || "Unknown"}
                      tokenAmountUsd={(
                        parseFloat(route.outputAmount) *
                        parseFloat(lastSwap.to.usdPrice || 0)
                      ).toFixed(2)}
                      protocolFee={totalFees.toFixed(5)}
                      providerFee="0"
                      percentFee={"0"}
                      fees={totalFees.toFixed(2)}
                      timeDuration={Math.ceil(totalTime / 60)}
                      onSelect={() => setSelectedRoute(route)}
                      isSelected={selectedRoute === route}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                No providers available.
              </p>
            )
          ) : (
            /* symbiosisRoutes ? (
            <div className="max-h-[535px] overflow-y-auto flex flex-col gap-4">
              <ProvidersListCard
                key="symbiosis"
                tokenAmount={formatTokenAmount(symbiosisRoutes?.tokenAmountOut?.amount, symbiosisRoutes?.tokenAmountOut?.decimals)}
                tokenSymbol={symbiosisRoutes?.tokenAmountOut?.symbol || ""}
                tokenRouter={"Symbiosis"}
                tokenAmountUsd={(parseFloat(symbiosisRoutes?.amountInUsd?.amount || 0) / 10 ** symbiosisRoutes?.amountInUsd?.decimals).toFixed(2)}
                protocolFee={formatTokenAmount(symbiosisRoutes?.fee?.amount, symbiosisRoutes?.fee?.decimals)}
                providerFee={symbiosisRoutes?.fees?.[1] ? formatTokenAmount(symbiosisRoutes?.fees[1]?.amount, symbiosisRoutes?.fees[1]?.decimals) : "0"}
                percentFee={"0"}
                fees={(
                  parseFloat(formatTokenAmount(symbiosisRoutes?.fees?.[0]?.amount || "0", symbiosisRoutes?.fees?.[0]?.decimals || 0)) +
                  parseFloat(formatTokenAmount(symbiosisRoutes?.fees?.[1]?.amount || "0", symbiosisRoutes?.fees?.[1]?.decimals || 0))
                ).toFixed(6)}
                timeDuration={symbiosisRoutes?.estimatedTime || "Unknown"}
                onSelect={() => setSelectedRoute(symbiosisRoutes)}
                isSelected={selectedRoute === symbiosisRoutes}
              />
            </div>
          ) : (
            <p className="text-gray-400 text-center">No providers available.</p>
          ) */
            <p className="text-gray-400 text-center">No providers available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvidersList;
