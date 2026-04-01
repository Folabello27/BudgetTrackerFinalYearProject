import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { CurrencyCode, currencyService, CURRENCIES } from '@/lib/currency';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  rates: Record<string, number> | null;
  isLoading: boolean;
  convert: (amount: number, from: CurrencyCode, to: CurrencyCode) => Promise<number | null>;
  format: (amount: number, curr?: CurrencyCode) => string;
  currencies: typeof CURRENCIES;
  getRate: (to: CurrencyCode) => number | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user preference on mount
  useEffect(() => {
    currencyService.getUserCurrency().then(setCurrencyState);
  }, []);

  // Fetch rates when currency changes
  useEffect(() => {
    setIsLoading(true);
    currencyService.getExchangeRates(currency)
      .then(setRates)
      .finally(() => setIsLoading(false));
  }, [currency]);

  const setCurrency = useCallback(async (newCurrency: CurrencyCode) => {
    await currencyService.setUserCurrency(newCurrency);
    setCurrencyState(newCurrency);
  }, []);

  const convert = useCallback(async (amount: number, from: CurrencyCode, to: CurrencyCode) => {
    return currencyService.convert(amount, from, to);
  }, []);

  const format = useCallback((amount: number, curr?: CurrencyCode) => {
    return currencyService.formatAmount(amount, curr || currency);
  }, [currency]);

  const getRate = useCallback((to: CurrencyCode) => {
    return rates?.[to] || null;
  }, [rates]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        isLoading,
        convert,
        format,
        currencies: CURRENCIES,
        getRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
