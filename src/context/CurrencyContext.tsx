import React, { createContext, useContext, useState, useEffect } from 'react';

type CurrencyMode = 'FBET' | 'USD';

interface CurrencyContextType {
  currencyMode: CurrencyMode;
  toggleCurrencyMode: () => void;
  setCurrencyMode: (mode: CurrencyMode) => void;
  formatCurrency: (usdAmount: number, showSymbol?: boolean) => string;
  formatPot: (usdPotStr: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyMode, setCurrencyModeState] = useState<CurrencyMode>(() => {
    if (typeof window === 'undefined') return 'FBET';
    const saved = localStorage.getItem('facebet_currency_mode');
    return (saved === 'USD' || saved === 'FBET') ? saved : 'FBET';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('facebet_currency_mode', currencyMode);
    }
  }, [currencyMode]);

  const toggleCurrencyMode = () => {
    setCurrencyModeState(prev => prev === 'FBET' ? 'USD' : 'FBET');
  };

  const setCurrencyMode = (mode: CurrencyMode) => {
    setCurrencyModeState(mode);
  };

  const formatCurrency = (usdAmount: number, showSymbol = true) => {
    if (currencyMode === 'USD') {
      return showSymbol ? `$${usdAmount.toFixed(2)}` : `${usdAmount.toFixed(2)}`;
    } else {
      return showSymbol ? `${(usdAmount * 10).toFixed(2)} FBET` : `${(usdAmount * 10).toFixed(2)}`;
    }
  };

  const formatPot = (usdPotStr: string) => {
    const num = parseFloat(usdPotStr.replace(/,/g, '')) || 2446.95;
    if (currencyMode === 'USD') {
      return `$${usdPotStr}`;
    } else {
      return `${(num * 10).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} $FBET`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currencyMode, toggleCurrencyMode, setCurrencyMode, formatCurrency, formatPot }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
