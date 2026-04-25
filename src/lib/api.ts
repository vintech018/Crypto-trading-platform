const BASE = 'http://localhost:4002/api';

export interface BotEntryCondition {
  type: 'price_drop' | 'price_rise' | 'rsi' | 'ma_cross' | 'macd' | 'bb_lower' | 'bb_upper';
  operator?: '<' | '>';
  value?: number;
}
export interface BotExit { 
  tp: number; 
  sl: number; 
  trailingEnabled?: boolean;
  trailingDeviation?: number;
  maxTradesPerDay: number; 
}

export interface CreateBotPayload {
  name: string;
  pair: string;
  amount: number;
  leverage?: number;
  botClass?: 'beginner' | 'advanced' | 'algo';
  algoType?: 'grid' | 'arbitrage' | 'rebalance';
  webhookEndpoint?: string;
  algoConfig?: any;
  entryConditions: BotEntryCondition[];
  logic: 'AND' | 'OR';
  exit: BotExit;
}

export interface Trade {
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  qty: number;
  openedAt: string;
  closedAt: string;
  closeReason: 'take_profit' | 'stop_loss';
}

export interface Bot {
  id: string;
  name: string;
  pair: string;
  amount: number;
  leverage?: number;
  botClass?: 'beginner' | 'advanced' | 'algo';
  algoType?: 'grid' | 'arbitrage' | 'rebalance';
  webhookEndpoint?: string;
  algoConfig?: any;
  entryConditions: BotEntryCondition[];
  logic: 'AND' | 'OR';
  exit: BotExit;
  status: 'active' | 'inactive';
  position: { entryPrice: number; openedAt: string; qty: number } | null;
  trades: Trade[];
  pnl: number;
  unrealizedPnl: number;
  tradeCount: number;
  winCount: number;
  virtualBalance: number;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getWallet:  ()         => request<{ balance: number }>('/wallet'),
  listBots:   ()         => request<Bot[]>('/bots'),
  getBot:     (id: string) => request<Bot>(`/bots/${id}`),
  createBot:  (data: CreateBotPayload) => request<Bot>('/bots', { method: 'POST', body: JSON.stringify(data) }),
  startBot:   (id: string) => request<Bot>(`/bots/${id}/start`, { method: 'PATCH' }),
  stopBot:    (id: string) => request<Bot>(`/bots/${id}/stop`,  { method: 'PATCH' }),
  deleteBot:  (id: string) => request<void>(`/bots/${id}`,     { method: 'DELETE' }),
  listPairs:  ()          => request<string[]>('/pairs'),
};
