import { Link } from "react-router-dom";
import Logo from "../../assets/images/emp-main-logo.png";

export default function Footer() {
  return (
    <footer
      className="relative pt-16 pb-10 px-6 overflow-hidden"
      style={{ background: "#03030a" }}
    >
      <div className="divider mb-16" />

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[160px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(255,138,0,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row gap-12 mb-14">
          <div className="md:max-w-[240px]">
            <div className="relative mb-5" style={{ width: 120, height: 44 }}>
              <img
                src={Logo}
                alt="EMPX SEAL"
                className="object-contain object-left"
                style={{ width: 120, height: "auto" }}
              />
            </div>
            <p className="text-xs text-white/28 leading-relaxed mb-5">
              The ultimate multi-chain DEX aggregator. Swap, bridge, and explore
              Web3 with speed.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com/empx"
                className="w-8 h-8 flex items-center justify-center text-white/30 hover:opacity-80 hover:text-white transition-colors text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                𝕏
              </a>
              <a
                href="https://t.me/empx"
                className="w-8 h-8 flex items-center justify-center text-white/30 hover:opacity-80 hover:text-white transition-colors text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <img src="/telegram.png" alt="Tele" className="w-3" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex-1 grid grid-cols-3 gap-8">
            <div>
              <p
                className="text-[7px] font-black tracking-[0.3em] mb-4"
                style={{ color: "var(--empx-orange)" }}
              >
                PRODUCT
              </p>
              <ul className="space-y-3">
                {[
                  "Instant Swaps",
                  "Smart Limit Orders",
                  "Cross-Chain Bridge",
                  "Swap API",
                  "Enter Dapp",
                ].map((item) => (
                  <li key={item}>
                    <Link
                      to="/"
                      className="text-xs text-white/28 hover:text-white/65 transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className="text-[7px] font-black tracking-[0.3em] mb-4"
                style={{ color: "var(--empx-orange)" }}
              >
                DEVELOPERS
              </p>
              <ul className="space-y-3">
                {[
                  "Documentation",
                  "Integration Support",
                  "API Reference",
                  "GitHub",
                  "Build with EMPX",
                ].map((item) => (
                  <li key={item}>
                    <Link
                      to="/"
                      className="text-xs text-white/28 hover:text-white/65 transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className="text-[7px] font-black tracking-[0.3em] mb-4"
                style={{ color: "var(--empx-orange)" }}
              >
                NETWORKS
              </p>
              <ul className="space-y-3">
                {[
                  "PulseChain",
                  "Base",
                  "Monad",
                  "BSC",
                  "Avalanche",
                  "Arbitrum",
                ].map((item) => (
                  <li key={item}>
                    <span className="text-xs text-white/28">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="divider mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[9px] text-white/20 tracking-[0.12em]">
          <p>© 2026 EMPX. All rights reserved.</p>
          <p>
            <a
              href="mailto:support@empx.io"
              className="hover:text-white/50 transition-colors"
            >
              Support@EMPX.io
            </a>
            {" · "}
            <a
              href="/"
              className="hover:text-white/50 transition-colors"
            >
              EMPX.IO
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
