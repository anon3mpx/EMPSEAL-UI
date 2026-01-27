import { ChevronDown } from "lucide-react";
import { TokenLogo } from "../../../components/TokenLogo";

const TokenSelector = ({ token, chainId, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center gap-2">
        {token ? (
          <>
            <TokenLogo
              chainId={chainId}
              tokenAddress={token.address}
              symbol={token.symbol}
              logoURI={token.logoURI}
              className="md:w-10 md:h-10 w-5"
            />
            <span className="md:text-2xl text-[10px] font-medium">{token.symbol}</span>
          </>
        ) : (
          <span className="font-bold font-orbitron lg:text-3xl md:text-base text-[10px]">Select token</span>
        )}
        {/* <ChevronDown size={16} className="text-white ml-1" /> */}
      </div>
    </button>
  );
};

export default TokenSelector;
