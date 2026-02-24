import { ChevronDown } from "lucide-react";
import { TokenLogo } from "../../../components/TokenLogo";

const TokenSelector = ({ token, chainId, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex gap-2 w-full bg-transparent"
    >
      <div className="flex items-center gap-2">
        {token ? (
          <>
            <TokenLogo
              chainId={chainId}
              tokenAddress={token.address}
              symbol={token.symbol}
              logoURI={token.logoURI}
              className="md:w-5 md:h-5 w-4 h-4"
            />
            <span className="text-white lg:text-sm text-sm font-bold font-orbitron leading-normal bg-black appearance-none outline-none">{token.symbol}</span>
          </>
        ) : (
          <span className="text-white font-extrabold font-orbitron md:text-xs text-xs capitalize">Select token</span>
        )}
        {/* <ChevronDown size={16} className="text-white ml-1" /> */}
      </div>
    </button>
  );
};

export default TokenSelector;
