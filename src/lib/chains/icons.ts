// ─── Chain icon registry ──────────────────────────────────────────────────────
//
// Single source of truth for chain logo URLs.  Replaces the scattered
// chainLogoMap definitions previously inlined in Portfolio.tsx + similar
// pages.  Adds a graceful fallback so missing icons never show as a
// broken-image — letter pills render instead.
//
// Rules
// ─────
//   • EMPX-supported chains (the 14 agg-deployed list) should ALL eventually
//     be local at public/icons/.  Drop a new SVG/PNG there and add the
//     mapping below.  No new external CDN URLs for the EMPX chains.
//   • Other chains (kitchen-sink balance display — user might hold tokens
//     on Cronos, Fantom, etc. even though EMPX doesn't route there) may
//     stay on external CDNs.  These are pure read-only display surfaces
//     and a CDN outage just falls back to the letter pill.
//   • The chainKey is the lowercase chain name as it appears in
//     onchainPortfolio output / chains.ts.

// ── Local icons (already in public/icons/) ──────────────────────────────────
//
// These ship with the build — zero external dependency for the EMPX
// supported chains we have artwork for.

const LOCAL: Record<string, string> = {
  // EMPX-supported (14 chains; 10/14 covered)
  ethereum:        "/icons/eth.svg",
  base:            "/icons/base.svg",
  arbitrum:        "/icons/arbitrum.svg",
  polygon:         "/icons/polygon.svg",
  bsc:             "/icons/binance.svg",
  optimism:        "/icons/op.svg",
  avalanche:       "/icons/avalanche.svg",
  berachain:       "/icons/berachain.svg",
  pulsechain:      "/icons/pls.svg",
  sonic:           "/icons/sonic.png",
  // EMPX-supported but artwork missing — TODO drop SVGs into public/icons/:
  //   sei.svg, rootstock.svg, monad.svg, hyperevm.svg, ethereumpow.svg
};

// ── External CDN icons (non-EMPX chains; balance-display only) ──────────────
//
// Used when the user's wallet holds tokens on a chain EMPX doesn't route
// to.  Failure to load is harmless — falls back to the letter pill.
// These URLs are organized by source so we can audit them periodically.

const EXTERNAL: Record<string, string> = {
  sei:                  "https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/sei.svg",
  rootstock:            "https://rootstock.blockscout.com/assets/favicon/favicon.ico",
  "cronos mainnet":     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK7JCGpwklwB4QMz4g7NoNTd1Epuyi48zgS91loU1-b2RHCK5W",
  monad:                "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fmxy95kpjer9bgo8k4jr366qx7qyj&w=64&q=75",
  hyperevm:             "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fcre8xcjrtfqah7f2sjx8whz68izg&w=64&q=75",
  blast:                "https://cdn.prod.website-files.com/65a6baa1a3f8ed336f415cb4/65a6c461965bf28af43b80bc_Logo%20Yellow%20on%20Transparent%20Background.png",
  "manta pacific mainnet": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPaO9GeImBmVNTXZVGHaNUhp1WKKObzjDKDg&s",
  zetachain:            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDYhJxwXa_YkqJGPOLRh64V0J8BZkYEHlZOA&s",
  "zksync era":         "https://s2.coinmarketcap.com/static/img/coins/200x200/24091.png",
  "sei network":        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6fwxNLN1-so5tXQr4z_Z-VcgryIoKU2iaFw&s",
  "polygon zkevm":      "https://www.alchemy.com/dapps/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Falchemy-website%2Fimage%2Fupload%2Fv1694675395%2Fdapp-store%2Fdapp-logos%2FPolygon%2520zkEVM.png&w=640&q=75",
  moonriver:            "https://cryptologos.cc/logos/moonriver-movr-logo.png",
  fantom:               "https://s2.coinmarketcap.com/static/img/coins/200x200/3513.png",
  aurora:               "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDrtG7a1CUnAO9IZwRPWThw71z_uLm1nyjyw&s",
  gnosis:               "https://cryptologos.cc/logos/gnosis-gno-gno-logo.png",
  "linea mainnet":      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpHUmXshY3mPDmQmpf-VMFK_i9JxdG_FEFeg&s",
  scroll:               "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSESM97ra0eogVU9F-jgvHWyUcFFN6ZEh9SQ&s",
  fuse:                 "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlWRds0-tcHOYrR8jafkXU8U5Q0MFvo56Asw&s",
  moonbeam:             "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTekV-fnTPaXukurGta7NgI0gWy6z4-kj0hrg&s",
  celo:                 "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRADqqjgCRSQG2l648A0-x4vWeKph203JqS4w&s",
  "boba network":       "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTH1xnrUkBwf1Xgfsb-zcuzc0qbq4ADIdWkww&s",
  mantle:               "https://static1.tokenterminal.com//mantle/logo.png?logo_hash=eee8c4258e118b4c7d96ac52a6f83cc9b5ea8232",
  telos:                "https://s2.coinmarketcap.com/static/img/coins/200x200/4660.png",
  "kava evm":           "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQC931Eoyh14rn1dPlVQiMbcLLn7o7g6UtZ7w&s",
  "arbitrum nova":      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCsXde41ET2SnLR9qJlY3YduFS0r5BnXR1jg&s",
  tron:                 "https://s2.coinmarketcap.com/static/img/coins/200x200/1958.png",
  metis:                "https://s3.coinmarketcap.com/static-gravity/image/6cbb40029f714c00ab3103055cb4ed44.jpeg",
  bahamut:              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT63y2NYI8NM_NvlrJr7BSszLAVYEBb786FIg&s",
  "mode mainnet":       "https://s2.coinmarketcap.com/static/img/coins/200x200/31016.png",
  "rootstock mainnet":  "https://icons.llamao.fi/icons/chains/rsz_rsk.jpg",
  merlin:               "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0Xu_YMl9FlDCmW-gvl67pGW3fo0qxjdE61g&s",
};

/**
 * Resolve a chain's icon URL.  Returns `undefined` when no mapping exists;
 * callers should render the letter-pill fallback (use `<ChainIcon>` from
 * `lib/chains/ChainIcon.tsx` which does this automatically).
 *
 * Lookup is case-insensitive on the chain key — onchainPortfolio
 * sometimes emits "Polygon" vs "polygon" depending on the data source.
 */
export function getChainIconUrl(chainKey: string | undefined | null): string | undefined {
  if (!chainKey) return undefined;
  const key = chainKey.toLowerCase().trim();
  return LOCAL[key] ?? EXTERNAL[key];
}

/** True when the icon is shipped locally (no CDN).  Used by tests + audits. */
export function isLocalIcon(chainKey: string | undefined | null): boolean {
  if (!chainKey) return false;
  const key = chainKey.toLowerCase().trim();
  return key in LOCAL;
}

/** All chains we know about (local + external).  Useful for completeness
 *  checks against the supported-chains list at audit time. */
export function knownChainKeys(): string[] {
  return [...Object.keys(LOCAL), ...Object.keys(EXTERNAL)];
}

/** Pure helper used by the letter-pill fallback. */
export function chainInitial(chainKey: string | undefined | null): string {
  if (!chainKey) return "?";
  // Strip leading "chain " / trailing "mainnet" / etc. for cleaner pills.
  const cleaned = chainKey.replace(/\s*(mainnet|network|evm)\s*$/i, "").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}
