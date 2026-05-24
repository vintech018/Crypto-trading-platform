import { sendSuccess } from "../utils/helpers.js";
import { redisClient } from "../config/redis.js";
import { analyticsQueue } from "../analytics/services/analyticsEmitter.js";

/**
 * GET /api/system/queues
 * Returns queue depth and active jobs
 */
export async function getQueues(req, res, next) {
  try {
    const jobCounts = await analyticsQueue.getJobCounts();
    return sendSuccess(res, 200, "Queue metrics retrieved.", {
      queues: {
        analytics: jobCounts,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/redis-health
 * Returns Redis connectivity status
 */
export async function getRedisHealth(req, res, next) {
  try {
    const ping = await redisClient.ping();
    const isConnected = ping === "PONG";
    return sendSuccess(res, 200, "Redis health retrieved.", {
      status: isConnected ? "healthy" : "unhealthy",
      ping,
    });
  } catch (err) {
    return sendSuccess(res, 503, "Redis is unreachable.", {
      status: "down",
      error: err.message,
    });
  }
}

/**
 * GET /api/system/workers
 * Returns active BullMQ workers on the queue
 */
export async function getWorkers(req, res, next) {
  try {
    const workers = await analyticsQueue.getWorkers();
    return sendSuccess(res, 200, "Worker stats retrieved.", {
      activeWorkers: workers.length,
      workers,
    });
  } catch (err) {
    next(err);
  }
}
