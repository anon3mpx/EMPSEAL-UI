import React, { useState, useEffect, useCallback } from "react";
import Logo from "../../assets/images/emp-logo.png";
import WalletImg from "../../assets/images/wallet-2.svg";
import Home from "../../assets/images/house.svg";
import { Link } from "react-router-dom";
import WalletConnect from "./WalletConnect/WalletConnect";
import { useBalance, useAccount } from "wagmi";
import { formatEther } from "viem";

const truncateAddress = (address) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const Wallet = () => {
  const [balance, setBalance] = useState(null);
  const [chainIconUrl, setChainIconUrl] = useState(undefined);
  const [chainName, setChainName] = useState(undefined);
  const { address, chain } = useAccount();
  const { data, isLoading, isError, error } = useBalance({ address });

  useEffect(() => {
    if (address && data) {
      setBalance(formatEther(data.value));
    } else if (!address) {
      setBalance("0.00");
    }
  }, [address, data]);

  const formattedBalance = isLoading
    ? "Loading..."
    : isError
    ? "Error fetching balance"
    : balance
    ? `${parseFloat(balance).toFixed(2)}`
    : "0.00";

  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  const handleChainChange = useCallback((iconUrl, name) => {
    setChainIconUrl(iconUrl);
    setChainName(name);
  }, []);

  return (
    <>
      {/* <div className="w-full border border-white rounded-xl py-4 2xl:px-6 lg:px-5 px-4 bg-black md:flex gap-8">
      <div className="flex flex-col bg-[#161616] p-5 rounded-lg w-full md:max-w-[202px]">
        <div className="flex items-center gap-2 mb-4">
          <img src={Logo} alt="Logo" className="h-8" />
          {address ? (
            <Link
              to="#"
              target="_blank"
              className="text-white font-mono text-sm truncate roboto"
            >
              {truncateAddress(address)}
            </Link>
          ) : (
            <span className="text-gray-400">Not Connected</span>
          )}
        </div>
        {chainName ? (
          <div className="text-white text-sm font-medium mb-2 flex items-center roboto">
            {chainIconUrl && (
              <img
                src={chainIconUrl}
                alt={`${chainName} icon`}
                className="w-6 h-6 mt-1 me-2"
              />
            )}
            {chainName}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No chain found</div>
        )}
        <div className="flex items-center gap-2">
          <div className="text-white text-lg font-bold roboto">
            {formatNumber(formattedBalance)}{" "}
            {chain?.nativeCurrency?.symbol || "ETH"}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 flex-col wallet_bg z-10 md:mt-0 mt-3 absolute wallet-bg-bridge ">
        <WalletConnect
          icon={<img src={WalletImg} alt="Wallet Icon" />}
          onChainChange={handleChainChange}
        />
        <Link to="/">
          <button className="flex items-center md:justify-start justify-center gap-2 bg-[#FF9900] text-black text-sm py-2 px-6 rounded-md font-semibold w-full font-orbitron">
            <img className="pe-2" src={Home} alt="Home Icon" />
            Home Page
          </button>
        </Link>
      </div>
    </div> */}
      <div className="flex justify-center lg:gap-2 gap-2 flex-col wallet_bg md:z-10 z-1 md:mt-0 mt-3 absolute wallet-bg-bridge lefts1">
        <WalletConnect
          icon={<img src={WalletImg} alt="Wallet Icon" />}
          onChainChange={handleChainChange}
        />
        <Link to="/">
          <button className="flex items-center justify-center bg-[#FF9900] gtw transition-all text-sm py-2 px-6 rounded-md font-extrabold w-full font-orbitron">
            <span>Home</span>
          </button>
        </Link>
      </div>
    </>
  );
};

export default Wallet;
