import React, { useState, useEffect, useRef } from "react";
import BG1 from "../../assets/images/bg.png";
import EL from "../../assets/images/emp-logo.png";

const calculateSlippage = (amountOut, slippagePercent) => {
  const clampedPercent = Math.max(0, Math.min(50, Number(slippagePercent) || 0));
  const bps = BigInt(Math.round(clampedPercent * 100));
  return (amountOut * (10000n - bps)) / 10000n;
};

const SlippageCalculator = ({
  inputAmount,
  selectedSlippage = 0.5,
  onSlippageChange,
  onSlippageCalculated,
  onClose,
}) => {
  const [slippage, setSlippage] = useState(selectedSlippage);
  const [customSlippage, setCustomSlippage] = useState(
    selectedSlippage ? selectedSlippage.toString() : "",
  );
  const [slippageApplied, setSlippageApplied] = useState(false);
  const [error, setError] = useState("");
  const originalAmountRef = useRef(null);
  const modalRef = useRef(null);

  // Validate trade info on mount
  useEffect(() => {
    if (!inputAmount || inputAmount <= 0n) {
      setError("Please provide token input values before applying slippage.");
    } else {
      setError("");
    }
  }, [inputAmount]);

  useEffect(() => {
    originalAmountRef.current = inputAmount && inputAmount > 0n ? inputAmount : null;
  }, [inputAmount]);

  // Sync selected slippage from parent state
  useEffect(() => {
    setSlippage(selectedSlippage);
    setCustomSlippage(selectedSlippage ? selectedSlippage.toString() : "");
    setSlippageApplied(false);
  }, [selectedSlippage]);

  // Calculate slippage when necessary
  useEffect(() => {
    if (
      originalAmountRef.current &&
      slippage >= 0 &&
      slippage <= 5 &&
      !slippageApplied &&
      !error
    ) {
      try {
        const adjustedAmount = calculateSlippage(
          originalAmountRef.current,
          slippage,
        );
        onSlippageCalculated(adjustedAmount);
        setSlippageApplied(true);
      } catch (error) {
        console.error("Error calculating slippage:", error);
        setError(error.message);
      }
    }
  }, [slippage, onSlippageCalculated, slippageApplied, error]);

  // Handle slippage option selection
  const handleSlippageSelect = (value) => {
    if (error) return; // Prevent selection if there's an error
    if (slippage !== value) {
      setSlippage(value);
      setCustomSlippage(value.toString());
      setSlippageApplied(false);
      if (onSlippageChange) onSlippageChange(value);
    }
  };

  // Handle custom slippage input change
  const handleCustomSlippageChange = (e) => {
    if (error) return; // Prevent input if there's an error

    const inputValue = e.target.value;
    if (inputValue === "") {
      setCustomSlippage("");
      if (onSlippageChange) onSlippageChange(0);
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value < 0 || value > 5) return;

    setCustomSlippage(inputValue);
    setSlippage(value);
    setSlippageApplied(false);
    if (onSlippageChange) onSlippageChange(value);
  };

  // Reset slippage state and calculate immediately
  const handleResetSlippage = () => {
    if (error) return; // Prevent reset if there's an error

    if (originalAmountRef.current) {
      try {
        const defaultSlippage = 0;
        const adjustedAmount = calculateSlippage(
          originalAmountRef.current,
          defaultSlippage,
        );
        onSlippageCalculated(adjustedAmount);
        setSlippage(defaultSlippage);
        setCustomSlippage("");
        setSlippageApplied(true);
        if (onSlippageChange) onSlippageChange(defaultSlippage);
      } catch (error) {
        console.error("Error resetting slippage:", error);
        setError(error.message);
      }
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setSlippageApplied(false);
    setError("");
    originalAmountRef.current = null;
    onClose();
  };

  const slippageOptions = [0.0, 0.5, 1.0, 2.0];

  return (
    <div className="w-full">
      <div ref={modalRef} className="clip-bg bg_slip_box w-full relative">
        {/* <button
          onClick={handleModalClose}
          className="absolute md:top-10 top-7 md:right-10 right-7 text-white hover:opacity-80 flex flex-shrink-0 tilt"
        >
          <svg
            className="text-white hover:text-[#FF8A00]"
            width="18"
            height="19"
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {" "}
            <path
              d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>{" "}
          </svg>{" "}
        </button> */}
        {/* <h2 className="mb-4 md:text-lg capitalize text-lg font-medium text-white  text-center tracking-widest flex gap-1 items-center justify-center">
          <img src={EL} alt="EL" className="w-10 object-contain" />
          Slippage Settings
        </h2> */}

        {error && (
          <div className="mb-2">
            <p className="text-white/30 text-xs">{error}</p>
          </div>
        )}
        <div className="flex gap-4 items-center justify-center flex-wrap">
          {slippageOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSlippageSelect(option)}
              className={`slip1 ${
                slippage === option
                  ? "bg- text-white"
                  : "bg-transparent text-white"
              } ${error ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!!error}
            >
              {option}%
            </button>
          ))}
          <input
            type="text"
            inputMode="decimal"
            value={customSlippage}
            onChange={handleCustomSlippageChange}
            className={`slip1 text-center
      ${error ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="%"
            disabled={!!error}
          />
        </div>

        <div className="flex justify-center items-center mt-4 gap-4">
          <button
            onClick={handleResetSlippage}
            className={`gtw relative z-50 w-full uppercase md:h-8 h-8 bg-[#FF8A00] mx-auto font-bold button-trans h- flex justify-center items-center transition-all text-xs 
    ${error ? "opacity-100 cursor-not-allowed" : ""}`}
            disabled={!!error}
          >
            Reset Slippage
          </button>
          <button
            onClick={handleModalClose}
            className="slippage-btn w-full uppercase md:h-8 h-8"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlippageCalculator;
