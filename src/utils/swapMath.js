export const MIN_EXECUTION_BUFFER_PERCENT = 2;
export const HIGH_PRICE_IMPACT_WARNING_PERCENT = 5;
export const HIGH_PRICE_IMPACT_BLOCK_PERCENT = 15;

export const clampSlippagePercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Math.max(numeric, 0), 50);
};

export const getEffectiveSlippagePercent = (selectedSlippage) =>
  Math.max(
    MIN_EXECUTION_BUFFER_PERCENT,
    clampSlippagePercent(selectedSlippage),
  );

export const calculateMinOut = (amountOut, selectedSlippage) => {
  if (typeof amountOut !== "bigint" || amountOut <= 0n) return 0n;
  const bps = BigInt(Math.round(getEffectiveSlippagePercent(selectedSlippage) * 100));
  return (amountOut * (10000n - bps)) / 10000n;
};

export const calculateMinReceived = (amountOut, selectedSlippage) => {
  const numericAmount = Number(amountOut);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  const effective = getEffectiveSlippagePercent(selectedSlippage) / 100;
  return numericAmount * (1 - effective);
};

export const hasUsableRouteQuote = (quote) =>
  !!(
    quote &&
    Array.isArray(quote.amounts) &&
    quote.amounts.length >= 2 &&
    Array.isArray(quote.path) &&
    quote.path.length >= 2 &&
    quote.amounts[quote.amounts.length - 1] > 0n
  );

export const calculateRoutePriceImpactPercent = ({
  amountIn,
  amountOut,
  singleTokenOut,
}) => {
  const input = Number(amountIn);
  const output = Number(amountOut);
  const spot = Number(singleTokenOut);

  if (
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    !Number.isFinite(spot) ||
    input <= 0 ||
    output <= 0 ||
    spot <= 0
  ) {
    return null;
  }

  const expectedOutput = input * spot;
  if (!Number.isFinite(expectedOutput) || expectedOutput <= 0) {
    return null;
  }

  return ((output - expectedOutput) / expectedOutput) * 100;
};

export const calculateUsdPriceImpactPercent = ({
  usdValueTokenA,
  usdValueTokenB,
}) => {
  const inputUsd = Number(usdValueTokenA);
  const outputUsd = Number(usdValueTokenB);

  if (
    !Number.isFinite(inputUsd) ||
    !Number.isFinite(outputUsd) ||
    inputUsd <= 0 ||
    outputUsd <= 0
  ) {
    return null;
  }

  return ((outputUsd - inputUsd) / inputUsd) * 100;
};

export const shouldSuppressQuoteDetails = ({
  amountIn,
  debouncedAmountIn,
  isQuoting,
  isQuoteExpired,
}) =>
  !!(
    isQuoting ||
    isQuoteExpired ||
    !amountIn ||
    !debouncedAmountIn ||
    amountIn !== debouncedAmountIn
  );

export const formatImpactPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(2);
};
