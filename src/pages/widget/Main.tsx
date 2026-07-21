import Widget from "./Widget";
import { HelmetProvider } from "react-helmet-async";
import BreadCrumb from "../../components/BreadCrumb";

const MainPage = () => {
  return (
    <>
      <HelmetProvider>
        <title>EmpX Swap Widget | Multichain DEX Aggregator</title>
        <meta
          name="description"
          content="Integrate the EmpX Swap Widget into your application. Enable seamless token swaps on various chains and earn revenue through our Integrator Program."
        />
        <meta
          name="keywords"
          content="EmpX, PulseChain, Swap, Widget, DEX, DeFi, Crypto, Bridge, Integrator"
        />
      </HelmetProvider>
      <BreadCrumb />
      <div className="relative md:py-16 py-10">
        <Widget />
      </div>
    </>
  );
};

export default MainPage;
