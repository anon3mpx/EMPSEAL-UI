import { describe, expect, it } from "vitest";
import { isUserRejectedError, mapBasketApiError } from "./errors";

describe("mapBasketApiError", () => {
  it("maps stable basket error codes", () => {
    expect(mapBasketApiError({ status: 422, body: { error: "BASKET_CAPABILITY_UNAVAILABLE", message: "intent baskets are disabled" } }))
      .toMatch(/disabled/i);
    expect(mapBasketApiError({ status: 410, body: { error: "BASKET_QUOTE_EXPIRED" } }))
      .toMatch(/expired/i);
    expect(mapBasketApiError({ status: 401, body: { error: "BASKET_SIGNATURE_INVALID" } }))
      .toMatch(/signature/i);
    expect(mapBasketApiError({ status: 409, body: { error: "BASKET_LEG_NOT_RETRYABLE" } }))
      .toMatch(/failed legs/i);
    expect(mapBasketApiError({ status: 503, body: { message: "down" } })).toBe("down");
  });

  it("maps wallet rejection and missing hashes", () => {
    expect(isUserRejectedError({ code: 4001, message: "User rejected the request" })).toBe(true);
    expect(mapBasketApiError({ code: 4001, message: "User rejected the request" }))
      .toMatch(/rejected/i);
    expect(mapBasketApiError(new Error("WALLET_TX_HASH_MISSING: wallet did not return a transaction hash")))
      .toMatch(/did not return a hash/i);
  });
});
