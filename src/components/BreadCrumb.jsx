import React from "react";
import { Link, useLocation } from "react-router-dom";
import Arrow from "../assets/images/arrow-2.svg";
import Logo from "../assets/images/swap-emp.png";
import X from "../assets/images/x.svg";
import L from "../assets/images/linked.svg";
import Y from "../assets/images/youtube.svg";
const BreadCrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  if (location.pathname === "/") {
    return null;
  }
  // Helper function to format the breadcrumb text
  const formatBreadcrumb = (text) => text.replace(/-/g, "_");

  return (
    <nav aria-label="breadcrumb ">
      <ol className="breadcrumb flex container mx-auto lg:px-24 pt-4 lg:justify-start justify-between lg:mb-0 mb-10">
        {/* Home link always appears */}
        {/* <li className="breadcrumb-item text-[#FF9900] roboto">
          <Link className="me-2" to="/">
            Home
          </Link>
          {pathnames.length > 0 && (
            <img
              src={Arrow}
              alt="separator"
              className="mx-2 inline-block"
              style={{ width: '21px', height: '21px' }}
            />
          )}
            
        </li> */}
        <img
          src={Logo}
          alt="Logo"
          className="mx-aut 2xl:w-[193px] md:w-[150px] w-[132px]"
        />
        <div className="md:hidden flex lg:justify-end justify-end gap-4 items-center md:max-w-[1400px] w-full mx-auto px-4">
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-9 h-9 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={X} alt="x" className="2xl:w-6 2xl:h-6 w-3 h-3" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-9 h-9 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={L} alt="x" className="2xl:w-6 2xl:h-6 w-3 h-3" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-9 h-9 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={Y} alt="x" className="2xl:w-6 2xl:h-6 w-3 h-3" />
          </button>
        </div>
        {/* Generate breadcrumb links for each path segment */}
        {/* {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          return isLast ? (
            <li
              className="breadcrumb-item active text-white ms-2 capitalize roboto"
              key={to}
              aria-current="page"
            >
              {formatBreadcrumb(value)}
            </li>
          ) : (
            <li className="breadcrumb-item text-[#FF9900] ps-2 pe-1" key={to}>
              <Link className="pe-2" to={to}>
                {formatBreadcrumb(value)}
              </Link>
              <span> &gt; </span>
            </li>
          );
        })} */}
      </ol>
    </nav>
  );
};

export default BreadCrumb;
