import Redis from "ioredis";
import { env } from "./env.js";
import logger from "../utils/logger.js";

// Common configuration for exponential backoff and resilience
const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    // Reconnect after
    // 50ms, 100ms, 200ms, ..., max 2000ms
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
  },
};

let redisClient;
let redisPubClient;
let redisSubClient;

if (env.NODE_ENV === "test") {
  // Use memory mock in tests
  logger.info("[Redis] Initializing memory mocks for test environment");
  // We cannot use top-level await in Jest cleanly, so we use a very simple mock for tests.
  // Tests don't actually need full ioredis-mock since we mocked BullMQ.
  class DummyRedis {
    async setex() {}
    async get() { return null; }
    async del() {}
    async keys() { return []; }
    async ping() { return "PONG"; }
    on() {}
    call() {}
  }
  redisClient = new DummyRedis();
  redisPubClient = new DummyRedis();
  redisSubClient = new DummyRedis();
} else {
  redisClient = new Redis(env.REDIS_URL, redisOptions);
  redisPubClient = new Redis(env.REDIS_URL, redisOptions);
  redisSubClient = new Redis(env.REDIS_URL, redisOptions);

  redisClient.on("connect", () => logger.info("[Redis] Main Client connected"));
  redisClient.on("error", (err) => logger.error(`[Redis] Error: ${err.message}`));
  
  redisPubClient.on("connect", () => logger.info("[Redis] Pub Client connected"));
  redisSubClient.on("connect", () => logger.info("[Redis] Sub Client connected"));
}

export { redisClient, redisPubClient, redisSubClient };
