import { useState, useEffect, useRef } from "react";
import ChainsList from "../chainsList.json";

const TokensChains = ({ onClose, onSelect, onChainSelect }) => {
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [fetchedTokens, setFetchedTokens] = useState([]);
  const modalRef = useRef(null);

  const ChainList = ChainsList.filter((chain) =>
    chain.name.toLowerCase().includes(chainSearchQuery.toLowerCase())
  );

  const fetchedToken = fetchedTokens.filter(
    (token) =>
      token.name.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(tokenSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleChainClick = async (chain) => {
    setSelectedChain(chain);
  };

  useEffect(() => {
    if (!selectedChain) return;

    async function getTokens() {
      try {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/tokens/?network=${selectedChain}&pageSize=1000`
        );
        const data = await response.json();
        if (data?.results) {
          setFetchedTokens(data.results);
        }
      } catch (error) {
        console.error("Error fetching tokens:");
      }
    }

    getTokens();
  }, [selectedChain]);

  return (
    <div className="fixed inset-0 flex items-center justify-center ">
      {/* <div className="relative text-white rounded-2xl flex flex-col items-center gap-4"> */}
      {/* <div className="w-full flex justify-center my-auto items-center"> */}
      <div ref={modalRef} className="relative py-10 md:px-12 clip-bg bg-black/70 z-50 px-4 md:max-w-[530px] w-full mx-auto rounded-2xl">
        <svg
          onClick={onClose}
          className="absolute cursor-pointer right-8 top-9 tilt"
          width={12}
          height={12}
          viewBox="0 0 18 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
            stroke="#ffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex gap-4 items-center justify-start md:justify-center cursor-pointer my-2">
          <p className="md:text-2xl capitalize text-lg font-bold text-white roboto text-center tracking-widest">
            Select Chain and Token{" "}
          </p>
        </div>
        <div className="grid grid-cols-[48%_48%] justify-between mt-4">
          <div className="bg-[#191919] rounded-xl">
            <div className=" w-full flex items-center p-3 ">
              <button onClick={() => setChainSearchQuery(chainSearchQuery)}>
                <svg
                  className="flex flex-shrink-0 cursor-pointer"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.8632 19.0535L13.3482 13.5375C10.8947 15.2818 7.51414 14.8552 5.57102 12.556C3.62792 10.257 3.7706 6.85254 5.89925 4.72413C8.02735 2.59479 11.4322 2.45149 13.7317 4.3945C16.0311 6.3375 16.458 9.71849 14.7137 12.1721L20.2287 17.688L18.8642 19.0526L18.8632 19.0535ZM9.99282 4.95765C8.16287 4.95724 6.58411 6.24178 6.21237 8.03356C5.84064 9.82534 6.7781 11.6319 8.45718 12.3596C10.1363 13.0871 12.0955 12.5358 13.1486 11.0392C14.2018 9.54268 14.0594 7.51235 12.8078 6.17743L13.3916 6.75644L12.7335 6.10023L12.7219 6.08865C11.9999 5.36217 11.0171 4.95489 9.99282 4.95765Z"
                    fill="grey"
                  />
                </svg>
              </button>
              <input
                type="text"
                placeholder="Search Chain"
                className="bg-transparent text-[#575757] w-full px-2 text-sm font-normal roboto "
                value={chainSearchQuery}
                onChange={(e) => setChainSearchQuery(e.target.value)}
              />
            </div>
            <hr class="h-px  bg-gray-200 border-[#3b3c4e] d" />
            <div className="flex flex-col space-y-2  max-h-[400px] overflow-y-auto bg-[#191919] px-3 pt-4">
              {ChainList.map((chain, index) => (
                <div
                  key={index}
                  className={`flex flex-row items-center cursor-pointer roboto p-2 rounded-2xl ${
                    selectedChain === chain.name
                      ? "bg-[#3D3D3D]"
                      : "hover:bg-[#3D3D3D]"
                  }`}
                  onClick={() => {
                    handleChainClick(chain.name);
                    onChainSelect(chain);
                    setSelectedChain(chain.name);
                  }}
                >
                  <img
                    src={chain.image}
                    alt={chain.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) =>
                      (e.target.src = "path/to/fallback/image.png")
                    }
                  />
                  <p className="text-white text-xs mt-0 ms-2">{chain.name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#191919] rounded-xl">
            <div className=" w-full flex  items-center p-3 ">
              <button onClick={() => setTokenSearchQuery(tokenSearchQuery)}>
                <svg
                  className="flex flex-shrink-0 cursor-pointer"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.8632 19.0535L13.3482 13.5375C10.8947 15.2818 7.51414 14.8552 5.57102 12.556C3.62792 10.257 3.7706 6.85254 5.89925 4.72413C8.02735 2.59479 11.4322 2.45149 13.7317 4.3945C16.0311 6.3375 16.458 9.71849 14.7137 12.1721L20.2287 17.688L18.8642 19.0526L18.8632 19.0535ZM9.99282 4.95765C8.16287 4.95724 6.58411 6.24178 6.21237 8.03356C5.84064 9.82534 6.7781 11.6319 8.45718 12.3596C10.1363 13.0871 12.0955 12.5358 13.1486 11.0392C14.2018 9.54268 14.0594 7.51235 12.8078 6.17743L13.3916 6.75644L12.7335 6.10023L12.7219 6.08865C11.9999 5.36217 11.0171 4.95489 9.99282 4.95765Z"
                    fill="grey"
                  />
                </svg>
              </button>
              <input
                type="text"
                placeholder="Search Token"
                className="bg-transparent text-[#575757]  w-full px-2 text-sm font-normal roboto "
                value={tokenSearchQuery}
                onChange={(e) => setTokenSearchQuery(e.target.value)}
              />
            </div>
            <hr class="h-px  bg-gray-200 border-[#3b3c4e] d" />
            <div className="flex flex-col space-y-2  max-h-[400px] overflow-y-auto bg-[#191919] px-3 pt-4">
              {fetchedToken?.map((token, index) => (
                <div
                  key={index}
                  className={`flex flex-row items-center cursor-pointer roboto p-2 rounded-2xl ${
                    selectedToken === token.name
                      ? "bg-[#3D3D3D]"
                      : "hover:bg-[#3D3D3D]"
                  }`}
                  onClick={() => {
                    setTimeout(() => {
                      onSelect(token);
                    }, 100);
                    setSelectedToken(token);
                    onClose();
                  }}
                >
                  <img
                    src={token.image}
                    alt={token.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) =>
                      (e.target.src = "path/to/fallback/image.png")
                    }
                  />
                  <p className="text-white text-xs mt-0 ms-2">{token.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* </div> */}
      {/* /</div> */}
    </div>
  );
};

export default TokensChains;
