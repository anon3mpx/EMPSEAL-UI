import { afterEach, describe, expect, it } from "vitest";
import { clearBasketSession, loadBasketSession, saveBasketSession } from "./session";

afterEach(() => {
  clearBasketSession();
});

describe("basket session", () => {
  it("persists only non-sensitive identifiers", () => {
    saveBasketSession({
      basketId: "basket-1",
      quoteVersion: 2,
      planId: "plan-1",
      planVersion: 3,
      wallet: "0x1111111111111111111111111111111111111111",
      mode: "many-to-many",
    });
    expect(loadBasketSession()).toEqual({
      basketId: "basket-1",
      quoteVersion: 2,
      planId: "plan-1",
      planVersion: 3,
      wallet: "0x1111111111111111111111111111111111111111",
      mode: "many-to-many",
    });
    expect(sessionStorage.getItem("empx:basket-session")).not.toMatch(/signature|private|apiKey/i);
  });
});
