# Solidus — Technical Viva Reference

Code-backed audit of **Crypto-trading-platform** (Next.js 14 frontend + Express/MongoDB backend).  
Also present but secondary: `news/` (small Next stubs), `crypto-terminal/` (separate Express stack).

---

## 1. Syllabus mapping

| # | Topic | Status | Where / notes |
|---|--------|--------|----------------|
| 1 | Client–server & request lifecycle | ✅ | Browser → `NEXT_PUBLIC_BACKEND_URL` (`src/lib/apiClient.ts`); Express `app` + listen (`backend/src/server.js`, `app.js`). |
| 2 | Node setup, modules, file handling | ✅ | ESM `"type": "module"` (`backend/package.json`); PDF uses `doc.pipe(res)` (`backend/src/services/pdf.service.js`). |
| 3 | Node pros/cons (usage) | ⚠️ | Async I/O via Mongoose; `bcrypt.hash` / `compare` on login path (`auth.service.js`) — CPU on event loop. |
| 4 | Built-in `http` module | ❌ | Not used in `backend/src`; Express abstracts HTTP. |
| 5 | Express & NPM | ✅ | `express`, `mongoose`, `socket.io`, etc. (`backend/package.json`, root `package.json`). |
| 6 | Routing (methods, params, handlers) | ✅ | `spot.routes.js`, `order.routes.js`, `auth.routes.js`; `req.params` e.g. cancel order. |
| 7 | Static files, streams, errors | ⚠️ | Static: `express.static` `/static` (`app.js`). Streams: mainly PDF. Errors: `error.middleware.js`. |
| 8 | Middleware | ✅ | Helmet, CORS, body, cookies, XSS, logger, auth, validation, rate limit, 404/error (`app.js`). |
| 9 | Blocking vs non-blocking | Mixed | Async handlers; bcrypt cost on auth. |
| 10 | Body parsing | ✅ | `express.json`, `express.urlencoded` (`app.js`). |
| 11 | SSR vs CSR; EJS/HBS | ⚠️ | Next App Router + `'use client'` terminal. **No EJS/HBS** in tree. |
| 12 | SQL/NoSQL, MongoDB, Mongoose | NoSQL only | Models under `backend/src/models/`. **SQL: missing.** |
| 13 | Sessions, cookies | ⚠️ | **No `express-session`.** JWT + `cookie-parser`; httpOnly cookies (`auth.controller.js`). |
| 14 | bcrypt, JWT, Passport | ✅ | `auth.service.js`, `auth.middleware.js`, `passport.js`, `auth.routes.js`. |
| 15 | Real-time (Socket.io) | ✅ | `backend/src/websocket.js`; client `marketStore.ts` → `trade:update`. |

**Note:** Raw `ws` exists in `services/realtime/websocket.service.js` as `initWebSocketServer`, but **`server.js` never calls it** — only Socket.IO `initWebSocket` runs. `broadcast()` from whale/twitter services targets an uninitialized server unless wired elsewhere.

---

## 2. Auth flow (viva script)

1. **Signup:** `POST /api/auth/signup` → `validateSignup` → `auth.service.signup` → `bcrypt.hash` → `User.create` → `Wallet` + `Ledger` (rollback user if wallet fails) → token pair → httpOnly cookies (`auth.routes.js`, `auth.controller.js`).
2. **Login:** `POST /api/auth/login` → `validateLogin` → `bcrypt.compare` → login history → tokens + cookies.
3. **Google OAuth:** `GET /api/auth/google` → Passport → `googleCallback` → tokens + redirect (`passport.js`).
4. **Protected routes:** `authenticate` reads `Authorization: Bearer` or `solidus_access` cookie (`auth.middleware.js`).
5. **Refresh:** `POST /api/auth/refresh` — JWT verified; **in-memory** `refreshTokenStore` (`utils/refreshTokenStore.js`).
6. **Logout:** token blacklist (in-memory) + refresh revoke (`auth.controller.js`).

---

## 3. Trade & order flows

### Spot (market)

- Client: `TradeExecution.tsx` → `POST /api/trade/buy` or `/sell`.
- `spot.routes.js`: `authenticate` + `validateTrade` → `trade.controller.js`.
- `trade.service.js`: `executeBuy` / `executeSell` — wallet, holding, trade, ledger; optional Mongoose session; M0 fallback **without** transaction (race risk).

### Limit orders

- Client: `POST /api/orders` (`TradeExecution.tsx`).
- `order.routes.js`: **`POST /` has no `validateTrade`** — only `authenticate`.
- `order.service.js`: `Order.create` → `_runMatcher` → per fill, `executeBuy`/`executeSell` for both legs.

### Express middleware order (memorize)

Documented in `app.js`: Helmet → `requestId` → CORS → JSON/urlencoded → `cookieParser` → `passport.initialize` → `xss-clean` → `httpLogger` → static → **routers** → `notFoundHandler` → `errorHandler`.

---

## 4. Middleware list

| Layer | Role |
|--------|------|
| `helmet` | Security headers |
| `requestId` | `req.id`, tracing |
| `cors` | Origin policy, credentials |
| `express.json` / `urlencoded` | `req.body` |
| `cookieParser` | `req.cookies` |
| `passport.initialize` | OAuth |
| `xss-clean` | Sanitize body/query/params |
| `httpLogger` | Request logging |
| `validateSignup` / `validateLogin` / `validateTrade` | Validation + normalize body |
| `authenticate` | JWT → `req.user`, `req.token` |
| `authLimiter` | Rate limit on auth routes |
| `errorHandler` / `notFoundHandler` | Errors |

**Gaps:** No global rate limit on trade/order writes; no CSRF middleware; limit orders lack body validation middleware.

---

## 5. Database (schemas & issues)

- **Models:** `User`, `Wallet` (unique `userId`), `Holding` (unique `userId+coin`), `Trade`, `Order`, `Ledger`, plus intelligence/news models.
- **Relations:** ObjectId references, not SQL FKs.
- **Indexes:** e.g. `Trade` by `userId` + `createdAt`; `Order` compound indexes for matcher (`Order.model.js`).

**Logic issues:**

- Limit orders: comments mention reservation; **`placeLimitOrder` does not lock funds** — multiple OPEN BUYs can exceed cash until settlement fails.
- Matcher: `tradeId` on fills uses **incoming** user’s trade only, not resting user’s.
- M0 / no transaction: concurrent `executeBuy` can **overspend** (read-modify-write race).

---

## 6. Real-time

- Server: Socket.IO on same HTTP server; handshake JWT from `solidus_access` cookie; `socket.join(userId)`; `emitTradeUpdate` → `trade:update` (`websocket.js`).
- Client: `initFromBackend` in `terminal/page.tsx` and `hub/page.tsx` — dynamic `socket.io-client`.

**Config risk:** HTTP uses `NEXT_PUBLIC_BACKEND_URL`; socket uses **`NEXT_PUBLIC_API_URL`** (`marketStore.ts`) — two env vars; `.env.local` may only set one.

**Limit-order emit bug:** `order.controller.js` passes `latestTrade: fills[0]` where `fills` is `{ restingOrderId, tradeId, fillQty, fillPrice }`, not a `Trade` document — wrong shape for consumers expecting a trade.

---

## 7. Critical bugs (be ready to explain)

| Bug | Evidence |
|-----|-----------|
| “Open orders” UI is holdings | `OpenOrders.tsx` calls `GET /api/user/portfolio`, not `GET /api/orders`. Terminal maps this to the **orders** panel. |
| Resting limit still updates local holdings | `TradeExecution.tsx` calls `addHoldingFromTrade` for **both** filled and resting limit paths. |
| Dead / misleading `GET /api/orders` in `app.js` | `app.use("/api/orders", orderRoutes)` wins; later `app.get([..., "/api/orders"], …)` for trade history **never runs** for that path. Actual `GET /api/orders` = user orders (`order.controller.js`). |
| Matcher partial two-leg failure | `order.service.js`: if first `execute*` succeeds and second throws, `catch` does `continue` — **no rollback** of first leg. |
| Leverage is UI-only | Frontend gates on `notional/leverage`; API only gets `quantity` and `price` — backend charges full notional. |
| Order book panel ≠ internal book | `OrderBook.tsx` uses Binance-fed `marketStore.orderBook`, not `GET /api/orders/book/:coin`. |

---

## 8. Security (viva Q&A)

| Topic | Finding |
|--------|---------|
| CSRF | No CSRF token; CORS + `SameSite=Lax` mitigates some cases only. |
| Token expiry | `jwt.verify` in `authenticate`; expired → 403. |
| Refresh | In-memory store — **not** multi-instance or restart-safe. |
| Cookies | `httpOnly`, `sameSite: lax`, `secure` in prod (`auth.controller.js`). |
| Brute force | `authLimiter` on signup/login/refresh — **not** on `/api/trade` or `/api/orders`. |
| JWT in logs | Dev-only `console.log` of full JWT in auth — remove before production. |

---

## 9. Failure & race scenarios

- **DB mid-transaction:** Session path aborts; M0 path can leave inconsistent state.
- **Concurrent buys (M0):** Two wallet reads → both pass → **overspend** possible.
- **Socket down:** HTTP still succeeds; UI depends on refetch / `loadWalletFromBackend` / `triggerTradeSync`.
- **Stale UI:** Optimistic updates + limit-order bug worsen drift vs Mongo.

---

## 10. Order matching (what to say)

- Price-time priority for resting orders; fill price = **maker (resting)** price (`order.service.js`).
- Partial fills: `PARTIAL`, `remainingQty` on `Order` model.
- **Not production-safe:** no outer transaction for full match cycle; skip-on-error after partial settlement; no fund reservation on place.

---

## 11. Architecture verdict

- **Scalability:** Weak — in-memory blacklist + refresh store; Socket.IO without Redis adapter; matcher not multi-node safe.
- **Structure:** Routes → controllers → services → models is clear; `app.js` also has large inline handlers (`/api/session`, duplicate trade listing intent).
- **Production scores (honest):** scalability ~3/10, security ~4/10, reliability ~3/10, performance ~5/10 for demo-scale load.

---

## 12. Gap table (quick revision)

| Concept | Status | Fix direction |
|---------|--------|----------------|
| Native `http` | Missing | Academic only unless you drop Express |
| EJS/HBS | Missing | Map to Next SSR or add if syllabus requires |
| SQL | Missing | Optional second store |
| `express-session` | Missing | JWT+cookie design is intentional |
| Limit `POST` validation | Missing | Reuse `validateTrade` + side checks |
| Fund reservation | Missing | Lock balance/holding on place; release on cancel |
| Matcher atomicity | Broken | One transaction or saga + compensate |
| Orders UI | Wrong | Wire to `GET /api/orders`; rename component |
| Socket env | Risk | Single `NEXT_PUBLIC_BACKEND_URL` for fetch + io |
| `ws` intelligence feed | Dead | Call `initWebSocketServer` or remove |
| Token persistence | Weak | Redis for refresh + blacklist |

---

## 13. Improvement plan (if examiner asks “what next?”)

1. Fix matcher: two-leg atomicity or compensation; reserve funds on limit place; correct per-user `tradeId` on fills.
2. Fix UI: orders panel → `GET /api/orders`; no optimistic holdings for resting limits; align leverage with API or remove.
3. Unify backend URL env for REST + Socket.IO.
4. Redis for refresh tokens and JWT blacklist; rate-limit trade endpoints.
5. Remove JWT debug logging; add CSRF strategy if cookie auth stays primary.
6. Production features still missing: fees, idempotency, min notional, real order-book UI for internal book.

---

## 14. Key file paths (for “show me in the codebase”)

| Area | Path |
|------|------|
| App & middleware order | `backend/src/app.js` |
| Server entry + Socket.IO boot | `backend/src/server.js`, `backend/src/websocket.js` |
| Auth | `backend/src/routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `middlewares/auth.middleware.js`, `config/passport.js` |
| Spot trades | `backend/src/routes/spot.routes.js`, `services/trade.service.js`, `controllers/trade.controller.js` |
| Limit orders | `backend/src/routes/order.routes.js`, `services/order.service.js`, `models/Order.model.js` |
| Portfolio | `backend/src/services/portfolio.service.js`, `routes/user.routes.js` |
| Frontend API | `src/lib/apiClient.ts` |
| Terminal trading UI | `src/components/terminal/TradeExecution.tsx`, `OpenOrders.tsx`, `OrderBook.tsx` |
| State + socket client | `src/state/marketStore.ts` |
| Next route guard | `src/middleware.ts` |

---

*Use this doc to defend architecture choices, admit known bugs with file names, and tie every claim to paths above.*
