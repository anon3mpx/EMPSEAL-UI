import { useEffect, useRef, useState } from "react";
import DotSquare from "../../assets/images/dots.png";
import Logo from "../../assets/images/empx-new.svg";
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
      <div className="relative md:w-[70px] w-10 md:h-[51px] h-8">
        <button
          ref={buttonRef}
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center justify-center !bg-black transition-all md:w-[70px] w-10 md:h-[51px] h-8 md:rounded-2xl rounded-lg new_shad"
        >
          <img
            src={DotSquare}
            alt="menu"
            className="md:min-w-9 md:h-9 min-w-5 shrink-0 tilt"
          />
        </button>
      </div>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed inset-x-0 top-0 md:h-[370px] h-[340px] bg-black border-4 border-[#FFA600]
  md:rounded-2xl rounded-lg md:px-10 px-4 py-10 z-50 shadow-xl w-full
  transform transition-all duration-500 ease-in-out
  ${
    open
      ? "translate-y-0 opacity-100"
      : "-translate-y-full opacity-0 pointer-events-none"
  }`}
      >
        <div
          ref={menuRef}
          className="grid grid-cols-2 gap-10 text-[#FFA600] font-orbitron relative md:pt-10"
        >
          <div
            onClick={() => setOpen(false)}
            className="cursor-pointer absolute right-5 md:top-5 top-0 text-white text-2xl font-black hover:text-[#FFA600] transition tilt"
          >
            ✕
          </div>
          <div>
            <h3 className="text-white md:text-4xl text-2xl font-bold mb-3">
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
                className="cursor-pointer hover:translate-x-1 transition md:text-[30px] text-lg my-4 font-extrabold"
              >
                {item}
              </p>
            ))}
          </div>
          <div>
            <h3 className="text-white md:text-4xl text-2xl font-bold mb-3">
              Help
            </h3>
            {["Documentation", "Twitter/X", "Telegram", "Integration"].map(
              (item) => (
                <p
                  key={item}
                  onClick={() => {
                    if (item === "Documentation") window.open("https://docs.empx.io", "_blank");
                    else if (item === "Integration") window.open("https://www.empx.io/dapp", "_blank");
                    else if (item === "Twitter")
                      window.open("https://x.com/EmpXio", "_blank");
                    else if (item === "Telegram")
                      window.open("https://t.me/EmpXEmpseal", "_blank");

                    setOpen(false);
                  }}
                  className="cursor-pointer hover:translate-x-1 transition md:text-[30px] text-lg my-4 font-extrabold"
                >
                  {item}
                </p>
              ),
            )}
          </div>
          <div className="absolute md:bottom-1 bottom-[-70px] right-3 text-white flex gap-3 flex-col md:text-[30px] text-lg my-4 font-extrabold text-right">
             <a href="https://www.empx.io/dapp">
             HOME
            </a>
            <a href="https://www.empx.io/dapp">
              <img
                src={Logo}
                alt="Logo"
                className="2xl:w-[145px] md:w-[130px] w-[100px]"
              />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default DotsMenu;
