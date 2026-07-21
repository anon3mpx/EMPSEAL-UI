import { describe, expect, it } from "vitest";

import {
  WIDGET_FORM_DEFAULTS,
  buildWidgetSnippet,
  buildWidgetUrl,
  clampWidgetDimension,
  normalizeWidgetDimensions,
  resolveWidgetSnippetOrigin,
  type WidgetForm,
} from "./widgetV2Adapters";
import { parseWidgetConfig } from "../../widget/useWidgetConfig";

const configuredForm: WidgetForm = {
  ...WIDGET_FORM_DEFAULTS,
  chainKey: "base",
  theme: "midnight",
  primaryColor: "#60a5fa",
  background: "#010101",
  borderColor: "#222222",
  defaultFrom: "USDC",
  defaultTo: "ETH",
  defaultAmount: "100",
  integratorId: "partner-abc",
  showBackground: false,
  showSlippage: false,
  showPoweredBy: true,
  executionMode: "contract",
  width: 900,
  height: 300,
};

describe("widgetV2Adapters", () => {
  it("builds URLs that match the /widget/swap parser contract", () => {
    const url = buildWidgetUrl(configuredForm, "https://empx.network");
    const parsed = new URL(url);

    expect(parsed.pathname).toBe("/widget/swap");
    expect(parsed.searchParams.get("chain")).toBe("base");
    expect(parsed.searchParams.get("from")).toBe("USDC");
    expect(parsed.searchParams.get("to")).toBe("ETH");
    expect(parsed.searchParams.get("amountIn")).toBe("100");
    expect(parsed.searchParams.get("execution")).toBe("contract");
    expect(parsed.searchParams.get("defaultTokenIn")).toBeNull();
    expect(parsed.searchParams.get("defaultTokenOut")).toBeNull();
    expect(parsed.searchParams.get("defaultAmountIn")).toBeNull();
    expect(parseWidgetConfig(parsed.searchParams)).toMatchObject({
      chain: "base",
      defaultTokenIn: "USDC",
      defaultTokenOut: "ETH",
      defaultAmountIn: "100",
      integratorId: "partner-abc",
      showBackground: false,
      showSlippage: false,
      showPoweredBy: true,
      executionMode: "contract",
      isWidgetMode: true,
    });
  });

  it("omits blank optional token, amount, and integrator defaults", () => {
    const url = buildWidgetUrl({
      ...WIDGET_FORM_DEFAULTS,
      defaultFrom: "  ",
      defaultTo: "",
      defaultAmount: "",
      integratorId: "",
    });
    const parsed = new URL(url, "https://local.test");

    expect(parsed.searchParams.has("from")).toBe(false);
    expect(parsed.searchParams.has("to")).toBe(false);
    expect(parsed.searchParams.has("amountIn")).toBe(false);
    expect(parsed.searchParams.has("integratorId")).toBe(false);
  });

  it("clamps generated embed dimensions to supported iframe bounds", () => {
    expect(clampWidgetDimension("width", 120)).toBe(300);
    expect(clampWidgetDimension("width", 900)).toBe(800);
    expect(clampWidgetDimension("height", 300)).toBe(400);
    expect(clampWidgetDimension("height", 1300)).toBe(1200);
    expect(normalizeWidgetDimensions(configuredForm)).toEqual({ width: 800, height: 400 });
  });

  it("builds iframe, React, and URL snippets from the same parser-compatible URL", () => {
    const iframe = buildWidgetSnippet("iframe", configuredForm);
    const react = buildWidgetSnippet("react", configuredForm);
    const url = buildWidgetSnippet("url", configuredForm);

    expect(url).toContain("/widget/swap?");
    expect(url).toContain("from=USDC");
    expect(iframe).toContain('width="800"');
    expect(iframe).toContain('height="400"');
    expect(iframe).toContain('allow="clipboard-write"');
    expect(react).toContain("width={800}");
    expect(react).toContain("height={400}");
    expect(react).toContain("clipboard-write");
  });

  it("uses the current app origin for generated snippets when available", () => {
    expect(resolveWidgetSnippetOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(resolveWidgetSnippetOrigin("https://preview.example.com")).toBe("https://preview.example.com");
    expect(resolveWidgetSnippetOrigin()).toBe("https://empx.network");
  });
});
