import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DEFAULT_WIDGET_CONFIG } from "../../widget/useWidgetConfig";

const ACCENT_COLORS = [
  "#FF8A00",
  "#4ade80",
  "#60a5fa",
  "#e879f9",
  "#f87171",
  "#facc15",
];

const THEMES = ["dark", "darker", "midnight"];

const CHAINS = [
  { label: "Pulsechain", value: "pulsechain" },
  { label: "Sonic", value: "sonic" },
  { label: "Base", value: "base" },
  { label: "Monad", value: "monad" },
];

const WIDGET_FORM_DEFAULTS = {
  accent: "#FF8A00ff",
  customAccent: "#ff8a00",
  chain: "pulsechain",
  theme: "dark",
  defaultFrom: "",
  defaultTo: "",
  defaultAmount: "",
  integratorId: "",
  background: DEFAULT_WIDGET_CONFIG.background,
  borderColor: DEFAULT_WIDGET_CONFIG.borderColor,
  showSlip: true,
  showPowered: true,
  width: "440",
  height: "900",
};

export default function WidgetPage() {
  const [accent, setAccent] = useState(WIDGET_FORM_DEFAULTS.accent);
  const [customAccent, setCustomAccent] = useState(WIDGET_FORM_DEFAULTS.customAccent);
  const [chain, setChain] = useState(WIDGET_FORM_DEFAULTS.chain);
  const [theme, setTheme] = useState(WIDGET_FORM_DEFAULTS.theme);
  const [defaultFrom, setDefaultFrom] = useState(WIDGET_FORM_DEFAULTS.defaultFrom);
  const [defaultTo, setDefaultTo] = useState(WIDGET_FORM_DEFAULTS.defaultTo);
  const [defaultAmount, setDefaultAmount] = useState(WIDGET_FORM_DEFAULTS.defaultAmount);
  const [integratorId, setIntegratorId] = useState(WIDGET_FORM_DEFAULTS.integratorId);
  const [background, setBackground] = useState(WIDGET_FORM_DEFAULTS.background);
  const [borderColor, setBorderColor] = useState(WIDGET_FORM_DEFAULTS.borderColor);
  const [showSlip, setShowSlip] = useState(WIDGET_FORM_DEFAULTS.showSlip);
  const [showPowered, setShowPowered] = useState(WIDGET_FORM_DEFAULTS.showPowered);
  const [width, setWidth] = useState(WIDGET_FORM_DEFAULTS.width);
  const [height, setHeight] = useState(WIDGET_FORM_DEFAULTS.height);
  const [copied, setCopied] = useState(false);

  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("chain", chain);
    params.set("theme", theme);
    params.set("primaryColor", accent);
    params.set("background", background);
    params.set("borderColor", borderColor);
    params.set("showSlippage", showSlip ? "true" : "false");
    params.set("showPoweredBy", showPowered ? "true" : "false");

    if (integratorId.trim()) {
      params.set("integratorId", integratorId.trim());
    }
    if (defaultFrom.trim()) {
      params.set("from", defaultFrom.trim());
    }
    if (defaultTo.trim()) {
      params.set("to", defaultTo.trim());
    }
    if (defaultAmount.trim()) {
      params.set("amountIn", defaultAmount.trim());
    }

    const baseUrl = window.location.origin;
    return `${baseUrl}/widget/swap?${params.toString()}`;
  }, [accent, background, borderColor, chain, defaultAmount, defaultFrom, defaultTo, integratorId, showSlip, showPowered, theme]);

  const embedCode = useMemo(
    () => `<iframe
  src="${widgetUrl}"
  allow="clipboard-read; clipboard-write"
  width="${width || "440"}"
  height="${height || "900"}"
  frameborder="0"
></iframe>`,
    [height, widgetUrl, width],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setAccent(WIDGET_FORM_DEFAULTS.accent);
    setCustomAccent(WIDGET_FORM_DEFAULTS.customAccent);
    setChain(WIDGET_FORM_DEFAULTS.chain);
    setTheme(WIDGET_FORM_DEFAULTS.theme);
    setDefaultFrom(WIDGET_FORM_DEFAULTS.defaultFrom);
    setDefaultTo(WIDGET_FORM_DEFAULTS.defaultTo);
    setDefaultAmount(WIDGET_FORM_DEFAULTS.defaultAmount);
    setIntegratorId(WIDGET_FORM_DEFAULTS.integratorId);
    setBackground(WIDGET_FORM_DEFAULTS.background);
    setBorderColor(WIDGET_FORM_DEFAULTS.borderColor);
    setShowSlip(WIDGET_FORM_DEFAULTS.showSlip);
    setShowPowered(WIDGET_FORM_DEFAULTS.showPowered);
    setWidth(WIDGET_FORM_DEFAULTS.width);
    setHeight(WIDGET_FORM_DEFAULTS.height);
    setCopied(false);
  };

  const previewWidth = Math.min(parseInt(width || "440", 10) || 440, 560);
  const previewHeight = Math.max(parseInt(height || "900", 10) || 900, 500);

  return (
    <div className="widget-container min-h-[calc(100vh-52px)] px-4 md:px-8 pb-16">
      <div className="pt-8">
        <div className="mb-7">
          <p className="text-[9px] font-bold tracking-[0.4em] text-[rgba(255,138,0,0.45)] mb-2">
            WIDGET BUILDER
          </p>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">
            Embed EMPX. <span className="text-[#FF8A00]">Anywhere.</span>
          </h1>
          <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-2">
            Add the EMPX swap widget to your site in under 2 minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[rgba(6,6,14,0.98)] border-new-gray backdrop-blur-[60px] h-fit"
          >
            <div className="px-5 py-[18px] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-bold tracking-[0.08em] text-white">
                CONFIGURATION
              </h3>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-[5px] text-[10px] font-bold tracking-[0.08em] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-colors cursor-pointer"
              >
                RESET
              </button>
            </div>
            <div className="p-5">
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-2">
                  CHAIN
                </p>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full outline-none px-[10px] py-2 bg-new-gray border-new-gray text-[12px] font-semibold text-white cursor-pointer"
                >
                  {CHAINS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[#06060e]"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-2">
                  THEME
                </p>
                <div className="flex border-new-gray">
                  {THEMES.map((t, i) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 py-2 text-[10px] font-semibold tracking-[0.06em] uppercase cursor-pointer border-none ${
                        theme === t
                          ? "bg-[rgba(255,138,0,0.1)] text-[#FF8A00]"
                          : "bg-transparent text-[rgba(255,255,255,0.25)]"
                      } ${
                        i < THEMES.length - 1
                          ? "border-r border-[rgba(255,255,255,0.07)]"
                          : ""
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-2">
                  ACCENT COLOR
                </p>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      className={`w-7 h-7 cursor-pointer border-2 ${
                        accent === c
                          ? "border-white widget-accent-active"
                          : "border-transparent"
                      }`}
                      style={{
                        background: c,
                        outline: accent === c ? `2px solid ${c}` : "none",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                  <label
                    className={`h-7 px-2 flex items-center justify-center text-[9px] font-bold tracking-[0.08em] cursor-pointer border-2 ${
                      !ACCENT_COLORS.includes(accent)
                        ? "border-white text-white"
                        : "border-transparent text-[rgba(255,255,255,0.5)]"
                    }`}
                    style={{
                      background: !ACCENT_COLORS.includes(accent)
                        ? customAccent
                        : "rgba(255,255,255,0.06)",
                      outline: !ACCENT_COLORS.includes(accent)
                        ? `2px solid ${customAccent}`
                        : "none",
                      outlineOffset: 2,
                    }}
                  >
                    Custom
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => {
                        const picked = e.target.value;
                        setCustomAccent(picked);
                        setAccent(`${picked}ff`);
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-[18px]">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    DEFAULT FROM (TOKEN ADDRESS)
                  </p>
                  <input
                    type="text"
                    value={defaultFrom}
                    onChange={(e) => setDefaultFrom(e.target.value)}
                    placeholder="0x..."
                    className="w-full outline-none px-[10px] py-2 bg-new-gray border-new-gray text-[12px] font-semibold text-white cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    DEFAULT TO (TOKEN ADDRESS)
                  </p>
                  <input
                    type="text"
                    value={defaultTo}
                    onChange={(e) => setDefaultTo(e.target.value)}
                    placeholder="0x..."
                    className="w-full outline-none px-[10px] py-2 bg-new-gray border-new-gray text-[12px] font-semibold text-white cursor-pointer"
                  />
                </div>
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                  DEFAULT AMOUNT IN
                </p>
                <input
                  type="text"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                  placeholder="0.0"
                />
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                  INTEGRATOR ID (BYTES32)
                </p>
                <input
                  type="text"
                  value={integratorId}
                  onChange={(e) => setIntegratorId(e.target.value)}
                  className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                  placeholder="0x..."
                />
                <p className="text-[10px] text-[rgba(255,255,255,0.35)] mt-2">
                  Join our integrator program,{" "}
                  <a
                    href="https://docs.empx.io/docs/developers/widget-integration"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FF8A00] underline"
                  >
                    register as an integrator
                  </a>
                  .
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-[18px]">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    BACKGROUND
                  </p>
                  <input
                    type="text"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                    placeholder="#000000"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    BORDER COLOR
                  </p>
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                  WIDTH (px)
                </p>
                <input
                  type="text"
                  value={width}
                  onChange={(e) =>
                    setWidth(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                />
              </div>
              <div className="mb-[18px]">
                <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                  HEIGHT (px)
                </p>
                <input
                  type="text"
                  value={height}
                  onChange={(e) =>
                    setHeight(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-full bg-new-gray-1 border-new-gray px-[10px] py-2 text-[13px] font-normal text-white outline-none widget-input"
                />
              </div>
              <div className="mb-5">
                {[
                  {
                    label: "Show slippage settings",
                    value: showSlip,
                    set: setShowSlip,
                  },
                  {
                    label: 'Show "Powered by EMPX"',
                    value: showPowered,
                    set: setShowPowered,
                  },
                ].map(({ label, value, set }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-[9px] border-b border-[rgba(255,255,255,0.04)]"
                  >
                    <span className="text-[12px] text-[rgba(255,255,255,0.4)]">
                      {label}
                    </span>
                    <button
                      onClick={() => set(!value)}
                      className={`w-9 h-5 relative border-none cursor-pointer transition-colors duration-200 ${
                        value ? "bg-[#FF8A00]" : "bg-[rgba(255,255,255,0.08)]"
                      }`}
                    >
                      <div
                        className={`w-[14px] h-[14px] bg-white absolute top-[3px] transition-all duration-200 ${
                          value ? "left-[19px]" : "left-[3px]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
              {/* <div className="px-[14px] py-3 bg-[rgba(255,138,0,0.04)] border border-[rgba(255,138,0,0.1)]">
                <p className="text-[10px] font-bold tracking-[0.08em] text-[#FF8A00] mb-1">
                  FREE PLAN
                </p>
                <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-[1.5]">
                  Up to 1,000 swaps/month. Upgrade for custom domains, analytics
                  &amp; white-label.
                </p>
              </div> */}
            </div>
          </motion.div>
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="border-new-gray mb-4 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)] flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.2em] text-new-gray">
                  LIVE PREVIEW
                </span>
                <div className="flex-1 h-px bg-new-gray" />
                <span className="text-[9px] tracking-[0.06em] text-new-gray-1">
                  {previewWidth}px × {previewHeight}px
                </span>
              </div>
              <div className="flex items-start justify-center px-5 py-8 bg-[rgba(3,3,10,1)] min-h-[400px]">
                <div
                  className="bg-[rgba(6,6,14,0.98)] border-new-gray max-w-full"
                  style={{
                    width: previewWidth,
                    height: previewHeight,
                  }}
                >
                  <iframe
                    key={widgetUrl}
                    title="EmpX Widget Preview"
                    src={widgetUrl}
                    width="100%"
                    height="100%"
                    allow="clipboard-read; clipboard-write"
                    frameBorder="0"
                  />
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="border-new-gray overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)] flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[0.2em] text-new-gray">
                  EMBED CODE
                </span>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-[5px] text-[10px] font-bold tracking-[0.08em] border transition-opacity hover:opacity-75 cursor-pointer ${
                    copied
                      ? "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.2)] text-[#4ade80]"
                      : "bg-[rgba(255,138,0,0.1)] border-[rgba(255,138,0,0.2)] text-[#FF8A00]"
                  }`}
                >
                  {copied ? "COPIED!" : "COPY"}
                </button>
              </div>
              <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)]">
                <a
                  href={widgetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#FF8A00] tracking-[0.08em] font-bold"
                >
                  OPEN SWAP TEST PAGE
                </a>
              </div>
              <pre className="m-0 p-4 bg-[rgba(3,3,10,1)] text-[11px] text-[rgba(255,255,255,0.5)] overflow-x-auto leading-[1.7] font-mono">
                {embedCode}
              </pre>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
