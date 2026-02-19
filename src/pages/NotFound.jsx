import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const NotFound = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found | EMPX</title>
        <meta
          name='description'
          content='The page you are looking for does not exist.'
        />
      </Helmet>
      <div className='bg-black min-h-screen flex items-center justify-center py-12 px-4'>
        <div className='max-w-md w-full text-center'>
          <div className='mb-8'>
            <h1 className='text-9xl font-bold text-[#FF9900] font-orbitron mb-2'>
              404
            </h1>
            <div className='h-1 w-24 bg-[#FF9900] mx-auto mb-6'></div>
          </div>
          
          <h2 className='text-3xl font-bold text-white mb-4 font-orbitron'>
            Page Not Found
          </h2>
          
          <p className='text-gray-400 text-lg mb-8'>
            The page you are looking for does not exist or has been moved.
          </p>
          
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <a
              href='https://www.empx.io/dapp'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center px-8 py-3 border border-[#FF9900] rounded-xl text-[#040404] font-medium font-orbitron bg-[#FF9900] hover:border-[#FF9900] hover:bg-transparent hover:text-[#FF9900] transition-all duration-200'
            >
              Return to Home
            </a>
            <Link
              to='/swap'
              className='inline-flex items-center justify-center px-8 py-3 border border-[#EEC485] rounded-xl text-[#EEC485] font-medium font-orbitron hover:border-[#FF9900] hover:text-[#FF9900] transition-all duration-200'
            >
              Go to Swap
            </Link>
          </div>
          
          <div className='mt-12 text-gray-500 text-sm'>
            <p>Still having issues?</p>
            <p className='mt-2'>
              Contact us on{' '}
              <a
                href='https://t.me/EmpXEmpseal'
                target='_blank'
                rel='noopener noreferrer'
                className='text-[#FF9900] hover:underline'
              >
                Telegram
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
