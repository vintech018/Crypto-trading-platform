# Crypto Terminal

Production-oriented AI-powered crypto intelligence dashboard monorepo.

## Services

- `backend`: Express + WebSocket market ingestion, broadcast, REST API
- `frontend`: Next.js dashboard with terminal UI
- `ai-service`: FastAPI research service with modular agents/tools

## Architecture

Exchange WebSocket Streams -> Data ingestion service -> Backend WebSocket broadcaster -> REST API -> Frontend dashboard

AI flow: Frontend -> Backend API gateway -> AI service -> tools/agents -> response

## Quick Start

### 1) Environment setup

Copy env templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cp ai-service/.env.example ai-service/.env
```

Fill keys:

- `CRYPTOPANIC_API_KEY`
- `ETHERSCAN_API_KEY`
- `OPENAI_API_KEY` (or your LLM provider key)

### 2) Install dependencies

```bash
cd crypto-terminal
npm install
cd backend && npm install
cd ../frontend && npm install
```

Python service:

```bash
cd ../ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3) Run services

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

AI service:

```bash
cd ai-service
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Endpoints

Backend (default `http://localhost:3001`):

- `GET /api/market/prices`
- `GET /api/market/candles?symbol=BTCUSDT&interval=1h&limit=100`
- `GET /api/news/latest`
- `GET /api/portfolio/:address`
- `POST /api/ai/research`
- `WS /` for `price_update`, `alerts`, `market_event`

AI service (default `http://localhost:8000`):

- `POST /research`

## Notes

- Backend maintains in-memory latest price cache and whale alerts cache.
- Alerts trigger when trade notional value exceeds configured threshold.
- Designed for extensibility with additional services (funding rates, liquidations, DeFi analytics).
