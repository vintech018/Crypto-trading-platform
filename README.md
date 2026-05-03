# SOLIDUS — Professional Crypto Trading Platform

<div align="center">

![SOLIDUS Banner](https://img.shields.io/badge/SOLIDUS-Crypto%20Trading%20Platform-white?style=for-the-badge&labelColor=000000)

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Production-grade, full-stack crypto trading simulation platform with real-time market data, a custom matching engine, double-entry ledger accounting, and financial-precision arithmetic.**

[Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Setup](#-setup) · [System Design](#-system-design)

</div>

---

## ✨ Features

### Trading Engine
- **Market Orders** — Instant BUY/SELL execution against live CoinGecko prices
- **Limit Order Book** — Price-time-priority matching engine with partial fills
- **Multi-coin Support** — BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, MATIC, DOT
- **Self-match prevention** — Users cannot match against their own orders

### Financial Precision
- **BigInt Decimal Library** — Custom `decimal.js` utility eliminates all IEEE-754 float errors (satoshi-level: 10⁸ precision)
- **Double-Entry Ledger** — Every financial event writes two immutable ledger entries (USD debit + coin credit, or vice versa)
- **Atomic Operations** — MongoDB session transactions (M2+) with M0 graceful fallback
- **Derivable Balances** — Wallet balance can be independently audited by replaying all ledger entries; drift detection built-in

### Portfolio & Reporting
- **Cost-Basis Tracking** — `avgBuyPrice` captured at trade execution time (not derived retroactively)
- **Pre-computed Realised P/L** — Stored on each SELL trade: `(sellPrice - avgBuyPrice) × quantity`
- **Live Unrealised P/L** — `currentPrice × qty − totalCost`
- **OHLC Candles** — Aggregated from real trade executions across 6 intervals (1m/5m/15m/1h/4h/1d)
- **Trade History** — Filterable by coin, type, and date range

### Security & Auth
- **JWT Access + Refresh Tokens** — Separate secrets; 15-min access, 7-day refresh
- **Token Blacklist** — O(1) in-memory Map for immediate logout invalidation
- **Password Complexity Validation** — Regex-enforced on signup (uppercase, lowercase, number, special char)
- **Helmet** — 11 HTTP security headers; CSP, HSTS, X-Frame-Options, CORS

### Real-Time
- **Binance WebSocket Streams** — Live ticker, order book depth, and trade feed (zero-latency)
- **Auto-reconnect** — Exponential backoff; symbol-switch preserves ticker stream

### UI Terminal
- **Professional Trading Interface** — Dark-mode, Bloomberg-style terminal layout
- **Panels** — Chart, Order Book, Trades Feed, Open Orders, Trade History, Portfolio, AI Insights, Whale Tracker, On-Chain, Alerts
- **Keyboard Shortcuts** — `O` orderbook, `P` portfolio, `R` orders, `H` history, `F` fullscreen
- **30-fps Price Flash** — Green/red price animation on live tick changes

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│                                                                             │
│   Next.js 15 App Router  ·  TypeScript  ·  Tailwind CSS                    │
│                                                                             │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────────┐  │
│  │  Terminal Page   │   │  Hub / Dashboard  │   │  Auth Pages          │  │
│  │  (Trading UI)    │   │  (Portfolio view) │   │  (Login / Signup)    │  │
│  └────────┬─────────┘   └────────┬──────────┘   └──────────┬───────────┘  │
│           │                      │                           │              │
│  ┌────────▼──────────────────────▼───────────────────────────▼───────────┐ │
│  │                         Zustand Store (marketStore)                   │ │
│  │  prices · orderBook · recentTrades · holdings · walletBalance         │ │
│  └──────────┬────────────────────────────────────────────────────────────┘ │
│             │  REST (apiClient.ts)              WebSocket (binanceSocket.ts)│
└─────────────┼───────────────────────────────────────────────────────────── ┘
              │ HTTP                              wss://stream.binance.com
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express.js / Node 22)                     │
│                                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│   │  /auth   │  │ /trade   │  │ /orders  │  │ /wallet  │  │ /reports  │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│        │              │              │              │               │        │
│   ┌────▼──────────────▼──────────────▼──────────────▼───────────────▼────┐ │
│   │                         Service Layer                                 │ │
│   │   auth.service   trade.service   order.service  wallet.service        │ │
│   │   portfolio.service   report.service   ohlc.service   price.service   │ │
│   └────────────────────────────┬──────────────────────────────────────────┘ │
│                                │  decimal.js (BigInt arithmetic)            │
│   ┌────────────────────────────▼──────────────────────────────────────────┐ │
│   │                     Matching Engine (order.service)                   │ │
│   │   Price-Time Priority  ·  Partial Fills  ·  Double Settlement         │ │
│   │   Self-match Prevention  ·  OHLC candle update on every fill          │ │
│   └────────────────────────────┬──────────────────────────────────────────┘ │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ Mongoose ODM
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MongoDB Atlas (M0 / M2+)                            │
│                                                                             │
│   Users   Wallets   Trades   Holdings   Ledger   Orders   OHLC   Prices    │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Compound Indexes for matching engine:                                │ │
│   │  { coin, type, status, price: -1, createdAt: 1 }  (BUY book)        │ │
│   │  { coin, type, status, price:  1, createdAt: 1 }  (SELL book)        │ │
│   │  { userId, createdAt: -1 }  (trade history)                           │ │
│   │  { coin, interval, openTime: -1 }  (OHLC candles) — unique           │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Trade Execution → DB → UI

```
User clicks "Buy"
      │
      ▼
TradeExecution.tsx
  POST /api/trade/buy  { coin, quantity, price }
      │
      ▼
trade.service.js → executeBuy()
  1. Validate wallet balance                ← MongoDB read
  2. Deduct wallet (BigInt arithmetic)      ← MongoDB write (Wallet)
  3. Upsert holding (weighted avg)          ← MongoDB write (Holding)
  4. Insert trade record (cost basis)       ← MongoDB write (Trade)
  5. Insert 2x ledger entries               ← MongoDB write (Ledger ×2)
  6. Update OHLC candles (6 intervals)      ← MongoDB upsert (OHLC ×6)
  All above = ATOMIC (session if M2+, sequential-safe on M0)
      │
      ▼
Response: { trade, walletBalance }
      │
      ▼
marketStore.addHoldingFromTrade()  ← Optimistic UI update
loadWalletFromBackend()            ← Authoritative sync
      │
      ▼
UI reflects new balance + holding instantly
```

---

## 🗄 Database Schema

### Collections Overview

| Collection | Documents | Key Fields |
|---|---|---|
| `users` | One per account | `email`, `passwordHash`, `name` |
| `wallets` | One per user | `balance` (cached from ledger) |
| `trades` | One per execution | `coin`, `type`, `price`, `avgBuyPrice`, `realisedPnL` |
| `holdings` | One per (user, coin) | `quantity`, `avgBuyPrice`, `totalCost` |
| `ledgers` | Two per trade | `type`, `amount`, `asset`, `balanceBefore`, `balanceAfter` |
| `orders` | One per limit order | `price`, `remainingQty`, `fills[]`, `status` |
| `ohlcs` | One per (coin, interval, bucket) | `o`, `h`, `l`, `c`, `volume` |
| `prices` | Snapshots | `coin`, `price`, `timestamp` |

### Ledger Double-Entry Design

Every BUY produces:
```
{ type: "BUY", asset: "USD",  amount: 1500, balanceBefore: 50000, balanceAfter: 48500 }
{ type: "BUY", asset: "ETH",  amount: 0.5,  balanceBefore: null,  balanceAfter: null  }
```
Wallet balance is always re-derivable:
```
balance = Σ(DEPOSIT) + Σ(SELL/USD) − Σ(BUY/USD) − Σ(WITHDRAW) − Σ(FEE)
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Register with password complexity validation |
| `POST` | `/api/auth/login` | — | Login → access + refresh tokens |
| `POST` | `/api/auth/logout` | ✅ | Blacklist access token |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token → new access token |
| `GET` | `/api/auth/me` | ✅ | Current user info |

### Trading (Market Orders)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/trade/buy` | ✅ | Market buy — instant execution |
| `POST` | `/api/trade/sell` | ✅ | Market sell — instant execution |
| `POST` | `/api/trade/deposit` | ✅ | Deposit funds (creates ledger entry) |

### Limit Orders & Matching Engine

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/orders` | ✅ | Place limit order → triggers matching engine |
| `GET` | `/api/orders` | ✅ | User's orders (filter: status, coin, page) |
| `DELETE` | `/api/orders/:id` | ✅ | Cancel open/partial order |
| `GET` | `/api/orders/trades` | ✅ | Trade history (filter: coin, type, date range) |
| `GET` | `/api/orders/book/:coin` | 🌐 | Order book snapshot (bids + asks) |
| `GET` | `/api/orders/candles/:coin` | 🌐 | OHLC chart data (interval, limit, pagination) |

### Wallet & Ledger

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/wallet/balance` | ✅ | Cached wallet balance (fast path) |
| `GET` | `/api/wallet/derived-balance` | ✅ | Ledger-derived balance (authoritative) |
| `GET` | `/api/wallet/ledger` | ✅ | Transaction history (type/asset/date filter) |
| `GET` | `/api/wallet/audit` | ✅ | Drift check: cached vs derived balance |

### Portfolio & Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/portfolio` | ✅ | Holdings with live P/L from CoinGecko |
| `GET` | `/api/reports` | ✅ | Full report: summary, monthly P&L, coin breakdown |

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free M0 tier works)
- CoinGecko API key (free tier)

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/solidus.git
cd solidus/Crypto-trading-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5050
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/solidus
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COINGECKO_API_URL=https://api.coingecko.com/api/v3
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

```bash
npm run dev   # nodemon with ESM
```

### 3. Frontend Setup

```bash
cd ..         # back to Crypto-trading-platform root
npm install
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5050
```

```bash
npm run dev   # Next.js dev server on :3000
```

### 4. Verify

```bash
curl http://localhost:5050/health
# → {"status":"ok"}

curl http://localhost:3000
# → Hub landing page
```

---

## 🐳 Docker (Optional)

```dockerfile
# backend/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ src/
EXPOSE 5050
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: ./backend
    ports: ["5050:5050"]
    env_file: ./backend/.env
    restart: unless-stopped

  web:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local
    depends_on: [api]
    restart: unless-stopped
```

---

## 🧪 Running Tests (Endpoint Smoke Test)

```bash
# Create user, execute trades, verify audit
EMAIL="test_$(date +%s)@example.com"
TOKEN=$(curl -sf -X POST http://localhost:5050/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"Test@1234\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# BUY
curl -sf -X POST http://localhost:5050/api/trade/buy \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"coin":"ETH","quantity":1,"price":3000}'

# AUDIT (drift should be 0)
curl -sf http://localhost:5050/api/wallet/audit \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 System Design

### Scaling Strategy

**Current (Single-node):**
- In-process price cache (30s TTL, Map)
- Sequential matching per coin
- Atlas M0 free tier

**Production Scale:**
```
                    ┌─────────────────┐
                    │   Load Balancer  │
                    │   (nginx/ALB)   │
                    └────────┬────────┘
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         API Node 1    API Node 2    API Node 3
              └─────────────┼─────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
         Redis Cluster              MongoDB Atlas
         (price cache,              (M10+ replica set,
          sessions,                  sharded on userId)
          rate limits)
```

- **Redis** — shared price cache, session store, rate-limit counters
- **MongoDB sharding** — shard key: `userId` (natural cardinality for wallet/holdings/ledger)
- **Matching engine per coin** — one Node process per coin (BTC-engine, ETH-engine) to eliminate cross-coin lock contention
- **WebSocket gateway** — dedicated service (Socket.io cluster with Redis adapter) for real-time order book updates

### Why MongoDB over PostgreSQL?

| Factor | MongoDB | PostgreSQL |
|---|---|---|
| **Schema flexibility** | Add `fills[]` array to orders without ALTER TABLE | Requires JOIN table + migration |
| **Aggregation pipeline** | OHLC candle upserts in one `$set` pipeline stage | Complex `ON CONFLICT` + CTEs |
| **Atlas M0** | Free tier with replica set, no operational overhead | Requires self-managed or paid PaaS |
| **Horizontal scale** | Native sharding | Citus or Partitioning required |
| **Atomic array push** | `$push` on `fills[]` in one operation | INSERT + UPDATE in a transaction |

**Trade-off:** PostgreSQL's ACID guarantees and typed schemas are stronger for pure financial systems in production. A hybrid approach (Postgres for ledger + MongoDB for real-time market data) would be ideal at scale.

### Financial Consistency Guarantees

1. **BigInt arithmetic** — all financial math uses scaled integers (×10⁸), never IEEE-754 floats
2. **Double-entry ledger** — every balance change writes ≥1 ledger entry; balance is always re-derivable
3. **`/api/wallet/audit`** — detects cached-vs-derived drift; any value > $0.01 triggers a `logger.error`
4. **Pre-computed cost basis** — `avgBuyPrice` stored on `Trade` at execution time; P/L survives position closure
5. **Atomic writes** — MongoDB sessions (M2+) wrap all 6 writes per trade; M0 gracefully degrades to sequential with rollback logging

---

## 📁 Project Structure

```
Crypto-trading-platform/
├── backend/
│   └── src/
│       ├── config/          # env validation, DB connection (DNS-patched for Atlas)
│       ├── controllers/     # HTTP handlers (thin — delegate to services)
│       ├── middlewares/     # auth guard, error handler, rate limiter, XSS
│       ├── models/          # Mongoose schemas (User, Wallet, Trade, Holding,
│       │                    #   Ledger, Order, OHLC, Price)
│       ├── routes/          # Express routers
│       ├── services/        # Business logic
│       │   ├── trade.service.js      # Market order execution + ledger
│       │   ├── order.service.js      # Matching engine + limit orders
│       │   ├── ohlc.service.js       # Candle aggregation
│       │   ├── wallet.service.js     # Balance + audit + ledger history
│       │   ├── portfolio.service.js  # Holdings + unrealised P/L
│       │   ├── report.service.js     # Full financial report
│       │   └── price.service.js      # CoinGecko + in-process cache + DB fallback
│       └── utils/
│           ├── decimal.js    # BigInt-based financial arithmetic (no float errors)
│           ├── logger.js     # Structured JSON logger (Winston)
│           ├── helpers.js    # AppError, sendSuccess
│           └── constants.js  # SUPPORTED_COINS, COINGECKO_ID_MAP
│
└── src/                     # Next.js frontend
    ├── app/                 # App router pages
    │   ├── terminal/        # Trading terminal (main UI)
    │   ├── hub/             # Portfolio dashboard
    │   ├── login/ signup/   # Auth pages
    │   └── dashboard/       # Analytics
    ├── components/terminal/ # Panel components
    │   ├── TradeExecution   # Market + limit order entry
    │   ├── OrderBook        # Live Binance depth stream
    │   ├── OpenOrders       # User's limit orders from backend
    │   ├── TradeHistory     # Filterable backend trade history
    │   ├── PortfolioPanel   # Holdings + P/L
    │   ├── ChartPanel       # TradingView Lightweight Charts
    │   └── ...12 more panels
    ├── state/
    │   └── marketStore.ts   # Zustand global store
    ├── services/
    │   └── binanceSocket.ts # WebSocket manager (ticker/depth/trades)
    └── lib/
        └── apiClient.ts     # Typed Axios wrapper + auth interceptors
```

---

## 🔒 Security

- **Helmet.js** — Content-Security-Policy, HSTS, X-Frame-Options, noSniff, referrer policy
- **CORS** — whitelist-based origin validation; no wildcard in production
- **JWT** — RS256-compatible (currently HS256); access tokens 15m, refresh 7d
- **Token blacklist** — O(1) Map lookup before every verify(); Redis-backed in production
- **bcrypt** — password hashing with salt rounds = 12
- **XSS-clean** — strips script injection from body/query/params
- **express-rate-limit** — auth endpoints rate-limited (login, signup, refresh)
- **Password policy** — min 8 chars, requires uppercase + lowercase + number + special character

---

## 📊 Performance Characteristics

| Operation | Latency (dev, M0) | Notes |
|---|---|---|
| Market BUY (6 DB writes) | ~800–1200ms | Atlas M0; M10+ would be ~50–100ms |
| Price fetch (cache hit) | <1ms | In-process Map |
| Price fetch (CoinGecko) | 200–400ms | Batch fetch, 30s cache TTL |
| Ledger audit (full replay) | 50–200ms | MongoDB aggregation pipeline |
| OHLC candle fetch (200 bars) | 30–80ms | Indexed on `{coin, interval, openTime}` |
| Limit order placement | 300–600ms | + matching time if fills exist |

---

## 🛣 Roadmap

- [ ] **Redis** — shared price cache, rate-limit store
- [ ] **WebSocket push** — order fill notifications (Socket.io)
- [ ] **OHLC Chart Integration** — wire `/api/orders/candles` into ChartPanel
- [ ] **Stop-Loss / Take-Profit** — triggered orders via price polling
- [ ] **Tax Export** — realised P/L CSV export per fiscal year
- [ ] **Docker Compose** — one-command dev stack
- [ ] **CI/CD** — GitHub Actions → Railway/Render auto-deploy

---

## 👤 Author

Built by **Vaibhav** as a portfolio/interview project demonstrating production-grade full-stack engineering across financial systems, real-time data, and scalable API design.

---

## 📄 License

MIT — see [LICENSE](LICENSE)
