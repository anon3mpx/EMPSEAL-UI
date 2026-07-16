export class SwapRoutePreparationError extends Error {
  constructor(sdkError, localError) {
    super("SDK and local swap route preparation failed");
    this.name = "SwapRoutePreparationError";
    this.sdkError = sdkError;
    this.localError = localError;
  }
}

const hasUsableLocalQuote = (quote) =>
  Array.isArray(quote?.amounts) &&
  quote.amounts.length >= 2 &&
  Array.isArray(quote?.path) &&
  quote.path.length >= 2;

const uniqueFallbackSteps = (maxSteps, fallbackPlan) =>
  [maxSteps, fallbackPlan?.secondStep, fallbackPlan?.thirdStep]
    .filter((step) => step != null)
    .map(Number)
    .filter((step, index, steps) => steps.indexOf(step) === index);

export async function prepareSwapRoute(input) {
  let sdkError;

  try {
    if (!input.router?.splitSwap) {
      throw new Error("SDK split route preparation is unavailable");
    }
    const sdkResult = await input.router.splitSwap(
      input.amountIn,
      input.tokenIn,
      input.tokenOut,
      input.recipient,
      {
        routing: "auto",
        maxSteps: input.maxSteps,
        slippageBps: input.slippageBps,
        maxSplits: 3,
        minSavingsBps: 10,
        feeContext: { pairType: input.pairType },
      },
    );
    return {
      source: "sdk",
      routing: sdkResult.routing,
      sdkResult,
    };
  } catch (error) {
    sdkError = error;
  }

  const steps = uniqueFallbackSteps(input.maxSteps, input.fallbackPlan);
  let localError;
  for (const maxSteps of steps) {
    try {
      const quote = await input.localQuote({
        chainId: input.chainId,
        amountIn: input.amountIn,
        tokenIn: input.localTokenIn ?? input.tokenIn,
        tokenOut: input.localTokenOut ?? input.tokenOut,
        maxSteps,
      });
      if (hasUsableLocalQuote(quote)) {
        return {
          source: "local",
          routing: "single",
          quote,
          sdkError,
        };
      }
      localError = new Error(`Local ${maxSteps}-step quote returned no usable route`);
    } catch (error) {
      localError = error;
    }
  }

  throw new SwapRoutePreparationError(sdkError, localError);
}
