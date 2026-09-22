import SocialTray from "./SocialTray";
import { EMPX_SOCIALS } from "../data/socials";
import { useIsMobile } from "../breakpoints";

export default function DappFooter() {
  const isMobile = useIsMobile();

  return (
    <footer
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: isMobile ? "0 16px 40px" : "0 20px 56px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ height: 1, background: "rgba(255,255,255,.07)", marginBottom: 18 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <span style={{ fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,.22)" }}>
          EmpX — cross-chain intent settlement
        </span>
        <SocialTray links={EMPX_SOCIALS} />
      </div>
    </footer>
  );
}
