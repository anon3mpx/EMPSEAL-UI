import { useRef, useEffect } from "react";
import { useBalance } from "wagmi";
import { formatEther } from "viem";
import EL from "../../../assets/images/emp-logo.png";

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
      className="relative bg-black text-white md:p-8 p-8 rounded-2xl clip-bg flex flex-col items-center gap-4 md:max-w-[540px] w-full border border-[#FF9900]"
    >
      <svg
        onClick={onClose}
        className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 tilt text-white hover:text-[#FF9900]"
        width={18}
        height={19}
        viewBox="0 0 18 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2 className="md:text-lg capitalize text-lg font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
        <img src={EL} alt="EL" className="w-10 object-contain" />
        Address
      </h2>
      <div className="bg-[#382B19] py-6 w-full rounded-xl text-center mb-5 mt-3">
        <p className="text-2xl text-[#FFD484] font-bold font-orbitron">
          {shortAddress}
        </p>
        <p className="text-white font-medium text-lg font-orbitron">
          {balance} {balanceData?.symbol || "PLS"}
        </p>
      </div>
      <div
        className="relative hoverclip_2 flex gap-2 items-center justify-center text-[#FF9900] rounded-lg px-6 py-3 w-full font-black text-lg font-orbitron text-center cursor-pointer transition-all"
        onClick={onCopy}
      >
        <svg
          width={26}
          height={26}
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.6667 9.75H11.9167C10.72 9.75 9.75 10.72 9.75 11.9167V21.6667C9.75 22.8633 10.72 23.8333 11.9167 23.8333H21.6667C22.8633 23.8333 23.8333 22.8633 23.8333 21.6667V11.9167C23.8333 10.72 22.8633 9.75 21.6667 9.75Z"
            stroke="#FF9900"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.41602 16.2501H4.33268C3.75805 16.2501 3.20695 16.0218 2.80062 15.6155C2.39429 15.2091 2.16602 14.658 2.16602 14.0834V4.33341C2.16602 3.75878 2.39429 3.20768 2.80062 2.80135C3.20695 2.39502 3.75805 2.16675 4.33268 2.16675H14.0827C14.6573 2.16675 15.2084 2.39502 15.6147 2.80135C16.0211 3.20768 16.2493 3.75878 16.2493 4.33341V5.41675"
            stroke="#FF9900"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="relative z-10">Copy Address</span>
      </div>
      <div
        className="mt-2 relative hoverclip_2 flex gap-2 items-center justify-center text-white rounded-lg px-6 py-3 w-full font-bold text-lg font-orbitron text-center cursor-pointer transition-all"
        onClick={onDisconnect}
      >
        <span className="relative z-10">Disconnect</span>
      </div>
    </div>
  );
}
