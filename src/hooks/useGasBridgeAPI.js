import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { parseEther } from 'viem';

const GAS_API_BASE_URL = 'https://backend.gas.zip/v2';

export const isGasBridgeTerminalStatus = (status) => {
  return ['CONFIRMED', 'CANCELLED', 'ERROR'].includes(String(status || '').toUpperCase());
};

export const buildGasQuotePath = (fromChain, amountInWei, toChain) => {
  if (Array.isArray(toChain)) {
    throw new Error('Gas bridge quotes require exactly one destination chain');
  }
  return `/quotes/${fromChain}/${amountInWei}/${toChain}`;
};

// Endpoint 1: Get all supported chains
export const useGetChains = () => {
  return useQuery({
    queryKey: ['gasChains'],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/chains`);
      // The API response has the array under the "chains" key.
      return data?.chains || [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

// Endpoint 2: Get user's transaction history
export const useGetUserHistory = ({ address }) => {
  return useQuery({
    queryKey: ['gasUserHistory', address],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/user/${address}`);
      // The API response has the transaction array under the "user" key.
      return data?.user || [];
    },
    enabled: !!address,
    refetchOnWindowFocus: true,
  });
};

// Endpoint 3: Get status of a specific deposit
export const useGetDepositStatus = ({ hash }) => {
  return useQuery({
    queryKey: ['gasDepositStatus', hash],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/deposit/${hash}`);
      return data;
    },
    enabled: !!hash,
  });
};

// Endpoint 4: Get status of an outbound transaction
export const useGetOutboundStatus = ({ hash }) => {
  return useQuery({
    queryKey: ['gasOutboundStatus', hash],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/outbound/${hash}`);
      return data;
    },
    enabled: !!hash,
  });
};

// Endpoint 5: Search for a transaction by hash (for polling)
export const useSearchTransaction = ({ hash }) => {
  return useQuery({
    queryKey: ['gasSearchTransaction', hash],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/search/${hash}`);
      return data;
    },
    enabled: !!hash,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when Gas.zip reports a terminal outcome.
      if (isGasBridgeTerminalStatus(data?.deposit?.status)) {
        return false;
      }
      return 5000; // Poll every 5 seconds
    },
  });
};

// Endpoint 6: Get a simple quote
export const useGetQuote = ({ fromChain, amount, toChain }) => {
  const amountInWei = amount ? parseEther(amount) : '0';

  return useQuery({
    queryKey: ['gasQuote', fromChain, amountInWei.toString(), toChain],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}${buildGasQuotePath(fromChain, amountInWei, toChain)}`);
      return data;
    },
    enabled: !!fromChain && BigInt(amountInWei) > 0 && !!toChain,
  });
};

// Endpoint 7: Get a reverse quote
export const useGetQuoteReverse = ({ fromChain, amountOut, toChain }) => {
  const amountOutWei = amountOut ? parseEther(amountOut) : '0';

  return useQuery({
    queryKey: ['gasQuoteReverse', fromChain, amountOutWei.toString(), toChain],
    queryFn: async () => {
      const { data } = await axios.get(`${GAS_API_BASE_URL}/quoteReverse/${fromChain}/${amountOutWei}/${toChain}`);
      return data;
    },
    enabled: !!fromChain && BigInt(amountOutWei) > 0 && !!toChain,
  });
};

// Endpoint 8: Get calldata and quote for the transaction
export const useGetCalldataQuote = ({ fromChain, toChain, amount, toAddress, fromAddress }) => {
  const amountInWei = amount ? parseEther(amount) : '0';

  return useQuery({
    queryKey: ['gasCalldataQuote', fromChain, toChain, amountInWei.toString(), toAddress, fromAddress],
    queryFn: async () => {
      const path = buildGasQuotePath(fromChain, amountInWei, toChain);
      const { data } = await axios.get(`${GAS_API_BASE_URL}${path}?to=${toAddress}&from=${fromAddress}`);
      return data;
    },
    enabled: !!fromChain && !!toChain && BigInt(amountInWei) > 0 && !!toAddress && !!fromAddress,
    refetchOnWindowFocus: false,
  });
};
