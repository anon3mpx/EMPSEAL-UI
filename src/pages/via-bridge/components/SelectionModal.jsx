import { X } from "lucide-react";
import { LogoService } from "../../../services/LogoService";
import { TokenLogo } from "../../../components/TokenLogo.tsx";
import EL from "../../../assets/images/emp-logo.png";

const SelectionModal = ({
  isOpen,
  onClose,
  items,
  onSelect,
  title,
  chainId,
}) => {
  if (!isOpen) return null;

  // Determine if items are tokens (have 'address' property) or chains
  const isTokenList = items.length > 0 && items[0]?.address !== undefined;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative text-white md:p-8 p-6 rounded-2xl md:max-w-[618px] w-full clip-bg font-orbitron"
      >
        {/* Header */}
        <div className="flex justify-center items-center mb-4">
          <h2 className="md:text-lg capitalize text-lg font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
            <img src={EL} alt="EL" className="w-10 object-contain" />
            {title}
          </h2>

          <button
            onClick={onClose}
            className="absolute md:right-10 right-7 top-10 cursor-pointer tilt hover:text-[#FF9900]"
          >
            <X size={30} />
          </button>
        </div>
        {/* Items */}
        <div className="max-h-60 overflow-y-auto chain_scroll pr-2">
          {items.map((item) => {
            // For tokens, use TokenLogo; for chains, use chain logo
            const isToken = item.address !== undefined;
            const logo = isToken ? null : LogoService.getChainLogo(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className="p-3.5 flex items-center gap-3 hoverclip text-[#FFD484] hover:text-white rounded-lg cursor-pointer my-3.5"
              >
                {isToken ? (
                  <div className="w-[23px] h-[23px] flex justify-center items-center shrink-0">
                    <TokenLogo
                      chainId={chainId}
                      tokenAddress={item.address}
                      symbol={item.symbol}
                      logoURI={item.logoURI}
                      className="w-full h-full rounded-full"
                    />
                  </div>
                ) : (
                  logo && (
                    <div className="w-[23px] h-[23px] flex justify-center items-center shrink-0">
                      <img
                        src={logo}
                        alt={item.name}
                        className="w-full rounded-full"
                      />
                    </div>
                  )
                )}
                <span className="font-medium text-base">
                  {item.name || item.symbol}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
