export const GAS_CHAIN_PAGE_SIZE = 6;

export const DISPLAY_GAS_CHAIN_IDS = [
  369, // PulseChain
  146, // Sonic
  8453, // Base
  1329, // Sei
  80094, // Berachain
  30, // Rootstock
  56, // BSC
  143, // Monad
  42161, // Arbitrum
  10, // Optimism
  137, // Polygon
  43114, // Avalanche
  999, // HyperEVM
  1, // Ethereum
  324, // zkSync Era
  59144, // Linea
  534352, // Scroll
  81457, // Blast
];

const DISPLAY_GAS_CHAIN_ID_SET = new Set(DISPLAY_GAS_CHAIN_IDS);
const GWEI_DECIMALS = 9;
const MICRO_NATIVE_DECIMALS = 6;

const toBigIntOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;

  try {
    return BigInt(value);
  } catch {
    return null;
  }
};

const trimTrailingZeros = (value) =>
  value.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");

const formatUnits = (value, decimals, maxFractionDigits) => {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n || maxFractionDigits === 0) {
    return whole.toString();
  }

  const paddedFraction = fraction.toString().padStart(decimals, "0");
  const visibleFraction = paddedFraction.slice(0, maxFractionDigits);

  return trimTrailingZeros(`${whole}.${visibleFraction}`);
};

const formatUnitsRounded = (value, decimals, maxFractionDigits) => {
  if (maxFractionDigits >= decimals) {
    return formatUnits(value, decimals, maxFractionDigits);
  }

  const reductionFactor = 10n ** BigInt(decimals - maxFractionDigits);
  const roundedValue = (value + reductionFactor / 2n) / reductionFactor;
  const divisor = 10n ** BigInt(maxFractionDigits);
  const whole = roundedValue / divisor;
  const fraction = roundedValue % divisor;

  if (fraction === 0n || maxFractionDigits === 0) {
    return whole.toString();
  }

  const paddedFraction = fraction.toString().padStart(maxFractionDigits, "0");
  return trimTrailingZeros(`${whole}.${paddedFraction}`);
};

export const filterDisplayGasChains = (chains = []) => {
  const chainsById = new Map(
    chains
      .filter((chain) => DISPLAY_GAS_CHAIN_ID_SET.has(Number(chain.chain)))
      .map((chain) => [Number(chain.chain), chain]),
  );

  return DISPLAY_GAS_CHAIN_IDS.flatMap((chainId) => {
    const chain = chainsById.get(chainId);
    return chain ? [chain] : [];
  });
};

export const formatGasChainPrice = (chain) => {
  const gasLimit = toBigIntOrNull(chain?.gas);
  const weiPerGas = toBigIntOrNull(chain?.gwei);
  const decimals = Number(chain?.decimals ?? 18);
  const symbol = chain?.symbol || "";

  if (!gasLimit || !weiPerGas || !Number.isInteger(decimals) || decimals < 0) {
    return {
      transferCost: "--",
      gasUnit: "-- gwei",
    };
  }

  const transferCostValue = gasLimit * weiPerGas;
  const nativeUnit = 10n ** BigInt(decimals);
  const microNativeThreshold =
    decimals >= MICRO_NATIVE_DECIMALS
      ? 10n ** BigInt(decimals - MICRO_NATIVE_DECIMALS)
      : 1n;
  const nativeWholeValue = transferCostValue / nativeUnit;
  const nativeFractionDigits = nativeWholeValue > 0n ? 6 : 8;
  const nativeTransferCost =
    transferCostValue > 0n && transferCostValue < microNativeThreshold
      ? `<0.${"0".repeat(MICRO_NATIVE_DECIMALS - 1)}1`
      : formatUnitsRounded(transferCostValue, decimals, nativeFractionDigits);
  const gasUnit = formatUnitsRounded(weiPerGas, GWEI_DECIMALS, 6);

  return {
    transferCost: symbol
      ? `${nativeTransferCost} ${symbol}`
      : nativeTransferCost,
    gasUnit: `${gasUnit} gwei`,
  };
};

export const formatBridgeFee = (quote = {}) => {
  const feeValue =
    quote.feeUsd ??
    quote.bridgeFeeUsd ??
    quote.bridgeFeeUSD ??
    quote.fee_usd ??
    quote.bridge_fee_usd;

  if (feeValue === null || feeValue === undefined || feeValue === "") {
    return null;
  }

  const numericFee = Number(feeValue);
  if (!Number.isFinite(numericFee) || numericFee < 0) {
    return null;
  }

  return `$${numericFee.toFixed(2)}`;
};
