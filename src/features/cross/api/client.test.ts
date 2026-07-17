import { describe, expect, it } from "vitest";
import { resolveCrossApiBaseUrl } from "./client";

describe("resolveCrossApiBaseUrl", () => {
  it("uses the same-origin Vite proxy during local development", () => {
    expect(resolveCrossApiBaseUrl(undefined, true)).toBe("");
  });

  it("uses the public API origin outside local development", () => {
    expect(resolveCrossApiBaseUrl(undefined, false)).toBe(
      "https://crosschain.empx.io",
    );
  });

  it("preserves an explicit API origin override without a trailing slash", () => {
    expect(
      resolveCrossApiBaseUrl("https://crosschain-staging.empx.io/", true),
    ).toBe("https://crosschain-staging.empx.io");
  });
});
