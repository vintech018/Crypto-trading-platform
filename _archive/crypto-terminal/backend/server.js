require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { ZodError } = require("zod");

const marketRoutes = require("./routes/marketRoutes");
const newsRoutes = require("./routes/newsRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const aiRoutes = require("./routes/aiRoutes");

const { initializeBroadcaster } = require("./websocket/broadcaster");
const { connectBinanceStream, stopBinanceStream } = require("./websocket/binanceStream");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  })
);
app.use(helmet());
app.use(express.json({ limit: "250kb" }));
app.use(morgan("combined"));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/ai", aiRoutes);

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors });
  }

  const status = err?.response?.status || err.statusCode || 500;
  const message =
    err?.response?.data?.detail || err?.response?.data?.error || err.message || "Internal server error";

  return res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3001);
const server = http.createServer(app);

initializeBroadcaster(server);
connectBinanceStream();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  stopBinanceStream();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  stopBinanceStream();
  server.close(() => process.exit(0));
});
