/**
 * Crypto Intelligence Platform - Backend Server
 * 
 * Production-grade real-time crypto market data server.
 * 
 * Architecture:
 * - Single Binance WebSocket connection (multiplexed)
 * - CoinGecko metadata for 14,000+ coins (cached)
 * - Price intelligence with USD/INR normalization
 * - Event throttling (100+ events/sec → 5 updates/sec)
 * - Client WebSocket hub for fan-out
 * - Kline streaming for real-time charts
 * 
 * @author Production-Grade System
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

// Services
import { coinMetadataService } from './services/CoinMetadataService.js';
import { binanceStreamManager } from './services/BinanceStreamManager.js';
import { priceIntelligenceService } from './services/PriceIntelligenceService.js';
import { eventThrottler } from './services/EventThrottler.js';
import { clientWebSocketHub } from './services/ClientWebSocketHub.js';
import { streamOrchestrator } from './services/StreamOrchestrator.js';
import { klineStreamService } from './services/KlineStreamService.js';

// Types
import type { BinanceTickerMessage, KlineUpdate } from './types/market.types.js';
import { DEFAULT_CONFIG } from './types/market.types.js';

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());

// ============================================
// REST API ENDPOINTS
// ============================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        services: {
            binance: binanceStreamManager.getStats(),
            prices: priceIntelligenceService.getStats(),
            throttler: eventThrottler.getStats(),
            hub: clientWebSocketHub.getStats(),
            orchestrator: streamOrchestrator.getStats(),
            metadata: coinMetadataService.getStats(),
        },
    });
});

/**
 * Search coins endpoint
 * Instant fuzzy search across 14,000+ coins
 */
app.get('/api/coins/search', (req, res) => {
    const query = req.query.q as string || '';
    const limit = parseInt(req.query.limit as string) || 20;

    const results = coinMetadataService.search(query, limit);
    res.json(results);
});

/**
 * Get all coins (paginated)
 */
app.get('/api/coins', (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    const allCoins = coinMetadataService.getAllCoins();
    const coins = allCoins.slice(offset, offset + limit);

    res.json({
        coins,
        total: allCoins.length,
        page,
        limit,
        hasMore: offset + limit < allCoins.length,
    });
});

/**
 * Get top coins by market cap
 */
app.get('/api/coins/top', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const coins = coinMetadataService.getTopCoins(limit);
    res.json(coins);
});

/**
 * Get current prices (snapshot)
 */
app.get('/api/prices', (req, res) => {
    const prices = priceIntelligenceService.getAllPrices();
    res.json(prices);
});

/**
 * Get price for specific symbols
 */
app.get('/api/prices/:symbols', (req, res) => {
    const symbols = req.params.symbols.split(',').map(s => s.toUpperCase());
    const prices = symbols
        .map(s => priceIntelligenceService.getPrice(s))
        .filter(Boolean);
    res.json(prices);
});

/**
 * Get top gainers
 */
app.get('/api/gainers', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const gainers = priceIntelligenceService.getTopGainers(limit);
    res.json(gainers);
});

/**
 * Get top losers
 */
app.get('/api/losers', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const losers = priceIntelligenceService.getTopLosers(limit);
    res.json(losers);
});

/**
 * Get/Set INR rate
 */
app.get('/api/inr-rate', (req, res) => {
    res.json({ rate: priceIntelligenceService.getUsdtInrRate() });
});

app.post('/api/inr-rate', (req, res) => {
    const { rate } = req.body;
    if (typeof rate === 'number' && rate > 0) {
        priceIntelligenceService.setUsdtInrRate(rate);
        res.json({ success: true, rate });
    } else {
        res.status(400).json({ error: 'Invalid rate' });
    }
});

// ============================================
// SERVER INITIALIZATION
// ============================================

const server = createServer(app);
const PORT = DEFAULT_CONFIG.port;

/**
 * Wire up the services:
 * Binance → PriceIntelligence → Throttler → Hub → Clients
 */
function setupDataPipeline(): void {
    // 1. Binance tickers → Price Intelligence
    binanceStreamManager.onTicker((ticker: BinanceTickerMessage) => {
        const priceUpdate = priceIntelligenceService.processTicker(ticker);
        eventThrottler.addUpdate(priceUpdate);
    });

    // 2. Throttled batches → Client Hub
    eventThrottler.on('batch', (updates) => {
        clientWebSocketHub.broadcastBatch(updates);
    });

    // 3. Client subscription requests → Stream Orchestrator
    clientWebSocketHub.on('subscribe', (symbols: string[]) => {
        streamOrchestrator.requestSubscription(symbols);
    });

    clientWebSocketHub.on('unsubscribe', (symbols: string[]) => {
        streamOrchestrator.releaseSubscription(symbols);
    });

    // 4. Client requests current prices
    clientWebSocketHub.on('get_prices', (client: any, symbols?: string[]) => {
        let prices;
        if (symbols && symbols.length > 0) {
            prices = symbols
                .map(s => priceIntelligenceService.getPrice(s))
                .filter(Boolean);
        } else {
            prices = priceIntelligenceService.getAllPrices();
        }

        client.ws.send(JSON.stringify({
            type: 'batch_update',
            data: prices,
            timestamp: Date.now(),
        }));
    });

    // 5. Kline (candlestick) subscriptions for real-time charts
    // Maps client → active kline subscriptions
    const clientKlineUnsubscribers = new Map<string, Map<string, () => void>>();

    clientWebSocketHub.on('subscribe_kline', (client: any, symbol: string, interval: string) => {
        const key = `${symbol}_${interval}`;

        // Get or create unsubscriber map for this client
        if (!clientKlineUnsubscribers.has(client.id)) {
            clientKlineUnsubscribers.set(client.id, new Map());
        }
        const clientSubs = clientKlineUnsubscribers.get(client.id)!;

        // Already subscribed?
        if (clientSubs.has(key)) return;

        // Subscribe to kline stream
        klineStreamService.subscribe(symbol, interval, (kline: KlineUpdate) => {
            // Send directly to this client
            if (client.ws.readyState === 1) { // OPEN
                client.ws.send(JSON.stringify({
                    type: 'kline_update',
                    data: kline,
                    timestamp: Date.now(),
                }));
            }
        }).then((unsubscribe) => {
            clientSubs.set(key, unsubscribe);
        });
    });

    clientWebSocketHub.on('unsubscribe_kline', (client: any, symbol: string, interval: string) => {
        const key = `${symbol}_${interval}`;
        const clientSubs = clientKlineUnsubscribers.get(client.id);

        if (clientSubs?.has(key)) {
            const unsubscribe = clientSubs.get(key)!;
            unsubscribe();
            clientSubs.delete(key);
        }
    });

    // Clean up kline subscriptions when client disconnects
    clientWebSocketHub.on('client_disconnected', (clientId: string) => {
        const clientSubs = clientKlineUnsubscribers.get(clientId);
        if (clientSubs) {
            for (const unsubscribe of clientSubs.values()) {
                unsubscribe();
            }
            clientKlineUnsubscribers.delete(clientId);
        }
    });

    console.log('[Server] Data pipeline configured');
}

/**
 * Start all services.
 */
async function startServices(): Promise<void> {
    console.log('[Server] Starting services...');

    // 1. Initialize coin metadata (CoinGecko)
    await coinMetadataService.initialize();

    // 2. Setup data pipeline
    setupDataPipeline();

    // 3. Connect to Binance
    await binanceStreamManager.connect();

    // 4. Initialize stream orchestrator
    streamOrchestrator.initialize();

    // 5. Start event throttler
    eventThrottler.start();

    // 6. Attach WebSocket hub to server
    clientWebSocketHub.attach(server);

    console.log('[Server] All services started');
}

/**
 * Graceful shutdown.
 */
function setupShutdown(): void {
    const shutdown = () => {
        console.log('\n[Server] Shutting down...');

        eventThrottler.stop();
        clientWebSocketHub.shutdown();
        streamOrchestrator.shutdown();
        binanceStreamManager.disconnect();

        server.close(() => {
            console.log('[Server] Shutdown complete');
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// ============================================
// START SERVER
// ============================================

server.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🚀 CRYPTO INTELLIGENCE PLATFORM - BACKEND SERVER 🚀     ║
╠══════════════════════════════════════════════════════════════╣
║  REST API:  http://localhost:${PORT}/api                         ║
║  WebSocket: ws://localhost:${PORT}/ws                            ║
║  Health:    http://localhost:${PORT}/api/health                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

    await startServices();
    setupShutdown();
});

export { app, server };
