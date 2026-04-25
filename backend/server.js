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
    origin: ['http://localhost:3002', 'http://localhost:3000', process.env.FRONTEND_ORIGIN].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

// Wire bot engine emitters → Socket.IO
setEmitters({
  onUpdate: (bot) => io.emit(BOT_EVENTS.UPDATE, bot),
  onTrade: (trade) => io.emit(BOT_EVENTS.TRADE, trade),
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);
  // Send current list of all bots to newly connected client
  socket.emit(BOT_EVENTS.LIST, getAllBots());

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ── Express middleware ────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3002', 'http://localhost:3000', process.env.FRONTEND_ORIGIN].filter(Boolean) }));
app.use(express.json());

// ── REST API ───────────────────────────────────────────────────────────────

// GET /api/bots — list all bots
app.get('/api/bots', (_req, res) => {
  res.json(getAllBots());
});

// GET /api/bots/:id — single bot
app.get('/api/bots/:id', (req, res) => {
  const bot = getBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  res.json(bot);
});

// GET /api/wallet — get global wallet balance
app.get('/api/wallet', (_req, res) => {
  res.json(getWallet());
});

// POST /api/bots — create bot
app.post('/api/bots', (req, res) => {
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

  const wallet = getWallet();
  if (amount > wallet.balance) {
    return res.status(400).json({ error: `Insufficient capital. Available: $${wallet.balance.toFixed(2)}` });
  }

  const bot = createBot({ name, pair, amount, leverage, botClass, entryConditions, logic, exit });
  
  // Docker Orchestrator Hook
  if (bot.botClass === 'algo') {
    spawnCloudEngine(bot);
  }

  io.emit(BOT_EVENTS.LIST, getAllBots());
  res.status(201).json(bot);
});

// PATCH /api/bots/:id/start
app.patch('/api/bots/:id/start', (req, res) => {
  const bot = startBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  io.emit(BOT_EVENTS.UPDATE, bot);
  io.emit(BOT_EVENTS.LIST, getAllBots());
  res.json(bot);
});

// PATCH /api/bots/:id/stop
app.patch('/api/bots/:id/stop', (req, res) => {
  let bot = getBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  if (bot.position) {
    const candles = getCandles(bot.pair);
    const lastPrice = candles.length > 0 ? candles[candles.length - 1] : bot.position.entryPrice;
    bot = forceClosePosition(bot, lastPrice);
  }

  const stoppedBot = stopBot(req.params.id);
  io.emit(BOT_EVENTS.UPDATE, stoppedBot);
  io.emit(BOT_EVENTS.LIST, getAllBots());
  res.json(stoppedBot);
});

// DELETE /api/bots/:id
app.delete('/api/bots/:id', (req, res) => {
  const bot = getBot(req.params.id);
  const deleted = deleteBot(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Bot not found' });

  // Docker Orchestrator Hook
  if (bot && bot.botClass === 'algo') {
    terminateCloudEngine(req.params.id);
  }

  io.emit(BOT_EVENTS.LIST, getAllBots());
  res.json({ success: true });
});

// POST /api/webhook — Freqtrade Cloud Engine Listener
app.post('/api/webhook', (req, res) => {
  const { botId, type, price, pnl } = req.body;
  if (!botId) return res.status(400).json({ error: 'Missing botId' });

  let bot = getBot(botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const numericPrice = parseFloat(price) || 0;

  if (type === 'open') {
    bot.position = { entryPrice: numericPrice, size: bot.amount };
    bot.status = 'active';
    io.emit(BOT_EVENTS.TRADE, { botName: bot.name, type: 'open', price: numericPrice });
  } else if (type === 'close') {
    const numericPnl = parseFloat(pnl) || 0;
    bot.pnl += numericPnl;
    
    const wallet = getWallet();
    wallet.balance += numericPnl;

    bot.position = null;
    io.emit(BOT_EVENTS.TRADE, { botName: bot.name, type: 'close', pnl: numericPnl, price: numericPrice });
  }

  io.emit(BOT_EVENTS.UPDATE, bot);
  io.emit(BOT_EVENTS.LIST, getAllBots());

  console.log(`[Webhook] Processed ML signal for ${bot.name} (${type})`);
  res.status(200).json({ success: true });
});

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', bots: getAllBots().length, timestamp: new Date().toISOString() });
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
