import { useState } from "react";
import {
  Copy,
  Check,
  Bitcoin,
  ChevronDown,
  ArrowUp,
  ArrowUp01Icon,
  ChevronDownCircle,
} from "lucide-react";

const initialData = [
  {
    id: 1,
    name: "Order #6",
    address: "0x05...2b9cui",
    price: "Limit Price",
    change: "-0.65",
    status: "Active",
    tokenIn: "0xA107...9a27",
    tokenOut: "0xb107...9a39",
    amountIn: 1000,
    minOut: 5.9031,
    limitPrice: 0.0045,
    date: "10/27/2025",
    time: "5:09:00PM",
  },
  {
    id: 2,
    name: "Order #6",
    address: "0x05...2b9cui",
    price: "Limit Price",
    change: "-0.65",
    status: "Fulfilled",
    tokenIn: "0xA107...9a27",
    tokenOut: "0xb107...9a39",
    amountIn: 1000,
    minOut: 5.9031,
    limitPrice: 0.0045,
    date: "10/27/2025",
    time: "5:09:00PM",
  },
  {
    id: 3,
    name: "Order #6",
    address: "0x05...2b9cui",
    price: "Limit Price",
    change: "-0.65",
    status: "Active",
    tokenIn: "0xA107...9a27",
    tokenOut: "0xb107...9a39",
    amountIn: 1000,
    minOut: 5.9031,
    limitPrice: 0.0045,
    date: "10/27/2025",
    time: "5:09:00PM",
  },
  {
    id: 4,
    name: "Order #6",
    address: "0x05...2b9cui",
    price: "Limit Price",
    change: "-0.65",
    status: "Expired",
    tokenIn: "0xA107...9a27",
    tokenOut: "0xb107...9a39",
    amountIn: 1000,
    minOut: 5.9031,
    limitPrice: 0.0045,
    date: "10/27/2025",
    time: "5:09:00PM",
  },
];

export default function App() {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [filter, setFilter] = useState("All");
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const filteredData =
    filter === "All"
      ? initialData
      : initialData.filter((d) => d.status === filter);

  const statusColors = {
    Active: "active_limit_table",
    Fulfilled: "active_limit_table1",
    Expired: "active_limit_table2",
  };

  return (
    <div className="text-white w-full sctable">
      <h1>Note:Static Table</h1>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <button className=" px-6 py-2 bg-[#FF8A00] text-black md:w-[220px] h-[70px] md:text-base text-sm font-extrabold border border-[#FF8A00] rounded-t-[10px]  transition-all duration-200">
          Your Orders
        </button>

        <select
          className="bg-black border border-[#FF8A00] rounded-md px-3 py-2 w-[137px] h-10 "
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          <option>Active</option>
          <option>Fulfilled</option>
          <option>Expired</option>
          <option>Cancelled</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="clip-bg1 w-full rounded-tr-2xl rounded-b-2xl lg:py-8 lg:px-8 md:px-6 px-4 md:py-6 py-6 space-y-3">
        {filteredData.map((item, idx) => (
          <div
            key={idx}
            className="border border-[#FF8A00]  md:px-6 md:py-6 px-4 py-4 hover:bg-[#FF8A00]/10 transition"
          >
            <div className="flex justify-between items-center md:flex-nowrap flex-wrap md:gap-1 gap-4">
              <div className="flex items-center gap-4 md:max-w-[350px] w-full">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full flex-shrink-0">
                  <Bitcoin className="text-[#FF8A00]" size={24} />
                </div>
                <div className="flex gap-4 items-center">
                  <div className="font-medium whitespace-nowrap">
                    {item.name}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm mt-1 bg-[#1b1a17] md:w-[180px] w-full px-3 py-1 rounded-full">
                    <span>{item.address}</span>
                    {copiedIndex === idx ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy
                        className="w-4 h-4 cursor-pointer hover:text-orange-400"
                        onClick={() => handleCopy(item.address, idx)}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:justify-between md:max-w-[350px] w-full">
                <div className="flex gap-2 items-center">
                  <div className="font-semibold text-sm">{item.price}:</div>
                  <div className="text-[#0EDA1B] text-sm flex gap-1 items-center">
                    {item.change}
                    <ArrowUp size={14} />
                  </div>
                </div>

                <div
                  className={`px-4 py-2 rounded-full text-sm cursor-pointer ${
                    statusColors[item.status]
                  }`}
                >
                  {item.status}
                </div>

                <button
                  className={`w-[30px] h-[30px] rounded-full flex justify-center items-center ${
                    expandedIndex === idx
                      ? "border-2 border-[#FF8A00]"
                      : "bg-[#402806] border-2 border-transparent  "
                  }`}
                  onClick={() =>
                    setExpandedIndex(expandedIndex === idx ? null : idx)
                  }
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform text-[#FF8A00] ${
                      expandedIndex === idx ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              </div>
            </div>

            {expandedIndex === idx && (
              <div className="mt-6 pt-5 border-t border-[#D4D4D4] border-opacity-80 p-3 text-sm grid md:grid-cols-4 grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div>
                    <span className="text-[#FF8A00]">Token In:</span>{" "}
                    {item.tokenIn}
                  </div>
                  <div>
                    <span className="text-[#FF8A00]">Token Out: </span>
                    {item.tokenOut}
                  </div>
                  <div>
                    <span className="text-[#FF8A00]">Amount In: </span>
                    {item.amountIn}
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[#FF8A00]">Min Out: </span>
                    {item.minOut}
                  </div>
                  <div>
                    <span className="text-[#FF8A00]">Limit Price: </span>
                    {item.limitPrice}
                  </div>
                  <div>
                    <span className="text-[#FF8A00]">Date: </span>
                    {item.date}
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[#FF8A00]">Time: </span>
                    {item.time}
                  </div>
                  <div>
                    <span className="text-[#FF8A00]">Address: </span>
                    {item.address}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
