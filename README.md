# SOLIDUS — Professional Crypto Trading Platform

<div align="center">

![SOLIDUS Banner](https://img.shields.io/badge/SOLIDUS-Crypto%20Trading%20Platform-white?style=for-the-badge&labelColor=000000)

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Analytics-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Pub%2FSub-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Jest](https://img.shields.io/badge/Tests-17%20passing-C21325?style=flat-square&logo=jest)](https://jestjs.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Production-grade, full-stack crypto trading simulation platform with real-time market data, a custom matching engine, double-entry ledger accounting, analytics pipeline, and financial-precision arithmetic.**

[Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Setup](#-setup) · [Testing](#-testing) · [System Design](#-system-design)

</div>

---

## ✨ Features

### Trading Engine
- **Market Orders** — Instant BUY/SELL execution against live CoinGecko prices
- **Limit Order Book** — Price-time-priority matching engine with partial fills
- **Multi-coin Support** — BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, MATIC, DOT
- **Self-match prevention** — Users cannot match against their own orders
- **Risk Engine** — Validates balance sufficiency, rejects naked shorts, enforces position limits

### Financial Precision
- **BigInt Decimal Library** — Custom `decimal.js` utility eliminates all IEEE-754 float errors (satoshi-level: 10⁸ precision)
- **Double-Entry Ledger** — Every financial event writes two immutable ledger entries (USD debit + coin credit, or vice versa)
- **Atomic Operations** — MongoDB session transactions (M2+) with M0 graceful fallback
- **Derivable Balances** — Wallet balance can be independently audited by replaying all ledger entries; drift detection built-in

### Portfolio & Reporting
- **Cost-Basis Tracking** — `avgBuyPrice` captured at trade execution time (not derived retroactively)
- **Pre-computed Realised P/L** — Stored on each SELL trade: `(sellPrice - avgBuyPrice) × quantity`
- **Live Unrealised P/L** — `currentPrice × qty − totalCost`, updated in real-time via Binance WebSocket
- **OHLC Candles** — Aggregated from real trade executions across 6 intervals (1m/5m/15m/1h/4h/1d)
- **Trade History** — Filterable by coin, type, and date range
- **Portfolio Snapshots** — Daily automated snapshots via cron job (midnight UTC)

### Analytics Pipeline (PostgreSQL Sidecar)
- **BullMQ Durable Queue** — Trade events replicated to background analytics worker
- **PostgreSQL/Prisma Layer** — Dedicated analytics database for aggregations
- **Daily P&L Tracking** — Automated daily profit/loss aggregation
- **Asset Performance** — Per-coin performance metrics and breakdowns
- **Monthly Reports** — Monthly performance summaries with trend analysis
- **Trading Streaks** — Consecutive profitable trade tracking

### Security & Auth
- **Dual Auth Flow** — Email/password login + Google OAuth 2.0 (Passport.js)
- **JWT Access + Refresh Tokens** — Separate secrets; 15-min access, 7-day refresh
- **httpOnly Cookies** — `solidus_access`, `solidus_refresh`, `solidus_authed` with environment-aware `Secure`/`SameSite` flags
- **Token Blacklist** — In-memory Map (dev) / Redis-backed (prod) for immediate logout invalidation
- **Password Complexity Validation** — Regex-enforced on signup (uppercase, lowercase, number, special char)
- **Helmet** — 11 HTTP security headers; HSTS, X-Frame-Options, CORS
- **Rate Limiting** — Auth endpoints rate-limited with Redis store (prod) / memory (dev)
- **Avatar Upload** — Cloudinary-backed profile picture upload with Multer validation (MIME type, file size)

### Real-Time Data
- **Binance WebSocket Streams** — Live ticker, order book depth, and trade feed (zero-latency)
- **Socket.IO Backend** — Real-time trade notifications, portfolio updates, price broadcasts
- **Redis Pub/Sub Adapter** — Horizontal WebSocket scaling across multiple server instances
- **Auto-reconnect** — Exponential backoff; symbol-switch preserves ticker stream
- **Rate Limiting** — 120 events/min per socket; MAX 20 concurrent subscriptions
- **Mixed Content Protection** — Automatic HTTP→HTTPS protocol upgrade for WebSocket URLs

### UI Terminal
- **Professional Trading Interface** — Dark-mode, Bloomberg-style terminal layout
- **Panels** — Chart, Order Book, Trades Feed, Open Orders, Trade History, Portfolio, AI Insights, Whale Tracker, On-Chain, Alerts
- **Keyboard Shortcuts** — `O` orderbook, `P` portfolio, `R` orders, `H` history, `F` fullscreen
- **30-fps Price Flash** — Green/red price animation on live tick changes
- **Hub Dashboard** — Community leaderboard, live price strips, portfolio overview
- **Analytics Dashboard** — Equity curves, asset allocation, monthly breakdown charts
- **Profile Page** — Avatar upload, login history, account management

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│                                                                             │
│   Next.js 14 App Router  ·  TypeScript  ·  Tailwind CSS                    │
│                                                                             │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────────┐  │
│  │  Terminal Page   │   │  Hub / Dashboard  │   │  Auth Pages          │  │
│  │  (Trading UI)    │   │  (Portfolio view) │   │  (Login / Signup)    │  │
│  └────────┬─────────┘   └────────┬──────────┘   └──────────┬───────────┘  │
│           │                      │                           │              │
│  ┌────────▼──────────────────────▼───────────────────────────▼───────────┐ │
│  │                         Zustand Store (marketStore)                   │ │
│  │  prices · orderBook · recentTrades · holdings · walletBalance         │ │
│  └──┬──────────────────────────────────────────────────────────────┬─────┘ │
│     │  REST (apiClient.ts)        Socket.IO           WebSocket     │      │
└─────┼────────────────────────────────┼──────────────────────────────┼──────┘
      │ HTTP                           │ ws://                        │ wss://
      ▼                                ▼                              ▼
┌─────────────────────────────────────────┐          wss://stream.binance.com
│       BACKEND (Express.js / Node 22)    │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────────┐  │
│  │ /auth  │ │ /trade │ │ /analytics │  │
│  │ /user  │ │ /orders│ │ /upload    │  │
│  │ /wallet│ │/reports│ │ /system    │  │
│  └───┬────┘ └───┬────┘ └─────┬──────┘  │
│      └──────────┼────────────┘          │
│  ┌──────────────▼──────────────────┐    │
│  │        Service Layer            │    │
│  │  auth · trade · order · wallet  │    │
│  │  portfolio · report · ohlc      │    │
│  │  price · analytics · upload     │    │
│  └──────────┬──────────────────────┘    │
│  ┌──────────▼──────────────────────┐    │
│  │     Matching Engine             │    │
│  │  Price-Time Priority · Partial  │    │
│  │  Fills · Double Settlement      │    │
│  └──────────┬──────────────────────┘    │
│             │                           │
│  ┌──────────▼────┐  ┌──────────────┐   │
│  │  Socket.IO    │  │   BullMQ     │   │
│  │  (Redis PubSub│  │  (Analytics  │   │
│  │   Adapter)    │  │   Worker)    │   │
│  └──────────┬────┘  └──────┬───────┘   │
└─────────────┼──────────────┼───────────┘
              │              │
    ┌─────────▼────┐  ┌──────▼──────────┐
    │    Redis     │  │   PostgreSQL    │
    │  • Pub/Sub   │  │  (Analytics     │
    │  • Tokens    │  │   Sidecar)      │
    │  • Cache     │  │  Prisma ORM     │
    │  • Sessions  │  └─────────────────┘
    └──────┬───────┘
           │
    ┌──────▼──────────────────────────┐
    │    MongoDB Atlas (M0 / M2+)     │
    │                                 │
    │  Users  Wallets  Trades         │
    │  Holdings  Ledger  Orders       │
    │  OHLC  Prices                   │
    └─────────────────────────────────┘
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
  7. Emit TRADE_REPLICATION to BullMQ       ← Analytics pipeline
  All above = ATOMIC (session if M2+, sequential-safe on M0)
      │
      ▼
Response: { trade, walletBalance }
      │
      ├──→ Socket.IO emitTradeUpdate()      ← Real-time push to all clients
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

### MongoDB — Primary Data Store

| Collection | Documents | Key Fields |
|---|---|---|
| `users` | One per account | `email`, `passwordHash`, `name`, `profilePicture`, `loginHistory[]` |
| `wallets` | One per user | `balance` (cached from ledger) |
| `trades` | One per execution | `coin`, `type`, `price`, `avgBuyPrice`, `realisedPnL` |
| `holdings` | One per (user, coin) | `quantity`, `avgBuyPrice`, `totalCost` |
| `ledgers` | Two per trade | `type`, `amount`, `asset`, `balanceBefore`, `balanceAfter` |
| `orders` | One per limit order | `price`, `remainingQty`, `fills[]`, `status` |
| `ohlcs` | One per (coin, interval, bucket) | `o`, `h`, `l`, `c`, `volume` |
| `prices` | Snapshots | `coin`, `price`, `timestamp` |

### PostgreSQL — Analytics Sidecar (Prisma)

| Table | Purpose |
|---|---|
| `trade_analytics` | Replicated trade data for fast aggregations |
| `daily_pnl` | Daily profit/loss per user |
| `asset_performance` | Per-coin performance metrics |
| `monthly_performance` | Monthly summaries with equity snapshots |
| `trading_streaks` | Consecutive profitable trade tracking |
| `portfolio_snapshots` | Daily automated portfolio state snapshots |

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
| `POST` | `/api/auth/login` | — | Login → access + refresh tokens + httpOnly cookies |
| `POST` | `/api/auth/logout` | ✅ | Blacklist access token + clear cookies |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token → new access token |
| `GET` | `/api/auth/me` | ✅ | Current user info with login history |
| `GET` | `/api/auth/google` | — | Initiate Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | — | Google OAuth callback → issue tokens |

### Trading (Market Orders)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/trade/buy` | ✅ | Market buy — instant execution with risk validation |
| `POST` | `/api/trade/sell` | ✅ | Market sell — instant execution with P&L calculation |
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

### Analytics (PostgreSQL)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/daily-pnl` | ✅ | Daily P&L history with date range filter |
| `GET` | `/api/analytics/asset-performance` | ✅ | Per-coin performance breakdown |
| `GET` | `/api/analytics/monthly` | ✅ | Monthly performance summaries |
| `GET` | `/api/analytics/streaks` | ✅ | Trading streak data |
| `GET` | `/api/analytics/overview` | ✅ | Combined analytics overview |

### Upload & System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/upload/avatar` | ✅ | Upload profile picture (Cloudinary, max 5MB) |
| `GET` | `/api/system/queues` | ✅ | BullMQ queue statistics (admin) |

---

## 🚀 Setup

### Prerequisites

- **Node.js** 18+ (22 recommended)
- **MongoDB Atlas** account (free M0 tier works)
- **Redis** (local or cloud — [Redis Cloud free tier](https://redis.com/try-free/))
- **PostgreSQL** (local or cloud — [Neon free tier](https://neon.tech/) or [Supabase](https://supabase.com/))
- **Cloudinary** account (free tier — for avatar uploads)
- **Google Cloud Console** project (optional — for OAuth)

### 1. Clone

```bash
git clone https://github.com/vintech018/Crypto-trading-platform.git
cd Crypto-trading-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Core
PORT=5050
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/solidus

# PostgreSQL (Analytics)
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/solidus_analytics

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5050/api/auth/google/callback

# Cloudinary (optional — for avatar uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (optional — for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:5050
```

Initialize the analytics database:
```bash
npx prisma generate
npx prisma db push
```

Start the backend:
```bash
npm run dev   # nodemon with ESM — auto-restarts on file changes
```

### 3. Frontend Setup

```bash
cd ..         # back to Crypto-trading-platform root
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5050
```

```bash
npm run dev   # Next.js dev server on :3000
```

### 4. Run Both Together

```bash
npm run dev:all   # Runs frontend + backend concurrently
```

### 5. Verify

```bash
# Backend health
curl http://localhost:5050/
# → {"status":"ok","service":"SOLIDUS API","version":"1.0.0",...}

# Frontend
open http://localhost:3000
# → Landing page with live crypto prices
```

---

## 🧪 Testing

### Integration Test Suite (Jest)

The project includes a comprehensive integration test suite with **17 tests across 4 suites**:

```bash
cd backend
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage  # With coverage report
```

### Test Suites

| Suite | Tests | What It Validates |
|---|---|---|
| **Auth** (`auth.test.js`) | 6 | Signup, login, token refresh, logout, protected route access |
| **Trade** (`trade.test.js`) | 5 | Deposits, BUY/SELL execution, insufficient balance rejection, naked short rejection |
| **Analytics** (`analytics.test.js`) | 2 | BullMQ event enqueueing, queue statistics endpoint |
| **Upload** (`upload.test.js`) | 4 | Avatar upload, MIME type validation, file size limits, Multer security |

### Test Infrastructure

- **MongoMemoryServer** — Isolated in-memory MongoDB instance per test run
- **Global Mocks** — Cloudinary, Socket.IO, Prisma, BullMQ, Redis (no external calls)
- **Automatic Cleanup** — Database wiped between tests; connections closed after

### Quick Smoke Test (curl)

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

# PORTFOLIO
curl -sf http://localhost:5050/api/user/portfolio \
  -H "Authorization: Bearer $TOKEN"

# AUDIT (drift should be 0)
curl -sf http://localhost:5050/api/wallet/audit \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐳 Docker (Optional)

```dockerfile
# backend/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY prisma/ prisma/
RUN npx prisma generate
COPY src/ src/
EXPOSE 5050
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.9'
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./backend
    ports: ["5050:5050"]
    env_file: ./backend/.env
    depends_on: [redis]
    restart: unless-stopped

  web:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local
    depends_on: [api]
    restart: unless-stopped
```

---

## 🔧 System Design

### Scaling Strategy

**Current (Single-node):**
- In-process price cache (30s TTL, Map)
- Redis for token store, pub/sub, rate limiting
- Sequential matching per coin
- Atlas M0 free tier + Neon/Supabase PostgreSQL

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
          token blacklist,           sharded on userId)
          Socket.IO adapter,
          BullMQ queues,          PostgreSQL
          rate limits)             (analytics aggregations,
                                    Prisma ORM)
```

- **Redis** — Socket.IO pub/sub adapter, token blacklist, refresh token store, rate-limit counters, BullMQ job queue
- **MongoDB sharding** — shard key: `userId` (natural cardinality for wallet/holdings/ledger)
- **Matching engine per coin** — one Node process per coin (BTC-engine, ETH-engine) to eliminate cross-coin lock contention
- **WebSocket gateway** — Socket.IO cluster with Redis adapter for horizontal real-time scaling
- **Analytics worker** — BullMQ background worker processes trade events asynchronously into PostgreSQL

### Why MongoDB + PostgreSQL (Hybrid)?

| Concern | MongoDB | PostgreSQL |
|---|---|---|
| **Core trading data** | ✅ Flexible schema, atomic `$push` on `fills[]`, Atlas M0 free | — |
| **Analytics aggregations** | — | ✅ Prisma ORM, SQL aggregations, typed schemas |
| **OHLC candle upserts** | ✅ One `$set` pipeline stage | Complex `ON CONFLICT` + CTEs |
| **Time-series reports** | — | ✅ Window functions, GROUP BY month |
| **Horizontal scale** | ✅ Native sharding | Citus or partitioning required |
| **ACID guarantees** | ✅ Multi-doc transactions (M2+) | ✅ Native ACID |

**The hybrid approach gives the best of both:** MongoDB's flexibility for real-time trading, PostgreSQL's analytical power for reporting.

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
│   ├── prisma/
│   │   └── schema.prisma           # PostgreSQL analytics schema
│   ├── scripts/
│   │   └── backfillAnalytics.js    # Backfill script for existing trades
│   ├── tests/
│   │   ├── setup/
│   │   │   ├── jest.setup.js       # Global mocks (Cloudinary, Prisma, BullMQ, Redis)
│   │   │   └── test-db.js          # MongoMemoryServer lifecycle
│   │   ├── helpers/
│   │   │   └── authHelper.js       # Test user creation + token helpers
│   │   └── integration/
│   │       ├── auth.test.js        # 6 auth flow tests
│   │       ├── trade.test.js       # 5 trading engine tests
│   │       ├── analytics.test.js   # 2 BullMQ queue tests
│   │       └── upload.test.js      # 4 Multer security tests
│   └── src/
│       ├── analytics/              # PostgreSQL analytics layer
│       │   ├── controllers/        # Analytics API handlers
│       │   ├── routes/             # /api/analytics/* routes
│       │   └── services/           # Emitter, read service, trade analytics
│       ├── config/
│       │   ├── env.js              # Environment validation (11 config groups)
│       │   ├── passport.js         # Google OAuth + local JWT strategy
│       │   └── redis.js            # Redis client (main, pub, sub)
│       ├── controllers/            # HTTP handlers (thin — delegate to services)
│       │   ├── auth.controller.js  # Signup, login, logout, refresh, Google OAuth
│       │   ├── trade.controller.js # Buy, sell, deposit
│       │   ├── upload.controller.js# Avatar upload via Cloudinary
│       │   └── system.controller.js# Queue stats, health checks
│       ├── jobs/
│       │   ├── analyticsWorker.js  # BullMQ worker for trade replication
│       │   └── portfolioSnapshot.job.js # Daily portfolio snapshot cron
│       ├── middlewares/
│       │   ├── auth.middleware.js   # JWT verification (Bearer + cookie)
│       │   ├── rateLimit.middleware.js # Express rate limiter (Redis/memory)
│       │   ├── upload.middleware.js # Multer config (5MB, MIME validation)
│       │   └── validate.middleware.js # Request body validation
│       ├── models/                 # Mongoose schemas
│       ├── postgres/
│       │   └── client.js           # Prisma client singleton
│       ├── routes/                 # Express routers
│       ├── services/               # Business logic
│       │   ├── trade.service.js    # Market order execution + ledger
│       │   ├── order.service.js    # Matching engine + limit orders
│       │   ├── auth.service.js     # JWT signing, token rotation, Google auth
│       │   └── ...                 # wallet, portfolio, report, ohlc, price
│       ├── utils/
│       │   ├── decimal.js          # BigInt-based financial arithmetic
│       │   ├── logger.js           # Structured JSON logger (Pino)
│       │   ├── refreshTokenStore.js# Redis-backed (prod) / Map (dev)
│       │   ├── tokenBlacklist.js   # Redis-backed (prod) / Set (dev)
│       │   ├── cloudinary.js       # Cloudinary SDK wrapper
│       │   └── cache.js            # In-memory TTL cache
│       ├── websocket.js            # Socket.IO server (Redis adapter, rate limiting)
│       ├── app.js                  # Express app setup (middleware chain)
│       └── server.js               # Boot sequence (DB → HTTP → WS → Cron)
│
├── src/                            # Next.js 14 frontend
│   ├── app/                        # App router pages
│   │   ├── terminal/               # Trading terminal (main UI)
│   │   ├── hub/                    # Community hub + portfolio dashboard
│   │   │   └── analytics/          # Analytics charts page
│   │   ├── dashboard/              # User dashboard
│   │   │   └── profile/            # Profile settings + avatar upload
│   │   ├── login/ signup/          # Auth pages
│   │   ├── contact/                # Contact form
│   │   └── reports/                # Financial reports
│   ├── components/
│   │   ├── terminal/               # 12+ trading terminal panels
│   │   │   ├── TradeExecution.tsx   # Market + limit order entry
│   │   │   ├── ChartPanel.tsx      # TradingView Lightweight Charts
│   │   │   ├── PortfolioPanel.tsx   # Holdings + P/L + spot positions
│   │   │   ├── AlertsPanel.tsx     # Price alerts + trade notifications
│   │   │   └── ...                 # OrderBook, OpenOrders, TradeHistory, etc.
│   │   ├── profile/
│   │   │   └── AvatarUpload.tsx    # Cloudinary avatar upload component
│   │   └── ui/                     # Reusable UI primitives
│   ├── state/
│   │   └── marketStore.ts          # Zustand global store (prices, portfolio, WS)
│   ├── services/
│   │   └── binanceSocket.ts        # Binance WebSocket manager (SSR-safe)
│   └── lib/
│       └── apiClient.ts            # Typed fetch wrapper + auth + auto-refresh
│
├── tests.md                        # Jest testing guide (beginner-friendly)
├── run_entire.md                   # Full project run guide (beginner-friendly)
└── next.config.mjs                 # Next.js config (image domains, build opts)
```

---

## 🔒 Security

- **Helmet.js** — HSTS, X-Frame-Options, noSniff, referrer policy (11 headers)
- **CORS** — whitelist-based origin validation with credentials support; no wildcard in production
- **JWT** — HS256 with separate access/refresh secrets; access tokens 15m, refresh 7d
- **httpOnly Cookies** — `solidus_access`, `solidus_refresh` (httpOnly), `solidus_authed` (readable by Next.js middleware)
- **Environment-aware cookie flags** — `Secure: true` + `SameSite: none` in production; `Secure: false` + `SameSite: lax` in development
- **Token blacklist** — O(1) Map lookup (dev) / Redis `EXISTS` (prod) before every verify()
- **bcrypt** — password hashing with salt rounds = 12
- **Multer validation** — Avatar uploads restricted to JPEG/PNG/WebP, max 5MB, MIME type verification
- **express-rate-limit** — Auth endpoints rate-limited; Redis store in production
- **Password policy** — min 8 chars, requires uppercase + lowercase + number + special character
- **Trust proxy** — `app.set('trust proxy', 1)` for correct client IP behind load balancers

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
| WebSocket tick update | <10ms | Binance stream → Zustand store |
| Analytics event processing | <50ms | BullMQ worker → PostgreSQL write |
| Avatar upload (Cloudinary) | 1–3s | Depends on file size and network |

---

## 🛣 Roadmap

- [x] **Redis** — Token blacklist, refresh token store, Socket.IO adapter, rate limiting
- [x] **WebSocket push** — Socket.IO with Redis pub/sub adapter for real-time updates
- [x] **Analytics pipeline** — BullMQ + PostgreSQL for trade analytics
- [x] **Google OAuth** — Passport.js Google strategy
- [x] **Avatar upload** — Cloudinary integration with Multer validation
- [x] **Integration tests** — Jest + MongoMemoryServer (17 tests, 4 suites)
- [x] **Portfolio snapshots** — Daily cron job for equity tracking
- [ ] **OHLC Chart Integration** — Wire `/api/orders/candles` into ChartPanel
- [ ] **Stop-Loss / Take-Profit** — Triggered orders via price polling
- [ ] **Tax Export** — Realised P/L CSV export per fiscal year
- [ ] **CI/CD** — GitHub Actions → Railway/Render auto-deploy
- [ ] **E2E Tests** — Playwright browser tests for full user flows

---

## 👤 Author

Built by **Vaibhav** as a portfolio/interview project demonstrating production-grade full-stack engineering across financial systems, real-time data, analytics pipelines, and scalable API design.

---

## 📄 License

MIT — see [LICENSE](LICENSE)
