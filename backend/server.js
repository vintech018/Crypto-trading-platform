require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const {
  createBot,
  getBot,
  getAllBots,
  deleteBot,
  startBot,
  stopBot,
  getWallet,
  updateBot
} = require('./services/botStore');
const { setEmitters, forceClosePosition } = require('./services/botEngine');
const { initCandleService, getCandles } = require('./services/candleService');
const { start: startStream, stop: stopStream } = require('./websocket/binanceStream');
const { BOT_EVENTS, SUPPORTED_PAIRS } = require('./config/constants');
const { spawnCloudEngine, terminateCloudEngine } = require('./services/dockerService');

const app = express();
const server = http.createServer(app);

// ── Socket.IO ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', process.env.FRONTEND_ORIGIN].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

// Wire bot engine emitters → Socket.IO
setEmitters({
  onUpdate: (bot) => io.emit(BOT_EVENTS.UPDATE, bot),
  onTrade: (trade) => io.emit(BOT_EVENTS.TRADE, trade),
});

io.on('connection', async (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);
  // Send current list of all bots to newly connected client
  const allBots = await getAllBots();
  socket.emit(BOT_EVENTS.LIST, allBots);

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ── Express middleware ────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', process.env.FRONTEND_ORIGIN].filter(Boolean) }));
app.use(express.json());

// ── REST API ───────────────────────────────────────────────────────────────

// GET /api/bots — list all bots
app.get('/api/bots', async (_req, res) => {
  res.json(await getAllBots());
});

// GET /api/bots/:id — single bot
app.get('/api/bots/:id', async (req, res) => {
  const bot = await getBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  res.json(bot);
});

// GET /api/wallet — get global wallet balance
app.get('/api/wallet', async (_req, res) => {
  res.json(await getWallet());
});

// POST /api/bots — create bot
app.post('/api/bots', async (req, res) => {
  const { name, pair, amount, leverage, botClass, entryConditions, logic, exit } = req.body;

  if (!name || !pair || !amount || !entryConditions || !exit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!SUPPORTED_PAIRS.includes(pair.toUpperCase())) {
    return res.status(400).json({ error: `Unsupported pair. Use: ${SUPPORTED_PAIRS.join(', ')}` });
  }
  if (botClass !== 'algo' && (!Array.isArray(entryConditions) || entryConditions.length === 0)) {
    return res.status(400).json({ error: 'At least one entry condition is required' });
  }
  if (exit.tp <= 0 || exit.sl <= 0) {
    return res.status(400).json({ error: 'TP and SL must be > 0' });
  }

  const wallet = await getWallet();
  if (amount > wallet.balance) {
    return res.status(400).json({ error: `Insufficient capital. Available: $${wallet.balance.toFixed(2)}` });
  }

  const bot = await createBot({ name, pair, amount, leverage, botClass, entryConditions, logic, exit });
  
  // Docker Orchestrator Hook
  if (bot.botClass === 'algo') {
    spawnCloudEngine(bot);
  }

  io.emit(BOT_EVENTS.LIST, await getAllBots());
  res.status(201).json(bot);
});

// PATCH /api/bots/:id/start
app.patch('/api/bots/:id/start', async (req, res) => {
  const bot = await startBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  io.emit(BOT_EVENTS.UPDATE, bot);
  io.emit(BOT_EVENTS.LIST, await getAllBots());
  res.json(bot);
});

// PATCH /api/bots/:id/stop
app.patch('/api/bots/:id/stop', async (req, res) => {
  let bot = await getBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  if (bot.position) {
    const candles = getCandles(bot.pair);
    const lastPrice = candles.length > 0 ? candles[candles.length - 1] : bot.position.entryPrice;
    bot = await forceClosePosition(bot, lastPrice);
  }

  const stoppedBot = await stopBot(req.params.id);
  io.emit(BOT_EVENTS.UPDATE, stoppedBot);
  io.emit(BOT_EVENTS.LIST, await getAllBots());
  res.json(stoppedBot);
});

// DELETE /api/bots/:id
app.delete('/api/bots/:id', async (req, res) => {
  const bot = await getBot(req.params.id);
  const deleted = await deleteBot(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Bot not found' });

  // Docker Orchestrator Hook
  if (bot && bot.botClass === 'algo') {
    terminateCloudEngine(req.params.id);
  }

  io.emit(BOT_EVENTS.LIST, await getAllBots());
  res.json({ success: true });
});

// POST /api/webhook — Freqtrade Cloud Engine Listener
app.post('/api/webhook', async (req, res) => {
  const { botId, type, price, pnl } = req.body;
  if (!botId) return res.status(400).json({ error: 'Missing botId' });

  let bot = await getBot(botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const numericPrice = parseFloat(price) || 0;

  if (type === 'open') {
    bot = await updateBot(botId, {
      position: { entryPrice: numericPrice, qty: bot.amount, openedAt: new Date().toISOString() },
      status: 'active'
    });
    io.emit(BOT_EVENTS.TRADE, { botName: bot.name, type: 'open', price: numericPrice });
  } else if (type === 'close') {
    const numericPnl = parseFloat(pnl) || 0;
    
    // Add trade and update bot PNL
    // Here we skip addTradeToBot directly and just use Prisma via updateBot.
    // However, since it's an external webhook, we just clear position and increment PNL.
    // The wallet is also updated globally in updateBot if we wanted, but let's do it directly.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Manual Wallet update for Webhook
    const wallet = await prisma.wallet.findUnique({ where: { id: 1 }});
    if (wallet) {
      await prisma.wallet.update({
        where: { id: 1 },
        data: { balance: wallet.balance + numericPnl }
      });
    }

    bot = await updateBot(botId, {
      pnl: bot.pnl + numericPnl,
      position: null
    });
    
    io.emit(BOT_EVENTS.TRADE, { botName: bot.name, type: 'close', pnl: numericPnl, price: numericPrice });
  }

  io.emit(BOT_EVENTS.UPDATE, bot);
  io.emit(BOT_EVENTS.LIST, await getAllBots());

  console.log(`[Webhook] Processed ML signal for ${bot.name} (${type})`);
  res.status(200).json({ success: true });
});

// GET /health
app.get('/health', async (_req, res) => {
  const bots = await getAllBots();
  res.json({ status: 'ok', bots: bots.length, timestamp: new Date().toISOString() });
});

// Supported pairs
app.get('/api/pairs', (_req, res) => {
  res.json(SUPPORTED_PAIRS);
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 4002);

server.listen(PORT, async () => {
  console.log(`\n🤖 Solidus Bot Server running at http://localhost:${PORT}`);
  console.log(`   Socket.IO ready | Binance stream connecting…\n`);
  await initCandleService();
  startStream();
});

process.on('SIGINT', () => { stopStream(); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { stopStream(); server.close(() => process.exit(0)); });
