import { useEffect, useRef, useState } from "react";
import DotSquare from "../../assets/images/dots.png";
import Logo from "../../assets/images/empx-new.svg";
import Bg from "../../assets/images/menu-bg.png";
import { useNavigate } from "react-router-dom";

const DotsMenu = ({ onTabChange }) => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center justify-center !bg-black transition-all md:w-[70px] w-10 md:h-[51px] h-8 md:rounded-2xl rounded-lg new_shad"
        >
          <img
            src={DotSquare}
            alt="menu"
            className="md:min-w-6 md:h-6 min-w-5 shrink-0 tilt"
          />
        </button>
      </div>
      <div
        className={`fixed inset-0 bg-[#2a1708]/50 backdrop-blur-[1px] z-40 transition-opacity duration-500 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed inset-x-0 top-0 2xl:h-[280px] h280 md:h-[280px] h-[340px] bg-black border-4 border-[#FFA600]
  md:rounded-2xl rounded-lg 2xl:px-10 md:px-7 px-4 py-10 z-50 shadow-xl w-full
  transform transition-all duration-500 ease-in-out
  ${
    open
      ? "translate-y-0 opacity-100"
      : "-translate-y-full opacity-0 pointer-events-none"
  }`}
      >
        <div
          ref={menuRef}
          className="grid md:grid-cols-5 grid-cols-2 md:gap-10 gap-5 items-end text-[#FFA600] font-orbitron relative 2xl:pt-2 pt10"
        >
          <div
            onClick={() => setOpen(false)}
            className="cursor-pointer absolute md:right-5 right-3 2xl:top-0 top-0 text-white text-2xl font-black hover:text-[#FFA600] transition tilt"
          >
            ✕
          </div>
          <div>
            <h3 className="text-white 2xl:text-2xl text-2xl text2xl font-bold mb-3">
              Products
            </h3>
            {["Swap", "Limit Orders", "Bridge", "Gas"].map((item) => (
              <p
                key={item}
                onClick={() => {
                  if (item === "Limit Orders") {
                    navigate("/swap?tab=limit");
                  } else if (item === "Swap") {
                    navigate("/swap");
                  } else if (item === "Bridge") {
                    navigate("/via-bridge");
                  } else if (item === "Gas") {
                    navigate("/gas");
                  }

                  setOpen(false);
                }}
                className="cursor-pointer hover:translate-x-1 transition 2xl:text-2xl text-lg 2xl:my-1 text2xl my4 font-extrabold"
              >
                {item}
              </p>
            ))}
          </div>
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white 2xl:text-2xl text-2xl text2xl font-bold mb-3">
              Help
            </h3>
            {["Documentation", "Twitter/X", "Telegram", "Integration"].map(
              (item) => (
                <p
                  key={item}
                  onClick={() => {
                    if (item === "Documentation") window.open("https://docs.empx.io", "_blank");
                    else if (item === "Integration") window.open("https://docs.empx.io/docs/developers/widget-integration", "_blank");
                    else if (item === "Twitter/X")
                      window.open("https://x.com/EmpXio", "_blank");
                    else if (item === "Telegram")
                      window.open("https://t.me/EmpXEmpseal", "_blank");

                    setOpen(false);
                  }}
                  className="cursor-pointer hover:translate-x-1 transition 2xl:text-2xl text-lg 2xl:my-1 text2xl my4 font-extrabold"
                >
                  {item}
                </p>
              ),
            )}
          </div>
          {/* <div className="hidden"></div> */}
          <div className="col-span-2 md:col-span-2 relative 2xl:bottom-0 md:bottom-[-20px] bottom-0 md:right-3 text-white flex gap-3 flex-col 2xl:text-2xl text-lg 2xl:my-1 text2xl my4 font-extrabold text-right">
            <a href="https://www.empx.io/dapp" className="relative z-10">
              HOME
            </a>
            <a href="https://www.empx.io/dapp" className="relative w-full z-10 flex items-center justify-end h-[46px] px-2">
              <img
                src={Bg}
                alt="Bg"
                className="absolute top-0 right-0 w-full h-full"
              />
              <img
                src={Logo}
                alt="Logo"
                className="2xl:w-[140px] md:w-[100px] w-[100px] relative z-10"
              />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default DotsMenu;
