
// Map of chainId to GeckoTerminal network slug
const NETWORK_SLUGS: Record<number, string> = {
    369: "pulsechain",
    8453: "base",
    42161: "arbitrum",
    56: "bnb",
    137: "polygon",
    43114: "avalanche",
    10: "optimism",
};

const CACHE_PREFIX = "logo_cache_";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem {
    url: string | null;
    timestamp: number;
}

export const LogoService = {
    getNetworkSlug(chainId: number): string | null {
        return NETWORK_SLUGS[chainId] || null;
    },

    getChainLogo(chainId: number): string | null {

        const CHAIN_LOGOS: Record<number, string> = {
            369: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/pulsechain.svg",
            8453: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/base.svg",
            42161: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/arbitrum.svg",
            56: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/bnb.svg",
            137: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/polygon.svg",
            43114: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/avalanche.svg",
            10: "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/optimism.svg",
            // ... add others from chainsList.json
        };

        return CHAIN_LOGOS[chainId] || null;
    },

    async getTokenLogo(chainId: number, tokenAddress: string): Promise<string | null> {
        if (!tokenAddress || !chainId) return null;

        const formattedAddress = tokenAddress.toLowerCase();
        const network = this.getNetworkSlug(chainId);

        if (!network) return null;

        const cacheKey = `${CACHE_PREFIX}${chainId}_${formattedAddress}`;

        // Check cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const item: CacheItem = JSON.parse(cached);
                if (Date.now() - item.timestamp < CACHE_EXPIRY) {
                    return item.url;
                }
            } catch (e) {
                console.error("Error parsing logo cache", e);
            }
        }

        // Fetch from GeckoTerminal
        try {
            const response = await fetch(
                `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${formattedAddress}`
            );

            if (!response.ok) {
                throw new Error(`GeckoTerminal API error: ${response.status}`);
            }

            const data = await response.json();
            const imageUrl = data.data?.attributes?.image_url || null;

            // Update cache
            const cacheItem: CacheItem = {
                url: imageUrl,
                timestamp: Date.now(),
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));

            return imageUrl;
        } catch (error) {
            console.error("Failed to fetch token logo:", error);
            const cacheItem: CacheItem = {
                url: null,
                timestamp: Date.now() - (CACHE_EXPIRY - 60 * 60 * 1000), // expire in 1 hour
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            return null;
        }
    }
};
