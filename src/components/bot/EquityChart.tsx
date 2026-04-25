'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { Trade } from '@/lib/api';

interface EquityChartProps {
  trades: Trade[];
  startBalance?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs backdrop-blur-sm">
      <p className="text-white/40 mb-1">Trade #{d.tradeNum}</p>
      <p className="font-mono font-bold text-white">Balance: ${d.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      {d.pnl !== 0 && (
        <p className={`font-mono mt-0.5 ${d.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {d.pnl > 0 ? '+' : ''}${d.pnl.toFixed(2)} ({d.closeReason === 'take_profit' ? '✅ TP' : '🛑 SL'})
        </p>
      )}
    </div>
  );
};

export function EquityChart({ trades, startBalance = 10000 }: EquityChartProps) {
  const data = useMemo(() => {
    const points = [{ tradeNum: 0, balance: startBalance, pnl: 0, closeReason: '' }];
    let running = startBalance;
    trades
      .slice()
      .reverse()
      .forEach((t, i) => {
        running += t.pnl;
        points.push({
          tradeNum: i + 1,
          balance: running,
          pnl: t.pnl,
          closeReason: t.closeReason,
        });
      });
    return points;
  }, [trades, startBalance]);

  const isPositive = data[data.length - 1]?.balance >= startBalance;
  const color = isPositive ? '#10b981' : '#ef4444';

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20 text-sm">
        No trades yet — start the bot to see your equity curve
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />

        <XAxis
          dataKey="tradeNum"
          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Trade #', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.15)', fontSize: 10 }}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={color}
          strokeWidth={2}
          fill="url(#equityGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: 'black', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
