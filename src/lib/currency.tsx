import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { publicApi } from './api';

type CurrencyContextValue = {
  showCurrencySign: boolean;
  currencySymbol: string;
  setShowCurrencySign: (value: boolean) => void;
  setCurrencySymbol: (value: string) => void;
  toggleCurrencySign: () => void;
};

const CURRENCY_SIGN_KEY = 'take_easy_loan_show_currency_sign';
const CURRENCY_SYMBOL_KEY = 'take_easy_loan_currency_symbol';

const detectShowCurrencySign = () => {
  try {
    const v = localStorage.getItem(CURRENCY_SIGN_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
  }
  return true;
};

const detectCurrencySymbol = () => {
  try {
    const v = localStorage.getItem(CURRENCY_SYMBOL_KEY);
    if (v && v.trim()) return v.trim();
  } catch {
  }
  return '$';
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [showCurrencySign, setShowCurrencySignState] = useState<boolean>(() => detectShowCurrencySign());
  const [currencySymbol, setCurrencySymbolState] = useState<string>(() => detectCurrencySymbol());

  const setShowCurrencySign = useCallback((value: boolean) => {
    setShowCurrencySignState(value);
    try {
      localStorage.setItem(CURRENCY_SIGN_KEY, value ? '1' : '0');
    } catch {
    }
  }, []);

  const setCurrencySymbol = useCallback((value: string) => {
    const next = String(value || '').trim().slice(0, 4) || '$';
    setCurrencySymbolState(next);
    try {
      localStorage.setItem(CURRENCY_SYMBOL_KEY, next);
    } catch {
    }
  }, []);

  const toggleCurrencySign = useCallback(() => {
    setShowCurrencySignState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CURRENCY_SIGN_KEY, next ? '1' : '0');
      } catch {
      }
      return next;
    });
  }, []);

  useEffect(() => {
    publicApi
      .getSettings()
      .then((res) => {
        const enabled = !!res.settings.currencySignEnabled;
        const symbol = String(res.settings.currencySymbol || '$').trim() || '$';
        setShowCurrencySignState(enabled);
        setCurrencySymbolState(symbol);
        try {
          localStorage.setItem(CURRENCY_SIGN_KEY, enabled ? '1' : '0');
          localStorage.setItem(CURRENCY_SYMBOL_KEY, symbol);
        } catch {
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({ showCurrencySign, currencySymbol, setShowCurrencySign, setCurrencySymbol, toggleCurrencySign }),
    [showCurrencySign, currencySymbol, setShowCurrencySign, setCurrencySymbol, toggleCurrencySign],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};

export const formatMoney = (amount: number, showCurrencySign: boolean, decimals: number = 2, currencySymbol: string = '$') => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return showCurrencySign ? `${currencySymbol}0` : '0';
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return showCurrencySign ? `${currencySymbol}${formatted}` : formatted;
};

export const formatCompactMoney = (amount: number, showCurrencySign: boolean, currencySymbol: string = '$') => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return showCurrencySign ? `${currencySymbol}0` : '0';
  try {
    const formatted = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(n);
    return showCurrencySign ? `${currencySymbol}${formatted}` : formatted;
  } catch {
    const formatted = Math.round(n).toLocaleString('en-US');
    return showCurrencySign ? `${currencySymbol}${formatted}` : formatted;
  }
};
