import type { WidgetChainKey } from "../../widget/chains";
import type { WidgetExecutionMode } from "../../widget/widgetRuntime";

export type WidgetTheme = "dark" | "darker" | "midnight";
export type WidgetSnippetFormat = "iframe" | "react" | "url";

export interface WidgetForm {
  chainKey: WidgetChainKey;
  theme: WidgetTheme;
  primaryColor: string;
  background: string;
  borderColor: string;
  defaultFrom: string;
  defaultTo: string;
  defaultAmount: string;
  integratorId: string;
  showBackground: boolean;
  showSlippage: boolean;
  showPoweredBy: boolean;
  executionMode: WidgetExecutionMode;
  width: number;
  height: number;
}

export const WIDGET_FORM_DEFAULTS: WidgetForm = {
  chainKey: "pulsechain",
  theme: "dark",
  primaryColor: "#FF8A00",
  background: "#05050c",
  borderColor: "#15151f",
  defaultFrom: "",
  defaultTo: "",
  defaultAmount: "",
  integratorId: "",
  showBackground: true,
  showSlippage: true,
  showPoweredBy: true,
  executionMode: "auto",
  width: 440,
  height: 720,
};

export const WIDGET_PRODUCTION_ORIGIN = "https://empx.network";

const WIDGET_IFRAME_BOUNDS = {
  width: { min: 300, max: 800 },
  height: { min: 400, max: 1200 },
} as const;

export function clampWidgetDimension(kind: "width" | "height", value: number): number {
  const bounds = WIDGET_IFRAME_BOUNDS[kind];
  if (!Number.isFinite(value)) return WIDGET_FORM_DEFAULTS[kind];
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
}

export function normalizeWidgetDimensions(form: Pick<WidgetForm, "width" | "height">) {
  return {
    width: clampWidgetDimension("width", form.width),
    height: clampWidgetDimension("height", form.height),
  };
}

export function resolveWidgetSnippetOrigin(currentOrigin?: string): string {
  const trimmed = currentOrigin?.trim();
  return trimmed || WIDGET_PRODUCTION_ORIGIN;
}

function addOptionalParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
}

export function buildWidgetUrl(form: WidgetForm, origin: string = ""): string {
  const params = new URLSearchParams();

  params.set("chain", form.chainKey);
  params.set("theme", form.theme);
  params.set("primaryColor", form.primaryColor);
  params.set("background", form.background);
  params.set("borderColor", form.borderColor);
  // These keys intentionally mirror src/widget/useWidgetConfig.ts.
  addOptionalParam(params, "from", form.defaultFrom);
  addOptionalParam(params, "to", form.defaultTo);
  addOptionalParam(params, "amountIn", form.defaultAmount);
  addOptionalParam(params, "integratorId", form.integratorId);
  params.set("execution", form.executionMode);
  params.set("showBackground", String(form.showBackground));
  params.set("showSlippage", String(form.showSlippage));
  params.set("showPoweredBy", String(form.showPoweredBy));

  return `${origin}/widget/swap?${params.toString()}`;
}

export function buildWidgetSnippet(
  format: WidgetSnippetFormat,
  form: WidgetForm,
  origin: string = WIDGET_PRODUCTION_ORIGIN,
): string {
  const url = buildWidgetUrl(form, origin);
  const { width, height } = normalizeWidgetDimensions(form);

  if (format === "url") return url;

  if (format === "iframe") {
    return `<iframe
  src="${url}"
  width="${width}"
  height="${height}"
  frameBorder="0"
  allow="clipboard-write"
  title="EmpX Swap Widget"
></iframe>`;
  }

  return `export function EmpxSwapWidget() {
  return (
    <iframe
      src="${url}"
      width={${width}}
      height={${height}}
      frameBorder={0}
      allow="clipboard-write"
      title="EmpX Swap Widget"
      style={{ border: "1px solid ${form.borderColor}", borderRadius: 8 }}
    />
  );
}`;
}
