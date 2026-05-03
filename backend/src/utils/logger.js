/**
 * logger.js — lightweight structured logger
 *
 * Exports:
 *  - default export : logger object  (error / warn / info / debug)
 *  - named export   : httpLogger     (Express middleware — logs every HTTP request)
 *
 * In production swap the log() internals for winston / pino JSON output.
 */

// ─── Level & colour map ───────────────────────────────────────
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLOURS = {
  error: "\x1b[31m",  // red
  warn:  "\x1b[33m",  // yellow
  info:  "\x1b[36m",  // cyan
  debug: "\x1b[35m",  // magenta
  reset: "\x1b[0m",
};

// Status-code colour: green 2xx, yellow 3xx, red 4xx/5xx
function statusColour(code) {
  if (code >= 500) return "\x1b[31m"; // red
  if (code >= 400) return "\x1b[33m"; // yellow
  if (code >= 300) return "\x1b[35m"; // magenta
  return "\x1b[32m";                  // green
}

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const ts  = new Date().toISOString();
  const col = COLOURS[level] ?? "";
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console[level === "error" ? "error" : "log"](
    `${col}[${ts}] [${level.toUpperCase()}]${COLOURS.reset} ${message}${metaStr}`
  );
}

// ─── Structured logger (unchanged API) ───────────────────────
const logger = {
  error: (msg, meta) => log("error", msg, meta),
  warn:  (msg, meta) => log("warn",  msg, meta),
  info:  (msg, meta) => log("info",  msg, meta),
  debug: (msg, meta) => log("debug", msg, meta),
};

export default logger;

// ─── HTTP request logger middleware ──────────────────────────
/**
 * Logs every HTTP request AFTER the response finishes so we can
 * capture the real status code and accurate response time.
 *
 * Format: [reqId] METHOD /path STATUS - Xms
 * Example: [a1b2-…] GET /api/auth/login 200 - 32ms
 *
 * Requires requestId middleware to run first (provides req.id).
 */
export function httpLogger(req, res, next) {
  const startedAt = Date.now();

  // Hook fires once the response is fully flushed to the client.
  res.on("finish", () => {
    const ms     = Date.now() - startedAt;
    const code   = res.statusCode;
    const col    = statusColour(code);
    const reset  = COLOURS.reset;
    const reqId  = req.id ?? "-";

    // Only log if info level is enabled
    if (LEVELS.info <= currentLevel) {
      console.log(
        `\x1b[90m[${reqId}]${reset} ` +           // dim grey request ID
        `\x1b[1m${req.method}${reset} ` +          // bold method
        `${req.originalUrl} ` +                    // full URL with query string
        `${col}${code}${reset} ` +                 // coloured status code
        `\x1b[90m- ${ms}ms${reset}`                // grey latency
      );
    }
  });

  next();
}

