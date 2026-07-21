import { useRef, useEffect } from "react";
import EL from "../../../../assets/images/emp-logo.png";

import { useBalance } from "wagmi";
import { formatEther } from "viem";

export default function AddressCard({
  address,
  onCopy,
  onDisconnect,
  onClose,
}) {
  const popupRef = useRef(null);

  // Fetch balance inside the component
  const { data: balanceData } = useBalance({
    address: address,
  });

  const shortAddress =
    address && address.length > 8
      ? `${address.slice(0, 4)}...${address.slice(-4)}`
      : address;

  const balance = balanceData
    ? parseFloat(formatEther(balanceData.value)).toFixed(4)
    : "0";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="bg-black bg-opacity-40 backdrop-blur-sm py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out"
    >
      <div className="w-full flex justify-center my-auto items-center">
        <div className="md:max-w-[550px] w-full relative py-4 mx-auto clip-bg !px-4">
          <div className="flex justify-between gap-2 items-center pb-2 w-full">
            <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
              <img src={EL} alt="EL" className="w-10 object-contain" />
              Address
            </h2>
            <button onClick={onClose} className="close-btn">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="bg-[#FF8A00]/10 border border-[#FF8A00] py-6 w-full text-center mb-5 mt-3 uppercase">
            <p className="text-2xl text-[#FFD484] font-bold">{shortAddress}</p>
            <p className="text-white font-medium text-lg ">
              {balance} {balanceData?.symbol || "PLS"}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div
              className="relative hoverclip_2 uppercase flex gap-2 items-center justify-center text-white hover:bg-[#FF8A00]/10 px-6 py-3 w-full font-black text-xs text-center cursor-pointer transition-all"
              onClick={onCopy}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 26 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.6667 9.75H11.9167C10.72 9.75 9.75 10.72 9.75 11.9167V21.6667C9.75 22.8633 10.72 23.8333 11.9167 23.8333H21.6667C22.8633 23.8333 23.8333 22.8633 23.8333 21.6667V11.9167C23.8333 10.72 22.8633 9.75 21.6667 9.75Z"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.41602 16.2501H4.33268C3.75805 16.2501 3.20695 16.0218 2.80062 15.6155C2.39429 15.2091 2.16602 14.658 2.16602 14.0834V4.33341C2.16602 3.75878 2.39429 3.20768 2.80062 2.80135C3.20695 2.39502 3.75805 2.16675 4.33268 2.16675H14.0827C14.6573 2.16675 15.2084 2.39502 15.6147 2.80135C16.0211 3.20768 16.2493 3.75878 16.2493 4.33341V5.41675"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="relative z-10">Copy Address</span>
            </div>
            <div
              className="relative hoverclip_2 uppercase flex gap-2 items-center justify-center text-white hover:bg-[#FF8A00]/10 px-6 py-3 w-full font-black text-xs text-center cursor-pointer transition-all"
              onClick={onDisconnect}
            >
              <span className="relative z-10">Disconnect</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
