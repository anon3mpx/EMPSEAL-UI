import React from 'react';
import { Link } from 'react-router-dom';
import { HelmetProvider } from "react-helmet-async";

const NotFound = () => {
  return (
    <>
      <HelmetProvider>
        <title>Page Not Found | EMPX</title>
        <meta
          name='description'
          content='The page you are looking for does not exist.'
        />
      </HelmetProvider>
      <div className='bg-black min-h-screen flex items-center justify-center py-12 px-4'>
        <div className='max-w-md w-full text-center'>
          <div className='mb-8'>
            <h1 className='text-9xl font-bold text-[#FF8A00]  mb-2'>
              404
            </h1>
            <div className='h-1 w-24 bg-[#FF8A00] mx-auto font-bold mb-6'></div>
          </div>
          
          <h2 className='text-3xl font-bold text-white mb-4 '>
            Page Not Found
          </h2>
          
          <p className='text-gray-400 text-lg mb-8'>
            The page you are looking for does not exist or has been moved.
          </p>
          
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <a
              href='/swap'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center px-8 py-3 border border-[#FF8A00]  text-[#040404] font-medium  bg-[#FF8A00] hover:border-[#FF8A00] hover:bg-transparent hover:text-[#FF8A00] transition-all duration-200'
            >
              Return to Home
            </a>
            <Link
              to='/swap'
              className='inline-flex items-center justify-center px-8 py-3 border border-[#EEC485]  text-[#EEC485] font-medium  hover:border-[#FF8A00] hover:text-[#FF8A00] transition-all duration-200'
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
                className='text-[#FF8A00] hover:underline'
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
