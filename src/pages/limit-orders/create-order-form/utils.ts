import {
  STOP_LOSS_MARKET_POSITION,
  STOP_LOSS_MAX_ABOVE_PERCENT,
  STOP_LOSS_MAX_BELOW_PERCENT,
} from "./constants";

export const formatNumber = (value: string | undefined): string => {
  if (!value) return "";

  const [integerPart, decimalPart] = value.split(".");
  const formattedInteger = integerPart
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, "");

  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}`
    : formattedInteger;
};

export const limitDecimalPlaces = (
  value: string,
  maxDecimals: number = 8,
): string => {
  const parts = value.split(".");
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return `${parts[0]}.${parts[1].slice(0, maxDecimals)}`;
  }
  return value;
};

export const sanitizeNumericInput = (
  value: string,
  maxDecimals: number = 18,
): string => {
  let sanitized = value.replace(/[^0-9.]/g, "");
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  return limitDecimalPlaces(sanitized, maxDecimals);
};

export const getDeadlineBounds = (now: Date = new Date()) => {
  const threeMonthsFromNow = new Date(new Date().setMonth(now.getMonth() + 3));
  const timezoneOffset = now.getTimezoneOffset() * 60000;

  return {
    minDeadline: new Date(now.getTime() - timezoneOffset)
      .toISOString()
      .slice(0, 16),
    maxDeadline: new Date(threeMonthsFromNow.getTime() - timezoneOffset)
      .toISOString()
      .slice(0, 16),
  };
};

export const getStopLossSliderPosition = (percent: number) => {
  const safePercent = Math.min(
    STOP_LOSS_MAX_ABOVE_PERCENT,
    Math.max(-STOP_LOSS_MAX_BELOW_PERCENT, percent),
  );

  if (safePercent <= 0) {
    return (
      STOP_LOSS_MARKET_POSITION -
      (Math.abs(safePercent) / STOP_LOSS_MAX_BELOW_PERCENT) *
        STOP_LOSS_MARKET_POSITION
    );
  }

  return (
    STOP_LOSS_MARKET_POSITION +
    (safePercent / STOP_LOSS_MAX_ABOVE_PERCENT) *
      (100 - STOP_LOSS_MARKET_POSITION)
  );
};

export const getStopLossPercentFromSlider = (sliderPosition: number) => {
  const safePosition = Math.min(100, Math.max(0, sliderPosition));

  if (safePosition <= STOP_LOSS_MARKET_POSITION) {
    const belowRatio =
      (STOP_LOSS_MARKET_POSITION - safePosition) / STOP_LOSS_MARKET_POSITION;
    return -belowRatio * STOP_LOSS_MAX_BELOW_PERCENT;
  }

  const aboveRatio =
    (safePosition - STOP_LOSS_MARKET_POSITION) /
    (100 - STOP_LOSS_MARKET_POSITION);
  return aboveRatio * STOP_LOSS_MAX_ABOVE_PERCENT;
};
