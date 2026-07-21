import { SUPPORTED_CHAINS } from "../../config/chains";

const GECKO_TERMINAL_BASE = "https://api.geckoterminal.com/api/v2";

const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
const BATCH_SIZE = 30;

interface GeckoTerminalSimplePriceResponse {
  data?: {
    attributes?: {
      token_prices?: Record<string, string | number | null>;
      h24_price_change_percentage?: Record<string, string | number | null>;
    };
  };
}

export interface GeckoTerminalPriceToken {
  id: string;
  address: string;
  chainId: number;
  isNative?: boolean;
}

export interface GeckoTerminalTokenPrice {
  price: number;
  change24h: number;
}

const NETWORK_BY_CHAIN_ID: Record<number, string> = {
  369: "pulsechain",
  8453: "base",
  42161: "arbitrum",
  10: "optimism",
  137: "polygon_pos",
  56: "bsc",
  43114: "avalanche",
  146: "sonic",
  1329: "sei",
  80094: "berachain",
  30: "rootstock",
  143: "monad",
  999: "hyperevm",
};

const WRAPPED_NATIVE_BY_CHAIN_ID: Record<number, string> = {
  369: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  8453: "0x4200000000000000000000000000000000000006",
  42161: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  10: "0x4200000000000000000000000000000000000006",
  137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  56: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  43114: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  146: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
  1329: "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7",
  80094: "0x6969696969696969696969696969696969696969",
  30: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
  10001: "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990",
  999: "0x5555555555555555555555555555555555555555",
};

function parseNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLookupAddress(token: GeckoTerminalPriceToken): string | null {
  if (
    token.isNative ||
    token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS
  ) {
    return (
      SUPPORTED_CHAINS[token.chainId]?.wethAddress ||
      WRAPPED_NATIVE_BY_CHAIN_ID[token.chainId]
    )?.toLowerCase() || null;
  }

  return token.address.toLowerCase();
}

export async function getGeckoTerminalTokenPrices(
  tokens: GeckoTerminalPriceToken[],
): Promise<Record<string, GeckoTerminalTokenPrice>> {
  const tokensByNetwork = new Map<
    string,
    Array<GeckoTerminalPriceToken & { lookupAddress: string }>
  >();

  for (const token of tokens) {
    const network = NETWORK_BY_CHAIN_ID[token.chainId];
    const lookupAddress = getLookupAddress(token);

    if (!network || !lookupAddress) continue;

    const networkTokens = tokensByNetwork.get(network) || [];
    networkTokens.push({ ...token, lookupAddress });
    tokensByNetwork.set(network, networkTokens);
  }

  const prices: Record<string, GeckoTerminalTokenPrice> = {};

  for (const [network, networkTokens] of tokensByNetwork.entries()) {
    for (let i = 0; i < networkTokens.length; i += BATCH_SIZE) {
      const batch = networkTokens.slice(i, i + BATCH_SIZE);
      const addresses = [...new Set(batch.map((token) => token.lookupAddress))];
      const params = new URLSearchParams({
        include_24hr_price_change: "true",
        include_inactive_source: "true",
      });
      const url = `${GECKO_TERMINAL_BASE}/simple/networks/${network}/token_price/${addresses.join(",")}?${params.toString()}`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`);

        const data: GeckoTerminalSimplePriceResponse = await res.json();
        const tokenPrices = data.data?.attributes?.token_prices || {};
        const changes =
          data.data?.attributes?.h24_price_change_percentage || {};

        for (const token of batch) {
          const price = parseNumber(tokenPrices[token.lookupAddress]);
          if (price <= 0) continue;

          prices[token.id] = {
            price,
            change24h: parseNumber(changes[token.lookupAddress]),
          };
        }
      } catch (error) {
        console.warn(`GeckoTerminal price fetch failed for ${network}:`, error);
      }
    }
  }

  return prices;
}
