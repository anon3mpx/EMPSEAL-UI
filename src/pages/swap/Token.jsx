import { useState, useEffect, useRef, useMemo } from "react";
import Arrow from "../../assets/icons/downarrow.svg";
import { Star, StarIcon } from "lucide-react";
import { ERC20_ABI } from "./tokenFetch";
import TokenLogo from "../../components/TokenLogo.jsx";
import { useChainConfig } from "../../hooks/useChainConfig";
import { useMulticallBalances } from "../../hooks/useMulticallBalances";
import { useAccount } from "wagmi";
import Web3 from "web3";
import EL from "../../assets/images/emp-logo.png";

// Maximum number of tokens to render initially (virtualization)
const INITIAL_RENDER_LIMIT = 30;
const LOAD_MORE_COUNT = 20;

// Local storage key for favorites
const FAVORITES_STORAGE_KEY = "favoriteTokens";

const TokenListItem = ({
  token,
  balance,
  isLoading,
  onClick,
  isFavorite,
  onToggleFavorite,
}) => {
  const formattedBalance = balance
    ? parseFloat(balance.formatted).toFixed(4)
    : "0.0000";

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(token);
  };

  return (
    <div
      className="flex justify-between items-center mt-2 cursor-pointer hoverclip md:p-2 p-1 hover:bg-[#FF8A00]/5"
      onClick={() => onClick(token)}
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="flex justify-center items-center rounded-full p-1 slippage-btn1">
          <TokenLogo
            token={token}
            className="md:w-6 md:h-6 w-4 h-4 object-contain"
            fallbackImg={EL}
          />
        </div>
        <div>
          <div className="text-white  font-semibold uppercase md:text-xs text-xs tracking-wide">
            {token.name}
          </div>
          <div className="text-white/50 text-[10px] uppercase">
            {token.symbol || token.ticker}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Star button - always visible for favorites, on hover for non-favorites */}
        <button
          onClick={handleFavoriteClick}
          className={`transition-opacity duration-200 ${
            isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <StarIcon
              className="w-5 h-5 text-[#FF8A00] fill-[#FF8A00]"
              strokeWidth={1.5}
            />
          ) : (
            <Star
              className="w-5 h-5 text-white hover:text-[#FF8A00]"
              strokeWidth={1.5}
            />
          )}
        </button>

        <div className="text-right min-w-[100px]">
          <div className="text-[#ffffffb3] text-xs font-medium uppercase tracking-wide">
            {isLoading ? "Loading..." : formattedBalance}
          </div>
        </div>
      </div>
    </div>
  );
};

const Token = ({ onClose, onSelect }) => {
  const { chainId, tokenList, featureTokens, isSupported } = useChainConfig();
  const { address: walletAddress, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenDetails, setTokenDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_RENDER_LIMIT);
  // const [favorites, setFavorites] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const modalRef = useRef(null);
  const listContainerRef = useRef(null);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const loadFavorites = () => {
      try {
        const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (savedFavorites) {
          const parsedFavorites = JSON.parse(savedFavorites);
          // Ensure it's an array
          if (Array.isArray(parsedFavorites)) {
            setFavorites(parsedFavorites);
            // console.log("Loaded favorites from localStorage:", parsedFavorites);
          } else {
            // If it's not an array, reset it
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]));
            setFavorites([]);
          }
        } else {
          // Initialize empty array if nothing exists
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]));
          setFavorites([]);
        }
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error);
        // Reset on error
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]));
        setFavorites([]);
      }
    };

    loadFavorites();
  }, []);
  // Toggle favorite status for a token
  const toggleFavorite = (token) => {
    const tokenAddress = token.address.toLowerCase();

    setFavorites((prev) => {
      let newFavorites;

      if (prev.includes(tokenAddress)) {
        newFavorites = prev.filter((addr) => addr !== tokenAddress);
      } else {
        newFavorites = [...prev, tokenAddress];
      }

      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));

      return newFavorites;
    });
  };

  // Check if a token is favorited
  const isTokenFavorite = (tokenAddress) => {
    return favorites.includes(tokenAddress.toLowerCase());
  };

  // Fetch all balances in a single batched multicall
  const { balances, isLoading: balancesLoading } =
    useMulticallBalances(tokenList);

  const getRpcUrl = () => {
    switch (chainId) {
      case 369:
        return "https://rpc.pulsechain.com";
      case 10001:
        return "https://mainnet.ethereumpow.org";
      case 146:
        return "https://rpc.soniclabs.com";
      case 8453:
        return "https://mainnet.base.org";
      case 1329:
        return "https://sei.api.pocket.network";
      case 80094:
        return "https://berachain.drpc.org";
      case 30:
        return "https://public-node.rsk.co";
      case 56:
        return "https://bsc-rpc.publicnode.com";
      case 143:
        return "https://rpc.monad.xyz";
      case 42161:
        return "https://arb-one.api.pocket.network";
      case 10:
        return "https://mainnet.optimism.io";
      case 43114:
        return "https://avalanche-c-chain.publicnode.com";
      case 999:
        return "https://rpc.hyperliquid.xyz/evm";
      default:
        return null;
    }
  };

  const web3 = new Web3(getRpcUrl());

  // Filter tokens based on search query (with deduplication by address)
  const filteredTokens = useMemo(() => {
    // Deduplicate by address (keep first occurrence)
    const seen = new Set();
    const uniqueTokens = tokenList.filter((token) => {
      const addr = token.address.toLowerCase();
      if (seen.has(addr)) return false;
      seen.add(addr);
      return true;
    });

    return uniqueTokens.filter(
      (token) =>
        (token.name &&
          token.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.symbol &&
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.ticker &&
          token.ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (token.address &&
          token.address.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [tokenList, searchQuery]);

  // Sort tokens by favorites first, then by balance, then alphabetically
  const sortedTokens = useMemo(() => {
    return [...filteredTokens].sort((a, b) => {
      const addressA = a.address.toLowerCase();
      const addressB = b.address.toLowerCase();

      const isFavoriteA = favorites.includes(addressA);
      const isFavoriteB = favorites.includes(addressB);

      // Favorites come first
      if (isFavoriteA && !isFavoriteB) return -1;
      if (!isFavoriteA && isFavoriteB) return 1;

      // If both are favorites or both are not favorites, sort by balance
      const balanceA = parseFloat(balances.get(addressA)?.formatted || "0");
      const balanceB = parseFloat(balances.get(addressB)?.formatted || "0");

      // Both have balance - sort by balance descending
      if (balanceA > 0 && balanceB > 0) {
        if (balanceA !== balanceB) {
          return balanceB - balanceA;
        }
      }
      // One has balance, prioritize it
      if (balanceA > 0 && balanceB === 0) return -1;
      if (balanceB > 0 && balanceA === 0) return 1;

      // Neither has balance - sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [filteredTokens, balances, favorites]);

  // Get tokens to display (virtualization)
  const displayedTokens = useMemo(() => {
    return sortedTokens.slice(0, displayLimit);
  }, [sortedTokens, displayLimit]);

  // Handle scroll to load more tokens
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Load more when user scrolls to bottom (with 100px buffer)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (displayLimit < sortedTokens.length) {
        setDisplayLimit((prev) =>
          Math.min(prev + LOAD_MORE_COUNT, sortedTokens.length),
        );
      }
    }
  };

  // Reset display limit when search changes
  useEffect(() => {
    setDisplayLimit(INITIAL_RENDER_LIMIT);
  }, [searchQuery]);

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

      const decimal = Number(decimalsRaw);
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
        (token) => token.address.toLowerCase() === address.toLowerCase(),
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
        (token) => token.address.toLowerCase() === searchQuery.toLowerCase(),
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

  // Add a clear all favorites function (optional)
  const clearAllFavorites = () => {
    if (favorites.length > 0) {
      if (window.confirm("Clear all favorite tokens?")) {
        setFavorites([]);
      }
    }
  };

  // For debugging - check localStorage on mount
  useEffect(() => {
    const checkStorage = () => {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      // console.log("Current localStorage value:", saved);
    };
    checkStorage();
  }, []);

  if (!isSupported) {
    return (
      <div className="text-white text-center">
        Please switch to a supported chain
      </div>
    );
  }

  return (
    <div className="bg-black bg-opacity-40 backdrop-blur-sm py-8 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div
          ref={modalRef}
          className="md:max-w-[550px] w-full relative py-4 mx-auto clip-bg"
        >
          <div className="flex justify-between gap-2 items-center !px-4">
            <h2 className="text-[13px] uppercase font-bold text-white tracking-widest flex gap-1 items-center justify-center">
              <img src={EL} alt="EL" className="w-10 object-contain" />
              Select a Token
            </h2>
            <button
              onClick={onClose}
              className="close-btn"
            >
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
          <div className="flex gap-4 items-center justify-between cursor-pointer py-3 !px-4">
            {/* Show favorite count and clear button */}
            {favorites.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[#FF8A00] text-sm">
                  {favorites.length} ⭐
                </span>
                <button
                  onClick={clearAllFavorites}
                  className="text-xs text-white hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          <div className="px-4 border-top border-bottom">
            <div className="search-wrapper py-4">
              <svg
                onClick={() => handleTokenLookup(searchQuery)}
                className="search-icon"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search token name or paste address"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-5 grid-cols-4 gap-2 mt-4 !px-4">
            {featureTokens.slice(0, 10).map((token, index) => (
              <div
                key={index}
                className="flex flex-row items-center cursor-pointer slippage-btn2 hover:bg-[#FF8A00]/5"
                onClick={() => handleFeaturedTokenClick(token)}
              >
                <span className="flex items-center">
                  <div className="relative flex justify-center items-center">
                    <TokenLogo
                      token={token}
                      className="md:w-5 md:h-5 w-3 h-3 rounded-full relative z-10 p-[1px] object-contain flex shrink-0"
                      fallbackImg={EL}
                    />
                  </div>
                  <p className="text-white font-black md:text-[11px] text-[9px] mt-0 ms-2  truncate md:w-14 w-10">
                    {token.symbol || token.ticker}
                  </p>
                </span>
              </div>
            ))}
          </div>
          <div className="grid shrink-0 grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-2 border-b border-t mt-4 border-white/5">
            <span className="text-[9px] font-bold tracking-[0.22em] text-white/20">
              TOKEN
            </span>
            <span className="text-[9px] font-bold tracking-[0.22em] text-white/20 text-right">
              BALANCE
            </span>
          </div>
          <div className="mt-4 px-[2px]">
            {/* Virtualized token list with scroll handler */}
            <div
              ref={listContainerRef}
              className="max-h-[300px] overflow-y-auto px-1"
              onScroll={handleScroll}
            >
              {displayedTokens.map((token, index) => (
                <TokenListItem
                  key={token.address || index}
                  token={token}
                  balance={balances.get(token.address.toLowerCase())}
                  isLoading={balancesLoading}
                  onClick={handleTokenSelect}
                  isFavorite={isTokenFavorite(token.address)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
              {displayLimit < sortedTokens.length && (
                <div className="text-center text-white py-2 text-xs">
                  Scroll for more tokens...
                </div>
              )}
            </div>

            {isLoading && (
              <div className="text-white text-center text-xs mt-4">
                Loading...
              </div>
            )}

            {error && (
              <div className="text-red-500 text-center text-xs mt-4">
                {error}
              </div>
            )}

            {tokenDetails && (
              <TokenListItem
                token={tokenDetails}
                balance={balances.get(tokenDetails.address.toLowerCase())}
                isLoading={balancesLoading}
                onClick={handleTokenSelect}
                isFavorite={isTokenFavorite(tokenDetails.address)}
                onToggleFavorite={toggleFavorite}
              />
            )}

            <div className="my-3">
              <img src={Arrow} alt="Arrow" className="mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Token;
