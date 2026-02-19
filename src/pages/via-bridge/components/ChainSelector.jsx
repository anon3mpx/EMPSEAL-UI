import { ChevronDown } from "lucide-react";
import { LogoService } from "../../../services/LogoService";
import Ci from "../../../assets/icons/ci.png";

const ChainSelector = ({ chain, onClick }) => {
  const logo = chain ? LogoService.getChainLogo(chain.id) : null;

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center justify-center gap-2">
        {chain ? (
          <>
            {logo && (
              <img
                src={logo}
                alt={chain.name}
                className="md:w-10 md:h-10 w-6 h-6 rounded-full"
              />
            )}
            {/* <span className="md:text-xl text-[10px] font-medium">
              {chain.name}
            </span> */}
          </>
        ) : (
          // <span className="md:text-xl text-[10px] font-medium">Select Chain</span>
          <img
            src={Ci}
            alt="ci"
            className="md:w-16 md:h-16 h-7 object-contain"
          />
        )}
      </div>
      {/* <span className="md:text-xs text-[10px] text-black">
        <ChevronDown size={16} />
      </span> */}
    </button>
  );
};

export default ChainSelector;
