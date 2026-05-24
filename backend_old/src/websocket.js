import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisPubClient, redisSubClient } from "./config/redis.js";

let io;

export function initWebSocket(server) {
  const ioOptions = {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map(o => o.trim()).filter(Boolean),
      credentials: true,
    },
  };

  if (process.env.REDIS_URL) {
    ioOptions.adapter = createAdapter(redisPubClient, redisSubClient);
  }

  io = new Server(server, ioOptions);

  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=").map((c) => c.trim());
          acc[key] = value;
          return acc;
        }, {});
        token = cookies.solidus_access;
      }

      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // --- CONCURRENCY & RATE LIMITING ---
  // MAX_SUBSCRIPTIONS prevents memory leaks from too many active streams per user
  // RATE_LIMIT_WINDOW and MAX_EVENTS_PER_WINDOW throttle spammy clients
  const MAX_SUBSCRIPTIONS = 20;
  const RATE_LIMIT_WINDOW = 60000; // 1 min
  const MAX_EVENTS_PER_WINDOW = 120;

  io.on("connection", (socket) => {
    // Throttling / Rate limiting
    socket.eventCount = 0;
    socket.windowStart = Date.now();
    socket.subscriptions = new Set();

    socket.use((event, next) => {
      const now = Date.now();
      if (now - socket.windowStart > RATE_LIMIT_WINDOW) {
        socket.windowStart = now;
        socket.eventCount = 0;
      }
      
      socket.eventCount++;
      if (socket.eventCount > MAX_EVENTS_PER_WINDOW) {
        return next(new Error("Rate limit exceeded"));
      }

      // Check subscription caps if this is a subscribe event (custom logic depending on how UI subscribes)
      if (event[0] === "subscribe") {
        if (socket.subscriptions.size >= MAX_SUBSCRIPTIONS) {
          return next(new Error(`Maximum subscription limit reached (${MAX_SUBSCRIPTIONS})`));
        }
        socket.subscriptions.add(event[1]);
      }
      
      // Prevent subscription leaks by cleaning up on unsubscribe
      if (event[0] === "unsubscribe") {
        socket.subscriptions.delete(event[1]);
      }
      next();
    });

    // Automatically join the user's room upon successful connection
    socket.join(socket.userId);
    socket.emit("authenticated", { message: "Connected to real-time feed." });

    socket.on("disconnect", () => {
      socket.subscriptions.clear();
      // Automatic cleanup handled by socket.io natively (rooms etc)
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("WebSocket (Socket.IO) not initialized.");
  return io;
}

/**
 * Emit trade update to a specific user
 */
export function emitTradeUpdate(userId, payload) {
  if (!io) return;
  io.to(userId.toString()).emit("trade:update", payload);
}

/**
 * Emit position-closed events to a specific user's room.
 *
 * Fires three separate events so each UI panel can react independently:
 *   "positionClosed"       — Open Positions panel removes the row
 *   "portfolioUpdated"     — Portfolio/wallet panels refresh balance
 *   "tradeHistoryUpdated"  — Trade History panel appends the SELL record
 *
 * @param {string} userId
 * @param {object} payload
 * @param {string}  payload.coin
 * @param {number}  payload.quantity
 * @param {number}  payload.exitPrice
 * @param {number}  payload.realisedPnL
 * @param {object}  payload.trade        — full trade document
 * @param {object}  payload.portfolio    — fresh portfolio snapshot
 */
export function emitPositionClosed(userId, payload) {
  if (!io) return;
  const room = userId.toString();
  io.to(room).emit("positionClosed",      payload);
  io.to(room).emit("portfolioUpdated",    { portfolio: payload.portfolio });
  io.to(room).emit("tradeHistoryUpdated", { trade: payload.trade });
}
