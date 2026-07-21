import type { PortfolioV2Data } from "./portfolioV2Adapters";

export function fetchPortfolio(
  address: string,
  options?: { forceRefresh?: boolean },
): Promise<PortfolioV2Data>;
