import React, { useState } from 'react';
import Icon from '../../src/assets/images/emp-icon.svg';
import CollectionImage from '../../src/assets/images/nft_pic.svg';
import Grid from '../assets/images/grid-view.svg';
import List from '../assets/images/list-view.svg';
import PriceIcon from '../assets/images/nft-ico.svg';
import Traits from '../assets/images/traits.svg';
import Bid from '../assets/images/items3.svg';
import Loans from '../assets/images/items2.svg';
import { Link } from 'react-router-dom';
const ItemDetails = () => {
  const [data, setData] = useState([
    {
      id: 1,
      name: 'Milady #284',
      size: 3,
      price: 11.27,
      bidders: 3,
      total: 33.81,
      listedTime: 8888,
    },
    {
      id: 2,
      name: 'Milady #837',
      size: 9.24,
      price: 0.0262,
      bidders: -6.03,
      total: 14,
      listedTime: 8888,
    },
    {
      id: 3,
      name: 'Ayush',
      size: 9.24,
      price: 0.0262,
      bidders: -6.03,
      total: 14,
      listedTime: 8888,
    },
    {
      id: 4,
      name: 'Kaus',
      size: 9.24,
      price: 0.0262,
      bidders: -6.03,
      total: 14,
      listedTime: 8888,
    },
    {
      id: 5,
      name: 'Kaus',
      size: 9.24,
      price: 0.0262,
      bidders: -6.03,
      total: 14,
      listedTime: 8888,
    },
    {
      id: 6,
      name: 'Kaus',
      size: 9.24,
      price: 0.0262,
      bidders: -6.03,
      total: 14,
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
            <img src={Traits} alt="Items" className="h-4 mr-2" />
            Traits
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
              activeTab === 'descriptions'
                ? 'bg-[#FF8A00] text-black'
                : 'bg-[#222222] text-white'
            }`}
            onClick={() => setActiveTab('descriptions')}
          >
            <img src={Loans} alt="Loans" className="h-4 mr-2" />
            Description
          </button>
        </div>
      </header>

      {activeTab === 'items' && (
        <div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <div className="bg-[#222222] p-4  shadow-md text-white w-72 relative z-10">
                <h3 className="text-[#9F9F9F] text-sm">Plain Backgrounds</h3>

                <h4 className="text-base font-bold mt-2">3</h4>

                <hr className="my-4 border-white-600" />

                <div className="flex justify-between items-center text-sm">
                  <h5 className="px-2 py-1 border border-white-600 rounded text-[#9F9F9F] text-sm">
                    1,239/9,012
                  </h5>
                  <h6 className="text-[#FF8A00] font-bold text-sm">12%</h6>
                </div>
              </div>
              <div className="bg-[#222222] p-4  shadow-md text-white w-72 relative z-10">
                <div className="text-[#9F9F9F] text-sm">Skin</div>

                <div className="text-base font-bold mt-2">Brown</div>

                <hr className="my-4 border-white-600" />

                <div className="flex justify-between items-center text-sm">
                  <div className="px-2 py-1 border border-white-600 rounded text-[#9F9F9F] text-sm">
                    1,239/9,012
                  </div>
                  <div className="text-[#FF8A00] font-bold text-sm">12%</div>
                </div>
              </div>
              <div className="bg-[#222222] p-4  shadow-md text-white w-72 relative z-10">
                <div className="text-[#9F9F9F] text-sm">Accessories</div>

                <div className="text-base font-bold mt-2">None</div>

                <hr className="my-4 border-white-600" />

                <div className="flex justify-between items-center text-sm">
                  <div className="px-2 py-1 border border-white-600 rounded text-[#9F9F9F] text-sm">
                  6,780/9012
                  </div>
                  <div className="text-[#FF8A00] font-bold text-sm">54%</div>
                </div>
              </div>
            </div>
        </div>
      )}

      {activeTab === 'bids' && (
       <div>
                    <table className="w-full border-separate border-spacing-y-2 relative z-10">
              <thead>
                <tr className="collection text-white roboto">
                  <th className="bg-[#222222] text-center py-3 px-4 border border-gray-700">
                     Price
                  </th>
                  <th className="bg-[#222222] text-center py-3 px-4 border border-gray-700">
                    Size
                  </th>
                  <th className="bg-[#222222] text-center py-2 px-4 border border-gray-700">
                    Total
                  </th>
                  <th className="bg-[#222222] text-center py-3 px-4 border border-gray-700">
                    Bidders
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, rowsToShow).map((item) => (
                  <tr
                    key={item.id}
                    className="border border-gray-700 collection_row roboto"
                  >
                    
                    <td className="text-center py-2 px-4">
                      {item.price}
                    </td>
                    <td className="text-center py-2 px-4">
                      <span
                        className={
                          item.size < 0
                            ? 'text-red-500'
                            : 'text-[#0CDD2E]'
                        }
                      >
                        {item.size}
                      </span>
                    </td>
                    <td className="text-center py-2 px-4">{item.total}</td>
                    <td className="text-center py-2 px-4">{item.bidders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
       </div>
      )}

{activeTab === 'descriptions' && (
        <div>
          <div>
                            <p className="text-white">lorem ipsum </p>
                            <p className="text-white">lorem ipsum </p>
            </div>
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

export default ItemDetails;
