import React, { useState } from 'react';
import ActivityRow from './ActivityRow';

const ActivityTable = ({ activities }) => {
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('default'); // State to manage sorting order

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    // You can implement additional filtering logic based on the selected filter value here.
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Function to compare prices for sorting
  const sortActivities = (activities) => {
    let sortedActivities = [...activities];

    if (sortOrder === 'highToLow') {
      sortedActivities.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)); // High to Low
    } else if (sortOrder === 'lowToHigh') {
      sortedActivities.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // Low to High
    }

    return sortedActivities;
  };

  // Apply sorting based on sortOrder
  const sortedActivities = sortActivities(activities);

  return (
    <div className="border_gradient  p-4 mx-auto text-white mt-8">
      <div className="flex justify-between items-center pb-2 relative z-10 roboto">
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="flex space-x-4">
         

          <select
            className="bg-transparent text-whi text-sm rounded px-2 py-1 activity_select"
            value={sortOrder}
            onChange={handleSortChange}
          >
            <option value="default">All</option>
            <option value="lowToHigh">Price: Low to High</option>
            <option value="highToLow">Price: High to Low</option>
          </select>
        </div>
      </div>

      <table className="mt-0 w-full text-sm relative z-10 border-separate border-spacing-y-2 roboto">
        <thead>
          <tr className="text-gray-400 collection">
            <th className="py-2 px-4 text-left">Time</th>
            <th className="py-2 px-4 text-left">Item</th>
            <th className="py-2 px-4 text-left">Price</th>
            <th className="py-2 px-4 text-left">Seller</th>
            <th className="py-2 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sortedActivities.map((activity, index) => (
            <ActivityRow key={index} activity={activity} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTable;
