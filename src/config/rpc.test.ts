import { describe, expect, it } from "vitest";

import { buildDrpcBrowserRpcUrls } from "./rpc";

describe("buildDrpcBrowserRpcUrls", () => {
  it("returns no DRPC urls when no public key is configured", () => {
    expect(buildDrpcBrowserRpcUrls("")).toEqual({});
  });

  it("builds chain urls when a public key is provided", () => {
    const urls = buildDrpcBrowserRpcUrls("test-key");
    expect(urls[8453]).toBe("https://lb.drpc.live/base/test-key");
    expect(urls[137]).toBe("https://lb.drpc.live/polygon/test-key");
  });
});
