import { useState, useEffect, useRef } from "react";
import Arrow from "../../assets/icons/downarrow.svg";
import Sbg from "../../assets/images/sbg.png";
import Clip from "../../assets/images/bg-clip.png";
import { ERC20_ABI } from "./tokenFetch";
import { useBalance } from "wagmi";
import { useChainConfig } from "../../hooks/useChainConfig";
import Web3 from "web3";

const TokenListItem = ({
  token,
  walletAddress,
  onClick,
}) => {
  const { data: tokenBalance, isLoading: balanceLoading } = useBalance({
    address: walletAddress,
    token:
      token.address === "0x0000000000000000000000000000000000000000"
        ? undefined
        : token.address,
    watch: true,
  });

  const formattedBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(4)
    : "0.0000";

  return (
    <div
      className="flex justify-between items-center mt-2 cursor-pointer hoverclip md:p-2 p-1 rounded-xl"
      onClick={() => onClick(token)}
    >
      <div className="flex items-center gap-2">
        <div className="flex justify-center items-center rounded-full p-1">
          <img
            src={token.logoURI || token.image}
            className="w-6 h-6 object-contain"
            alt={token.name}
            onError={(e) => {
              e.target.src = "path/to/fallback/image.png";
            }}
          />
        </div>
        <div>
          <div className="text-white font-orbitron font-black md:text-lg text-sm roboto leading-relaxed tracking-wide">
            {token.name}
          </div>
          <div className="text-white text-xs roboto">
            {token.symbol || token.ticker}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[#FF9900] md:text-lg text-sm font-bold roboto tracking-wide">
          {balanceLoading ? "Loading..." : formattedBalance}
        </div>
      </div>
    </div>
  );
};

const Token = ({ onClose, onSelect }) => {
  const { chainId, tokenList, featureTokens, isSupported } = useChainConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenDetails, setTokenDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const modalRef = useRef(null);

  const getRpcUrl = () => {
    switch (chainId) {
      case 369:
        return "https://rpc.pulsechain.com";
      case 10001:
        return "https://mainnet.ethereumpow.org";
      case 146:
        return "https://rpc.soniclabs.com";
      default:
        return null;
    }
  };

  const web3 = new Web3(getRpcUrl());

  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          setWalletAddress(accounts[0]);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };
    getAddress();
  }, []);

  const filteredTokens = tokenList
    .filter(
      (token) =>
        (token.name &&
          token.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.symbol &&
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.ticker &&
          token.ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.address &&
          token.address.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const SortedTokenList = () => {
    // const { symbol, wethAddress } = useChainConfig();

    const tokenPromises = filteredTokens.map((token) => ({
      token,
      balancePromise: useBalance({
        address: walletAddress,
        token:
          token.address === "0x0000000000000000000000000000000000000000"
            ? undefined
            : token.address,
        watch: true,
      }),
    }));

    // Sort based on balance
    const sortedTokens = [...tokenPromises].sort((a, b) => {
      const balanceA = parseFloat(a.balancePromise.data?.formatted || "0");
      const balanceB = parseFloat(b.balancePromise.data?.formatted || "0");

      if (balanceA > 0 && balanceB > 0) {
        if (balanceA !== balanceB) {
          return balanceB - balanceA; // Sort descending
        }
      }
      if (balanceA > 0 && balanceB === 0) return -1;
      if (balanceB > 0 && balanceA === 0) return 1;

      return a.token.name.localeCompare(b.token.name);
    });

    return (
      <div className="max-h-[400px] overflow-y-auto px-3">
        {sortedTokens.map(({ token }, index) => (
          <TokenListItem
            key={index}
            token={token}
            walletAddress={walletAddress}
            onClick={handleTokenSelect}
          />
        ))}
      </div>
    );
  };

  const lookupTokenByAddress = async (address) => {
    if (!web3.utils.isAddress(address)) {
      console.error("Invalid address");
      return null;
    }

    try {
      const tokenContract = new web3.eth.Contract(ERC20_ABI, address);
      const [name, symbol, decimalsRaw] = await Promise.all([
        tokenContract.methods.name().call(),
        tokenContract.methods.symbol().call(),
        tokenContract.methods.decimals().call(),
      ]);

      const decimal = Number(decimalsRaw); // Convert BigInt to Number
      return {
        address,
        name,
        symbol,
        decimal,
        logoURI: `https://tokens.app.pulsex.com/images/tokens/${address}.png`,
        image: `https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/${address}.png`,
        ticker: symbol,
      };
    } catch (error) {
      console.error("Error fetching token details:", error);
      return null;
    }
  };

  const handleTokenLookup = async (address) => {
    setError(null);
    setTokenDetails(null);
    setIsLoading(true);

    try {
      // First check if token exists in tokenList
      const existingToken = tokenList.find(
        (token) => token.address.toLowerCase() === address.toLowerCase()
      );

      if (existingToken) {
        setTokenDetails(existingToken);
        setError(null);
        return;
      }

      // Only proceed with ABI calls if token is not in tokenList
      const details = await lookupTokenByAddress(address);
      if (details) {
        setTokenDetails(details);
        setError(null);
      } else {
        setError("Token not found or invalid address.");
      }
    } catch (err) {
      setError("Failed to fetch token details.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (web3.utils.isAddress(searchQuery)) {
      // First check if token exists in tokenList
      const existingToken = tokenList.find(
        (token) => token.address.toLowerCase() === searchQuery.toLowerCase()
      );

      if (existingToken) {
        setTokenDetails(existingToken);
        setError(null);
      } else {
        handleTokenLookup(searchQuery);
      }
    } else {
      setTokenDetails(null);
      setError(null);
    }
  }, [searchQuery]);

  const handleTokenSelect = (token) => {
    if (tokenDetails && token.address === tokenDetails.address) {
      onSelect(tokenDetails);
    } else {
      onSelect(token);
    }
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleFeaturedTokenClick = (token) => {
    onSelect(token);
    onClose();
  };

  if (!isSupported) {
    return (
      <div className="text-white text-center">
        Please switch to a supported chain
      </div>
    );
  }

  return (
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div
          ref={modalRef}
          className="md:max-w-[618px] w-full rounded-3xl relative py-4 md:px-10 px-4 mx-auto clip-bg"
        >
          {/* <img src={Clip} /> */}
          <svg
            onClick={onClose}
            className="absolute cursor-pointer md:right-14 right-7 top-12 tilt"
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

          <div className="flex gap-4 items-center justify-center cursor-pointer mt-2 py-3">
            <p className="md:text-2xl capitalize text-lg font-bold text-white roboto text-center tracking-widest">
              Select a token
            </p>
          </div>
          <div className="grid md:grid-cols-5 grid-cols-3 gap-2 mt-4 md:px-[24px] px-1">
            {featureTokens.map((token, index) => (
              <div
                key={index}
                className="flex flex-row items-center cursor-pointer roboto md:rounded-2xl rounded-lg border border-[#FF9900] md:p-[14px] p-2"
                onClick={() => handleFeaturedTokenClick(token)}
              >
                {/* bg-rec */}
                <span className="flex items-center">
                  <div className="relative flex justify-center items-center">
                    <img
                      src={token.logoURI || token.image}
                      alt={token.name}
                      className="w-4 h-4 rounded-full relative z-10 p-[1px] object-contain"
                      onError={(e) =>
                        (e.target.src = "path/to/fallback/image.png")
                      }
                    />
                  </div>
                  <p className="text-white font-black text-xs mt-0 ms-2 font-orbitron">
                    {token.symbol || token.ticker}
                  </p>
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 items-center justify-center cursor-pointer mt-1 py-3">
            <p className="md:text-2xl capitalize text-lg font-bold text-white roboto text-center tracking-widest">
              Search token
            </p>
          </div>
          {/* bg-search */}
          <div className="mt-3 relative px-[10px] h-[54px] w-full flex gap-2 items-center border border-[#FF9900] rounded-xl">
            <input
              type="text"
              placeholder="Search token name or paste address"
              className="bg-transparent rounded-[4.83px] h-[43px] text-white md:max-w-[490px] w-full px-5 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="ms-4"
              onClick={() => handleTokenLookup(searchQuery)}
            >
              <svg
                className="flex flex-shrink-0 cursor-pointer"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.8632 19.0535L13.3482 13.5375C10.8947 15.2818 7.51414 14.8552 5.57102 12.556C3.62792 10.257 3.7706 6.85254 5.89925 4.72413C8.02735 2.59479 11.4322 2.45149 13.7317 4.3945C16.0311 6.3375 16.458 9.71849 14.7137 12.1721L20.2287 17.688L18.8642 19.0526L18.8632 19.0535ZM9.99282 4.95765C8.16287 4.95724 6.58411 6.24178 6.21237 8.03356C5.84064 9.82534 6.7781 11.6319 8.45718 12.3596C10.1363 13.0871 12.0955 12.5358 13.1486 11.0392C14.2018 9.54268 14.0594 7.51235 12.8078 6.17743L13.3916 6.75644L12.7335 6.10023L12.7219 6.08865C11.9999 5.36217 11.0171 4.95489 9.99282 4.95765Z"
                  fill="#5C5C5C"
                />
              </svg>
            </button>
          </div>

          {/* <hr className="h-px my-8 bg-gray-200 border-[#3b3c4e] h-hr" /> */}
          <div className="mt-4 px-[2px]">
            {/* <div className="flex justify-between gap-4 items-center">
              <p className="text-white text-sm font-medium roboto leading-relaxed tracking-wide">
                Token Name
              </p>
            </div> */}

            <SortedTokenList />

            {isLoading && (
              <div className="text-white text-center mt-4">Loading...</div>
            )}

            {error && (
              <div className="text-red-500 text-center mt-4">{error}</div>
            )}

            {tokenDetails && (
              <TokenListItem
                token={tokenDetails}
                walletAddress={walletAddress}
                onClick={handleTokenSelect}
              />
            )}

            <div className="my-6">
              <img src={Arrow} alt="Arrow" className="mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Token;
