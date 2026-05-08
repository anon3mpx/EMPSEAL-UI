import React from "react";
import T1 from "../../assets/images/t1.svg";
import R1 from "../../assets/images/ri.svg";

const Table = () => {
  return (
    <>
      <div className="w-full border-[2px] border-[#FF8A00]  py-5 bg-black lg:h-[370px] h-full">
        <div className="px-4 mt-2 flex justify-center">
          <div className="w-[160px] h-[29px] border border-[#FF8A00] rounded-[8px] flex">
            <div className="w-[56px] h-[27px] roboto rounded-l-md bg-[#FF8A00] text-black text-[8.94px] flex justify-center items-center">
              Active
            </div>
            {/* <div className="w-[80px] h-[27px] roboto bg-black text-[#FF8A00] border-r border-[#FF8A00] text-[8.94px] flex justify-center items-center">
              Pending
            </div> */}
            <div className="w-[105px] h-[27px] roboto rounded-r-md bg-black text-[#FF8A00] border-r border-[#FF8A00] text-[8.94px] flex justify-center items-center">
              Limit Orders
            </div>
          </div>
        </div>
        {/* <div className="md:pr-3 pr-2"> */}
        <div className="mt-6 px-4 overflow-x-auto whitespace-nowrap w-full ">
          <div className="flex justify-between items-center">
            <p className="w-[142px] text-white text-center md:text-base text-xs font-bold roboto leading-normal">
              Paid
            </p>
            <p className="w-[142px] text-white text-center md:text-base text-xs font-bold roboto leading-normal">
              Received
            </p>
            <p className="w-[195px] text-white text-center md:text-base text-xs font-bold roboto leading-normal">
              Rate
            </p>
            <p className="w-[180px] text-white text-center md:text-base text-xs font-bold roboto leading-normal">
              Status
            </p>
            <p className="w-[290px] text-white text-center md:text-base text-xs font-bold roboto leading-normal">
              Tx
            </p>
          </div>
          <div className="tablescrool h-[250px] overflow-x-auto whitespace-nowrap w-full">
            <table className="overflow-x-auto whitespace-nowrap w-full">
              {/* <thead>
                <tr>
                  <th>
                    <p className="text-white text-center md:text-base text-xs font-bold roboto leading-normal">
                      Paid
                    </p>
                  </th>
                  <th>
                    <p className="text-white text-center md:text-base text-xs font-bold roboto leading-normal">
                      Received
                    </p>
                  </th>
                  <th>
                    <p className="text-white text-center md:text-base text-xs font-bold roboto leading-normal">
                      Rate
                    </p>
                  </th>
                  <th>
                    <p className="text-white text-center md:text-base text-xs font-bold roboto leading-normal">
                      Status
                    </p>
                  </th>
                  <th>
                    <p className="text-white text-center md:text-base text-xs font-bold roboto leading-normal">
                      Tx
                    </p>
                  </th>
                </tr>
              </thead> */}
              <tbody>
                <tr>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          WBTC
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB/MTV
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0.22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-[#53F3C3] md:text-[15px] text-[11px] font-normal roboto">
                          Success
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          Tx
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0XUSF22145
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          WBTC
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB/MTV
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0.22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-[#DDF353] md:text-[15px] text-[11px] font-normal roboto">
                          Pending
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          Tx
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0XUSF22145
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          WBTC
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB/MTV
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0.22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-[#F35353] md:text-[15px] text-[11px] font-normal roboto">
                          Failed
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          Tx
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0XUSF22145
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          WBTC
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB/MTV
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0.22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-[#53F3C3] md:text-[15px] text-[11px] font-normal roboto">
                          Success
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          Tx
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0XUSF22145
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          WBTC
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          BNB/MTV
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0.22145
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-[#53F3C3] md:text-[15px] text-[11px] font-normal roboto">
                          Success
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pt-5">
                    <div className="flex gap-2 items-center justify-center">
                      <div>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-bold roboto leading-[9.66px]">
                          Tx
                        </p>
                        <p className="text-white md:text-[15px] text-[11px] text-center font-normal roboto mt-1">
                          0XUSF22145
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* </div> */}
      </div>
    </>
  );
};

export default Table;
