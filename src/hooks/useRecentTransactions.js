import { useState, useEffect } from 'react';

const STORAGE_KEY = 'recentTransactions';
const MAX_TRANSACTIONS = 10;

export const useRecentTransactions = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    try {
      const storedTxs = localStorage.getItem(STORAGE_KEY);
      if (storedTxs) {
        setTransactions(JSON.parse(storedTxs));
      }
    } catch (error) {
      console.error("Error reading from localStorage", error);
    }
  }, []);

  const addTransaction = (newTx) => {
    try {
      const newTransactions = [newTx, ...transactions].slice(0, MAX_TRANSACTIONS);
      setTransactions(newTransactions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  };

  const clearTransactions = () => {
    try {
      setTransactions([]);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing localStorage", error);
    }
  };

  return { transactions, addTransaction, clearTransactions };
};
