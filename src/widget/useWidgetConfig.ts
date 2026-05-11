import {
  DEFAULT_WIDGET_CHAIN_KEY,
  getWidgetChainKey,
  WIDGET_CHAIN_BY_KEY,
  WidgetChainKey,
} from "./chains";

export type WidgetConfig = {
  chain: WidgetChainKey;
  chainId: number;
  theme: string;
  background: string;
  primaryColor: string;
  borderColor: string;
  defaultTokenIn: string | null;
  defaultTokenOut: string | null;
  defaultAmountIn: string | null;
  integratorId: string | null;
  showSlippage: boolean;
  showPoweredBy: boolean;
  isWidgetMode: boolean;
};

export const DEFAULT_WIDGET_CONFIG = {
  chain: DEFAULT_WIDGET_CHAIN_KEY,
  theme: "dark",
  background: "#000000",
  primaryColor: "#e49c01ff",
  borderColor: "#e49c01ff",
  integratorId: null as string | null,
};

const WIDGET_PARAM_KEYS = [
  "chain",
  "background",
  "primaryColor",
  "borderColor",
  "integratorId",
  "from",
  "to",
  "amountIn",
  "theme",
  "showSlippage",
  "showPoweredBy",
] as const;

export const parseWidgetConfig = (params: URLSearchParams): WidgetConfig => {
  const chain = getWidgetChainKey(params.get("chain"));
  const runtime = WIDGET_CHAIN_BY_KEY[chain];

  const themeParam = params.get("theme")?.trim().toLowerCase();
  const theme =
    themeParam === "darker" || themeParam === "midnight" || themeParam === "dark"
      ? themeParam
      : DEFAULT_WIDGET_CONFIG.theme;

  return {
    chain,
    chainId: runtime.chainId,
    theme,
    background: params.get("background") || DEFAULT_WIDGET_CONFIG.background,
    primaryColor:
      params.get("primaryColor") || DEFAULT_WIDGET_CONFIG.primaryColor,
    borderColor: params.get("borderColor") || DEFAULT_WIDGET_CONFIG.borderColor,
    defaultTokenIn: params.get("from"),
    defaultTokenOut: params.get("to"),
    defaultAmountIn: params.get("amountIn")?.trim() || null,
    integratorId:
      params.get("integratorId")?.trim() || DEFAULT_WIDGET_CONFIG.integratorId,
    showSlippage:
      (params.get("showSlippage")?.trim().toLowerCase() || "true") !== "false",
    showPoweredBy:
      (params.get("showPoweredBy")?.trim().toLowerCase() || "true") !== "false",
    isWidgetMode: WIDGET_PARAM_KEYS.some((key) => params.has(key)),
  };
};

export const useWidgetConfig = (): WidgetConfig => {
  const params = new URLSearchParams(window.location.search);
  return parseWidgetConfig(params);
};
