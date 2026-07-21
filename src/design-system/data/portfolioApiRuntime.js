// Runtime bridge only: the legacy portfolio API currently pulls older viem
// typing debt into focused V2 type gates. Keep the TypeScript contract local to
// portfolioV2Adapters while Vite still bundles the real fetch implementation.
import { fetchPortfolio as fetchLegacyPortfolio } from "../../lib/api";

export async function fetchPortfolio(address, options) {
  if (!address) {
    throw new Error("Portfolio V2 requires a connected wallet address");
  }

  return fetchLegacyPortfolio(address, options);
}
