import { describe, expect, it } from "vitest";
import { buildBasketActionMessage, createUnsignedBasketAction } from "./signatures";

const WALLET = "0x1111111111111111111111111111111111111111";

describe("basket action messages", () => {
  it("matches the Ruflo plan plaintext exactly", () => {
    expect(
      buildBasketActionMessage({
        action: "plan",
        basketId: "basket-1",
        wallet: WALLET,
        planVersion: 3,
        idempotencyKey: "idem-1",
        timestamp: 1700000000,
        expiresAt: 1700000120,
      }),
    ).toBe(
      [
        "EMPX-IntentBasket",
        "plan",
        "basket-1",
        WALLET,
        "3",
        "idem-1",
        "1700000000",
        "1700000120",
      ].join("\n"),
    );
  });

  it("includes legId before planVersion for submitted and retry", () => {
    expect(
      buildBasketActionMessage({
        action: "submitted",
        basketId: "basket-1",
        wallet: WALLET,
        legId: "leg-9",
        planVersion: 4,
        idempotencyKey: "idem-2",
        timestamp: 1700000000,
        expiresAt: 1700000120,
      }),
    ).toBe(
      [
        "EMPX-IntentBasket",
        "submitted",
        "basket-1",
        WALLET,
        "leg-9",
        "4",
        "idem-2",
        "1700000000",
        "1700000120",
      ].join("\n"),
    );
  });

  it("omits optional fields for status", () => {
    expect(
      buildBasketActionMessage(
        createUnsignedBasketAction({
          action: "status",
          basketId: "basket-1",
          wallet: WALLET,
          timestamp: 1700000000,
          expiresAt: 1700000120,
        }),
      ),
    ).toBe(
      [
        "EMPX-IntentBasket",
        "status",
        "basket-1",
        WALLET,
        "1700000000",
        "1700000120",
      ].join("\n"),
    );
  });
});
