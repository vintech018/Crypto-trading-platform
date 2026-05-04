import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";

let io;

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(","),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error("Authentication error"));

      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.split("=").map((c) => c.trim());
        acc[key] = value;
        return acc;
      }, {});

      const token = cookies.solidus_access;
      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // Automatically join the user's room upon successful connection
    socket.join(socket.userId);
    socket.emit("authenticated", { message: "Connected to real-time feed." });

    socket.on("disconnect", () => {
      // Automatic cleanup
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
