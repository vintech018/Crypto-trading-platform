import pino from "pino";

// ─── Structured logger (Pino) ───────────────────────────────
const isProd = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "info";

const pinoLogger = pino({
  level: logLevel,
  transport: isProd ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  }
});

const logger = {
  error: (msg, meta) => meta ? pinoLogger.error(meta, msg) : pinoLogger.error(msg),
  warn:  (msg, meta) => meta ? pinoLogger.warn(meta, msg)  : pinoLogger.warn(msg),
  info:  (msg, meta) => meta ? pinoLogger.info(meta, msg)  : pinoLogger.info(msg),
  debug: (msg, meta) => meta ? pinoLogger.debug(meta, msg) : pinoLogger.debug(msg),
};

export default logger;

// ─── HTTP request logger middleware ──────────────────────────
export function httpLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    const code = res.statusCode;
    const reqId = req.id ?? "-";

    pinoLogger.info({
      reqId,
      method: req.method,
      url: req.originalUrl,
      status: code,
      durationMs: ms
    }, `${req.method} ${req.originalUrl} ${code} - ${ms}ms`);
  });

  next();
}

// ─── Structured Trade / Order Event Logging ─────────────────
export function logTradeExecution(type, { userId, coin, quantity, price, totalValue, tradeId } = {}) {
  logger.info(`[trade] ${type} executed`, {
    tradeId: tradeId ?? null,
    userId,
    coin,
    quantity,
    price,
    totalValue,
  });
}

export function logOrderPlacement({ userId, coin, quantity, price, type, orderId } = {}) {
  logger.info("[order] limit order placed", {
    orderId: orderId ?? null,
    userId,
    coin,
    quantity,
    price,
    type,
  });
}

export function logFailure(context, err, meta = {}) {
  logger.error(`[${context}] operation failed`, {
    error: err instanceof Error ? err.message : String(err),
    ...meta,
  });
}
