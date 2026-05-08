import React, { useState } from 'react';
import Icon from '../../src/assets/images/emp-icon.svg';
import CollectionImage from '../../src/assets/images/nft_pic.svg';
import Grid from '../assets/images/grid-view.svg';
import List from '../assets/images/list-view.svg';
import PriceIcon from '../assets/images/nft-ico.svg';
import Item from '../assets/images/items1.svg';
import Bid from '../assets/images/items3.svg';
import Loans from '../assets/images/items2.svg';
import { Link } from 'react-router-dom';
const ItemDetailActivity = () => {
  const [data, setData] = useState([
    {
      id: 1,
      name: 'Milady #284',
      sales: 9.24,
      listingPrice: 0.032,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '2E780B',
    },
    {
      id: 2,
      name: 'Milady #837',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '2BB80B',
    },
    {
      id: 3,
      name: 'Ayush',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '2E78B',
    },
    {
      id: 4,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '2E80B',
    },
    {
      id: 5,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '3E780B',
    },
    {
      id: 6,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
      from: '5E780B',
    },
    // Add more items as needed
  ]);

  const [viewMode, setViewMode] = useState('list'); // Toggle between 'list' and 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsToShow, setRowsToShow] = useState(6);
  const [activeTab, setActiveTab] = useState('items');
  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="collection-container border_gradient p-5 mt-6">
      {/* Header Section */}
      <header className="flex items-center justify-between text-white pb-4">
       <h2 className="text-base roboto">Activity</h2>
      </header>

      <table className="w-full border-separate border-spacing-y-2 relative z-10">
              <thead>
              <tr className=" collection text-white roboto">
      <th className="bg-[#121212] text-left py-2 px-4 border border-gray-700">Action</th>
      <th className="bg-[#121212] text-center py-2 px-4 border border-gray-700">Price</th>
      <th className="bg-[#121212] text-center py-2 px-4 border border-gray-700">From</th>
      <th className="bg-[#121212] text-center py-2 px-4 border border-gray-700">To</th>
      <th className="bg-[#121212] text-center py-2 px-4 border border-gray-700">Time</th>
    </tr>

              </thead>
              <tbody>
                {filteredData.slice(0, rowsToShow).map((item) => (
      <tr key={item.id} className="border border-gray-700 roboto collection_row">
      <td className="py-2 px-4 text-left">
        <span className="text-white">📄 Listing</span>
      </td>
      <td className="py-2 px-4 text-center text-white">{item.listingPrice}</td>
      <td className="py-2 px-4 text-center text-[#FF8A00]">{item.from}</td>
      <td className="py-2 px-4 text-center text-white">-</td>
      <td className="py-2 px-4 text-center text-[#0CDD2E]">{item.listedTime}</td>
    </tr>

                ))}
              </tbody>
            </table>

      <div className="flex space-x-2 text-white mt-4 mb-4 roboto items-center relative z-10">
        <span className="text-xs opacity-60">Show Top</span>
        {[6, 10, 30].map((num) => (
          <button
            key={num}
            className={`px-3 py-1 text-xs ${
              rowsToShow === num
                ? 'bg-[#3F3F3F] text-white'
                : 'bg-[#222222] text-gray-300'
            }`}
            onClick={() => setRowsToShow(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ItemDetailActivity;
