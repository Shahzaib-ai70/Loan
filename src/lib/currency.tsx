import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type CurrencyContextValue = {
  showCurrencySign: boolean;
  setShowCurrencySign: (value: boolean) => void;
  toggleCurrencySign: () => void;
};

const CURRENCY_SIGN_KEY = 'take_easy_loan_show_currency_sign';

const detectShowCurrencySign = () => {
  try {
    const v = localStorage.getItem(CURRENCY_SIGN_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
  }
  return true;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [showCurrencySign, setShowCurrencySignState] = useState<boolean>(() => detectShowCurrencySign());

  const setShowCurrencySign = useCallback((value: boolean) => {
    setShowCurrencySignState(value);
    try {
      localStorage.setItem(CURRENCY_SIGN_KEY, value ? '1' : '0');
    } catch {
    }
  }, []);

  const toggleCurrencySign = useCallback(() => {
    setShowCurrencySign((v) => !v);
  }, [setShowCurrencySign]);

  const value = useMemo<CurrencyContextValue>(
    () => ({ showCurrencySign, setShowCurrencySign, toggleCurrencySign }),
    [showCurrencySign, setShowCurrencySign, toggleCurrencySign],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};

export const formatMoney = (amount: number, showCurrencySign: boolean, decimals: number = 2) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return showCurrencySign ? '$0' : '0';
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return showCurrencySign ? `$${formatted}` : formatted;
};

export const formatCompactMoney = (amount: number, showCurrencySign: boolean) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return showCurrencySign ? '$0' : '0';
  try {
    const formatted = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(n);
    return showCurrencySign ? `$${formatted}` : formatted;
  } catch {
    const formatted = Math.round(n).toLocaleString('en-US');
    return showCurrencySign ? `$${formatted}` : formatted;
  }
};
