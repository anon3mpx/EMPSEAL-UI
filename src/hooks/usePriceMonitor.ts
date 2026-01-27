import { useState, useEffect, useCallback } from 'react';
import { useChainConfig } from './useChainConfig';

export interface PriceMonitorProps {
  initialQuote: string | number | null;
  currentQuote: string | number | null;
  enabled: boolean;
  onPriceChange: (newQuote: string, percentChange: number) => void;
  threshold?: number; // Optional threshold in percent (e.g., 0.5 for 0.5%)
}

export const usePriceMonitor = ({
  initialQuote,
  currentQuote,
  enabled,
  onPriceChange,
  threshold = 0.5, // Default threshold of 0.5%
}: PriceMonitorProps) => {
  const [lastQuote, setLastQuote] = useState<string | null>(
    initialQuote ? String(initialQuote) : null
  );
  const { blockTime } = useChainConfig();

  const checkPriceChange = useCallback(() => {
    if (!enabled || !initialQuote || !currentQuote) return;

    const initial = parseFloat(String(initialQuote));
    const current = parseFloat(String(currentQuote));

    if (isNaN(initial) || isNaN(current) || initial === 0) return;

    // Calculate percentage change
    const percentChange = ((current - initial) / initial) * 100;

    // console.log(
    //   `[PriceMonitor] Checking... Initial: ${initial}, Current: ${current}, Change: ${percentChange.toFixed(4)}%, Threshold: ${threshold}%`
    // );

    // If price has changed by more than the threshold
    const currentQuoteStr = String(currentQuote);
    if (Math.abs(percentChange) > threshold && currentQuoteStr !== lastQuote) {
      // console.log(`[PriceMonitor] Price change detected! Triggering alert.`);
      setLastQuote(currentQuoteStr);
      onPriceChange(currentQuoteStr, percentChange);
    }
  }, [initialQuote, currentQuote, enabled, lastQuote, onPriceChange, threshold]);

  useEffect(() => {
    if (!enabled || !blockTime) return;

    // Set interval based on block time (milliseconds)
    const interval = setInterval(checkPriceChange, blockTime * 1000);

    return () => clearInterval(interval);
  }, [enabled, blockTime, checkPriceChange]);

  // Reset lastQuote when initialQuote changes (e.g., when modal opens)
  useEffect(() => {
    if (initialQuote) {
      setLastQuote(String(initialQuote));
    }
  }, [initialQuote]);

  return {
    hasChanged: currentQuote !== initialQuote,
    percentChange: initialQuote && currentQuote
      ? ((parseFloat(String(currentQuote)) - parseFloat(String(initialQuote))) / parseFloat(String(initialQuote))) * 100
      : 0,
  };
};
