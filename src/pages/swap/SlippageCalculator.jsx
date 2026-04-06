import React, { useState, useEffect, useRef } from "react";
import BG1 from "../../assets/images/bg.png";
import EL from "../../assets/images/emp-logo.png";

// Helper function to calculate slippage
const calculateSlippage = (amountOut, slippagePercent) => {
  if (slippagePercent < 0 || slippagePercent > 5) {
    throw new Error("Invalid slippage percentage. Must be between 0.5 and 5");
  }
  // console.log("Calculated Slippage: ", amountOut, slippagePercent);
  return (
    (amountOut * BigInt(10000 - Math.round(slippagePercent * 100))) /
    BigInt(10000)
  );
};

const SlippageCalculator = ({ inputAmount, onSlippageCalculated, onClose }) => {
  const [slippage, setSlippage] = useState(0);
  const [customSlippage, setCustomSlippage] = useState("");
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

  // Store original amount when tradeInfo changes and ref is empty
  useEffect(() => {
    if (inputAmount && !originalAmountRef.current) {
      originalAmountRef.current = inputAmount;
    }
  }, [inputAmount]);

  // Calculate slippage when necessary
  useEffect(() => {
    // console.log("Calculating slippage...");
    // console.log(originalAmountRef.current, slippage, slippageApplied, error);
    if (
      originalAmountRef.current &&
      slippage >= 0 &&
      slippage <= 5 &&
      !slippageApplied &&
      !error
    ) {
      try {
        // Always calculate based on original amount
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
    }
  };

  // Handle custom slippage input change
  const handleCustomSlippageChange = (e) => {
    if (error) return; // Prevent input if there's an error

    const inputValue = e.target.value;
    if (inputValue === "") {
      setCustomSlippage("");
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value < 0 || value > 5) return;

    setCustomSlippage(inputValue);
    setSlippage(value);
    setSlippageApplied(false);
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

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleModalClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const slippageOptions = [0.0, 0.5, 1.0, 2.0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 roboto px-4">
      <div
        ref={modalRef}
        className="bg-black clip-bg rounded-xl lg:px-8 lg:py-8 p-6 md:max-w-[700px] w-full relative"
      >
        <button
          onClick={handleModalClose}
          className="absolute md:top-10 top-7 md:right-10 right-7 text-white hover:opacity-80 flex flex-shrink-0 tilt"
        >
          <svg
            className="text-white hover:text-[#FF9900]"
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
        </button>
        <h2 className="mb-4 md:text-lg capitalize text-lg font-medium text-white font-orbitron text-center tracking-widest flex gap-1 items-center justify-center">
          <img src={EL} alt="EL" className="w-10 object-contain" />
          Slippage Settings
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        <div className="flex gap-4 items-center justify-center flex-wrap">
          {slippageOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSlippageSelect(option)}
              className={`px-4 py-1.5 justify-center md:w-[100px] w-20 relative md:text-base text-sm border border-[#ff9900] rounded-xl ${
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
            className={`md:w-[120px] w-20 md:h-9 h-9 text-center font-bold text-sm text-white focus:outline-none bg-[#382B19] border border-[#ff9900] rounded-xl
      ${error ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="%"
            disabled={!!error}
          />
        </div>

        <div className="flex justify-center items-center mt-20 flex-col">
          <button
            onClick={handleResetSlippage}
            className={`gtw relative w-full md:h-12 rounded-xl h-11 flex items-center justify-center font-roboto font-bold md:text-lg text-base transition-all font-orbitron
    ${error ? "opacity-100 cursor-not-allowed" : ""}`}
            style={{
              background: "#F59216",
              border: "2px solid #F59216",
            }}
            disabled={!!error}
          >
            Reset Slippage
          </button>

          <button
            onClick={handleModalClose}
            className="px-4 py-1 mt-5 bg-black font-semibold md:text-lg text-base text-[#FF9900] rounded font-orbitron"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlippageCalculator;
