'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Plus, Bot, Zap, Activity, ArrowLeft, Wifi, WifiOff, Cpu, Server, Play } from 'lucide-react';
import { api, type Bot as BotModel } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { BotCard } from '@/components/bot/BotCard';
import { CreateBotModal } from '@/components/bot/CreateBotModal';
import { AnimatedNavFramer, NavTab } from '@/components/ui/animated-nav-framer';

const NAV_TABS: NavTab[] = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'algo', name: 'Algorithmic', locked: true },
  { id: 'running', name: 'Running' },
];

export default function BotsPage() {
  const [bots, setBots] = useState<BotModel[]>([]);
  const [modalState, setModalState] = useState<{ show: boolean; type: 'beginner' | 'advanced' | 'algo' }>({ show: false, type: 'advanced' });
  const [loading, setLoading]       = useState<string | null>(null); // botId being operated on
  const [connected, setConnected]   = useState(false);
  const [wallet, setWallet]         = useState<{ balance: number } | null>(null);
  const [recentTrade, setRecentTrade] = useState<{ botName: string; type: string; pnl?: number; price: number } | null>(null);
  const [activeTab, setActiveTab]   = useState<string>('beginner');

  // ── Page Loader ────────────────────────────────────────────────────────
  const LOAD_MESSAGES = [
    'Initializing bot engine…',
    'Fetching deployed strategies…',
    'Syncing with execution server…',
    'Loading trading environment…',
  ];
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadMsg, setLoadMsg] = useState(0);

  useEffect(() => {
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx++;
      if (msgIdx < LOAD_MESSAGES.length) setLoadMsg(msgIdx);
      else clearInterval(msgTimer);
    }, 350);
    const doneTimer = setTimeout(() => setLoadingDone(true), 1600);
    return () => { clearInterval(msgTimer); clearTimeout(doneTimer); };
  }, []);

  // ── REST initial load ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [botsData, walletData] = await Promise.all([api.listBots(), api.getWallet()]);
      setBots(botsData);
      setWallet(walletData);
    } catch (_) {/* backend may not be up yet */}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Socket.IO real-time ────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    if (socket.connected) {
      setConnected(true);
    } else {
      socket.connect();
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Full list (on connect or after create/start/stop/delete)
    socket.on('bot:list', (list: BotModel[]) => {
      setBots(list);
      api.getWallet().then(setWallet).catch(() => {});
    });

    // Single bot update (live P&L, position change)
    socket.on('bot:update', (updated: BotModel) => {
      setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    });

    // Trade event notification
    socket.on('bot:trade', (trade: { botName: string; type: string; pnl?: number; price: number }) => {
      setRecentTrade(trade);
      setTimeout(() => setRecentTrade(null), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('bot:list');
      socket.off('bot:update');
      socket.off('bot:trade');
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  async function handleStart(id: string) {
    setLoading(id);
    try { await api.startBot(id); } catch (e) { alert((e as Error).message); } finally { setLoading(null); }
  }

  async function handleStop(id: string) {
    setLoading(id);
    try { await api.stopBot(id); } catch (e) { alert((e as Error).message); } finally { setLoading(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bot? Its remaining virtual capital will be refunded to your Global Balance.')) return;
    setLoading(id);
    try { 
      await api.deleteBot(id); 
      // rely on socket bot:list to update everything
    } catch (e) { alert((e as Error).message); } finally { setLoading(null); }
  }

  function attemptCreate(type: 'beginner' | 'advanced' | 'algo') {
    if (wallet && wallet.balance <= 0) {
      alert("⚠️ Your entire $50,000 capital is deployed.\n\nYou must DELETE a running bot to free up capital before making a new one.");
      return;
    }
    setModalState({ show: true, type });
  }

  const beginnerBots = bots.filter((b) => b.botClass === 'beginner');
  const advancedBots = bots.filter((b) => !b.botClass || b.botClass === 'advanced');
  const algoBots = bots.filter((b) => b.botClass === 'algo');
  const activeBots = bots.filter((b) => b.status === 'active');
  const totalPnl = bots.reduce((s, b) => s + b.pnl + b.unrealizedPnl, 0);

  function renderBotGrid(list: BotModel[]) {
    if (list.length === 0) return <div className="text-center py-10 bg-white/[0.02] border border-white/[0.05] rounded-2xl border-dashed text-white/30 text-sm">No bots deployed in this tier.</div>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {list.map((bot) => (
            <BotCard key={bot.id} bot={bot} onStart={handleStart} onStop={handleStop} onDelete={handleDelete} loading={loading === bot.id} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Loading overlay fade */
        .bots-loading {
          transition: opacity 0.5s ease, visibility 0.5s ease;
        }
        .bots-loading.done {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      {/* Loading overlay */}
      <div className={`bots-loading fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 ${loadingDone ? 'done' : ''}`}>
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          <span className="text-black text-2xl font-black">S</span>
        </div>
        <div className="text-white text-lg font-bold tracking-wider">SOLIDUS</div>
        {/* Spinner */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        {/* Message */}
        <div className="h-5 flex items-center">
          <span className="text-[11px] font-mono text-white/40 tracking-widest transition-all duration-300">
            {LOAD_MESSAGES[loadMsg]}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-48 h-px bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((loadMsg + 1) / LOAD_MESSAGES.length) * 100}%` }}
          />
        </div>
      </div>

    <div className="min-h-screen bg-black bg-grid-white relative">
      {/* backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(34,197,94,0.05),transparent)] pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hub" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-base font-medium">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-emerald-400" />
              <span className="font-display font-bold text-white text-base tracking-wide">SOLIDUS</span>
              <span className="text-white/30 text-base">/ Trading Bots</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md text-sm font-bold transition-all ${
              connected 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {connected ? <Wifi size={16} className="animate-pulse" /> : <WifiOff size={16} />}
              {connected ? 'Live' : 'Connecting…'}
            </div>
          </div>
        </div>
      </nav>

      {/* Trade toast */}
      <AnimatePresence>
        {recentTrade && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-16 right-5 z-50 px-4 py-3 rounded-xl border text-xs font-medium flex items-center gap-2 backdrop-blur-sm ${
              recentTrade.type === 'close' && recentTrade.pnl && recentTrade.pnl > 0
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : recentTrade.type === 'close'
                ? 'bg-red-500/10 border-red-500/25 text-red-300'
                : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
            }`}
          >
            <Activity size={12} />
            <span>
              <strong>{recentTrade.botName}</strong>{' '}
              {recentTrade.type === 'open'
                ? `opened position @ $${recentTrade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : `closed ${recentTrade.pnl && recentTrade.pnl > 0 ? `+$${recentTrade.pnl.toFixed(2)} ✅` : `$${recentTrade.pnl?.toFixed(2)} 🛑`}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Trading Bots</h1>
            <p className="text-white/35 mt-1.5">Automate your strategies. No coding required.</p>
          </div>

          {bots.length > 0 && (
            <div className="flex items-center gap-5 text-right">
              <div>
                <p className="text-[11px] text-white/25 uppercase tracking-widest">Total Bots</p>
                <p className="text-xl font-mono font-bold text-white">{bots.length}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/25 uppercase tracking-widest">Available Capital</p>
                <p className="text-xl font-mono font-bold text-emerald-400">
                  ${wallet?.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '---'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/25 uppercase tracking-widest">Running</p>
                <p className="text-xl font-mono font-bold text-white">{activeBots.length}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/25 uppercase tracking-widest">Total P&L</p>
                <p className={`text-xl font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Section Rendering based on activeTab */}
        
        {/* Tier 1: Beginner */}
        {activeTab === 'beginner' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">Beginner Trading <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">Tier 1</span></h2>
                 <p className="text-xs text-white/40 mt-1">Simple conditional strategies evaluating raw price drops and pumps.</p>
              </div>
              <button onClick={() => attemptCreate('beginner')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all">
                <Plus size={13} /> Create Beginner
              </button>
            </div>
            {renderBotGrid(beginnerBots)}
          </motion.section>
        )}

        {/* Tier 2: Advanced */}
        {activeTab === 'advanced' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">Advanced Technicals <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Tier 2</span></h2>
                 <p className="text-xs text-white/40 mt-1">Multi-indicator condition engine utilizing RSI, MACD, and MA Crosses.</p>
              </div>
              <button onClick={() => attemptCreate('advanced')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all">
                <Plus size={13} /> Create Advanced
              </button>
            </div>
            {renderBotGrid(advancedBots)}
          </motion.section>
        )}

        {/* Tier 3: Algo Marketplace */}
        {activeTab === 'algo' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">Algorithmic App Store <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.3)]">Tier 3</span></h2>
                 <p className="text-xs text-white/40 mt-1">Deploy pre-configured Open Source microservices instantly.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {algoBots.length > 0 ? (
                <AnimatePresence>
                  {algoBots.map((bot) => (
                    <BotCard key={bot.id} bot={bot} onStart={handleStart} onStop={handleStop} onDelete={handleDelete} loading={loading === bot.id} />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="glass bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all flex flex-col h-full group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-5 flex-1 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Cpu size={18} />
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Available</span>
                    </div>
                    <h3 className="text-white font-bold mb-1 font-display">Freqtrade ML</h3>
                    <p className="text-xs text-white/40 leading-relaxed mb-4">High-performance open-source crypto trading bot powered by Hyperopt Machine Learning.</p>
                    
                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center justify-between text-[11px] text-white/30 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                        <span className="flex items-center gap-1.5"><Server size={10} /> Architecture</span>
                        <span className="text-white/50 text-right">Docker Webhook Native</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/[0.05] bg-black/20 mt-auto relative z-10">
                    <button onClick={() => attemptCreate('algo')} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all">
                       <Play size={14} /> Setup & Deploy
                    </button>
                  </div>
                </div>
              )}
              
               {algoBots.length === 0 && (
                <>
                <div className="glass bg-white/[0.01] border border-white/[0.02] rounded-2xl p-5 flex flex-col opacity-40 pointer-events-none">
                   <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Bot size={18} /></div>
                      <span className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2 py-1 rounded">Coming Soon</span>
                    </div>
                    <h3 className="text-white font-bold mb-1 font-display">Zenbot Simulator</h3>
                    <p className="text-xs text-white/40 leading-relaxed mb-4">Lightweight Node.js trading bot capable of running AI sentiment strategies.</p>
                </div>
                <div className="glass bg-white/[0.01] border border-white/[0.02] rounded-2xl p-5 flex flex-col opacity-40 pointer-events-none">
                   <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400"><Activity size={18} /></div>
                      <span className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2 py-1 rounded">Coming Soon</span>
                    </div>
                    <h3 className="text-white font-bold mb-1 font-display">OpenAlgo</h3>
                    <p className="text-xs text-white/40 leading-relaxed mb-4">Open-source quantitative platform utilizing Python Pandas for data manipulation.</p>
                </div>
                </>
              )}
            </div>
          </motion.section>
        )}

        {/* Tier 4: Running Bots */}
        {activeTab === 'running' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">Running Bots <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.3)]">Live</span></h2>
                 <p className="text-xs text-white/40 mt-1">Currently active strategies generating P&L.</p>
              </div>
            </div>
            {renderBotGrid(activeBots)}
          </motion.section>
        )}
      </main>

      {/* Floating Animated Nav */}
      <AnimatedNavFramer 
        tabs={NAV_TABS} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Create Bot Modal */}
      {modalState.show && (
        <CreateBotModal
          initialBotClass={modalState.type}
          availableCapital={wallet?.balance || 0}
          onClose={() => setModalState({ ...modalState, show: false })}
          onCreated={fetchData}
        />
      )}
    </div>
    </>
  );
}
