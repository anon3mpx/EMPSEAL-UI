import React, { useState } from 'react';
import { Chart } from 'react-google-charts';
import Depth from '../assets/images/line-chart.svg';
import Sales from '../assets/images/graph-chart.svg';

const ActivityChart = () => {
  const [activeTab, setActiveTab] = useState("Depth");

  const data = [
    ["x", activeTab],
    [0.03, 29],
    [0.04, 29],
    [0.05, 53],
    [0.07, 78],
    [0.08, 78],
    [0.09, 102],
    [0.10, 130],
    [0.11, 130],
    [0.12, 182]
  ];

  const options = {
    hAxis: {
      title: '',
      textStyle: { color: '#ffffff' },
      gridlines: { color: 'transparent' },
    },
    vAxis: {
      title: '',
      textStyle: { color: '#ffffff' },
      baselineColor: '#ffffff',
      gridlines: { color: 'transparent' }
    },
    legend: 'none',
    colors: ['#FF8A00'],
    backgroundColor: 'transparent',
    chartArea: {
      width: '85%',
      height: '70%'
    },
    lineWidth: 0,
    areaOpacity: 0.3,
    curveType: "function",
  };

  return (
    <div className="border_gradient p-4   mt-7 relative z-10">
      <div className="flex space-x-2 mb-4 relative z-10">
        <button
          onClick={() => setActiveTab("Depth")}
          className={`px-4 py-1 rounded flex items-center ${activeTab === "Depth" ? 'border border-white text-white' : 'bg-[#222222] text-white'}`}
        >
          <img className="pe-3" src={Depth} />
          Depth
        </button>
        <button
          onClick={() => setActiveTab("Sales")}
          className={`px-4 py-1 rounded flex items-center ${activeTab === "Sales" ? 'border border-white text-white' : 'bg-[#222222] text-white'}`}
        >
           <img className="pe-3" src={Sales} />
          Sales
        </button>
      </div>

      <Chart
        chartType="AreaChart"
        width="100%"
        className="relative z-10"
        height="200px"
        data={data}
        options={options}
      />
    </div>
  );
};

export default ActivityChart;
