// Mock cryptocurrency data for the dashboard

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  sparkline: number[];
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'send' | 'receive' | 'deposit' | 'withdraw';
  coin: string;
  coinSymbol: string;
  amount: number;
  value: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Holding {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  icon: string;
  color: string;
}

// Generate random sparkline data
const generateSparkline = (basePrice: number, volatility: number = 0.05): number[] => {
  const points: number[] = [];
  let price = basePrice;
  for (let i = 0; i < 24; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    price = Math.max(price + change, basePrice * 0.8);
    points.push(price);
  }
  return points;
};

export const coins: Coin[] = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 97542.18,
    change24h: 2.34,
    marketCap: 1920000000000,
    volume24h: 42500000000,
    sparkline: generateSparkline(97542.18),
    icon: '₿',
    color: '#F7931A'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    price: 3245.67,
    change24h: -1.23,
    marketCap: 390000000000,
    volume24h: 18200000000,
    sparkline: generateSparkline(3245.67),
    icon: 'Ξ',
    color: '#627EEA'
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    price: 198.45,
    change24h: 5.67,
    marketCap: 86000000000,
    volume24h: 4800000000,
    sparkline: generateSparkline(198.45),
    icon: '◎',
    color: '#9945FF'
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    price: 0.89,
    change24h: 3.21,
    marketCap: 31000000000,
    volume24h: 890000000,
    sparkline: generateSparkline(0.89),
    icon: '₳',
    color: '#0033AD'
  },
  {
    id: 'ripple',
    name: 'XRP',
    symbol: 'XRP',
    price: 2.34,
    change24h: -0.87,
    marketCap: 127000000000,
    volume24h: 5600000000,
    sparkline: generateSparkline(2.34),
    icon: '✕',
    color: '#23292F'
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    price: 7.23,
    change24h: 4.12,
    marketCap: 9800000000,
    volume24h: 320000000,
    sparkline: generateSparkline(7.23),
    icon: '●',
    color: '#E6007A'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    price: 38.56,
    change24h: -2.45,
    marketCap: 15400000000,
    volume24h: 620000000,
    sparkline: generateSparkline(38.56),
    icon: '△',
    color: '#E84142'
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    symbol: 'LINK',
    price: 19.87,
    change24h: 1.89,
    marketCap: 11800000000,
    volume24h: 480000000,
    sparkline: generateSparkline(19.87),
    icon: '⬡',
    color: '#375BD2'
  }
];

export const holdings: Holding[] = [
  {
    coinId: 'bitcoin',
    coinName: 'Bitcoin',
    coinSymbol: 'BTC',
    amount: 0.5234,
    avgBuyPrice: 89000,
    currentPrice: 97542.18,
    value: 51062.54,
    pnl: 4476.93,
    pnlPercent: 9.6,
    icon: '₿',
    color: '#F7931A'
  },
  {
    coinId: 'ethereum',
    coinName: 'Ethereum',
    coinSymbol: 'ETH',
    amount: 4.2,
    avgBuyPrice: 3100,
    currentPrice: 3245.67,
    value: 13631.81,
    pnl: 611.81,
    pnlPercent: 4.7,
    icon: 'Ξ',
    color: '#627EEA'
  },
  {
    coinId: 'solana',
    coinName: 'Solana',
    coinSymbol: 'SOL',
    amount: 25.5,
    avgBuyPrice: 180,
    currentPrice: 198.45,
    value: 5060.48,
    pnl: 470.48,
    pnlPercent: 10.25,
    icon: '◎',
    color: '#9945FF'
  },
  {
    coinId: 'cardano',
    coinName: 'Cardano',
    coinSymbol: 'ADA',
    amount: 5000,
    avgBuyPrice: 0.75,
    currentPrice: 0.89,
    value: 4450,
    pnl: 700,
    pnlPercent: 18.67,
    icon: '₳',
    color: '#0033AD'
  }
];

export const transactions: Transaction[] = [
  {
    id: 'tx1',
    type: 'buy',
    coin: 'Bitcoin',
    coinSymbol: 'BTC',
    amount: 0.1,
    value: 9754.22,
    date: '2026-02-01T10:30:00Z',
    status: 'completed'
  },
  {
    id: 'tx2',
    type: 'sell',
    coin: 'Ethereum',
    coinSymbol: 'ETH',
    amount: 0.5,
    value: 1622.84,
    date: '2026-01-31T15:45:00Z',
    status: 'completed'
  },
  {
    id: 'tx3',
    type: 'receive',
    coin: 'Solana',
    coinSymbol: 'SOL',
    amount: 10,
    value: 1984.50,
    date: '2026-01-30T09:20:00Z',
    status: 'completed'
  },
  {
    id: 'tx4',
    type: 'deposit',
    coin: 'USD',
    coinSymbol: 'USD',
    amount: 5000,
    value: 5000,
    date: '2026-01-29T14:00:00Z',
    status: 'completed'
  },
  {
    id: 'tx5',
    type: 'buy',
    coin: 'Cardano',
    coinSymbol: 'ADA',
    amount: 1000,
    value: 890,
    date: '2026-01-28T11:30:00Z',
    status: 'completed'
  },
  {
    id: 'tx6',
    type: 'send',
    coin: 'Bitcoin',
    coinSymbol: 'BTC',
    amount: 0.05,
    value: 4877.11,
    date: '2026-01-27T16:15:00Z',
    status: 'pending'
  }
];

// Generate price history for charts
export const generatePriceHistory = (basePrice: number, days: number = 30): { time: string; price: number }[] => {
  const history: { time: string; price: number }[] = [];
  let price = basePrice * 0.85; // Start 15% lower
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.45) * 0.05 * price; // Slight upward bias
    price = Math.max(price + change, basePrice * 0.7);
    
    history.push({
      time: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100
    });
  }
  
  // Ensure last price matches current price
  if (history.length > 0) {
    history[history.length - 1].price = basePrice;
  }
  
  return history;
};

export const btcPriceHistory = generatePriceHistory(97542.18, 30);
export const ethPriceHistory = generatePriceHistory(3245.67, 30);

// Portfolio total calculations
export const getPortfolioTotal = (): { value: number; pnl: number; pnlPercent: number } => {
  const value = holdings.reduce((sum, h) => sum + h.value, 0);
  const pnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const cost = holdings.reduce((sum, h) => sum + h.amount * h.avgBuyPrice, 0);
  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
  
  return { value, pnl, pnlPercent };
};

// Format helpers
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
