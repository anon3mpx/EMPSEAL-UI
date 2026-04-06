import React from 'react';
import Wallet from '../swap/Wallet';
import Logo from '../../assets/images/logo_nft.png';
import Fire from '../../assets/images/fire.png';
import Bracket from '../../assets/images/bracket.png';
import Market from '../../assets/images/market.png';
import Git from '../../assets/images/github.png';
import Tx from '../../assets/images/tele.png';
import X from '../../assets/images/x.png';
import Master from '../../assets/images/master.png';
import Star from '../../assets/images/star.png';
// import Cell from '../../assets/images/cell.gif';
import Dia from '../../assets/images/diamond.png';
import Stone from '../../assets/images/bridge.png';
import User from '../../assets/images/user-nft.svg';
import { Link } from 'react-router-dom';
import UserCard from '../../components/UserCard';
import Graph from '../swap/Graph';
import CollectionTable from '../../components/CollectionTable';
import MarketPlaceWallet from '../../components/MarketPlaceWallet';
const NFTMarketplace = () => {
  const users = [
    { name: 'Sam Lee', username: 'samlee', imgSrc: User },
    { name: 'Jane Doe', username: 'janedoe', imgSrc: User },
    { name: 'John Smith', username: 'johnsmith', imgSrc: User },
    { name: 'John Smith', username: 'johnsmith', imgSrc: User },
    { name: 'John Smith', username: 'johnsmith', imgSrc: User },
    { name: 'John Smith', username: 'johnsmith', imgSrc: User },
    { name: 'John Smith', username: 'johnsmith', imgSrc: User },
    // Add more users as needed
  ];
  return (
    <>
      <div className="bg-[#121214] py-3 relative">
        <div className="md:max-w-[1536px] mx-auto w-full px-4 flex justify-center xl:gap-9 gap-4 items-start 2xl:pb-10 py-2 md:flex-nowrap flex-wrap">
          <div className="xl:max-w-[450px] lg:max-w-[300px] md:max-w-[220px] w-full text-white rounded-lg">
            <div className="flex flex-row items-center border_gradient p-4  mb-4">
              <div className="pe-5">
                <img src={Logo} alt="Collection Logo" className="w-48 h-48" />
              </div>

              <div>
                <h2 className="text-xl font-bold roboto underline font-semibold">
                  Collection Name
                </h2>
                <p className="text-gray-400 roboto">Creator Name</p>
                <div className="mt-8 space-y-1 text-sm">
                  <div className="grid grid-cols-2 gap-2 roboto">
                    <h6 className="text-xs">Floor</h6>
                    <h6 className="text-[#f39c12] text-xs">: 5M PLS</h6>
                  </div>
                  <div className="grid grid-cols-2 gap-2 roboto">
                    <h6 className="text-xs">24H Vol</h6>
                    <h6 className="text-[#f39c12] text-xs">: 5M PLS</h6>
                  </div>
                  <div className="grid grid-cols-2 gap-2 roboto">
                    <h6 className="text-xs">High Offer</h6>
                    <h6 className="text-[#f39c12] text-xs">: 1000 PLS</h6>
                  </div>
                  <div className="grid grid-cols-2 gap-2 roboto">
                    <h6>Total Items</h6>
                    <h6 className="text-[#f39c12] text-xs">: 10K</h6>
                  </div>
                  <div className="grid grid-cols-2 gap-2 roboto">
                    <h6 className="text-xs">Creator Fee</h6>
                    <h6 className="text-[#f39c12] text-xs">: 10%</h6>
                  </div>
                </div>
              </div>
            </div>
            <div className=" border_gradient   mb-4 mt-8">
              <div className="top_seller p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base roboto">Top Sellers</h2>
                  <h2 className="text-[#FF9900] roboto">See All</h2>
                </div>
              </div>
              <ul className="px-4 pt-8 pb-2 roboto relative z-10">
                {users.map((user, index) => (
                  <UserCard
                    key={index}
                    name={user.name}
                    username={user.username}
                    imgSrc={user.imgSrc}
                  />
                ))}
              </ul>
            </div>
          </div>

          <div className="md:max-w-[860px] w-full">
            <CollectionTable />
            <div className="md:block hidden mt-8">
              <div className="grid grid-cols-2 gap-6">
                <div><MarketPlaceWallet /></div>
             <div><Graph /></div>

              </div>
              
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NFTMarketplace;
