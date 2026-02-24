import React from 'react';
import Logo from '../../assets/images/emp-large-logo.png';
import Logo1 from '../../assets/images/emp-main-logo.png';
import Fire from '../../assets/images/fire.png';
import Metallic from '../../assets/images/metallic.png';
import Bracket from '../../assets/images/bracket.png';
import Market from '../../assets/images/market.png';
import Git from '../../assets/images/github.png';
import GB from '../../assets/images/gitbook.svg';
import X from '../../assets/images/x.png';
import Master from '../../assets/images/master.png';
import telegram from '../../assets/images/telegram.png';
import GitBook from '../../assets/images/GitBook.png';
import Star from '../../assets/images/star.png';
import Cell from '../../assets/images/cell.gif';
import Dia from '../../assets/images/diamond.png';
import Stone from '../../assets/images/bridge.png';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Home = () => {
  return (
    <>
      {/* For SEO */}
      <Helmet>
        <title>
          EMPSEAL: Your Comprehensive Guide to Decentralized Finance & NFTs
        </title>
        <meta
          name='description'
          content='Discover EMPSEAL, your gateway to the decentralized world. Navigate through our Onchain DEX Aggregator, EMPX Market for NFTs, EMPX Bridge for cross-chain transactions, and dive into DeFi with our unique DAAS feature. Experience seamless navigation and exclusive insights on the Blockchain.'
        />
        <meta
          name='keywords'
          content='EMPSEAL,EMPX,DEX Aggregator,Limit Orders,On-chain,NFT Marketplace,Decentralized NFT Marketplace,Cross Chain Bridge,Dashboard,Mint,Stake,Yield,DAAS,Defi as a Service,Pulsechain,Blockchain ,Decentralized , censorship resistant Cryptocurrency'
        />
      </Helmet>
      {/*  */}
      <div className='bg-[#121214] py-3 relative h-screen'>
        <div className='container-class 2xl:max-w-[1536px] md:max-w-[1036px] mx-auto w-full px-4 flex justify-center xl:gap-9 gap-4 items-start 2xl:py-10 py-2 md:flex-nowrap flex-wrap'>
          <div className='section-class 2xl:max-w-[370px] xl:max-w-[370px] lg:max-w-[680px] md:max-w-[515px] w-full md:mt-0 mt-10'>
            <div className=' w-full py-10 px-3 flex flex-col items-center border-[#C71328] border h_grid rounded-3xl 2xl:h-[474px] lg:h-[428px] md:h-[570px] relative'>
              <div>
                <img
                  src={Logo}
                  alt='Logo'
                  className='mt-0 relative lg:top-0 lg:w-[235px] w-[150px] mb-4'
                />
                {/* <div className="text-center text-white text-xs font-light">
                MINT | STAKE
              </div> */}
              </div>
              <div>
                <div className='text-center text-white md:text-[25px] text-xl font-bold'>
                  Mint | Yield | Daas{' '}
                </div>
                <div className='text-center text-white text-lg font-light mt-3'>
                  An art and innovation intersect.{' '}
                </div>
              </div>
              {/* <div className="text-center text-white 2xl:text-[29.14px] text-lg font-bold wmo 2xl:h-[400px] md:h-[250px] h-[250px]">
              Innovating On-Chain Liquidity and Yield
            </div> */}
              <div className='h-[150px]'></div>
              <img
                src={Fire}
                alt='Fire'
                className='absolute left-0 right-0 2xl:bottom-[-100px] bottom-[-85px] mx-auto 2xl:w-[369px] w-[300px]'
              />
            </div>
            <div className='mt-14 w-full py-2 px-3 flex flex-col justify-between items-center border-[#895E8C] border h_grid_metallic rounded-3xl 2xl:h-[250px] xl:h-[386px] md:h-[570px] relative bg-[#1B1B1F]'>
              <div className='absolute 2xl:top-[-50px] top-[-50px]  xl:top-[-16px] 2xl:left-[-60px] left-[-10px]'>
                <img
                  src={Metallic}
                  alt='Metallic'
                  className='w-[150px] md:w-[250px] 2xl:w-[200px] xl:w-[154px]'
                />
              </div>
              <div className='text-right w-full pr-1'>
                <img
                  src={Logo}
                  alt='Logo'
                  className='mt-2 ms-auto lg:top-10 lg:w-[75px] w-[50px] mb-4'
                />
              </div>
              <div className='text-center z-50'>
                <div className='text-white md:text-[36px] text-2xl font-bold text-end'>
                  Yield Optimizer
                </div>
                <div className='text-white text-sm md:text-base font-light mt-3 text-end 2xl:w-[310px]'>
                  A vault auto-compounding liquidity positions. Burnt LP
                  optimization. Single click zap in and out of LPs.
                </div>
                <div className='text-white text-sm md:text-base font-light mt-4 text-end'>
                  Optimize any LP. Even Burnt.
                </div>
              </div>
              <div className='h-[50px]'></div>
            </div>
          </div>

          <div className='section-class 2xl:max-w-[370px] xl:max-w-[370px] lg:max-w-[680px] md:max-w-[515px] w-full md:mt-0 mt-10'>
            <div className='w-full rounded-3xl border border-[#90A321] h_grid1 px-4 py-3 relative'>
              <div className='w-[74px] h-[74px] rounded-full flex justify-center items-center bg-[#FFE500] absolute right-8 bottom-[-20px]'>
                <img src={Bracket} alt='Bracket' />
              </div>
              <div className='bg-[#dee870] rounded-[35px] px-5 py-3 blur-lg text-neutral-900 2xl:text-xl text-base font-medium lexend leading-[25px]'>
                Add <span className='font-bold'>EMP X</span> | SWAP to your
                products and earn <br className='2xl:block hidden' />{' '}
                transaction fees
              </div>
            </div>
            <Link to='/nft-marketplace' className='pointer-events-none'>
              <div className='w-full rounded-3xl border border-white black px-4 py-3 relative mt-10 flex flex-col justify-center items-center'>
                <div className='absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto px-5 py-5 h-full'>
                  <img src={Market} alt='Market' className='w-full h-full' />
                </div>
                <div className='text-center text-black text-2xl font-light relative z-50 mt-4 2xl:top-[70px] lg:top-[30px] top-[70px]'>
                  EMP X
                </div>
                <div className='market_text text-center text-black 2xl:text-[50px] lg:text-2xl text-[50px] font-bold relative z-50 mt-3 2xl:top-[70px] lg:top-[20px] top-[50px]'>
                  MARKET
                </div>
                <div className='text-center text-black 2xl:text-[20px] lg:text-xl text-[20px] font-light relative z-50 mt-3 2xl:top-[75px] lg:top-[30px] top-[40px]'>
                  Decentralised NFT <br /> Marketplace
                </div>
                <div className='mt260 opacity-0 text-black 2xl:text-[26px] md:text-base text-lg font-normal leading-[30px] roboto relative z-50 2xl:left-[-30px] lg:left-[-40px] md:left-[-70px] left-[-50px] 2xl:mt-[220px] top-[-20px] lg:mt-[50px] mt-[160px]'></div>
              </div>
            </Link>
            <div className='w-full rounded-2xl border border-white black px-4 py-5 relative mt-8 flex gap-8 justify-center items-center h_grid2'>
              <Link target='_blank' to='https://github.com/3mperorsSeal'>
                <img src={Git} alt='Git' />
              </Link>
              <Link target='_blank' to='https://x.com/3mp_X_'>
                <img src={X} alt='X' />
              </Link>
              <Link
                target='_blank'
                to='https://emperors-seal.gitbook.io/emperors-seal'
              >
                <img src={GB} className='h-8 flex' alt='Gitbook' />
              </Link>
              <Link target='_blank' to='https://t.me/EmpXEmpseal'>
                <img src={telegram} className='h-8 flex' alt='telegram' />
              </Link>
            </div>
            <div className='w-full rounded-2xl border border-white black px-4 py-6 relative mt-8 flex gap-8 justify-center items-center h_grid6'>
              <div className='text-center text-white text-base font-bold leading-[14px]'>
                MULTI SIGNATURE SAFE
              </div>
            </div>
          </div>
          <div className='section-class 2xl:max-w-[400px] xl:max-w-[400px] lg:max-w-[680px] md:max-w-[515px] w-full'>
            <Link to='/swap'>
              <div className='w-full rounded-3xl border border-white 2xl:pt-7 2xl:pb-6 lg:py-4 py-7 relative h_grid3'>
                <Link to='/swap'>
                  <img
                    src={Cell}
                    alt='Cell'
                    className='absolute z-20 2xl:w-[348px] xl:w-[260px] lg:w-[200px] md:w-[150px] w-[290px] 2xl:right-[-75px] lg:right-[-25px] md:right-[-15px] right-[-50px] 2xl:top-[-20px] md:top-[70px] top-[80px]'
                  />
                </Link>
                {/* <Link to="/swap"> */}
                <div className='bg-[#F1DDDD] Marquee'>
                  <div className='Marquee-content'>
                    <div className='Marquee-tag'>
                      <div className='px-3 py-4 flex justify-between gap-8 items-center'>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          EMP X
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          SWAP
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          EMP X
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          SWAP
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          EMP X
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          SWAP
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          EMP X
                          <img src={Star} alt='Star' />
                        </div>
                        <div className='text-center text-stone-950 text-xs font-medium uppercase leading-3 tracking-wider flex gap-5 items-center'>
                          SWAP
                          <img src={Star} alt='Star' />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* </Link> */}
                <div className='px-10 pt-4'>
                  {/* <Link to="/swap"> */}
                  {/* <span className="text-white text-2xl font-extrabold">
                    EMP X{" "}
                  </span>
                  <span className="text-white text-[21.90px] font-extrabold">
                    {" "}
                  </span>
                  <span className="text-white text-sm font-light">| </span>
                  <span className="text-white text-xs font-light">SWAP</span> */}

                  {/* </Link> */}
                </div>
                {/* <Link to="/swap"> */}

                <img
                  src={Logo1}
                  alt='Logo1'
                  className='w-[125px] h-16 object-contain mb-1'
                />
                <div className='text-white w-max  font-bold ms-5 py-1 mb-8'>
                  <span>On-chain DEX Aggregation</span>
                </div>
                <div className='text-white  bg-[#3a383b] w-max px-4 py-2 rounded-full font-bold ms-5'>
                  <span>Swap</span>
                  <span className='ps-4'>Trade</span>
                </div>
                {/* </Link> */}
              </div>
            </Link>
            <div className='w-full blur-lg rounded-3xl border border-[#916894] 2xl:py-8 lg:py-4 py-8 relative mt-4 h_grid4 px-9 pt-8 pb-8'>
              <img
                src={Dia}
                alt='Dia'
                className='absolute right-0 top-0 bottom-0 my-auto h-full'
              />
              <div className='relative z-50'>
                <div className='text-white 2xl:text-[21.90px] lg:text-base text-[21.90px] font-extrabold'>
                  DASHBOARD{' '}
                </div>
                <div className='text-white 2xl:text-sm lg:text-xs text-sm font-extralight mt-2'>
                  Protocol & Market Analysis
                </div>
                <div className='2xl:mt-4 lg:mt-1 mt-4 text-gray-300 text-xs font-normal'>
                  All-Time Volume
                </div>
                <div className='text-white 2xl:text-3xl lg:text-xl text-3xl font-bold'>
                  $ 445 m{' '}
                </div>
                <div className='2xl:mt-4 lg:mt-1 mt-4 text-gray-300 text-xs font-normal'>
                  Total Users
                </div>
                <div className='text-white 2xl:text-3xl lg:text-xl text-3xl font-bold'>
                  4144450
                </div>
              </div>
            </div>
            <Link to={'/via-bridge'}>
              <div className='w-full rounded-3xl border border-[#c6b2c9] 2xl:py-[67px] lg:py-4 py-8 relative mt-4 h_grid5 px-9 pt-8 pb-10 z-10'>
                <img
                  src={Stone}
                  alt='Dia'
                  className='absolute left-0 right-0 top-0 mx-auto  lg:object-cover md:object-contain h-full rounded-br-[25px] rounded-tl-[25px] w-full z-0'
                />
                <div className='relative z-50'>
                  <div className='text-center text-gray-300 text-xs font-normal'>
                    EMP X CROSS CHAIN
                  </div>
                  <div className='bridge text-center 2xl:text-[44px] lg:text-2xl text-[44px] font-bold mt-2'>
                    BRIDGE
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
