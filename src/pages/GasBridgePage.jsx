import ChainSelector from "../components/gas/ChainSelector";
import TransferPanel from "../components/gas/TransferPanel";
import TransactionHistory from "../components/gas/TransactionHistory";
import Wallet from "./swap/Wallet";
import BG from "../assets/images/empx-bg1.webp";

export default function GasBridgePage() {
  return (
    <>
      <div className="w-full">
        <img
          src={BG}
          alt="Background"
          className="w-full h-full fixed top-0 left-0 -z-10"
        />
        <div className="md:max-w-[1100px] w-full mx-auto p-4 text-white">
          <div className="lg:absolute relative lg:top-[100px] top-[1px] right-0 w-full">
            <Wallet allowUnsupported={true} />
          </div>
          <div className="text-center mb-4 lg:mt-0 mt-1">
            <h1 className="2xl:text-5xl font40 text-2xl text-center text-[#FF9900] font-orbitron font-bold mb-2">
              Gas <br /> <span className="text-white">Anywhere</span>
            </h1>
          </div>
        </div>
        <TransferPanel />
        <div className="md:mt-5 mt-4 md:max-w-[1000px] w-full mx-auto p-4">
          <TransactionHistory />
        </div>
      </div>
    </>
  );
}
