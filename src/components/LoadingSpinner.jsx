const LoadingSpinner = ({ SpinnerImage }) => {
  return (
    <div className='flex flex-col justify-center items-center h-screen'>
      <div className='relative w-20 h-20 bg-transparent rounded-full flex justify-center items-center'>
        {/* Outer Spinning Circle with Orange and White border */}
        <div className='absolute w-20 h-20 border-8 border-[#FF8A00] border-t-white border-t-8 rounded-full animate-spin'></div>
        {SpinnerImage ? (
          <img src={SpinnerImage} alt='Loading' className='w-8 h-8' />
        ) : (
          <></>
        )}
      </div>
      <span className='text-white text-base font-bold roboto leading-normal mt-4'>
        Loading...
      </span>
    </div>
  );
};

export default LoadingSpinner;
