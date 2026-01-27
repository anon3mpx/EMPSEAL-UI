import ChainSelector from "../components/gas/ChainSelector";
import TransferPanel from "../components/gas/TransferPanel";
import TransactionHistory from "../components/gas/TransactionHistory";
import WalletConnect from "./swap/WalletConnect/WalletConnect";
import Wallet from "./swap/Wallet";

export default function GasBridgePage() {
  return (
    <>
      <div className="md:max-w-[1100px] w-full mx-auto p-4 text-white">
         <div className="lg:absolute relative lg:top-[100px] top-[1px] right-0 w-full">
            <Wallet allowUnsupported={true} />
          </div>
        {/* <div className="flex justify-end gap-4 mb-4"> */}
          {/* <WalletConnect allowUnsupported={true} /> */}
          {/* <div className="block">
            <Wallet allowUnsupported={true} />
          </div>
        </div> */}
        <div className="text-center mb-4 lg:mt-0 mt-36">
          <h1 className="md:text-5xl text-3xl text-center text-[#FF9900] font-orbitron font-bold mb-2">
           Gas <span className="text-white">Anywhere</span>
          </h1> 
          {/* <p className="text-lg text-gray-400 text-center">
            Instantly refuel gas on any chain.
          </p> */}
        </div>
      </div>
      {/* Main Bridge UI */}
      {/* <div className="md:max-w-[818px] mx-auto w-full md:px-4 px-2 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 mt-4 scales-b scales-top"> */}
      {/* Left Side */}
      {/* <div className="md:col-span-1 bg-gray-800 p-6 rounded-lg">
          <ChainSelector />
        </div> */}
      {/* Right Side */}
      {/* <div className="w-full"> */}
      <TransferPanel />
      {/* </div> */}
      {/* </div> */}
      {/* Bottom Section */}
      <div className="md:mt-20 mt-8 md:max-w-[1100px] w-full mx-auto p-4">
        <TransactionHistory />
      </div>
    </>
  );
}
