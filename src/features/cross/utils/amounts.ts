import { formatUnits } from "viem";
import { getCrossTokensForChain } from "../model/catalog";

const TINY_DISPLAY_THRESHOLD = 0.000001;

function readDecimals(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatBaseUnitAmount(value?: string, decimals = 18) {
  if (!value) {
    return { display: "0", numeric: 0, raw: "0" };
  }

  try {
    const raw = formatUnits(BigInt(value), decimals);
    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) {
      return { display: raw, numeric: null, raw };
    }

    if (numeric === 0) {
      return { display: "0", numeric, raw };
    }

    if (numeric < TINY_DISPLAY_THRESHOLD) {
      return {
        display: `<${TINY_DISPLAY_THRESHOLD.toLocaleString(undefined, {
          minimumFractionDigits: 6,
          maximumFractionDigits: 6,
        })}`,
        numeric,
        raw,
      };
    }

    return {
      display: numeric.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      }),
      numeric,
      raw,
    };
  } catch {
    return { display: value, numeric: null, raw: value };
  }
}

function readAmountField(entry: any) {
  if (!entry) return undefined;
  if (typeof entry === "string") return entry;
  if (typeof entry?.amount === "string") return entry.amount;
  return undefined;
}

function readSettlementAmountField(offer: any) {
  return (
    readAmountField(offer?.amounts?.bridgeSettlement) ??
    readAmountField(offer?.execution?.quote?.amounts?.bridgeSettlement) ??
    (typeof offer?.execution?.quote?.minSettlementAmount === "string"
      ? offer.execution.quote.minSettlementAmount
      : undefined)
  );
}

function readLegAmountField(
  leg: any,
  field: "amountOut" | "minimumAmountOut",
) {
  const value = leg?.[field];
  return typeof value === "string" ? value : undefined;
}

function getDerivedOutputAmount(
  offer: any,
  field: "amountOut" | "minimumAmountOut",
) {
  const destinationSwap = getOfferLeg(offer, "destinationSwap");
  if (destinationSwap) {
    return readLegAmountField(destinationSwap, field);
  }

  const bridge = getOfferLeg(offer, "bridge");
  if (offer?.deliveryShape === "direct" && bridge) {
    return readLegAmountField(bridge, field);
  }

  return undefined;
}

function amountsDifferMaterially(left?: string, right?: string) {
  if (!left || !right) return false;

  try {
    const leftAmount = BigInt(left);
    const rightAmount = BigInt(right);
    const [larger, smaller] =
      leftAmount >= rightAmount ? [leftAmount, rightAmount] : [rightAmount, leftAmount];

    return smaller > 0n && larger > smaller * 10n;
  } catch {
    return false;
  }
}

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : null;
}

function readSourceTokenDecimals(offer: any, fallback: number) {
  const amountInputDecimals =
    offer?.amounts?.input?.decimals ??
    offer?.execution?.quote?.amounts?.input?.decimals;
  const parsed = Number(amountInputDecimals);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const chainId = Number(offer?.srcChainId ?? offer?.execution?.quote?.srcChainId);
  const tokenIn = normalizeAddress(offer?.tokenIn ?? offer?.execution?.quote?.tokenIn);
  if (Number.isFinite(chainId) && tokenIn) {
    const token = getCrossTokensForChain(chainId).find(
      (entry) => entry.address.toLowerCase() === tokenIn,
    );
    if (token) {
      return token.decimals;
    }
  }

  return fallback;
}

function resolvesToSettlementToken(offer: any) {
  const tokenOut = normalizeAddress(offer?.tokenOut);
  const settlementToken =
    normalizeAddress(offer?.destinationSettlementAsset?.tokenAddress) ??
    normalizeAddress(offer?.destinationSettlementAsset?.dstTokenAddress) ??
    normalizeAddress(offer?.execution?.quote?.expectedDstSettlementToken);

  return Boolean(tokenOut && settlementToken && tokenOut === settlementToken);
}

function amountsAreClose(left?: string, right?: string, maxPercentDelta = 10n) {
  if (!left || !right) return false;

  try {
    const leftAmount = BigInt(left);
    const rightAmount = BigInt(right);
    if (leftAmount === 0n || rightAmount === 0n) return false;

    const larger = leftAmount >= rightAmount ? leftAmount : rightAmount;
    const smaller = leftAmount >= rightAmount ? rightAmount : leftAmount;
    const delta = larger - smaller;

    return delta * 100n <= smaller * maxPercentDelta;
  } catch {
    return false;
  }
}

export function getOfferOutputAmount(offer: any) {
  return (
    readAmountField(offer?.amounts?.output) ??
    readAmountField(offer?.execution?.quote?.amounts?.output) ??
    getDerivedOutputAmount(offer, "amountOut") ??
    offer?.estimatedOut
  );
}

export function getOfferMinimumOutputAmount(offer: any) {
  return (
    readAmountField(offer?.amounts?.minimumOutput) ??
    readAmountField(offer?.execution?.quote?.amounts?.minimumOutput) ??
    getDerivedOutputAmount(offer, "minimumAmountOut") ??
    offer?.minAmountOut
  );
}

export function getOfferLeg(offer: any, leg: "sourceSwap" | "bridge" | "destinationSwap") {
  return offer?.legs?.[leg] ?? offer?.execution?.quote?.legs?.[leg] ?? null;
}

export function getQuotedOutputDisplay(
  value?: string,
  tokenOutDecimals = 18,
  offer?: any,
) {
  const explicitOutputAmount =
    value === undefined && offer ? getOfferOutputAmount(offer) : undefined;
  const candidateValue = explicitOutputAmount ?? value;
  const tokenDisplay = formatBaseUnitAmount(value, tokenOutDecimals);
  const explicitDisplay = explicitOutputAmount
    ? formatBaseUnitAmount(explicitOutputAmount, tokenOutDecimals)
    : null;
  const requiresDestinationSwap =
    offer?.deliveryShape === "dst_swap_required" ||
    offer?.deliveryShape === "src_and_dst_swap_required";
  const prefersSettlementOutput =
    (offer?.deliveryShape === "src_swap_required" ||
      offer?.deliveryShape === "src_and_dst_swap_required") &&
    resolvesToSettlementToken(offer);
  const settlementDecimals = readDecimals(
    offer?.destinationSettlementAsset?.decimals ?? offer?.routeAsset?.decimals,
    tokenOutDecimals,
  );
  const sourceTokenDecimals = readSourceTokenDecimals(offer, settlementDecimals);
  const settlementDisplay = formatBaseUnitAmount(candidateValue, settlementDecimals);
  const settlementAmountCandidate = readSettlementAmountField(offer);
  const settlementAmountDisplay = formatBaseUnitAmount(
    settlementAmountCandidate,
    settlementDecimals,
  );
  const sourceScaleDisplay = formatBaseUnitAmount(candidateValue, sourceTokenDecimals);
  const sourceAmountHint =
    typeof offer?.execution?.quote?.minSrcSwapOut === "string"
      ? offer.execution.quote.minSrcSwapOut
      : offer?.amountIn;
  const quoteUnitMismatch =
    !explicitOutputAmount &&
    requiresDestinationSwap &&
    settlementDecimals !== tokenOutDecimals &&
    typeof tokenDisplay.numeric === "number" &&
    tokenDisplay.numeric > 0 &&
    tokenDisplay.numeric < TINY_DISPLAY_THRESHOLD &&
    typeof settlementDisplay.numeric === "number" &&
    settlementDisplay.numeric >= TINY_DISPLAY_THRESHOLD;
  const settlementOutputMismatch =
    !explicitOutputAmount &&
    prefersSettlementOutput &&
    settlementAmountCandidate !== undefined &&
    settlementDecimals === tokenOutDecimals &&
    amountsDifferMaterially(candidateValue, settlementAmountCandidate);
  const invalidQuote =
    !explicitOutputAmount &&
    prefersSettlementOutput &&
    settlementDecimals !== sourceTokenDecimals &&
    amountsAreClose(candidateValue, sourceAmountHint) &&
    typeof settlementDisplay.numeric === "number" &&
    settlementDisplay.numeric >= 1_000_000 &&
    typeof sourceScaleDisplay.numeric === "number" &&
    sourceScaleDisplay.numeric > 0 &&
    sourceScaleDisplay.numeric < 1_000;

  return {
    display: invalidQuote
      ? "—"
      : explicitDisplay?.display ??
      (quoteUnitMismatch
        ? settlementDisplay.display
        : settlementOutputMismatch
          ? settlementAmountDisplay.display
          : tokenDisplay.display),
    quoteUnitMismatch: quoteUnitMismatch || settlementOutputMismatch,
    invalidQuote,
    settlementSymbol:
      offer?.destinationSettlementAsset?.canonicalAssetId ??
      offer?.settlementToken ??
      null,
  };
}
