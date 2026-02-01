import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type Currency = 'INR' | 'USD';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    currencySymbol: string;
    formatCurrency: (amount: number) => string;
    conversionRate: number; // USD to selected currency
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

// Current USD to INR rate
const USD_TO_INR_RATE = 91.68;

export const useCurrencySettings = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrencySettings must be used within a CurrencyProvider');
    }
    return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<Currency>(() => {
        // Load from localStorage or default to INR
        const saved = localStorage.getItem('preferred_currency');
        return (saved as Currency) || 'INR';
    });

    const setCurrency = useCallback((newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    }, []);

    const currencySymbol = useMemo(() => {
        return currency === 'INR' ? '₹' : '$';
    }, [currency]);

    const conversionRate = useMemo(() => {
        return currency === 'INR' ? USD_TO_INR_RATE : 1;
    }, [currency]);

    const formatCurrency = useCallback((amount: number): string => {
        if (currency === 'INR') {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: amount < 100 ? 4 : 2,
            }).format(amount);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: amount < 1 ? 6 : 2,
        }).format(amount);
    }, [currency]);

    const value = useMemo(() => ({
        currency,
        setCurrency,
        currencySymbol,
        formatCurrency,
        conversionRate,
    }), [currency, setCurrency, currencySymbol, formatCurrency, conversionRate]);

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};
