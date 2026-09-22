import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = [
  "src/features/ramp/api/rampApi.ts",
  "src/features/ramp/hooks/useRampSession.ts",
  "src/features/ramp/execution/rampSigning.ts",
  "src/features/basket/api/basketApi.ts",
  "src/features/basket/hooks/useBasketSession.ts",
  "src/design-system/pages/RampPage.tsx",
  "src/design-system/pages/MultiPage.tsx",
];

describe("browser feature security", () => {
  it("does not send Partner API keys or keep demo execution paths", () => {
    const root = process.cwd();
    const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
    expect(source).not.toMatch(/partnerApiKey|x-api-key|BRIDGE_API_KEY|PRICE_USD_DEMO|demoQuoteFor/i);
    expect(source).not.toMatch(/\/api\/v1\/basket\/execute/);
    expect(source).not.toMatch(/\/api\/v1\/wallet\/liquidate/);
    expect(source).not.toMatch(/\/api\/v1\/ramp\/agent-grants/);
    expect(source).not.toMatch(/Provider integration not wired/);
    expect(source).not.toMatch(/Basket preview only — backend basket API required/);
    expect(source).not.toMatch(/WalletScanner is not connected/);
  });
});
