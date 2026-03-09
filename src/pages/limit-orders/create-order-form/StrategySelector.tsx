import { OrderStrategy } from "../schema";
import { OrderMode } from "./types";

interface StrategySelectorProps {
  selectedStrategy: OrderStrategy;
  orderMode: OrderMode;
  onSelectSell: () => void;
  onSelectBuy: () => void;
  onSelectBracket: () => void;
  onSelectPosition: () => void;
}

export function StrategySelector({
  selectedStrategy,
  orderMode,
  onSelectSell,
  onSelectBuy,
  onSelectBracket,
  onSelectPosition,
}: StrategySelectorProps) {
  return (
    <div className="mb-4 md:max-w-[850px] w-full mx-auto border-4 border-[#FFA600] rounded-lg px-4 py-2 bg-black">
      <p className="text-center text-[#FF9900] md:text-lg font-bold text-sm font-orbitron">
        Select Strategy
      </p>
      <div className="flex justify-center gap-8 md:gap-16 items-start mt-2 md:flex-nowrap flex-wrap">
        <div className="flex flex-col items-center">
          <div className="text-center text-[#FF9900] md:text-sm font-bold text-sm font-orbitron mb-2">
            Exit/Entry
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center relative group cursor-pointer">
              <button
                type="button"
                className={`
                  w-24 h-10 p-3 md:text-xl text-lg !cursor-pointer
                  rounded-2xl flex justify-center items-center
                  transition-all duration-200
                  ${
                    selectedStrategy === OrderStrategy.SELL &&
                    orderMode === OrderMode.STANDARD
                      ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                      : "bg-black text-white hover:bg-[#1a1a1a]"
                  }
                `}
                onClick={onSelectSell}
                data-testid="button-strategy-sell"
              >
                Sell
              </button>
              <div className="hidden group-hover:block font-orbitron absolute z-50 mt-2 left-0 right-0 mx-auto top-10 md:w-[500px] w-[250px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-xs text-[10px] font-bold text-white shadow-lg">
                <span className="text-[#FF9900] font-black">Sell High</span>{" "}
                <br />
                Exit your position exactly at the price you want - above the
                current market. Lock in your profits from price appreciation and
                sell directly into stables or core assets of your choice. Secure
                gains. Zero emotion. One click.
              </div>
              <div className="mt-1 text-center text-[#FFE3BA] md:text-[8px] text-[8px] font-semibold font-orbitron">
                Sell High: Exit
              </div>
            </div>

            <div className="flex flex-col items-center relative group cursor-pointer">
              <button
                type="button"
                className={`
                  w-24 h-10 p-3 md:text-xl text-lg
                  rounded-2xl flex justify-center items-center
                  transition-all duration-200
                  ${
                    selectedStrategy === OrderStrategy.BUY &&
                    orderMode === OrderMode.STANDARD
                      ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                      : "bg-black text-white hover:bg-[#1a1a1a]"
                  }
                `}
                onClick={onSelectBuy}
                data-testid="button-strategy-buy"
              >
                Buy
              </button>
              <div className="hidden group-hover:block font-orbitron absolute z-50 mt-2 top-10 md:w-[500px] w-[250px] whitespace-pre-wrap rounded-lg bg-black px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg">
                <span className="text-[#FF9900] font-black">Buy Low</span>{" "}
                <br />
                Enter your position exactly at the price you want - below the
                current market. Perfect for buying the dip and sniping optimal
                entries with precision and speed. One-click setup. Zero
                guesswork.
              </div>
              <div className="mt-1 text-center text-[#FFE3BA] md:text-[8px] text-[8px] font-semibold font-orbitron">
                Buy Low: Entry
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-center text-[#FF9900] md:text-sm font-bold text-sm font-orbitron mb-2">
            Spot Protection
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                className={`
                  w-32 h-10 p-3 md:text-xl text-lg
                  rounded-2xl flex justify-center items-center
                  transition-all duration-200
                  ${
                    orderMode === OrderMode.BRACKET
                      ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                      : "bg-black text-white hover:bg-[#1a1a1a]"
                  }
                `}
                onClick={onSelectBracket}
                data-testid="button-bracket"
              >
                Full
              </button>
              <div className="mt-1 text-center text-[#FFE3BA] md:text-[8px] text-[8px] font-semibold font-orbitron">
                Entry + SL/TP
              </div>
            </div>

            <div className="flex flex-col items-center">
              <button
                type="button"
                className={`
                  w-32 h-10 p-3 md:text-xl text-lg
                  rounded-2xl flex justify-center items-center
                  transition-all duration-200
                  ${
                    orderMode === OrderMode.POSITION
                      ? "bg-black border border-[#FF9900] text-[#FF9900] font-bold"
                      : "bg-black text-white hover:bg-[#1a1a1a]"
                  }
                `}
                onClick={onSelectPosition}
                data-testid="button-position"
              >
                Spot
              </button>
              <div className="mt-1 text-center text-[#FFE3BA] md:text-[8px] text-[8px] font-semibold font-orbitron">
                Protect Holdings
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
