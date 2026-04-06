import React, { useState } from "react";
import Walletconnect from "../../assets/images/walletconnect.png";
import BNB from "../../assets/images/BNB.png";
import Mask from "../../assets/images/meta-mask.png";
import Portis from "../../assets/images/portis.png";

const ConnectWallet = ({ onClose }) => {
  return (
    <>
      <div className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div className="md:max-w-[390px] w-full bg-black border border-white rounded-3xl relative py-6 px-6 mx-auto">
            <svg
              onClick={onClose}
              className="absolute cursor-pointer right-8 top-9"
              width={18}
              height={19}
              viewBox="0 0 18 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                stroke="#ffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex items-center gap-4 md:flex-nowrap flex-wrap lg:justify-between w-full">
              <div className="flex gap-4 items-center cursor-pointer mt-2">
                <p className="text-lg font-medium text-white roboto">Connect Wallet</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-6">
              <img src={Mask} alt="Mask" />
              <div className="text-white text-sm font-bold roboto leading-normal">
                Meta Mask
              </div>
            </div>
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-4">
              <img src={BNB} alt="Mask" />
              <div className="text-white text-sm font-bold roboto leading-normal">
                Binance Chain Wallet
              </div>
            </div>
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-4">
              <img src={Walletconnect} alt="Walletconnect" />
              <div className="text-white text-sm font-bold roboto leading-normal">
                Wallet Connect
              </div>
            </div>
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-4">
              <img src={Portis} alt="Portis" />
              <div className="text-white text-sm font-bold roboto leading-normal">
                Portis
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectWallet;
