import React from 'react';
import { useParams } from 'react-router-dom';
import Image from '../assets/images/collection_detail.svg';
import Twitter from '../assets/images/profile_twitter.svg';
import Discord from '../assets/images/profile_discord.svg';
import Globe from '../assets/images/profile_globe.svg';
import Link from '../assets/images/profile_link.svg';
import Activity from '../assets/images/activity_img.svg';
import ActivityTable from './ActivityTable';
import ActivityChart from './ActivityChart';
import CollectionDetailTable from './CollectionDetailTable';

const CollectionDetail = () => {
  const { name } = useParams();
  const activityData = [
    { time: '16m', price: '02.3K', seller: 'a767F' },
    { time: '18m', price: '1.2K', seller: 'b897T' },
    { time: '19m', price: '03.3K', seller: 'a767F' },
    { time: '20m', price: '1.3K', seller: 'b897T' },
    { time: '18m', price: '1.2K', seller: 'b897T' },
    { time: '19m', price: '03.3K', seller: 'a767F' },
    { time: '11m', price: '02.3K', seller: 'a767F' },
    { time: '14m', price: '1.2K', seller: 'b897T' },
    // Add more activity items here
  ];
  return (
    <div className="md:container mx-auto p-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border_gradient p-4 ">
            <div className="md:col-span-3 col-span-12  roboto relative z-10">
              <div className="text-white">
                {/* Profile Image */}
                <div className="w  overflow-hidden">
                  <img
                    src={Image}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow">
                  {/* Name and Social Icons */}
                  <div className="flex items-center justify-between space-x-2 mb-4 mt-1">
                    <h2 className="text-xs font-semibold">
                      {name.replace(/-/g, ' ')}
                    </h2>
                    <span className="text-[#FF8A00]">★</span>
                  </div>
                  <div className="flex space-x-4 text-gray-400">
                    <a href="#">
                      <img src={Twitter} alt="twitter"></img>
                    </a>
                    <a href="#">
                      <img src={Discord} alt="discord"></img>
                    </a>
                    <a href="#">
                      <img src={Globe} alt="globe"></img>
                    </a>
                    <a href="#">
                      <img src={Link} alt="link"></img>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats Section */}
            <div className="md:col-span-9 col-span-12 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 roboto">
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">Floor Price</h3>
                  <p className="text-[#FF8A00] font-semibold mt-1">220</p>
                </div>
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">Total Volume</h3>
                  <p className="text-[#FF8A00] font-semibold mt-1">
                    6,256,460.45
                  </p>
                </div>
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">24hr Volume</h3>
                  <p className="text-[#FF8A00] font-semibold mt-1">810</p>
                </div>
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">Item</h3>
                  <p className="text-[#FF8A00] font-semibold mt-1">$450</p>
                </div>
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">Listed</h3>
                  <p className="text-[#FF8A00]  font-semibold mt-1">165</p>
                </div>
                <div className="bg-[#222222] p-5  shadow-md text-xs text-center">
                  <h3 className="text-white">Owners</h3>
                  <p className="text-[#FF8A00] font-semibold mt-1">3,240</p>
                </div>
              </div>
            </div>
          </div>
          <ActivityTable activities={activityData} />
          <ActivityChart />
        </div>
        <div className="md:col-span-7 col-span-12">
         <CollectionDetailTable />
        </div>
      </div>
    </div>
  );
};

export default CollectionDetail;
