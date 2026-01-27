import { useState, useEffect, useRef } from "react";
// import BG1 from "../../assets/images/bg.png";

interface SlippageCalculatorProps {
  onSlippageChange: (slippage: number) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  slippage: number;
  onClose: () => void;
}

export function SlippageCalculator({
  onSlippageChange,
  onClose,
  isOpen,
  onOpenChange,
  slippage = 0.5,
}: SlippageCalculatorProps) {
  // const [isOpen, setIsOpen] = useState(true);
  const [customSlippage, setCustomSlippage] = useState(
    [0.5, 1.0, 2.0].includes(slippage) ? "" : String(slippage)
  );

  useEffect(() => {
    const isPreset = [0.5, 1.0, 2.0].includes(slippage);
    if (!isPreset) {
      setCustomSlippage(String(slippage));
    } else {
      setCustomSlippage("");
    }
  }, [slippage]);

  const handleSelect = (value: number) => {
    onSlippageChange(value);
    onOpenChange(false);
  };
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSlippage(value);
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 5) {
      onSlippageChange(parsedValue);
    }
  };

  const handleReset = () => {
    const defaultValue = 0.5;
    onSlippageChange(defaultValue);
    onOpenChange(false);
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  const modalRef = useRef<HTMLDivElement | null>(null);

  const handleModalClose = () => {
    // setSlippageApplied(false);
    // setError("");
    // originalAmountRef.current = null;
    onClose();
  };
  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        event.target instanceof Node &&
        !modalRef.current.contains(event.target)
      ) {
        handleModalClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 roboto px-4">
      {" "}
      <div
        ref={modalRef}
        className="bg-black clip-bg rounded-xl lg:px-12 lg:py-10 p-6 md:max-w-[700px] w-full relative"
      >
        {/* Close Button */}
        <button
          className="absolute md:top-10 top-7 md:right-10 right-7 text-white hover:opacity-80 flex flex-shrink-0 tilt"
          onClick={() => handleModalClose()}
        >
          {" "}
          <svg
            width="18"
            height="19"
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {" "}
            <path
              d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
              stroke="#ffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>{" "}
          </svg>{" "}
        </button>
        <h2 className="text-white text-xl font-bold mb-4 roboto text-center">
          Slippage Settings
        </h2>
        {/* <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
          <p className="text-red-200 text-sm">
            Please provide token input values before applying slippage.
          </p>
        </div> */}
        <div className="flex gap-4 items-center justify-center flex-wrap">
          {[0.5, 1.0, 2.0].map((preset) => (
            <button
              key={preset}
              className={`px-4 py-1.5 justify-center md:w-[100px] w-20 relative md:text-base text-sm text-white border border-[#ff9900] rounded-xl`}
              onClick={() => handleSelect(preset)}
            >
              {preset}%
              {/* <img src={BG1} alt="BG1" className="absolute top-0 left-0" /> */}
            </button>
          ))}
          <input
            id="custom-slippage"
            placeholder="Custom"
            value={customSlippage}
            onChange={handleCustomChange}
            type="number"
            step="0.1"
            min="0"
            max="5"
            className="md:w-[120px] w-20 md:h-9 h-9 text-center font-bold text-sm text-white focus:outline-none bg-[#382B19] border border-[#ff9900] rounded-xl"
          // style={{
          //   clipPath:
          //     "polygon(0px 0px, 90% 0px, 100% 20%, 100% 100%, 12% 100%, 0px 65%)",
          // }}
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            %
          </span>
        </div>
        {parseFloat(customSlippage) > 5 && (
          <p className="text-sm text-destructive mt-2 text-red-400 text-center">
            Custom slippage cannot exceed 5%.
          </p>
        )}
        <div className="flex justify-center items-center mt-8 flex-col gap-2">
          {/* clip-path-polygon */}
          <button
            className={`gtw bg-[#FF9900] relative w-full md:h-16 rounded-xl h-12 flex items-center justify-center font-roboto font-black md:text-2xl text-xl transition-all font-orbitron`}
            // style={{
            //   clipPath:
            //     "polygon(0px 0px, 95% 0px, 100% 30%, 100% 100%, 6% 100%, 0px 60%)",
            // }}
            onClick={handleReset}
          >
            Reset Slippage
            <div className="w-full absolute md:top-4 top-1 md:-left-4 -left-3 z-[1] bg-transparent border-2 border-[#FF9900] rounded-xl md:h-[58px] h-[50px]"></div>
          </button>
          <button
            className="px-4 py-1 mt-4 bg-black font-semibold md:text-2xl text-xl text-[#FF9900] rounded font-orbitron"
            onClick={() => handleDone()}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
