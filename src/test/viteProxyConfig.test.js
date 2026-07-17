// @vitest-environment node

import { describe, expect, it } from "vitest";
import config from "../../vite.config.js";

describe("Vite cross API proxy", () => {
  it("proxies local /api/v1 requests to the public cross-chain API", () => {
    expect(config.server?.proxy?.["/api/v1"]).toMatchObject({
      target: "https://crosschain.empx.io",
      changeOrigin: true,
      secure: true,
    });
  });
});
