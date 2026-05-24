/**
 * app.js — Express application setup
 *
 * Middleware order (intentional — do not rearrange):
 *  1. Helmet     — HTTP security headers on every response
 *  2. Request ID — unique tracing ID on req.id + X-Request-Id header
 *  3. CORS       — cross-origin policy for the Next.js frontend
 *  4. Body parse — parses JSON / URL-encoded bodies
 *  5. XSS clean  — strips script injection from req.body / query / params
 *  6. HTTP logger — logs method, URL, status, latency, request ID
 *  7. Static     — serves /public directory
 *  8. Routes     — API business logic (rate limiting inside auth routes)
 *  9. 404 + Error handler — catches everything else
 */

import express    from "express";
import helmet     from "helmet";
import cors       from "cors";
import cookieParser from "cookie-parser";
import path       from "path";
import { fileURLToPath } from "url";

import { env }            from "./config/env.js";
import passport          from "./config/passport.js";
import { requestId }      from "./middlewares/requestId.middleware.js";
import { httpLogger }     from "./utils/logger.js";

import authRoutes      from "./routes/auth.routes.js";
import spotRoutes      from "./routes/spot.routes.js";
import walletRoutes    from "./routes/wallet.routes.js";
import userRoutes      from "./routes/user.routes.js";
import reportRoutes    from "./routes/report.routes.js";
import orderRoutes     from "./routes/order.routes.js";
import newsRoutes      from "./routes/news.routes.js";
import intelligenceRoutes from "./routes/intelligence.routes.js";
import alertRoutes     from "./routes/alert.routes.js";
import uploadRoutes    from "./routes/upload.routes.js";
import systemRoutes    from "./routes/system.routes.js";
// ─── Analytics (PostgreSQL sidecar — isolated secondary layer) ────────────
// This import adds the NEW /api/analytics/* routes only.
// It does NOT modify any existing route, middleware, or business logic.
import analyticsRoutes from "./analytics/routes/analytics.routes.js";

import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { authenticate }                   from "./middlewares/auth.middleware.js";
import { getPnl }                         from "./controllers/report.controller.js";
import User                               from "./models/User.model.js";
import Trade                             from "./models/Trade.model.js";
import Wallet                            from "./models/Wallet.model.js";
import Holding                           from "./models/Holding.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const { IS_PROD, CORS_ORIGIN } = env;

const app = express();

// Trust the first proxy (e.g. Railway/Render load balancer) for rate limiting to work
app.set("trust proxy", 1);

// ─── 1. Helmet — HTTP Security Headers ───────────────────────
// Goes FIRST so every response (including errors) gets headers.
// Helmet sets 11+ headers by default including X-Content-Type-Options,
// X-DNS-Prefetch-Control, X-Download-Options, X-Permitted-Cross-Domain-Policies,
// and removes X-Powered-By automatically (replaces app.disable("x-powered-by")).
app.use(helmet({

  // Content-Security-Policy — controls which origins can load scripts/styles/images.
  // In dev: permissive so Next.js hot-reload and inline styles work.
  // In prod: locked down to self + your frontend origin only.
  contentSecurityPolicy: IS_PROD
    ? {
        directives: {
          defaultSrc:  ["'self'"],                          // only load from own origin
          scriptSrc:   ["'self'"],                          // no inline scripts
          styleSrc:    ["'self'", "'unsafe-inline'"],       // allow inline styles (common in APIs)
          imgSrc:      ["'self'", "data:", "https:"],       // allow images from HTTPS sources
          connectSrc:  ["'self'", ...CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)],
          fontSrc:     ["'self'", "https:", "data:"],
          objectSrc:   ["'none'"],                          // block <object>, <embed>, <applet>
          frameAncestors: ["'none'"],                       // same as X-Frame-Options: DENY
        },
      }
    : false,  // disable CSP in development (avoids breaking Next.js dev server)

  // X-Frame-Options — prevents your API responses from being embedded in iframes.
  // "DENY" = no framing allowed at all (prevents clickjacking).
  // Helmet v7+ uses frameguard submodule for this.
  frameguard: { action: "deny" },

  // HSTS — tells browsers to ONLY use HTTPS for future requests.
  // Only enabled in production because local dev uses HTTP.
  // maxAge: 1 year (31536000s) is the recommended minimum for HSTS preload.
  hsts: IS_PROD
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,

  // Prevents browsers from MIME-sniffing the Content-Type.
  // Without this, a browser might interpret a JSON response as HTML.
  noSniff: true,

  // Disables the deprecated X-XSS-Protection header.
  // Modern browsers don't use it, and it can introduce vulnerabilities.
  // Helmet v7 disables it by default; we're explicit here for clarity.
  xXssProtection: false,

  // Prevents Adobe Flash/Reader from loading data from this domain.
  crossOriginResourcePolicy: { policy: "same-origin" },

  // Controls how much referrer info is sent on navigations.
  // "no-referrer" in prod = leak nothing; "no-referrer-when-downgrade" in dev.
  referrerPolicy: {
    policy: IS_PROD ? "no-referrer" : "no-referrer-when-downgrade",
  },
}));

// ─── 2. Request ID ───────────────────────────────────────────────
// Runs immediately after Helmet so the tracing ID is available
// on req.id for every subsequent middleware, route, and error handler.
// Also sets X-Request-Id response header (visible in DevTools / Postman).
app.use(requestId);

// ─── 3. CORS ──────────────────────────────────────────────────
// Allowed origins come from env.CORS_ORIGIN (validated at startup).
const ALLOWED_ORIGINS = CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  // Explicitly list allowed headers/methods — tighter than the wildcard default
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
}));

// ─── 4. Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── 4b. Cookie Parser ────────────────────────────────────────
// Must come AFTER body parsing. Required for reading httpOnly JWT cookies
// set by Google OAuth callback and the login/signup endpoints.
app.use(cookieParser());

// ─── 4c. Passport (OAuth only, no sessions) ───────────────────
// initialize() wires passport middleware. We do NOT call session()
// because we use JWTs, not server-side sessions.
app.use(passport.initialize());

// ─── 5. Input Validation Layer (Replaced XSS Clean) ───────────
// We removed xss-clean as it is deprecated. Input sanitization is now
// handled explicitly via centralized validation logic and React's native escaping.

// ─── 6. HTTP Logger ────────────────────────────────────────────
// Logs: [reqId] METHOD /url STATUS - Xms  (fires on res.finish, so status is real)
// req.id is already set by requestId middleware — no dependency risk.
app.use(httpLogger);

// ─── 7. Static Assets ─────────────────────────────────────────
app.use("/static", express.static(path.join(__dirname, "../public")));

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok", type: "process" }));

app.get("/ready", async (_req, res) => {
  try {
    const mongoose = (await import("mongoose")).default;
    const { redisClient } = await import("./config/redis.js");
    const { prisma } = await import("./postgres/client.js");

    const mongoState = mongoose.connection.readyState;
    const isMongoReady = mongoState === 1;

    let isRedisReady = false;
    try {
      isRedisReady = (await redisClient.ping()) === "PONG";
    } catch (e) {}

    let isPostgresReady = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isPostgresReady = true;
    } catch (e) {}

    if (isMongoReady && isRedisReady && isPostgresReady) {
      res.json({ status: "ok", dependencies: { mongo: true, redis: true, postgres: true } });
    } else {
      res.status(503).json({ status: "degraded", dependencies: { mongo: isMongoReady, redis: isRedisReady, postgres: isPostgresReady } });
    }
  } catch (err) {
    res.status(503).json({ status: "error" });
  }
});

// ─── 8. API Routes ────────────────────────────────────────────
// Rate limiting lives inside auth.routes.js — not globally here.
app.use("/api/auth",        authRoutes);
app.use("/api/trade",       spotRoutes);
app.use("/api/wallet",      walletRoutes);
app.use("/api/user",        userRoutes);
app.use("/api/reports",     reportRoutes);
app.use("/api/orders",      orderRoutes);
app.use("/api/news",        newsRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/alerts",      alertRoutes);
app.use("/api/uploads",     uploadRoutes);
app.use("/api/system",      systemRoutes);
// ─── Analytics sidecar (PostgreSQL — SECONDARY, isolated, non-blocking) ───
// NEW endpoints only: GET /api/analytics/pnl|monthly|top-assets
// MongoDB-backed core routes above are completely unmodified.
app.use("/api/analytics",   analyticsRoutes);

app.get("/api/pnl", authenticate, getPnl);

// ─── Test / Debug Routes ──────────────────────────────────────
// GET /api/test-auth — confirms JWT middleware is working.
// Returns the decoded token payload so you can verify claims.
app.get("/api/test-auth", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Authenticated ✅",
    user: {
      id:     req.user.id,
      userId: req.user.userId,
      email:  req.user.email,
      iat:    req.user.iat,
      exp:    req.user.exp,
      expiresAt: new Date(req.user.exp * 1000).toISOString(),
    },
    tokenSource: req.headers["authorization"]
      ? "Authorization header"
      : "solidus_access cookie",
  });
});

// GET /api/me — returns the full user document from MongoDB.
// Proxy for /api/auth/me that also surfaces loginHistory.
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({
      success: true,
      user: {
        id:             user._id,
        name:           user.name,
        email:          user.email,
        profilePicture: user.profilePicture,
        createdAt:      user.createdAt,
        lastLogin:      user.lastLogin,
        loginCount:     (user.loginHistory || []).length,
        recentLogins:   (user.loginHistory || []).slice(-10).reverse(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Persistence Verification Routes ──────────────────────────────

/**
 * GET /api/transactions
 * GET /api/orders
 *
 * Canonical, frontend-friendly alias for trade history.
 * Identical data to GET /api/trade/history but with a simpler URL.
 * All data is scoped to req.user.id — never leaks across users.
 *
 * Query params (all optional, same as /api/trade/history):
 *   coin       — filter by asset ticker (e.g. BTC)
 *   startDate  — ISO date lower bound
 *   endDate    — ISO date upper bound
 *   page       — 1-indexed (default 1)
 *   limit      — items per page (default 50, max 200)
 */
app.get(["/api/transactions", "/api/orders"], authenticate, async (req, res) => {
  try {
    const { coin, startDate, endDate, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(200, Math.max(1, Number(limit)));
    const safePage  = Math.max(1, Number(page));
    const skip      = (safePage - 1) * safeLimit;

    // Always filter by the authenticated user — never trusts frontend-provided userId
    const filter = { userId: req.user.id };
    if (coin) filter.coin = coin.toUpperCase();
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [total, trades] = await Promise.all([
      Trade.countDocuments(filter),
      Trade.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    ]);

    res.json({
      success: true,
      data: {
        transactions: trades.map(t => ({
          id:          t._id,
          type:        t.type,        // "BUY" | "SELL"
          asset:       t.coin,        // matches requested field name
          coin:        t.coin,
          quantity:    t.quantity,
          price:       t.price,
          amount:      t.totalValue,  // matches requested field name
          totalValue:  t.totalValue,
          fee:         t.fee ?? 0,
          status:      t.status ?? "COMPLETED",
          avgBuyPrice: t.avgBuyPrice ?? null,
          realisedPnL: t.realisedPnL ?? null,
          createdAt:   t.createdAt,
        })),
        pagination: {
          total,
          page:  safePage,
          limit: safeLimit,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/session
 *
 * Dashboard bootstrap endpoint.
 * Returns everything the frontend needs in ONE request to prove that
 * all user activity persists correctly across logins and login methods.
 *
 * Response:
 *   user         — profile + lastLogin + loginCount
 *   wallet       — current cash balance
 *   tradeCount   — total trades (BUY + SELL) ever made by this user
 *   holdingCount — number of open positions
 *   loginHistory — last 5 login events (for observability)
 */
app.get("/api/session", authenticate, async (req, res) => {
  console.log("\n[Debug] /api/session route hit");
  console.log("User ID:", req.user.id);
  try {
    const uid = req.user.id;

    const [user, wallet, tradeCount, holdingCount] = await Promise.all([
      User.findById(uid).lean(),
      Wallet.findOne({ userId: uid }).lean(),
      Trade.countDocuments({ userId: uid }),
      Holding.countDocuments({ userId: uid }),
    ]);

    console.log("[Debug] /api/session data fetched:", !!user, !!wallet);

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.json({
      success: true,
      data: {
        user: {
          id:             user._id,
          name:           user.name,
          email:          user.email,
          profilePicture: user.profilePicture,
          createdAt:      user.createdAt,
          lastLogin:      user.lastLogin,
          loginCount:     (user.loginHistory || []).length,
          // Last 5 logins — shows method ("google"|"email") + IP
          recentLogins:   (user.loginHistory || []).slice(-5).reverse(),
        },
        wallet: {
          balance:   wallet?.balance ?? 0,
        },
        activity: {
          tradeCount,
          holdingCount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 9. 404 + Error Handlers (MUST be last) ──────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
