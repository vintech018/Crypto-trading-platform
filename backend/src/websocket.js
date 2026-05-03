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
