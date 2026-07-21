import { describe, expect, it } from "vitest";
import { readProviderApprovalRequests } from "../execution/approvals";
import { classifyProviderDirectAction } from "../execution/providerDirect";
import { getOfferCapability } from "../model/capabilities";
import {
  chainflipQuoteOnlyOffer,
  chainflipSelectionUnavailableFixture,
  disabledOptimismWithdrawalOffer,
  disabledTeleSwapOffer,
  hyperlaneApprovalSelectionFixture,
  hyperlaneBaseToArbitrumUsdcOffer,
  mayaBitcoinToEthereumOffer,
  optimismErc20DepositOffer,
  optimismErc20SelectionFixture,
  optimismNativeDepositOffer,
  optimismNativeSelectionFixture,
  railEnablementQuoteFixture,
} from "./railOffers";

describe("sanitized rail enablement fixtures", () => {
  it("covers every rollout case with canonical backend rail identifiers", () => {
    expect(railEnablementQuoteFixture.offerSet.offers).toEqual(
      expect.arrayContaining([
        hyperlaneBaseToArbitrumUsdcOffer,
        optimismErc20DepositOffer,
        optimismNativeDepositOffer,
        mayaBitcoinToEthereumOffer,
        chainflipQuoteOnlyOffer,
        disabledTeleSwapOffer,
        disabledOptimismWithdrawalOffer,
      ]),
    );
  });

  it("preserves Hyperlane's exact provider approval when it differs from transfer amount", () => {
    expect(hyperlaneApprovalSelectionFixture.quote.amountIn).toBe("1000000");
    expect(
      readProviderApprovalRequests(
        hyperlaneApprovalSelectionFixture.integration,
        8453,
      ),
    ).toEqual([
      expect.objectContaining({
        amount: 1200000n,
        chainId: 8453,
      }),
    ]);
    expect(
      classifyProviderDirectAction(
        hyperlaneApprovalSelectionFixture.integration,
        { selectedSourceChainId: 8453 },
      ),
    ).toBe("evm_transaction");
  });

  it("keeps both ERC-20 and native Optimism deposits executable", () => {
    for (const candidate of [
      optimismErc20DepositOffer,
      optimismNativeDepositOffer,
    ]) {
      expect(getOfferCapability(candidate)).toMatchObject({
        status: "executable",
        selectable: true,
      });
    }
    expect(optimismErc20SelectionFixture.integration).toHaveProperty(
      "approvals.0.amount",
      "1000000",
    );
    expect(optimismNativeSelectionFixture.integration).not.toHaveProperty(
      "approvals",
    );
  });

  it("gates Maya, Chainflip, TeleSwap, and Optimism withdrawals", () => {
    expect(getOfferCapability(mayaBitcoinToEthereumOffer).status).toBe(
      "restricted",
    );
    expect(getOfferCapability(chainflipQuoteOnlyOffer).status).toBe(
      "quote_only",
    );
    expect(getOfferCapability(disabledTeleSwapOffer).status).toBe("disabled");
    expect(getOfferCapability(disabledOptimismWithdrawalOffer).status).toBe(
      "disabled",
    );
    expect(chainflipSelectionUnavailableFixture.body.code).toBe(
      "CHAINFLIP_BROKER_UNAVAILABLE",
    );
  });
});
