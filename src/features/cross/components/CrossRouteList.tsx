import { useState } from "react";
import { formatUnits } from "viem";
import {
  getOfferLeg,
  getOfferMinimumOutputAmount,
  getOfferOutputAmount,
  getQuotedOutputDisplay,
} from "../utils/amounts";
import {
  getOfferCapability,
  getRailCapability,
} from "../model/capabilities";

const formatDisplayAmount = (value?: string, decimals = 18) => {
  if (!value) return "0";

  try {
    const formatted = formatUnits(BigInt(value), decimals);
    const numeric = Number(formatted);
    if (!Number.isFinite(numeric)) return formatted;
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  } catch {
    return value;
  }
};

const getDeliveryLabel = (deliveryShape?: string) => {
  switch (deliveryShape) {
    case "src_swap_required":
      return "SRC SWAP";
    case "dst_swap_required":
      return "DST SWAP";
    case "src_and_dst_swap_required":
      return "SRC + DST";
    default:
      return "DIRECT";
  }
};

const formatUsd = (value?: string | number) => {
  if (value === undefined || value === null || value === "") return "0.00";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
};

const sanitizeNumeric = (value: string) => {
  const next = value.replace(/[^0-9.]/g, "");
  return next.split(".").length <= 2 ? next : value;
};

const formatRailLabel = (rail?: string) => {
  if (!rail) return "Route";
  return getRailCapability(rail).label;
};

const formatExecutionMode = (executionMode?: string) => {
  if (executionMode === "provider_direct") return "Provider Direct";
  if (executionMode === "router_intent") return "Router Intent";
  return "Standard";
};

const formatAssetLabel = (asset: any) => {
  if (!asset) return "—";
  if (typeof asset === "string") return asset;

  return (
    asset.canonicalAssetId ??
    asset.providerAssetId ??
    asset.tokenAddress ??
    asset.dstTokenAddress ??
    asset.srcTokenAddress ??
    "—"
  );
};

const getProviderFlowSummary = (offer: any) => {
  const rail = String(offer?.rail ?? "").toUpperCase();

  if (rail === "THORCHAIN") {
    return "THORChain direct deposit flow with provider memo and vault routing.";
  }

  if (rail === "LAYERZERO") {
    return offer?.executionMode === "provider_direct"
      ? "LayerZero provider steps may require transaction and signature actions."
      : "LayerZero contract-backed settlement.";
  }

  if (rail === "GASZIP") {
    return "Destination gas is executed as a second Gas.zip transfer leg.";
  }

  if (rail === "HYPERLANE_NEXUS") {
    return "Hyperlane Nexus Warp Route execution using the transaction returned by the API.";
  }

  if (rail === "OPTIMISM_NATIVE_BRIDGE") {
    return "Ethereum-to-Optimism deposit through the canonical Optimism Standard Bridge.";
  }

  if (rail === "MAYA") {
    return "Maya is restricted until a Bitcoin source wallet or reviewed deposit flow is available.";
  }

  if (rail === "CHAINFLIP") {
    return "Chainflip output is informational until private broker-backed deposit-channel creation is enabled.";
  }

  return offer?.executionMode === "provider_direct"
    ? "Provider-managed execution flow."
    : "Contract-backed cross-chain intent.";
};

const formatLegLabel = (leg: "sourceSwap" | "bridge" | "destinationSwap") => {
  switch (leg) {
    case "sourceSwap":
      return "Source Swap";
    case "destinationSwap":
      return "Destination Swap";
    default:
      return "Bridge";
  }
};

interface CrossRouteListProps {
  offers: any[];
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
  expiresAt: number | null;
  tokenOutDecimals?: number;
  tokenOutSymbol?: string;
  errorMessage?: string | null;
  gasOffers?: any[];
  includeDestinationGas?: boolean;
  selectedGasOfferId?: string | null;
  destinationGasAmount?: string;
  onSelectGasOffer?: (offerId: string) => void;
  onIncludeDestinationGasChange?: (value: boolean) => void;
  onDestinationGasAmountChange?: (value: string) => void;
}

export function CrossRouteList({
  offers,
  selectedOfferId,
  onSelect,
  expiresAt,
  tokenOutDecimals = 18,
  tokenOutSymbol = "",
  errorMessage,
  gasOffers = [],
  includeDestinationGas = false,
  selectedGasOfferId = null,
  destinationGasAmount = "0.001",
  onSelectGasOffer,
  onIncludeDestinationGasChange,
  onDestinationGasAmountChange,
}: CrossRouteListProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const expiresInSeconds = expiresAt
    ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    : null;

  const selectedOffer =
    offers.find((offer) => offer.offerId === selectedOfferId) ?? offers[0] ?? null;

  const selectedOfferOutput = selectedOffer
    ? getQuotedOutputDisplay(
        getOfferOutputAmount(selectedOffer),
        tokenOutDecimals,
        selectedOffer,
      )
    : null;
  const selectedOfferMinimum = selectedOffer
    ? getQuotedOutputDisplay(
        getOfferMinimumOutputAmount(selectedOffer),
        tokenOutDecimals,
        selectedOffer,
      )
    : null;
  const hasGasOffers = gasOffers.length > 0;

  if (errorMessage) {
    return (
      <div className="border border-red-400/15 bg-red-400/10 p-4 text-sm text-red-200">
        {errorMessage}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="border border-white/[0.05] bg-white/[0.02] p-4 text-sm text-white/40">
        Route unavailable for the selected pair.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold tracking-[0.2em] text-white/20">
          ROUTING RAIL
        </p>

        <div className="flex items-center gap-3">
          {expiresInSeconds !== null ? (
            <p className="text-[10px] text-white/20">
              {/* {expiresInSeconds}s */}
            </p>
          ) : null}
          {selectedOffer ? (
            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="text-[10px] tracking-[0.08em] text-white/20 transition-colors hover:text-white/45"
            >
              {showDetails ? "HIDE" : "DETAILS"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {offers.map((offer) => {
          const capability = getOfferCapability(offer);
          const output = getQuotedOutputDisplay(
            getOfferOutputAmount(offer),
            tokenOutDecimals,
            offer,
          );

          return (
            <button
              key={offer.offerId}
              type="button"
              onClick={() => {
                if (capability.selectable) onSelect(offer.offerId);
              }}
              disabled={!capability.selectable}
              title={capability.reason}
              className={`w-full border px-5 py-6 text-left transition-all ${
                selectedOfferId === offer.offerId
                  ? "border-[#FF8A00]/35 bg-white/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02]"
              } ${capability.selectable ? "" : "cursor-not-allowed opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[12px] font-bold uppercase tracking-[0.08em] ${
                        selectedOfferId === offer.offerId
                          ? "text-[#FF8A00]"
                          : "text-white/65"
                      }`}
                    >
                      {formatRailLabel(offer.rail)}
                    </span>
                    {offer.isBest ? (
                      <span className="border border-[#4ade80]/15 bg-[#4ade80]/10 px-[5px] py-[1px] text-[8px] font-bold tracking-[0.08em] text-[#4ade80]">
                        BEST
                      </span>
                    ) : null}
                    {offer.executionMode === "provider_direct" ? (
                      <span className="border border-white/[0.08] bg-white/[0.04] px-[5px] py-[1px] text-[8px] font-bold tracking-[0.08em] text-white/35">
                        DIRECT
                      </span>
                    ) : null}
                    {capability.status !== "executable" ? (
                      <span className="border border-[#FF8A00]/20 bg-[#FF8A00]/10 px-[5px] py-[1px] text-[8px] font-bold tracking-[0.08em] text-[#FF8A00]">
                        {capability.status === "quote_only"
                          ? "QUOTE ONLY"
                          : capability.status.toUpperCase()}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-[12px] text-white/30">
                    ~
                    {Math.max(
                      1,
                      Math.round(
                        Number(offer.economics?.settlementTimeSeconds ?? 120) / 60,
                      ),
                    )}{" "}
                    min · $
                    {offer.economics?.providerFeeUSD ??
                      offer.economics?.protocolFeeUSD ??
                      "0.00"}
                  </p>
                </div>

                <div className="text-right text-[10px] text-white/25">
                  <div>{getDeliveryLabel(offer.deliveryShape)}</div>
                  <div className="mt-2 text-white/50">
                    {output.display}
                    {output.invalidQuote ? "" : output.quoteUnitMismatch ? "*" : ""}{" "}
                    {output.invalidQuote ? "" : tokenOutSymbol}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showDetails && selectedOffer ? (
        <div className="border border-white/[0.05] bg-white/[0.015] px-4 py-3">
          {(() => {
            const capability = getOfferCapability(selectedOffer);
            return (
              <div className="mb-3 grid gap-2 text-[10px] text-white/55 sm:grid-cols-2">
                <div>
                  <span className="text-white/30">Status: </span>
                  <span className="uppercase">
                    {capability.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-white/30">Source wallet: </span>
                  <span className="uppercase">{capability.requiredSourceWallet}</span>
                </div>
                <div>
                  <span className="text-white/30">Approval: </span>
                  <span>
                    {capability.providerApprovalMayBeRequired
                      ? "May be required by provider"
                      : "Not expected"}
                  </span>
                </div>
                <div>
                  <span className="text-white/30">Destination address: </span>
                  <span>
                    {capability.nativeDestinationAddressRequired
                      ? "Native address required"
                      : "Connected wallet"}
                  </span>
                </div>
              </div>
            );
          })()}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="border border-[#FF8A00]/20 bg-[#FF8A00]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#FF8A00]">
              {selectedOffer.railVariant ?? formatRailLabel(selectedOffer.rail)}
            </span>
            <span className="border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45">
              {getDeliveryLabel(selectedOffer.deliveryShape)}
            </span>
            <span className="border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45">
              {formatExecutionMode(selectedOffer.executionMode)}
            </span>
          </div>

          <div className="space-y-2 text-[11px] text-white/65">
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Execution</span>
              <span>{formatExecutionMode(selectedOffer.executionMode)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Route Asset</span>
              <span>{formatAssetLabel(selectedOffer.routeAsset)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Source Settlement</span>
              <span>{formatAssetLabel(selectedOffer.sourceSettlementAsset)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Destination Settlement</span>
              <span>{formatAssetLabel(selectedOffer.destinationSettlementAsset)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Provider Fee</span>
              <span>${formatUsd(selectedOffer.economics?.providerFeeUSD)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/30">Minimum Receive</span>
              <span>
                {selectedOfferMinimum?.display}
                {selectedOfferMinimum?.invalidQuote
                  ? ""
                  : selectedOfferMinimum?.quoteUnitMismatch
                    ? "*"
                    : ""}{" "}
                {selectedOfferMinimum?.invalidQuote ? "" : tokenOutSymbol}
              </span>
            </div>
          </div>

          <p className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] leading-5 text-white/42">
            {getProviderFlowSummary(selectedOffer)}
          </p>

          {(["sourceSwap", "bridge", "destinationSwap"] as const).map((legKey) => {
            const leg = getOfferLeg(selectedOffer, legKey);
            if (!leg) return null;

            return (
              <div
                key={legKey}
                className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] text-white/48"
              >
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-white/28">
                  {formatLegLabel(legKey)}
                </div>
                <div className="flex justify-between gap-4">
                  <span>
                    {leg.tokenInSymbol ?? "IN"} to {leg.tokenOutSymbol ?? "OUT"}
                  </span>
                  <span>
                    {formatDisplayAmount(
                      leg.amountOut,
                      Number(leg.tokenOutDecimals ?? tokenOutDecimals),
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          {selectedOfferOutput?.invalidQuote ? (
            <p className="mt-3 text-[10px] leading-5 text-[#FF8A00]/75">
              API returned a malformed output amount for this route. Hiding the
              receive estimate instead of showing an incorrect value.
            </p>
          ) : selectedOfferOutput?.quoteUnitMismatch ? (
            <p className="mt-3 text-[10px] leading-5 text-[#FF8A00]/75">
              Quote-unit mismatch detected from the API. Showing the estimate
              using {selectedOfferOutput.settlementSymbol ?? "settlement"}{" "}
              decimals instead of {tokenOutSymbol || "tokenOut"} decimals.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 border border-white/[0.05] bg-white/[0.015] px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-white/20">
              DESTINATION GAS RAIL
            </p>
            <p className="mt-2 text-[11px] text-white/35">
              Optional second leg executed after the primary bridge route.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {includeDestinationGas ? (
              <input
                type="text"
                inputMode="decimal"
                value={destinationGasAmount}
                onChange={(event) =>
                  onDestinationGasAmountChange?.(
                    sanitizeNumeric(event.target.value),
                  )
                }
                className="w-[118px] border border-white/[0.08] bg-transparent px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/18"
              />
            ) : null}

            <button
              type="button"
              onClick={() =>
                onIncludeDestinationGasChange?.(!includeDestinationGas)
              }
              className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                includeDestinationGas
                  ? "border-[#FF8A00]/35 bg-[#FF8A00]/12 text-[#FF8A00]"
                  : "border-white/[0.08] bg-white/[0.03] text-white/35"
              }`}
            >
              {includeDestinationGas ? "Included" : "Add Gas"}
            </button>
          </div>
        </div>

        {hasGasOffers ? (
          <div className="grid gap-3 md:grid-cols-2">
            {gasOffers.map((offer) => {
              const active =
                includeDestinationGas && selectedGasOfferId === offer.offerId;

              return (
                <button
                  key={offer.offerId}
                  type="button"
                  onClick={() => {
                    onSelectGasOffer?.(offer.offerId);
                    onIncludeDestinationGasChange?.(true);
                  }}
                  className={`w-full border px-5 py-5 text-left transition-all ${
                    active
                      ? "border-[#FF8A00]/35 bg-white/[0.05]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[12px] font-bold uppercase tracking-[0.08em] ${
                            active ? "text-[#FF8A00]" : "text-white/65"
                          }`}
                        >
                          {formatRailLabel(offer.rail)}
                        </span>
                        <span className="border border-white/[0.08] bg-white/[0.04] px-[5px] py-[1px] text-[8px] font-bold tracking-[0.08em] text-white/35">
                          STEP 2
                        </span>
                      </div>

                      <p className="mt-4 text-[12px] text-white/30">
                        ~
                        {Math.max(
                          1,
                          Math.round(
                            Number(
                              offer.economics?.settlementTimeSeconds ?? 60,
                            ) / 60,
                          ),
                        )}{" "}
                        min · $
                        {offer.economics?.providerFeeUSD ??
                          offer.economics?.protocolFeeUSD ??
                          "0.00"}
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-white/25">
                      <div>{formatExecutionMode(offer.executionMode)}</div>
                      <div className="mt-2 text-white/50">
                        {formatDisplayAmount(offer.estimatedOut)} GAS
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : includeDestinationGas ? (
          <p className="text-[11px] text-white/35">
            No destination gas quote available for this route yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
