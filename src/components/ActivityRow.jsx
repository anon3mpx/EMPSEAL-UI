import React from 'react';
import ActivityImage from '../assets/images/activity_img.svg';

const ActivityRow = ({ activity }) => {
  return (
    <tr className="hover:bg-gray-800 border border-gray-700 transition collection_row roboto">
      <td className="py-2 text-white px-4">{activity.time}</td>
      <td className="py-2 px-4">
        <img src={ActivityImage} alt="Activity" className="h-8 w-8" />
      </td>
      <td className="py-2 px-4">{activity.price} Ξ</td>
      <td className="py-2 px-4 text-[#FF8A00]">{activity.seller}</td>
      <td className="py-2 text-right px-4">
        <button className="bg-transparent px-3 py-1 rounded hover:bg-gray-600 border border-white">
          BUY
        </button>
      </td>
    </tr>
  );
};

export default ActivityRow;
