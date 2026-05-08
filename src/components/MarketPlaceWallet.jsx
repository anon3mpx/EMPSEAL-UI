import React, { useEffect, useState } from "react";
import Logo from "../assets/images/emp-logo.png";
import Line from "../assets/images/Frame 25.png";
import Fra from "../assets/images/Frame 86.png";
import Wallets from '../assets/images/wallet.svg';
import Home from '../assets/images/house.svg';
import Links from '../assets/images/link.svg';
import { Link } from "react-router-dom";
// import LineChart from "./LinesGraphs";
import ConnectWallet from "../pages/swap/ConnectWallet";
import WalletConnect from "../pages/swap/WalletConnect/WalletConnect";
import { useBalance } from 'wagmi'
import { formatEther } from "viem";




const MarketPlaceWallet = () => {
  const [isConnectWalletVisible, setConnectWalletVisible] = useState(false);
  const [balance, setBalance] = useState(0)
  const result = useBalance({
    address: '0x4557B18E779944BFE9d78A672452331C186a9f48',
  })
  useEffect(() => {
    if (result.data) {
      setBalance(formatEther(result.data.value))
    }
  }, [result])


  return (
    <>
      <div className="w-full max-w-md  border_gradient p-4 bg-transparent flex gap-4 ">
        <div className="flex-1 bg-black  p-4 relative z-10">
          <div className="flex gap-2 items-center">
            <img src={Logo} alt="Logo" />
            <Link className="text-white underline text-sm"
              to="https://snowtrace.io/address/0xC4729E56b831d74bBc18797e0e17A295fA77488c"
              target="_blank"
            >
              
             0xC472...488c
            </Link>
          </div>
          {/* <div>
            <LineChart />
          </div> */}
          <img src={Line} alt="Line" />
          <div className="text-white text-[11px] font-normal roboto">
            Pulsechain
          </div>
          <div className="flex gap-3 items-center">
            <img src={Fra} alt="Fra" />
            <div className="text-white text-[14.29px] font-bold roboto">
              {parseFloat(balance).toFixed(6)}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 flex-col wallet_bg relative z-10">
          <WalletConnect />
        <button className="flex items-center justify-start gap-2 bg-[#FF8A00] text-black text-sm py-2 px-4 rounded-md font-semibold roboto">
        <img className="pe-2" src={Home} />
          Home Page
        </button>
        </div>
        
      </div>
      <div aria-label="Modal">
        {isConnectWalletVisible && (
          <ConnectWallet onClose={() => setConnectWalletVisible(false)} />
        )}
      </div>
    </>
  );
};

export default MarketPlaceWallet;