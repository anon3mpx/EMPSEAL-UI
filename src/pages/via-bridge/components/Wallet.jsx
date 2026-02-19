import { useState, useEffect, useCallback } from "react";
import Logo from "../../../assets/images/emp-logo.png";
import WalletImg from "../../../assets/images/wallet-2.svg";
import Home from "../../../assets/images/house.svg";
import { Link } from "react-router-dom";
import WalletConnect from "./WalletConnect/WalletConnect";
import { useBalance, useAccount } from "wagmi";
import { formatEther } from "viem";
import DotsMenu from "../../swap/DotsMenu";

const truncateAddress = (address) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const Wallet = ({ onTabChange }) => {
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
      <div className="flex justify-center lg:gap-2 gap-2 wallet_bg md:z-10 z-10 md:mt-0 mt-0 absolute wallet-bg-bridge lefts1">
        <WalletConnect
          icon={<img src={WalletImg} alt="Wallet Icon" />}
          onChainChange={handleChainChange}
        />
        {/* https://empx.io/dapp */}
        <DotsMenu onTabChange={onTabChange} />
      </div>
    </>
  );
};

export default Wallet;
