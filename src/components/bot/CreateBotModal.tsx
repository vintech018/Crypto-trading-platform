'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Rocket, Bot, Plus, Trash2, Check, Target, Shield, Activity, Cpu, Server, Terminal, AlertTriangle, Link as LinkIcon, Database } from 'lucide-react';
import { api, type CreateBotPayload, type BotEntryCondition } from '@/lib/api';

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'];

interface CreateBotModalProps {
  onClose: () => void;
  onCreated: () => void;
  availableCapital?: number;
  initialBotClass?: 'beginner' | 'advanced' | 'algo';
}

export function CreateBotModal({ onClose, onCreated, availableCapital = 50000, initialBotClass = 'advanced' }: CreateBotModalProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<{
    name: string;
    pair: string;
    amount: string;
    logic: 'AND' | 'OR';
    entryConditions: BotEntryCondition[];
    tp: string;
    sl: string;
    trailingEnabled: boolean;
    trailingDeviation: string;
    maxTradesPerDay: string;
    leverage: number;
    botClass: 'beginner' | 'advanced' | 'algo';
  }>({
    name: '',
    pair: 'BTCUSDT',
    amount: '500',
    logic: 'AND',
    entryConditions: initialBotClass === 'beginner' ? [{ type: 'price_drop', operator: '<', value: 5 }] 
                  : initialBotClass === 'algo' ? [] 
                  : [{ type: 'rsi', operator: '<', value: 30 }],
    tp: '3',
    sl: '1.5',
    trailingEnabled: false,
    trailingDeviation: '0.5',
    maxTradesPerDay: '5',
    leverage: 1,
    botClass: initialBotClass,
  });

  const isAlgo = form.botClass === 'algo';
  const STEPS = isAlgo 
    ? ['Architecture Overview', 'Capital Allocation', 'Cloud Provisioning']
    : ['Basic Setup', 'Entry Logic', 'Exit Rules', 'Review'];

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function addCondition() {
    set('entryConditions', [...form.entryConditions, { type: 'price_drop', value: 3 }]);
  }

  function updateCondition(idx: number, patch: Partial<BotEntryCondition>) {
    const updated = [...form.entryConditions];
    updated[idx] = { ...updated[idx], ...patch };
    set('entryConditions', updated);
  }

  function removeCondition(idx: number) {
    if (form.entryConditions.length <= 1) return;
    set('entryConditions', form.entryConditions.filter((_, i) => i !== idx));
  }

  function serializeCondition(c: BotEntryCondition) {
    switch (c.type) {
      case 'rsi': return `RSI is ${c.operator} ${c.value}`;
      case 'ma_cross': return `MA(50) crosses above MA(200)`;
      case 'macd': return `MACD crosses above Signal Line`;
      case 'bb_lower': return `Price drops ${c.operator} Lower Bollinger Band`;
      case 'bb_upper': return `Price breaks ${c.operator} Upper Bollinger Band`;
      case 'price_drop': return `Price drops by ${c.value}%`;
      case 'price_rise': return `Price rises by ${c.value}%`;
      default: return '';
    }
  }

  const maxAllowedCapital = Math.min(10000, availableCapital);

  function canNext() {
    if (isAlgo) {
      if (step === 0) return true;
      if (step === 1) return Number(form.amount) > 0 && Number(form.amount) <= maxAllowedCapital;
      return true;
    }

    if (step === 0) return form.name.trim().length > 0 && Number(form.amount) > 0 && Number(form.amount) <= maxAllowedCapital;
    if (step === 1) {
      if (form.entryConditions.length === 0) return false;
      return form.entryConditions.every(c => {
        if (c.type === 'rsi') return c.operator && c.value !== undefined;
        if (c.type === 'price_drop' || c.type === 'price_rise') return c.value && c.value > 0;
        return true; 
      });
    }
    if (step === 2) return Number(form.tp) > 0 && Number(form.sl) > 0;
    return true;
  }

  async function handleCreate() {
    if (!canNext()) return;
    setLoading(true);
    setError('');
    try {
      const payload: CreateBotPayload = {
        name: isAlgo ? 'Freqtrade NFI Cloud Engine' : form.name,
        pair: form.pair,
        amount: Number(form.amount),
        leverage: form.leverage,
        botClass: form.botClass,
        webhookEndpoint: isAlgo ? 'http://localhost:4002/api/webhook' : undefined,
        entryConditions: form.entryConditions.map(c => ({
          ...c,
          value: c.value !== undefined ? Number(c.value) : undefined
        })),
        logic: form.logic,
        exit: { 
          tp: Number(form.tp), 
          sl: Number(form.sl), 
          maxTradesPerDay: Number(form.maxTradesPerDay),
          trailingEnabled: form.trailingEnabled,
          trailingDeviation: Number(form.trailingDeviation),
        },
      };
      await api.createBot(payload);
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`relative w-full max-w-lg glass rounded-2xl overflow-hidden z-10 block`}
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div className="sticky top-0 z-20 glass border-b border-white/[0.06] flex items-center justify-between px-6 py-5 bg-black/50 backdrop-blur-xl">
            <div className="flex flex-col gap-1">
              {isAlgo ? (
                <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <Cpu size={18} className="text-purple-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Freqtrade Managed Cloud</span>
                </h2>
              ) : (
                <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" />
                  {form.botClass === 'beginner' ? 'Beginner Setup' : 'Advanced Bot Builder'}
                </h2>
              )}
              
              <p className="text-white/30 text-[11px]">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-all">
              <X size={15} />
            </button>
          </div>

          <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.04] bg-white/[0.01]">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-2 relative ${i === STEPS.length - 1 ? '' : 'flex-1'}`}>
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all ${
                   i < step ? (isAlgo ? 'bg-purple-500 text-black' : 'bg-emerald-500 text-black') 
                   : i === step ? (isAlgo ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-emerald-500/20 text-emerald-400') 
                   : 'bg-white/10 text-white/30'
                 }`}>
                   {i < step ? <Check size={11} /> : i + 1}
                 </div>
                 {i < STEPS.length - 1 && (
                   <div className={`flex-1 h-px ml-2 mr-2 ${i < step ? (isAlgo ? 'bg-purple-500/40' : 'bg-emerald-500/40') : 'bg-white/[0.06]'}`} />
                 )}
              </div>
            ))}
          </div>

          <div className="px-6 py-6 min-h-[340px]">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                
                {/* ======================= ALGO FLOW ======================= */}
                {isAlgo && step === 0 && (
                  <div className="space-y-4">
                    <div className="text-center pb-2">
                       <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/30 text-purple-400 mx-auto mb-4 relative">
                          <Cpu size={28} className="relative z-10" />
                       </div>
                       <h3 className="text-xl font-bold text-white font-display mb-2">NostalgiaForInfinityX Engine</h3>
                       <p className="text-sm text-white/50 max-w-[320px] mx-auto text-balance">This is not a regular rule-based bot. You are about to deploy an advanced Machine Learning microservice.</p>
                    </div>
                    
                    <div className="bg-black/40 border border-purple-500/20 p-4 rounded-xl text-xs space-y-3">
                       <div className="flex gap-3">
                          <div className="text-purple-400 mt-0.5"><Activity size={14}/></div>
                          <div>
                            <p className="text-white font-bold mb-1">Dynamic Market Phase Detection</p>
                            <p className="text-white/40 leading-relaxed">The AI constantly analyzes Bitcoin dominance to determine if the market is in a Bull, Bear, or Crab phase, adapting its strategy completely.</p>
                          </div>
                       </div>
                       <div className="w-full h-px bg-white/5" />
                       <div className="flex gap-3">
                          <div className="text-purple-400 mt-0.5"><Target size={14}/></div>
                          <div>
                            <p className="text-white font-bold mb-1">Over 40 Hyper-Optimized Triggers</p>
                            <p className="text-white/40 leading-relaxed">It calculates highly complex indicators (EWO, MFI, Volume Spikes) simultaneously, weighted dynamically by machine learning.</p>
                          </div>
                       </div>
                       <div className="w-full h-px bg-white/5" />
                       <div className="flex gap-3">
                          <div className="text-purple-400 mt-0.5"><Shield size={14}/></div>
                          <div>
                            <p className="text-white font-bold mb-1">Live Container Orchestration</p>
                            <p className="text-white/40 leading-relaxed">Deployment creates an isolated Node.js-managed Docker container running purely on paper money (dry_run: true) for 100% safety.</p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {isAlgo && step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center pb-2">
                       <h3 className="text-xl font-bold text-white font-display mb-2">Configure AI Container</h3>
                       <p className="text-sm text-white/40 max-w-[280px] mx-auto text-balance">Allocate capital to spin up an isolated, fully-managed ML microservice powered by Freqtrade and the NFI strategy.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-5">
                      <div>
                        <label className="text-[11px] text-white/40 uppercase font-bold mb-1.5 block flex justify-between">
                          Capital Funding
                          {Number(form.amount) > maxAllowedCapital && <span className="text-red-400 font-normal">Max ${maxAllowedCapital.toLocaleString()}</span>}
                        </label>
                        <div className="relative border border-white/10 rounded-xl bg-black/50 overflow-hidden focus-within:border-purple-500/40 transition-colors">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono font-bold">$</span>
                          <input
                            type="number"
                            max={maxAllowedCapital}
                            value={form.amount}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (Number(val) > maxAllowedCapital) val = maxAllowedCapital.toString();
                              set('amount', val);
                            }}
                            className="w-full bg-transparent pl-8 pr-4 py-3 text-emerald-400 text-lg font-mono font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                         <label className="text-[11px] text-white/40 uppercase font-bold mb-3 block flex justify-between">
                            Account Leverage 
                            <span className="text-purple-400 font-bold">{form.leverage}×</span>
                         </label>
                         <input
                             type="range" min={1} max={10} value={form.leverage} onChange={e => set('leverage', Number(e.target.value))}
                             className="w-full accent-purple-500 h-1.5 rounded-lg bg-white/10 appearance-none outline-none" style={{ WebkitAppearance: 'none' }}
                         />
                          <div className="flex justify-between items-center mt-3">
                              {[1, 2, 3, 5, 10].map(l => (
                                  <button
                                      key={l}
                                      onClick={(e) => { e.preventDefault(); set('leverage', l); }}
                                      className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded-lg transition-all ${
                                        form.leverage === l 
                                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
                                          : 'bg-white/[0.02] text-white/30 hover:text-white/60 border border-transparent'
                                      }`}
                                  >
                                      {l}×
                                  </button>
                              ))}
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAlgo && step === 2 && (
                  <div className="space-y-4">
                     <div className="bg-black/30 p-6 rounded-2xl border border-purple-500/20 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] text-center">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full" />
                      
                      <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400 mb-6 relative">
                         <div className="absolute inset-0 bg-purple-500/10 animate-ping rounded-2xl" />
                         <Server size={24} />
                      </div>

                      <h4 className="text-lg font-bold text-white mb-2">Ready to Provision</h4>
                      <p className="text-sm text-white/50 mb-6 max-w-[250px]">Solidus will automatically spin up an isolated Cloud AI container charged with your capital.</p>

                      <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center text-left">
                         <span className="text-xs text-white/40">Total Deployment</span>
                         <span className="text-sm font-mono text-emerald-400 font-bold">${form.amount} ({form.leverage}× Leverage)</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* ======================= END ALGO FLOW ======================= */}


                {/* ======================= STANDARD FLOW ======================= */}
                {!isAlgo && step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[11px] text-white/40 uppercase font-bold mb-1.5 block">Strategy Name</label>
                      <input
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="e.g. BTC Smart RSI Scalper"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-white/40 uppercase font-bold mb-1.5 block">Trading Pair</label>
                        <select
                          value={form.pair}
                          onChange={(e) => set('pair', e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                        >
                          {PAIRS.map((p) => <option key={p} value={p} className="bg-black">{p.replace('USDT', '/USDT')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-white/40 uppercase font-bold mb-1.5 block flex justify-between">
                          Position Size (USD)
                          {Number(form.amount) > maxAllowedCapital && <span className="text-red-400 font-normal">Max ${maxAllowedCapital.toLocaleString()}</span>}
                        </label>
                        <input
                          type="number"
                          max={maxAllowedCapital}
                          value={form.amount}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (Number(val) > maxAllowedCapital) val = maxAllowedCapital.toString();
                            set('amount', val);
                          }}
                          className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/40 ${Number(form.amount) > maxAllowedCapital ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-[11px] text-white/40 uppercase font-bold mb-3 block">Leverage: <span className="text-white font-bold">{form.leverage}×</span></label>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={form.leverage}
                            onChange={e => set('leverage', Number(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 rounded-lg bg-white/10 appearance-none outline-none"
                            style={{ WebkitAppearance: 'none' }}
                        />
                        <div className="flex gap-2 flex-wrap mt-4">
                            {[1, 2, 3, 5, 10].map(l => (
                                <button
                                    key={l}
                                    onClick={(e) => { e.preventDefault(); set('leverage', l); }}
                                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                                      form.leverage === l 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-white/[0.02] text-white/30 hover:text-white/60 hover:bg-white/[0.05] border border-transparent'
                                    }`}
                                >
                                    {l}×
                                </button>
                            ))}
                        </div>
                    </div>
                  </div>
                )}

                {!isAlgo && step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-white/40 uppercase font-bold">Execution Gating</label>
                      <select 
                        value={form.logic}
                        onChange={(e) => set('logic', e.target.value)}
                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="AND" className="bg-black">Match ALL Conditions (AND)</option>
                        <option value="OR" className="bg-black">Match ANY Condition (OR)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {form.entryConditions.map((cond, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 relative group">
                          
                          <select
                            value={cond.type}
                            onChange={(e) => updateCondition(idx, { type: e.target.value as any, operator: '<', value: form.botClass === 'beginner' ? 5 : 30 })}
                            className="bg-black/50 border border-white/10 text-white text-xs px-3 py-2 rounded-lg"
                          >
                            {form.botClass !== 'beginner' && (
                              <>
                                <option value="rsi">RSI (14)</option>
                                <option value="ma_cross">MA Cross (50/200)</option>
                                <option value="macd">MACD Cross</option>
                                <option value="bb_lower">Bollinger Band (Lower)</option>
                                <option value="bb_upper">Bollinger Band (Upper)</option>
                              </>
                            )}
                            <option value="price_drop">Price Drops (%)</option>
                            <option value="price_rise">Price Rises (%)</option>
                          </select>

                          {(cond.type === 'rsi' || cond.type === 'bb_lower' || cond.type === 'bb_upper') && (
                            <>
                              <select 
                                value={cond.operator || '<'}
                                onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                                className="bg-black/50 border border-white/10 text-white text-xs px-3 py-2 rounded-lg"
                              >
                                <option value="<">Less Than</option>
                                <option value=">">Greater Than</option>
                              </select>
                              {cond.type === 'rsi' && (
                                <input 
                                  type="number" 
                                  step="any"
                                  value={cond.value === undefined ? '' : cond.value} 
                                  onChange={(e) => updateCondition(idx, { value: e.target.value as any })}
                                  className="w-20 bg-black/50 border border-white/10 text-white font-mono text-xs px-3 py-2 rounded-lg text-center"
                                />
                              )}
                            </>
                          )}

                          {(cond.type === 'price_drop' || cond.type === 'price_rise') && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/40">by</span>
                              <input 
                                type="number"
                                step="any"
                                value={cond.value === undefined ? '' : cond.value} 
                                onChange={(e) => updateCondition(idx, { value: e.target.value as any })}
                                className="w-20 bg-black/50 border border-white/10 text-emerald-400 font-mono text-xs px-3 py-2 rounded-lg text-center"
                              />
                              <span className="text-xs text-white/40">%</span>
                            </div>
                          )}

                          <button 
                            onClick={() => removeCondition(idx)}
                            disabled={form.entryConditions.length === 1}
                            className="ml-auto w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-0 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={addCondition}
                      className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/10 rounded-xl text-xs text-white/40 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                    >
                      <Plus size={14} /> Add Another Condition
                    </button>

                    <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-xl text-xs leading-relaxed">
                      <p className="text-white/40 mb-2">⚡ Live Summary Engine:</p>
                      <p className="text-emerald-400 font-mono">
                        Bot will enter trade when <span className="text-white">{' {'}</span>
                        <br/>
                        {form.entryConditions.map((c, i) => (
                          <span key={i} className="pl-4 block">
                            {serializeCondition(c)}
                            {i < form.entryConditions.length - 1 && <span className="text-white/40 ml-2">{form.logic}</span>}
                          </span>
                        ))}
                        <span className="text-white">{'}'}</span>
                      </p>
                    </div>
                  </div>
                )}

                {!isAlgo && step === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-4">
                        <label className="text-[11px] text-emerald-400/50 uppercase tracking-widest font-bold mb-2 block flex items-center gap-2"><Target size={12}/> Take Profit (%)</label>
                        <input
                          type="number" step="0.1" value={form.tp} onChange={(e) => set('tp', e.target.value)}
                          className="w-full bg-black/60 border border-emerald-500/25 rounded-lg px-3 py-3 text-emerald-400 font-mono text-sm text-center focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl p-4">
                        <label className="text-[11px] text-red-400/50 uppercase tracking-widest font-bold mb-2 block flex items-center gap-2"><Shield size={12} /> Stop Loss (%)</label>
                        <input
                          type="number" step="0.1" value={form.sl} onChange={(e) => set('sl', e.target.value)}
                          className="w-full bg-black/60 border border-red-500/25 rounded-lg px-3 py-3 text-red-400 font-mono text-sm text-center focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>
                    {/* Trailing Settings */}
                    <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-2">
                           Trailing Take-Profit
                        </label>
                        <button 
                          onClick={() => set('trailingEnabled', !form.trailingEnabled)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${form.trailingEnabled ? 'bg-purple-500' : 'bg-white/10'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${form.trailingEnabled ? 'left-[22px]' : 'left-[3px]'}`} />
                        </button>
                      </div>
                      
                      {form.trailingEnabled && (
                        <div className="flex items-center gap-4 mt-2 p-3 bg-black/30 rounded-lg border border-purple-500/10">
                          <div className="flex-1">
                            <label className="text-[10px] text-white/40 uppercase block mb-1">Trailing Deviation (%)</label>
                            <input
                              type="number" step="0.1" value={form.trailingDeviation} onChange={(e) => set('trailingDeviation', e.target.value)}
                              className="w-full bg-black/60 border border-purple-500/25 rounded-md px-2 py-1.5 text-purple-400 font-mono text-xs focus:outline-none focus:border-purple-500/50"
                            />
                          </div>
                          <p className="text-[10px] text-white/30 flex-1 leading-snug">
                            After your <span className="text-emerald-400">Take Profit</span> hits, the bot will hold its position. If price drops by the <span className="text-purple-400">Deviation</span> from the peak, it sells.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] text-white/40 uppercase font-bold mb-1.5 block">Daily Guardrail: Max Trades (0 = unlimited)</label>
                      <input
                        type="number" value={form.maxTradesPerDay} onChange={(e) => set('maxTradesPerDay', e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {!isAlgo && step === 3 && (
                  <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center py-2"><span className="text-xs text-white/35">Bot Name</span><span className="text-xs font-mono text-white">{form.name}</span></div>
                    <div className="flex justify-between items-center py-2"><span className="text-xs text-white/35">Pair & Size</span><span className="text-xs font-mono text-emerald-400">{form.pair} / ${form.amount} ({form.leverage}×)</span></div>
                    <div className="flex justify-between items-center py-2"><span className="text-xs text-white/35">Logic Gate</span><span className="text-xs font-mono text-white bg-white/10 px-2 py-0.5 rounded">{form.logic}</span></div>
                    <div className="py-2">
                       <span className="text-xs text-white/35 block mb-2">Configured Conditions:</span>
                       <div className="space-y-1">
                          {form.entryConditions.map((c, i) => (
                             <div key={i} className="text-[11px] font-mono text-white/60 bg-white/5 px-2 py-1.5 rounded w-fit">
                               {serializeCondition(c)}
                             </div>
                          ))}
                       </div>
                    </div>
                    <div className="flex justify-between items-center py-2"><span className="text-xs text-white/35">Exit Rules</span><span className="text-xs font-mono text-white">TP +{form.tp}% / SL -{form.sl}%</span></div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
            {error && <p className="mt-4 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">{error}</p>}
          </div>

          <div className="sticky bottom-0 glass px-6 py-4 flex items-center justify-between border-t border-white/[0.04]">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} className="text-sm text-white/30 hover:text-white flex items-center gap-1"><ChevronLeft size={14}/> {step === 0 ? 'Cancel' : 'Back'}</button>
            {step < STEPS.length - 1 ? (
              <button disabled={!canNext()} onClick={() => setStep(s => s + 1)} className={`flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-black rounded-xl transition-all disabled:opacity-30 ${isAlgo ? 'bg-purple-400 hover:bg-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white hover:bg-white/90'}`}>Next <ChevronRight size={14}/></button>
            ) : (
              <button disabled={loading} onClick={handleCreate} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-black rounded-xl hover:opacity-90 disabled:opacity-40 shadow-lg ${isAlgo ? 'bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-purple-500/20' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}>
                {loading ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Rocket size={14} />} {isAlgo ? 'Deploy Instance' : 'Launch Engine'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
