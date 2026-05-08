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
const CollectionDetailTable = () => {
  const [data, setData] = useState([
    {
      id: 1,
      name: 'Milady #284',
      sales: 9.24,
      listingPrice: 0.032,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    {
      id: 2,
      name: 'Milady #837',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    {
      id: 3,
      name: 'Ayush',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    {
      id: 4,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    {
      id: 5,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    {
      id: 6,
      name: 'Kaus',
      sales: 9.24,
      listingPrice: 0.0262,
      floorDifference: -6.03,
      itemOwner: 14,
      listedTime: 8888,
    },
    // Add more items as needed
  ]);

  const [viewMode, setViewMode] = useState('list'); // Toggle between 'list' and 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsToShow, setRowsToShow] = useState(10);
  const [activeTab, setActiveTab] = useState('items');
  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="collection-container border_gradient p-5">
      {/* Header Section */}
      <header className="flex items-center justify-between text-white pb-4">
        <div className="flex space-x-4 relative z-10">
          <button
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded ${
              activeTab === 'items'
                ? 'bg-[#FF8A00] text-black'
                : 'bg-[#222222] text-white'
            }`}
            onClick={() => setActiveTab('items')}
          >
            <img src={Item} alt="Items" className="h-4 mr-2" />
            Items
          </button>
          <button
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded ${
              activeTab === 'bids'
                ? 'bg-[#FF8A00] text-black'
                : 'bg-[#222222] text-white'
            }`}
            onClick={() => setActiveTab('bids')}
          >
            <img src={Bid} alt="Bids" className="h-4 mr-2" />
            Bids
          </button>
          <button
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded ${
              activeTab === 'loans'
                ? 'bg-[#FF8A00] text-black'
                : 'bg-[#222222] text-white'
            }`}
            onClick={() => setActiveTab('loans')}
          >
            <img src={Loans} alt="Loans" className="h-4 mr-2" />
            Loans
          </button>
        </div>
      
        <div className="flex space-x-4 relative z-10">
          <div class="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-6 pointer-events-none">
            <svg
              class="w-4 h-4 text-white dark:text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
          </div>
          <input
            type="text"
            id="table-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            class="block py-1.5 ps-10 text-sm text-white border border-gray-300  w-[100px] bg-transparent placeholder-white text-sm"
            placeholder="Item ID"
          />
          <button
            className={`text-sm py-1.5 px-3 rounded flex items-center roboto ${
              viewMode === 'list'
                ? 'border border-white text-black'
                : 'text-white'
            }`}
            onClick={() => setViewMode('list')}
          >
            <img src={List} alt="List View" />
          </button>
          <button
            className={`text-sm py-1.5 px-3 rounded flex items-center roboto ${
              viewMode === 'grid'
                ? 'border border-white text-black'
                : 'text-white'
            }`}
            onClick={() => setViewMode('grid')}
          >
            <img src={Grid} alt="Grid View" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      {activeTab === 'items' && (
        <div>
          {viewMode === 'list' ? (
            <table className="w-full border-separate border-spacing-y-2 relative z-10">
              <thead>
                <tr className="collection text-white roboto">
                  <th className="bg-[#222222] text-left py-2 px-4 border border-gray-700">
                    Item
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Listing Price
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Floor Difference
                  </th>
                  <th className="bg-[#222222] text-right py-2 px-4 border border-gray-700">
                    Owner
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Listed Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, rowsToShow).map((item) => (
                  <tr
                    key={item.id}
                    className="border border-gray-700 collection_row roboto"
                  >
                    <td className="py-4 px-4 flex items-center">
                      <img
                        className="collection_img"
                        src={CollectionImage}
                        alt={`${item.name} logo`}
                      />
                      <Link
                        to={`/nft-marketplace/${generateSlug(item.name)}`}
                        className="ps-3"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="text-center py-2 px-4">
                      {item.listingPrice}
                    </td>
                    <td className="text-center py-2 px-4">
                      <span
                        className={
                          item.floorDifference < 0
                            ? 'text-red-500'
                            : 'text-[#0CDD2E]'
                        }
                      >
                        {item.floorDifference}
                      </span>
                    </td>
                    <td className="text-center py-2 px-4">{item.itemOwner}</td>
                    <td className="text-center py-2 px-4">{item.listedTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {filteredData.slice(0, rowsToShow).map((item) => (
                <div
                  key={item.id}
                  className="bg-[#222222]  overflow-hidden text-white shadow-md hover:shadow-lg transition-shadow relative z-10"
                >
                  <div className="relative">
                    <img
                      src={CollectionImage}
                      alt={item.name}
                      className="w-full h-48 object-cover p-2"
                    />
                    <div className="absolute top-3 right-3">
                      <input type="checkbox" className="w-5 h-5 accent-white" />
                    </div>
                  </div>
                  <div className="py-4 px-3">
                    <h3 className="text-sm font-semibold mb-2 roboto text-[#FF8A00]">
                      {item.name}
                    </h3>
                    <div className="flex justify-between text-sm opacity-80 roboto">
                      <div>
                        <h4 className="text-sm text-white">Price</h4>
                        <h5 className="text-xs text-white flex items-center mt-1">
                          {' '}
                          {item.listingPrice.toFixed(4)}
                          <img className="ps-1" src={PriceIcon} />
                        </h5>
                      </div>

                      <div>
                        <h4 className="text-sm text-white">Last Sale</h4>
                        <h5 className="text-xs text-white flex items-center mt-1">
                          {' '}
                          {item.listingPrice.toFixed(4)}
                          <img className="ps-1" src={PriceIcon} />
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

{activeTab === 'bids' && (
        <div>
          {viewMode === 'list' ? (
            <table className="w-full border-separate border-spacing-y-2 relative z-10">
              <thead>
                <tr className="collection text-white roboto">
                  <th className="bg-[#222222] text-left py-2 px-4 border border-gray-700">
                    Item
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Bids Price
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Floor Difference
                  </th>
                  <th className="bg-[#222222] text-right py-2 px-4 border border-gray-700">
                    Owner
                  </th>
                  <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
                    Listed Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, rowsToShow).map((item) => (
                  <tr
                    key={item.id}
                    className="border border-gray-700 collection_row roboto"
                  >
                    <td className="py-4 px-4 flex items-center">
                      <img
                        className="collection_img"
                        src={CollectionImage}
                        alt={`${item.name} logo`}
                      />
                      <Link
                        to={`/nft-marketplace/${generateSlug(item.name)}`}
                        className="ps-3"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="text-center py-2 px-4">
                      {item.listingPrice}
                    </td>
                    <td className="text-center py-2 px-4">
                      <span
                        className={
                          item.floorDifference < 0
                            ? 'text-red-500'
                            : 'text-[#0CDD2E]'
                        }
                      >
                        {item.floorDifference}
                      </span>
                    </td>
                    <td className="text-center py-2 px-4">{item.itemOwner}</td>
                    <td className="text-center py-2 px-4">{item.listedTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {filteredData.slice(0, rowsToShow).map((item) => (
                <div
                  key={item.id}
                  className="bg-[#222222]  overflow-hidden text-white shadow-md hover:shadow-lg transition-shadow relative z-10"
                >
                  <div className="relative">
                    <img
                      src={CollectionImage}
                      alt={item.name}
                      className="w-full h-48 object-cover p-2"
                    />
                    <div className="absolute top-3 right-3">
                      <input type="checkbox" className="w-5 h-5 accent-white" />
                    </div>
                  </div>
                  <div className="py-4 px-3">
                    <h3 className="text-sm font-semibold mb-2 roboto text-[#FF8A00]">
                      {item.name}
                    </h3>
                    <div className="flex justify-between text-sm opacity-80 roboto">
                      <div>
                        <h4 className="text-sm text-white">Price</h4>
                        <h5 className="text-xs text-white flex items-center mt-1">
                          {' '}
                          {item.listingPrice.toFixed(4)}
                          <img className="ps-1" src={PriceIcon} />
                        </h5>
                      </div>

                      <div>
                        <h4 className="text-sm text-white">Last Sale</h4>
                        <h5 className="text-xs text-white flex items-center mt-1">
                          {' '}
                          {item.listingPrice.toFixed(4)}
                          <img className="ps-1" src={PriceIcon} />
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-2 text-white mt-4 mb-4 roboto items-center relative z-10">
        <span className="text-xs opacity-60">Show Top</span>
        {[4, 6, 30].map((num) => (
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

export default CollectionDetailTable;
