import React, { useState } from 'react';

const UserCard = ({ name, username, imgSrc }) => {
  // State to manage the button text
  const [isFollowing, setIsFollowing] = useState(false);

  // Function to toggle following state
  const handleFollowClick = () => {
    setIsFollowing((prevState) => !prevState);
  };

  return (
    <li className="flex flex-row items-center justify-between mb-5">
      <div className="flex items-center">
        <div className="me-2">
          <img className="w-10 h-10" src={imgSrc} alt="user" />
        </div>
        <div>
          <h3 className="text-base text-white">{name}</h3>
          <h3 className="text-xs text-[#6C6C6C]">@{username}</h3>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={handleFollowClick}
          className={`focus:outline-none font-medium  text-sm px-4 w-32 py-2.5 ${
            isFollowing
              ? 'text-[#f39c12] bg-transparent border border-[#f39c12]'
              : 'text-black bg-[#FF8A00] hover:bg-[#FF8A00] border border-[#f39c12]'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </li>
  );
};

export default UserCard;
