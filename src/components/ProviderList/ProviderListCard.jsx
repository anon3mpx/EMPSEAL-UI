import ZigZag from "../../assets/images/zig_zag_provider.svg";
import DollarSign from "../../assets/images/dollar-sign.svg";
import Clock from "../../assets/images/clock.svg";
import React, { useState } from "react";

const ProvidersListCard = ({
  SpinnerImage,
  tokenAmount,
  tokenSymbol,
  tokenRouter,
  tokenAmountUsd,
  fees,
  timeDuration,
  protocolFee,
  providerFee,
  percentFee,
  onSelect,
  isSelected,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        onClick={onSelect} // Set the selected card on click
        className={`flex md:justify-between justify-center items-center md:flex-nowrap md:gap-2 gap-4 flex-wrap bg-black border border-[#FF9900] rounded-[10px] lg:px-10 lg:py-6 md:px-6 py-4 px-3 hover:bg-[#FF9900]/10 transition ${
          isSelected ? "bg-[#FF9900]/10" : ""
        }`}
      >
        <div className="grid grid-cols-[55%_50%]  justify-between p-3">
          <div className="flex items-center gap-4">
            <span className="text-white text-xl font-bold roboto">
              {tokenSymbol}
            </span>
            <span className="text-white text-xl font-bold roboto">
              {tokenAmount}
            </span>
            <div className="flex items-center">
              {/* <img src={ZigZag} alt='Loading' className='w-3 h-4' /> */}
              <span className="text-sm font-sm text-white roboto">
                {tokenRouter}
              </span>
            </div>
          </div>
          <div className="flex flex-col ">
            <span className="text-base font-normal roboto text-white text-end">
              ~{tokenAmountUsd}$
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[40%_40%] justify-between bg-transparent gap-4 items-center text-[#FF9900] p-3 relative">
          <div
            className=" flex items-center"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img src={DollarSign} alt="Loading" className="w-4 h-6" />
            <span className="text-sm font-base roboto">~${fees}</span>

            {hovered && (
              <div className="absolute bottom mb-2 z-50 md:-left-36 left-0 p-3 bg-[#FF9900]/90 text-white text-xs rounded-lg shadow-lg">
                <p>
                  <strong>Protocol Fee:</strong> {protocolFee}
                </p>
                <p>
                  <strong>Provider Fee:</strong> {providerFee}
                </p>
                <p>
                  <strong>Percent Fee:</strong> {percentFee}%
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end items-center gap-1">
            <img src={Clock} alt="Loading" className="w-3 h-4" />

            <span className=" text-sm font-base  roboto ">{timeDuration}M</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProvidersListCard;
