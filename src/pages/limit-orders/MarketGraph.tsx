import React, { useState, useMemo } from "react";
import { OrderStrategy } from "./schema";

interface MarketTargetChartProps {
  strategy?: OrderStrategy;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  marketPrice?: string;
}

export default function MarketTargetChart({
  strategy = OrderStrategy.SELL,
  stopLossPrice,
  takeProfitPrice,
  marketPrice,
}: MarketTargetChartProps) {
  const sellPoints = [
    [0, 80],
    [40, 70],
    [80, 60],
    [120, 65],
    [160, 55],
    [200, 45],
    [240, 40],
    [280, 42],
    [320, 35],
    [360, 30],
    [400, 32],
    [440, 25],
    [480, 20],
    [520, 30],
  ];
  const buyPoints = [
    [0, 20],
    [40, 30],
    [80, 35],
    [120, 42],
    [160, 40],
    [200, 45],
    [240, 55],
    [280, 65],
    [320, 60],
    [360, 70],
    [400, 75],
    [440, 80],
    [480, 78],
    [520, 85],
  ];
  const bracketPoints = [
    [0, 100],
    [40, 90],
    [80, 100],
    [120, 80],
    [160, 70],
    [200, 60],
    [240, 55],
    [280, 42],
    [320, 60],
    [360, 40],
    [400, 55],
    [440, 45],
    [480, 52],
    [520, 50],
  ];

  const width = 520;
  const height = 120;

  const isSellStrategy = strategy === OrderStrategy.SELL;
  const isBuyStrategy = strategy === OrderStrategy.BUY;
  const isBracketStrategy = strategy === OrderStrategy.BRACKET;

  // Use appropriate points based on strategy
  let points = sellPoints;
  if (isBuyStrategy) points = buyPoints;
  if (isBracketStrategy) points = bracketPoints;

  const pathLine = `M ${points.map((p) => p.join(",")).join(" L ")}`;
  const pathArea = `${pathLine} L ${width},${height} L 0,${height} Z`;

  const [hoverX, setHoverX] = useState<number | null>(null);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setHoverX(x);
  };
  const {
    stopLossY,
    takeProfitY,
    entryY,
    stopLossDisplay,
    takeProfitDisplay,
    entryDisplay,
  } = useMemo(() => {
    if (!marketPrice) {
      return {
        stopLossY: height * 0.7,
        takeProfitY: height * 0.3,
        entryY: height * 0.5,
        stopLossDisplay: stopLossPrice
          ? `$ ${parseFloat(stopLossPrice).toFixed(3)}`
          : "$ 0.423",
        takeProfitDisplay: takeProfitPrice
          ? `$ ${parseFloat(takeProfitPrice).toFixed(3)}`
          : "$ 0.623",
        entryDisplay: "$ 0.523",
      };
    }
    const market = parseFloat(marketPrice);
    let stopLoss: number;
    let takeProfit: number;

    if (stopLossPrice) {
      stopLoss = parseFloat(stopLossPrice);
    } else {
      stopLoss = market * 1.2;
    }

    if (takeProfitPrice) {
      takeProfit = parseFloat(takeProfitPrice);
    } else {
      takeProfit = market * 0.8;
    }
    const prices = [market, stopLoss, takeProfit];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Map price to Y coordinate (inverted: higher price = lower Y)
    const mapPriceToY = (price: number) => {
      // Add some padding (10%) at top and bottom for better visibility
      const padding = height * 0.1;
      return (
        height -
        padding -
        ((price - minPrice) / priceRange) * (height - 2 * padding)
      );
    };

    return {
      stopLossY: mapPriceToY(stopLoss),
      takeProfitY: mapPriceToY(takeProfit),
      entryY: mapPriceToY(market),
      stopLossDisplay: `$ ${stopLoss.toFixed(3)}`,
      takeProfitDisplay: `$ ${takeProfit.toFixed(3)}`,
      entryDisplay: `$ ${market.toFixed(3)}`,
    };
  }, [isBracketStrategy, marketPrice, stopLossPrice, takeProfitPrice, height]);

  return (
    <div className="w-full text-white font-orbitron">
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px]">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF9900" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FF9900" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          <g className="reveal">
            <path d={pathArea} fill="url(#area)" stroke="none" />
            <path
              d={pathLine}
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {isBracketStrategy && (
            <>
              {/* Stop Loss Line */}
              <line
                x1={0}
                x2={width}
                y1={stopLossY}
                y2={stopLossY}
                stroke="#000" // Red for stop loss
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              {/* Take Profit Line */}
              <line
                x1={0}
                x2={width}
                y1={takeProfitY}
                y2={takeProfitY}
                stroke="#FFE3BA" // Green for take profit
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              {/* Entry/Market Price Line */}
              <line
                x1={0}
                x2={width}
                y1={entryY}
                y2={entryY}
                stroke="#FF9900" // Orange for entry
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            </>
          )}

          {hoverX !== null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={0}
              y2={height}
              stroke="white"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}

          <rect
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverX(null)}
          />
        </svg>

        {/* Flipped labels based on strategy */}
        {isSellStrategy && (
          <>
            <div className="absolute left-2 top-6 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Market
            </div>
            <div className="absolute right-2 top-2 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Target
            </div>
          </>
        )}

        {isBuyStrategy && (
          <>
            <div className="absolute left-2 top-4 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Target
            </div>
            <div className="absolute right-2 top-10 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Market
            </div>
          </>
        )}

        {isBracketStrategy && (
          <>
            <div
              className="absolute bg-[#000] text-white text-xs px-2 py-1 rounded-md z-10"
              style={{
                left: "0.5rem",
                top: `${Math.min(Math.max((stopLossY / height) * 100, 5), 95)}%`,
                transform: "translateY(-50%)",
              }}
            >
              Stop Loss
            </div>
            <div
              className="absolute bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md z-10"
              style={{
                left: "40%",
                top: `${Math.min(Math.max((entryY / height) * 100, 5), 95)}%`,
                transform: "translateY(-50%)",
              }}
            >
              Entry
            </div>
            <div
              className="absolute bg-[#FF9900] text-black text-xs px-2 py-1 rounded-md z-10"
              style={{
                right: "0.5rem",
                top: `${Math.min(Math.max((takeProfitY / height) * 100, 5), 95)}%`,
                transform: "translateY(-50%)",
              }}
            >
              Take Profit
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between mt-1">
        {isBracketStrategy ? (
          // Bracket layout with three columns
          <>
            <div>
              <div className="text-lg font-semibold text-[#FFD484]">
                {Number(
                  String(stopLossDisplay).replace(/[^0-9.-]+/g, "") || 0,
                ).toFixed(3)}
              </div>
              <div className="text-white text-xs">Stop Loss</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-[#FFD484]">
                {Number(
                  String(entryDisplay).replace(/[^0-9.-]+/g, "") || 0,
                ).toFixed(3)}
              </div>
              <div className="text-white text-xs">Entry Price</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-[#FFD484]">
                {Number(
                  String(takeProfitDisplay).replace(/[^0-9.-]+/g, "") || 0,
                ).toFixed(3)}
              </div>
              <div className="text-white text-xs">Take Profit</div>
            </div>
          </>
        ) : (
          // Original layout for SELL and BUY
          <>
            <div>
              <div className="text-lg font-semibold text-[#FFD484]">
                {marketPrice
                  ? `$ ${parseFloat(marketPrice).toFixed(3)}`
                  : "$ 0.673"}
              </div>
              <div className="text-white text-xs">
                {isSellStrategy ? "Current Price" : "Target Price"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-[#FFD484]">
                {(() => {
                  if (isSellStrategy) {
                    return marketPrice
                      ? `$ ${(parseFloat(marketPrice) * 1.2).toFixed(3)}`
                      : "$ 54";
                  } else {
                    return marketPrice
                      ? `$ ${(parseFloat(marketPrice) * 0.8).toFixed(3)}`
                      : "$ 28";
                  }
                })()}
              </div>
              <div className="text-white text-xs">
                {isSellStrategy ? "Target Price" : "Current Price"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
