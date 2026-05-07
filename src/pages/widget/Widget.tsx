import { useState } from "react";
import { motion } from "framer-motion";
const ACCENT_COLORS = [
  "#FF8A00",
  "#4ade80",
  "#60a5fa",
  "#e879f9",
  "#f87171",
  "#facc15",
];
const THEMES = ["dark", "darker", "midnight"];
export default function WidgetPage() {
  const [accent, setAccent] = useState("#FF8A00");
  const [theme, setTheme] = useState("dark");
  const [defaultFrom, setDefaultFrom] = useState("ETH");
  const [defaultTo, setDefaultTo] = useState("USDC");
  const [showSlip, setShowSlip] = useState(true);
  const [showPowered, setShowPowered] = useState(true);
  const [width, setWidth] = useState("440");
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="https://widget.empx.io/v1/embed.js"></script>
<div id="empx-widget"
  data-theme="${theme}"
  data-accent="${accent}"
  data-from="${defaultFrom}"
  data-to="${defaultTo}"
  data-width="${width}"
  data-show-slippage="${showSlip}"
  data-show-powered="${showPowered}">
</div>`;
  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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
            <div className="px-5 py-[18px] border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[13px] font-bold tracking-[0.08em] text-white">
                CONFIGURATION
              </h3>
            </div>
            <div className="p-5">
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
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-[18px]">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    DEFAULT FROM
                  </p>
                  <select
                    value={defaultFrom}
                    onChange={(e) => setDefaultFrom(e.target.value)}
                    className="w-full outline-none px-[10px] py-2 bg-new-gray border-new-gray text-[12px] font-semibold text-white cursor-pointer"
                  >
                    {["ETH", "USDC", "USDT", "WBTC", "DAI"].map((t) => (
                      <option key={t} value={t} className="bg-[#06060e]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.2em] text-new-gray mb-[6px]">
                    DEFAULT TO
                  </p>
                  <select
                    value={defaultTo}
                    onChange={(e) => setDefaultTo(e.target.value)}
                    className="w-full outline-none px-[10px] py-2 bg-new-gray border-new-gray text-[12px] font-semibold text-white cursor-pointer"
                  >
                    {["USDC", "ETH", "USDT", "WBTC", "DAI"].map((t) => (
                      <option key={t} value={t} className="bg-[#06060e]">
                        {t}
                      </option>
                    ))}
                  </select>
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
              <div className="px-[14px] py-3 bg-[rgba(255,138,0,0.04)] border border-[rgba(255,138,0,0.1)]">
                <p className="text-[10px] font-bold tracking-[0.08em] text-[#FF8A00] mb-1">
                  FREE PLAN
                </p>
                <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-[1.5]">
                  Up to 1,000 swaps/month. Upgrade for custom domains, analytics
                  &amp; white-label.
                </p>
              </div>
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
                  width: {width}px
                </span>
              </div>
              <div className="flex items-start justify-center px-5 py-8 bg-[rgba(3,3,10,1)] min-h-[400px]">
                <div
                  className="bg-[rgba(6,6,14,0.98)] border-new-gray max-w-full"
                  style={{
                    width: Math.min(parseInt(width) || 440, 560),
                  }}
                >
                  <div className="px-[18px] py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <span className="text-[12px] font-bold tracking-[0.08em] text-white">
                      SWAP
                    </span>
                    <div className="flex items-center gap-[6px]">
                      <div className="w-[6px] h-[6px] bg-[#4ade80]" />
                      <span className="text-[9px] tracking-[0.06em] text-new-gray">
                        LIVE
                      </span>
                    </div>
                  </div>
                  <div className="p-[18px]">
                    <p className="text-[9px] tracking-[0.1em] text-new-gray mb-2">
                      YOU PAY
                    </p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[32px] font-[200] tracking-[-0.04em] text-new-gray-1">
                        0
                      </span>
                      <div className="flex items-center gap-2 px-[10px] py-[6px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
                        <span className="text-[11px] font-bold text-[rgba(255,255,255,0.8)]">
                          Ξ
                        </span>
                        <span className="text-[12px] font-semibold text-white">
                          {defaultFrom}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[rgba(255,255,255,0.18)] mb-[14px]">
                      $0.00
                    </p>
                    <div className="h-px bg-[rgba(255,255,255,0.05)] mb-[14px]" />
                    <p className="text-[9px] tracking-[0.1em] text-new-gray mb-2">
                      YOU RECEIVE
                    </p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[32px] font-[200] tracking-[-0.04em] text-[rgba(255,255,255,0.06)]">
                        0
                      </span>
                      <div className="flex items-center gap-2 px-[10px] py-[6px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
                        <span className="text-[11px] font-bold text-[rgba(255,255,255,0.8)]">
                          $
                        </span>
                        <span className="text-[12px] font-semibold text-white">
                          {defaultTo}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[rgba(255,255,255,0.18)] mb-4">
                      $0.00
                    </p>
                    <div
                      className="p-[13px] text-center"
                      style={{ background: accent }}
                    >
                      <span className="text-[11px] font-bold tracking-[0.1em] text-[#03030a]">
                        CONNECT WALLET
                      </span>
                    </div>
                    {showPowered && (
                      <p className="text-[8px] tracking-[0.14em] text-center text-[rgba(255,255,255,0.1)] mt-[10px]">
                        POWERED BY EMPX
                      </p>
                    )}
                  </div>
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
