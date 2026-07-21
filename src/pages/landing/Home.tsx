import Navbar from "./Navbar";
import ScrollStage from "./ScrollStage";
import EcosystemSection from "./EcosystemSection";
import SDKSection from "./SDKSection";
import Footer from "./Footer";
import SmoothScroll from "./SmoothScroll";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="relative" style={{ background: "#03030a" }}>
        <Navbar />
        <ScrollStage />
        <EcosystemSection />
        <SDKSection />
        <Footer />
      </div>
    </SmoothScroll>
  );
}
