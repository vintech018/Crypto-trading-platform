import { redisClient } from "../config/redis.js";
import logger from "./logger.js";
import { env } from "../config/env.js";

/**
 * Helper to cache heavy database queries safely.
 * If Redis fails, it naturally degrades to the fallback function.
 * 
 * @param {string} key - Redis key
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {Function} fallbackFn - The function to call if cache misses or Redis fails
 */
export async function withCache(key, ttlSeconds, fallbackFn) {
  if (!env.IS_PROD) {
    return await fallbackFn();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn(`[Redis Cache] GET failed for key ${key}: ${err.message}`);
    // Degrade gracefully, execute fallbackFn
  }

  const result = await fallbackFn();

  try {
    if (result) {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(result));
    }
  } catch (err) {
    logger.warn(`[Redis Cache] SETEX failed for key ${key}: ${err.message}`);
  }

  return result;
}
