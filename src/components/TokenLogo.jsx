import { useState, useEffect } from "react";
import { useChainConfig } from "../hooks/useChainConfig";
import fallbackImage from "../assets/images/emp-logo.png";

const getFallbackUrl = (chainId, address) => {
  if (!address) return null;
  const lowerAddress = address.toLowerCase();
  switch (chainId) {
    case 369: // Pulsechain
      return `https://api-assets.rubic.exchange/assets/coingecko/pulsechain/${lowerAddress}/logo.png`;
    case 80094: // Berachain
      return `https://api-assets.rubic.exchange/assets/coingecko/berachain/${lowerAddress}/logo.png`;
    case 8453: // Base
      return `https://api-assets.rubic.exchange/assets/coingecko/base/${lowerAddress}/logo.png`;
    case 30: // Rootstock
      return `https://api-assets.rubic.exchange/assets/coingecko/rootstock/${lowerAddress}/logo.png`;
    case 56: // BSC
      return `https://api-assets.rubic.exchange/assets/coingecko/binance-smart-chain/${lowerAddress}/logo.png`;
    case 143: // Monad
      return `https://api-assets.rubic.exchange/assets/coingecko/monad/${lowerAddress}/logo.png`;
    case 1329: // Sei
      return `https://raw.githubusercontent.com/Symphony-Exchange/Symphony-Exchange-Assetlist/refs/heads/main/logos/${lowerAddress}.png`;
    case 146: // Sonic
      return `https://raw.githubusercontent.com/Shadow-Exchange/shadow-assets/main/blockchains/sonic/assets/${address}/logo.png`;
    case 42161: // Arbitrum
      return `https://api-assets.rubic.exchange/assets/coingecko/arbitrum/${lowerAddress}/logo.png`;
    default:
      return null;
  }
};

const TokenLogo = ({ token, className, fallbackImg = fallbackImage }) => {
  const { chainId } = useChainConfig();

  if (!token) return null;

  const userFallbackUrl = getFallbackUrl(chainId, token.address);

  // Final generic token fallback image (SVG placeholder)
  const defaultFallbackImage = fallbackImg;

  const sources = [
    token.logoURI,
    token.image,
    userFallbackUrl
  ].filter(Boolean); // Only attempt URLs that are defined

  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);

  // Reset index when the underlying token address or chain changes
  useEffect(() => {
    setCurrentSrcIndex(0);
  }, [token?.address, chainId]);

  const handleError = () => {
    if (currentSrcIndex < sources.length) {
      setCurrentSrcIndex(prev => prev + 1);
    }
  };

  const currentSrc = currentSrcIndex < sources.length
    ? sources[currentSrcIndex]
    : defaultFallbackImage;

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      className={className}
      alt={token?.name || token?.symbol || token?.ticker || "Token"}
      onError={(e) => {
        if (currentSrcIndex < sources.length) {
          setCurrentSrcIndex(prev => prev + 1);
        } else {
          e.target.src = defaultFallbackImage;
          e.target.onerror = null;
        }
      }}
    />
  );
};

export { TokenLogo };
export default TokenLogo;
