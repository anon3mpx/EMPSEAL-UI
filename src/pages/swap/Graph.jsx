import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { createChart, LineSeries, LineStyle } from "lightweight-charts";
import { useStore } from "../../redux/store/routeStore";
import { useChainConfig } from "../../hooks/useChainConfig";
import LoadingSpinner from "../../components/LoadingSpinner";
import SpinnerImage from "../../assets/images/spinner_middle.svg";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const PRICE_CHART_ID = "price-chart-widget-container";

// Chain to GeckoTerminal network mapping
const CHAIN_TO_GECKO = {
  pulsechain: "pulsechain",
  ethereumpow: "ethw",
  sonic: "sonic",
};

// Removed PriceChartWidget component and its usage

const ManualChart = ({
  finalTokenInfo,
  geckoNetwork,
  loading,
  setLoading,
  error,
  setError,
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!finalTokenInfo || !chartContainerRef.current) return;

    const cleanupChart = () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };

    const fetchChartData = async () => {
      setLoading(true);
      setError(null);

      try {
        const poolSearch = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/tokens/${finalTokenInfo.toLowerCase()}/pools?page=1`
        );

        if (!poolSearch.data.data || poolSearch.data.data.length === 0) {
          throw new Error("No pool found for token");
        }

        const poolAddress = poolSearch.data.data[0].id.replace(
          `${geckoNetwork}_`,
          ""
        );
        const ohlcvRes = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/pools/${poolAddress}/ohlcv/day?aggregate=1`
        );
        const ohlcvList = ohlcvRes.data.data.attributes.ohlcv_list;
        const candleData = ohlcvList
          .map((candle) => ({
            time: candle[0],
            value: parseFloat(candle[4]),
          }))
          .sort((a, b) => a.time - b.time);

        const container = chartContainerRef.current;
        if (container) {
          cleanupChart();

          const chartOptions = {
            layout: {
              background: { type: "solid", color: "black" },
              textColor: "white",
              fontSize: 12,
              fontFamily: "'Roboto', sans-serif",
              padding: { top: 30, bottom: 20, left: 10, right: 50 },
            },
            grid: {
              vertLines: {
                color: "rgba(255, 255, 255, 0.1)",
                style: LineStyle.Dotted,
                visible: true,
              },
              horzLines: {
                color: "rgba(255, 255, 255, 0.1)",
                style: LineStyle.Dotted,
                visible: true,
              },
            },
            crosshair: {
              mode: 1,
              vertLine: {
                width: 1,
                color: "rgba(255, 153, 0, 0.5)",
                style: LineStyle.Solid,
                labelVisible: true,
                labelBackgroundColor: "#FF9900",
              },
              horzLine: {
                width: 1,
                color: "rgba(255, 153, 0, 0.5)",
                style: LineStyle.Solid,
                labelVisible: true,
                labelBackgroundColor: "#FF9900",
              },
            },
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: "rgba(255, 255, 255, 0.2)",
              rightOffset: 12,
              barSpacing: 12,
              fixLeftEdge: true,
              fixRightEdge: true,
              lockVisibleTimeRangeOnResize: true,
              rightBarStaysOnScroll: true,
              borderVisible: true,
              visible: true,
              tickMarkFormatter: (time) => {
                const date = new Date(time * 1000);
                return date.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                });
              },
            },
            rightPriceScale: {
              borderColor: "rgba(255, 255, 255, 0.2)",
              autoScale: true,
              mode: 1,
              alignLabels: true,
              borderVisible: true,
              scaleMargins: {
                top: 0.2,
                bottom: 0.2,
              },
              entireTextOnly: true,
            },
            handleScroll: {
              mouseWheel: true,
              pressedMouseMove: true,
              horzTouchDrag: true,
              vertTouchDrag: true,
            },
            handleScale: {
              axisPressedMouseMove: true,
              mouseWheel: true,
              pinch: true,
            },
            width: container.clientWidth,
            height: 400,
            localization: {
              priceFormatter: (price) =>
                new Intl.NumberFormat("en-US", {
                  style: "decimal",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                }).format(price),
            },
          };

          const chart = createChart(container, chartOptions);
          chartRef.current = chart;

          chart.applyOptions({
            localization: {
              priceFormatter: (price) =>
                new Intl.NumberFormat("en-US", {
                  style: "decimal",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                }).format(price),
              timeFormatter: (businessDayOrTimestamp) => {
                const date = new Date(businessDayOrTimestamp * 1000);
                return `${date.getDate()} ${date.toLocaleString("default", {
                  month: "short",
                })} '${String(date.getFullYear()).slice(-2)}`;
              },
            },
          });

          const series = chart.addSeries(LineSeries, {
            color: "#00ff00",
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: "#00ff00",
            crosshairMarkerBackgroundColor: "#000000",
            lastValueVisible: true,
            priceLineVisible: true,
            priceLineWidth: 1,
            priceLineColor: "rgba(0, 255, 0, 0.5)",
            priceLineStyle: LineStyle.Dotted,
            baseLineVisible: true,
            baseLineColor: "#FF9900",
            baseLineWidth: 1,
            baseLineStyle: LineStyle.Solid,
            priceFormat: {
              type: "price",
              precision: 6,
              minMove: 0.000001,
            },
            title: "Price",
            visible: true,
            lastPriceAnimation: 1,
          });

          series.setData(candleData);
          chart.timeScale().fitContent();

          const handleResize = () => {
            if (chartRef.current) {
              chartRef.current.applyOptions({
                width: container.clientWidth,
              });
            }
          };

          window.addEventListener("resize", handleResize);
          return () => {
            window.removeEventListener("resize", handleResize);
            cleanupChart();
          };
        }
      } catch (err) {
        console.error(err);
        if (!geckoNetwork) {
          setError("Failed to load chart: unsupported chain");
        } else {
          setError(null);
        }
        cleanupChart();
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();

    return () => {
      cleanupChart();
    };
  }, [finalTokenInfo, geckoNetwork]);

  return <div ref={chartContainerRef} className="w-full h-[400px]" />;
};

export const Graph = ({ padding }) => {
  const path = useStore((state) => state.path);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { chain: currentChain, tokenList } = useChainConfig();

  if (!path || path.length < 2) {
    return (
      <div
        className={`border-[2px] border-[#FF9900] rounded-xl pt-4 bg-black ${padding}`}
      >
        <div className="text-white roboto text-center">Select tokens to see chart</div>
      </div>
    );
  }

  const finalTokenInfo = path[0] === EMPTY_ADDRESS ? path[1] : path[0];
  const chainName = currentChain?.name?.toLowerCase() || "";
  const geckoNetwork = CHAIN_TO_GECKO[chainName] || "";
  // const isPulsechain = chainName === 'pulsechain'; // No longer needed

  // Get token info from tokenList
  const tokenInfo = finalTokenInfo ? tokenList.find(
    (token) => token.address && token.address.toLowerCase() === finalTokenInfo.toLowerCase()
  ) : undefined;

  return (
    <div
      className={`border-[2px] border-[#FF9900] rounded-xl pt-4 bg-black ${padding}`}
    >
      {loading && (
        <div className="text-white roboto text-center">Loading...</div>
      )}
      {error && (
        <div className="flex items-center justify-center py-4 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      )}
      {tokenInfo && (
        <div className="text-white text-center roboto">
          <h2 className="text-sm">
            {tokenInfo.name} ({tokenInfo.ticker})
          </h2>
        </div>
      )}
      {/* Always use ManualChart for all chains, including pulsechain */}
      <ManualChart
        finalTokenInfo={finalTokenInfo}
        geckoNetwork={geckoNetwork}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default Graph;
