// import React, { useEffect, useRef } from "react";
// import Chart from "chart.js/auto";

// const BusdGraph = () => {
//   const chartRef = useRef(null);
//   const chartInstance = useRef(null);

//   useEffect(() => {
//     const ctx = chartRef.current.getContext("2d");

//     if (chartInstance.current !== null) {
//       chartInstance.current.destroy();
//     }

//     var gradientStroke = ctx.createLinearGradient(500, 0, 100, 0);
//     gradientStroke.addColorStop(0, "#FF9900");
//     gradientStroke.addColorStop(1, "#FF9900");

//     var gradientBkgrd = ctx.createLinearGradient(0, 100, 0, 400);
//     gradientBkgrd.addColorStop(0, "#FF9900");
//     gradientBkgrd.addColorStop(1, "#FF9900");

//     if (Chart.controllers && Chart.controllers.line) {
//       let draw = Chart.controllers.line.prototype.draw;
//       Chart.controllers.line = Chart.controllers.line.extend({
//         draw: function () {
//           draw.apply(this, arguments);
//           let ctx = this.chart.chart.ctx;
//           let _stroke = ctx.stroke;
//           ctx.stroke = function () {
//             ctx.save();
//             ctx.shadowBlur = 8;
//             ctx.shadowOffsetX = 0;
//             ctx.shadowOffsetY = 6;
//             _stroke.apply(this, arguments);
//             ctx.restore();
//           };
//         },
//       });
//     }

//     chartInstance.current = new Chart(ctx, {
//       type: "line",

//       data: {
//         labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
//         datasets: [
//           {
//             label: "Status",

//             backgroundColor: gradientBkgrd,
//             borderColor: gradientStroke,
//             data: [5500, 2500, 10000, 6000, 14000, 15000, 7000, 20000],
//             pointBorderColor: "rgba(255,255,255,0)",
//             pointBackgroundColor: "rgba(255,255,255,0)",
//             pointBorderWidth: 0,
//             pointHoverRadius: 8,
//             pointHoverBackgroundColor: gradientStroke,
//             pointHoverBorderColor: "#FF9900",
//             pointHoverBorderWidth: 4,
//             pointRadius: 1,
//             borderWidth: 2,
//             pointHitRadius: 16,
//           },
//         ],
//       },

//       // Configuration options go here
//       options: {
//         plugins: {
//           tooltip: {
//             backgroundColor: "#FF9900",
//             displayColors: false,
//             titleFontColor: "#000",
//             bodyFontColor: "#000",
//             callbacks: {
//               label: function (context) {
//                 return null; // Return null to remove the label box
//               },
//             },
//           },
//         },
//         legend: {
//           display: false,
//         },
//         scales: {
//           x: {
//             display: false,
//             grid: {
//               display: false,
//             },
//           },
//           y: {
//             display: false,
//             ticks: {
//               callback: function (value, index, values) {
//                 return value / 1000 + "K";
//               },
//             },
//           },
//         },
//         elements: {
//           line: {
//             backgroundColor: gradientBkgrd
//           }
//         }
//       },
//     });
//   }, []);

//   return (
//     <div className="w-full">
//       <canvas ref={chartRef} width={600} height={100} />
//     </div>
//   );
// };

// export default BusdGraph;
