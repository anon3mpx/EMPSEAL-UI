import React, { useState } from 'react';
import Icon from '../../src/assets/images/emp-icon.svg';
import Chart from '../../src/assets/images/chart.svg';
import Point from '../../src/assets/images/arrow-dot.svg';
import CollectionImage from '../../src/assets/images/collection-img1.svg';
import Price from '../../src/assets/images/price.svg';
import { Link } from 'react-router-dom';
const CollectionTable = () => {
  const [data, setData] = useState([
    {
      id: 1,
      name: 'Milady Erbus',
      sales: 9.24,
      floorPrice: 82300,
      topBid: 82300,
      change: 7,
      volume: '14 (55%)',
      supply: 8888,
    },
    {
      id: 2,
      name: 'Ayush Srivastav',
      sales: 14.24,
      floorPrice: 800,
      topBid: 82300,
      change: 8,
      volume: '249 (56%)',
      supply: 8888,
    },
    {
      id: 3,
      name: 'Ganadhish',
      sales: 12.24,
      floorPrice: 82300,
      topBid: 82300,
      change: 4,
      volume: '77 (55%)',
      supply: 8888,
    },
    {
      id: 4,
      name: 'Rahul M',
      sales: 13.24,
      floorPrice: 7100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 5,
      name: 'Kaus',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 6,
      name: 'Sweatha',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 7,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 8,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 9,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 10,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 11,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 12,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 13,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 14,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 15,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 16,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 17,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 18,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 19,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
    {
      id: 20,
      name: 'Shohini',
      sales: 13.24,
      floorPrice: 100,
      topBid: 300,
      change: 1,
      volume: '149 (55%)',
      supply: 88,
    },
  ]);

  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsToShow, setRowsToShow] = useState(10);
  const handleSort = () => {
    const sortedData = [...data].sort((a, b) => {
      return sortOrder === 'asc' ? a.sales - b.sales : b.sales - a.sales;
    });
    setData(sortedData);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handlePriceSort = () => {
    const sortedData = [...data].sort((a, b) => {
      return sortOrder === 'asc'
        ? a.floorPrice - b.floorPrice
        : b.floorPrice - a.floorPrice;
    });
    setData(sortedData);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleTopSort = () => {
    const sortedData = [...data].sort((a, b) => {
      return sortOrder === 'asc' ? a.topBid - b.topBid : b.topBid - a.topBid;
    });
    setData(sortedData);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleSupplySort = () => {
    const sortedData = [...data].sort((a, b) => {
      return sortOrder === 'asc' ? a.supply - b.supply : b.supply - a.supply;
    });
    setData(sortedData);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleVolumeSort = () => {
    const sortedData = [...data].sort((a, b) => {
      // Extract the numeric part of the volume string
      const volumeA = parseFloat(a.volume.split(' ')[0]);
      const volumeB = parseFloat(b.volume.split(' ')[0]);
      return sortOrder === 'asc' ? volumeA - volumeB : volumeB - volumeA;
    });
    setData(sortedData);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleShowRows = (numRows) => {
    setRowsToShow(numRows);
  };

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };
  return (
    <div className="collection-table-container border_gradient p-5 ">
      {/* Header Section */}
      <header className="flex items-center justify-between  text-white pb-4 relative z-10">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <img src="/path/to/logo.png" alt="Logo" className="h-8" />{' '}
          {/* Replace with actual logo path */}
          <span className="text-xl font-bold">MPX</span>
        </div>
        {/* Buttons */}
        <div className="flex space-x-4">
          <button className="text-black text-sm py-1.5 px-3 rounded flex items-center roboto bg-[#FF8A00]">
            <img className="pe-2" src={Icon} />
            Collections
          </button>
          <button className="bg-transparent text-sm text-white py-1 px-3 border border-white rounded flex items-center roboto">
            <img className="pe-2" src={Chart} />
            Trending
          </button>
          <button className="bg-transparent text-sm border  border-white text-white py-1 px-3 rounded flex items-center roboto">
            <img className="pe-2" src={Point} />
            Points
          </button>
        </div>
        {/* Search Bar */}

        <div class="relative mt-1 opacity-60">
          <div class="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
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
            class="block py-1.5 ps-10 text-sm text-white border border-gray-300  w-[292px] bg-transparent placeholder-white text-sm"
            placeholder="Search by Collection, NFT and Wallet"
          />
        </div>
      </header>

      <table className="w-full border-separate border-spacing-y-2 relative z-10">
        <thead>
          <tr className="collection text-white roboto">
            <th className="bg-[#222222] text-left py-2 px-4 border border-gray-700">
              Collection
            </th>
            <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
              Floor Price
              <button onClick={handlePriceSort} className="ml-2">
                <svg
                  className="w-3 h-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </button>
            </th>
            <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
              Top Bid
              <button onClick={handleTopSort} className="ml-2">
                <svg
                  className="w-3 h-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </button>
            </th>
            <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
              Sales
              <button onClick={handleSort} className="ml-2">
                <svg
                  className="w-3 h-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </button>
            </th>
            <th className="bg-[#222222] text-right py-2 px-4 border border-gray-700">
              1D Change
            </th>
            <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
              7D Volume
              <button onClick={handleVolumeSort} className="ml-2">
                <svg
                  className="w-3 h-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </button>
            </th>
            <th className="bg-[#222222] text-right py-3 px-4 border border-gray-700">
              Supply
              <button onClick={handleSupplySort} className="ml-2">
                <svg
                  className="w-3 h-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredData.slice(0, rowsToShow).map((item) => (
            <tr
              key={item.id}
              className="border border-gray-700 collection_row roboto "
            >
              <td className="py-4 px-4 flex items-center">
                <img
                  className="pe-3"
                  src={CollectionImage}
                  alt={`${item.name} logo`}
                />
                <Link
                  to={`/nft-marketplace/${generateSlug(item.name)}`}
                  className=""
                >
                  {item.name}
                </Link>
              </td>
              <td className="text-center py-2 px-4">{item.floorPrice}K</td>
              <td className="text-center py-2 px-4">{item.topBid}K</td>
              <td className="text-center py-2 px-4 text-[#0CDD2E]">
                {item.sales}%
              </td>
              <td className="text-center py-2 px-4">
                <span
                  className={
                    item.change < 0 ? 'text-red-500' : 'text-[#0CDD2E]'
                  }
                >
                  {item.change}
                </span>
              </td>
              <td className="text-center py-2 px-4">{item.volume}</td>
              <td className="text-center py-2 px-4">{item.supply}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex space-x-2 text-white mt-4 mb-4 relative z-10 roboto items-center">
        <span className="text-xs opacity-60">Show Top</span>
        {[10, 20, 30].map((num) => (
          <button
            key={num}
            className={`px-3 py-1 text-xs  ${
              rowsToShow === num
                ? 'bg-[#3F3F3F] text-white'
                : 'bg-[#222222] text-gray-300'
            }`}
            onClick={() => handleShowRows(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CollectionTable;
