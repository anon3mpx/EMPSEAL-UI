import { useRef, useEffect } from "react";
import Min from "../../../assets/images/swap-emp.png";
import Dis from "../../../assets/images/dis.png";
import Copy from "../../../assets/images/copy.png";
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
      className="relative bg-black text-white md:p-12 p-8 rounded-2xl clip-bg flex flex-col items-center gap-4 md:max-w-[430px] w-full border border-[#FF9900]"
    >
      <svg
        onClick={onClose}
        className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 tilt"
        width={18}
        height={19}
        viewBox="0 0 18 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <img
        src={Min}
        alt="Avatar"
        className="md:w-[150px] w-16 rounded-full object-contain"
      />
      <p className="text-2xl font-bold roboto">{shortAddress}</p>
      <p className="text-gray-400 font-medium text-xl mb-5">{balance} PLS</p>
      <div
        className="gtw md:right-[-10px] right-[-5px] relative group text-black bg-[#FF9900] rounded-lg px-6 py-3 w-full font-black text-[28px] font-orbitron text-center cursor-pointer transition-all"
        onClick={onCopy}
      >
        <div className="w-full absolute md:top-4 top-4 md:-left-5 -left-5 lg:z-[-1] bg-transparent border-2 border-[#FF9900] rounded-[10px] h-[68px]"></div>
        {/* <img
          src={Copy}
          alt="Copy"
          className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto z-0"
        /> */}
        <span className="relative z-10">Copy Address</span>
      </div>
      <div
        className="mt-6 gtw md:right-[-10px] right-[-5px] relative group text-black bg-[#FF9900] rounded-lg px-6 py-3 w-full font-black text-[28px] font-orbitron text-center cursor-pointer transition-all"
        onClick={onDisconnect}
      >
        <div className="w-full absolute md:top-4 top-4 md:-left-5 -left-5 lg:z-[-1] bg-transparent border-2 border-[#FF9900] rounded-[10px] h-[68px]"></div>
        {/* <img
          src={Copy}
          alt="Copy"
          className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto z-0"
        /> */}
        <span className="relative z-10">Disconnect</span>
      </div>
    </div>
  );
}
