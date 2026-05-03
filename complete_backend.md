# Complete Solidus Backend Architecture Map

This document outlines the entire backend architecture currently interacting with the frontend of the Solidus Crypto Trading Platform. It covers both the mock/development state of the authentication system and the active microservices and WebSockets operating within the crypto terminal.

---

## 1. Authentication Layer (Port 5050)
* **Backend Source Location**: `backend/` directory
* **Primary Entry File**: `backend/src/server.js`
* **Frontend Component Using It**: `src/components/AuthFlow.tsx`
* **Transport Method**: Standard HTTP (`fetch()`)

### Current State:
* The directory structure is well-architected for a robust backend, but the actual authentication functional files (`auth.routes.js` and `auth.controller.js`) are currently empty placeholders in the codebase.
* The login page acts purely as an architectural frontend mock. The UI acts robustly and fires API calls to localhost port `5050`, but the underlying Node.js Express server does not yet contain the actual JWT token generation, database fetching (`Prisma`/`models`), or password comparison logic (`bcrypt`).
* For **Google & Apple OAuth**, the application currently uses a mocked UI simulation (using `MOCK_ACCOUNTS`) with localized delays to simulate an OAuth flow. It doesn't actually send real OAuth tokens to the backend right now.

### Expected Endpoints:
* `POST /auth/login` - Submits email and password to receive JWT `accessToken`.
* `POST /auth/signup` - Registers a new user account and requests a `twoFaToken`.

---

## 2. Crypto Terminal Microservices (Port 3001)
The crypto-terminal has its own isolated backend environment (`crypto-terminal/backend/`) and frontend. The dedicated backend handles fetching aggregated crypto stats, managing AI operations, and establishing WebSocket broadcasters.

* **Backend Source Location**: `crypto-terminal/backend/` directory
* **Frontend File Using It**: `crypto-terminal/frontend/utils/api.js` (Centralized Axios Client)
* **Transport Method**: Axios HTTP requests

### Active Endpoints:
* `GET /api/news/latest` - Used by `NewsPanel` to fetch aggregated crypto news.
* `GET /api/market/ticker/:symbol` - Fetches current real-time statistics for specific ticker symbols.
* `GET /api/market/candles` - Pulls historical candlestick charting data (used heavily by TradingView elements).
* `GET /api/market/alerts/whales` - Pulls recent large token transfers and whales activities.
* `GET /api/portfolio/:address` - Fetches mock portfolio tracker balances and positions.
* `POST /api/ai/research` - Triggers the AI research agent (`AIResearchPanel`) for symbol analysis.

---

## 3. Real-Time Streaming Networks (WebSockets)
Live crypto pricing relies primarily on WebSocket transmission rather than standard HTTP polling to ensure zero-latency data visualization.

### A. Internal Broadcaster (Port 3001)
The local Node.js environment processes, formats, and emits real-time data to local components.
* **Backend Source**: `crypto-terminal/backend/websocket/broadcaster.js`
* **Frontend File Using It**: `crypto-terminal/frontend/hooks/useCryptoStream.js`
* **Transport Method**: `WebSocket (ws://)`
* **Usage**: Provides the frontend with real-time `price_update`, `candle_update`, and pushing real-time `alerts` to trigger local state changes instantaneously.

### B. Direct Binance Connectivity (External)
For absolute zero-latency on live prices and charts, parts of the application bypass the internal Node proxy and connect straight to major exchanges.
* **Frontend File Using It**: `src/services/binanceSocket.ts`
* **Transport Method**: `WebSocket (wss://)`
* **Usage**: Establishes a direct peer-connection to `wss://stream.binance.com:9443/ws`. Bypasses custom Node.js servers completely to ensure zero-latency data feeds directly from the exchange to charts.

---

## Conclusion
The global frontend currently splits its backend responsibilities across distinct operational zones:
1. **Port 5050** (`backend/`): Strictly designed for global state, authorization, user profiles, and future database models mapping users to trades. (Currently pending full implementation).
2. **Port 3001** (`crypto-terminal/backend/`): Specifically targeted microservices that serve as market data aggregators, AI processing queues, and real-time custom WebSocket proxy broadcasters.
3. **Direct Exchange Pipes**: Client-side direct stream connections (e.g. `stream.binance.com`) for ultra-low latency price execution and visualization.
