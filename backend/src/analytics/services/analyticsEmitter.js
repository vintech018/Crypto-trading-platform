import { Queue } from "bullmq";
import logger from "../../utils/logger.js";
import { redisClient } from "../../config/redis.js";

// Initialize BullMQ Queue
export const analyticsQueue = new Queue("analytics-queue", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep in dead letter queue for inspection
  },
});

import { processTradeReplication, processAuditLog } from "../../jobs/analyticsWorker.js";

/**
 * Non-blocking emitter for trade events.
 * Enqueues a TRADE_REPLICATION event to BullMQ.
 * This should be called without `await` to maintain fire-and-forget behavior.
 */
export async function emitTradeEvent(payload) {
  try {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`[analyticsEmitter] DEV MODE: Direct execution for trade ${payload.tradeId}`);
      processTradeReplication({ userId: payload.userId, payload, createdAt: new Date() }).catch(err => {
        logger.error(`[analyticsEmitter] Direct trade execution failed`, { error: err.message });
      });
      return;
    }

    await analyticsQueue.add("TRADE_REPLICATION", {
      userId: payload.userId,
      payload,
    });
    logger.debug(`[analyticsEmitter] Enqueued TRADE_REPLICATION event for trade ${payload.tradeId}`);
  } catch (err) {
    logger.error(`[analyticsEmitter] Failed to enqueue TRADE_REPLICATION event`, { error: err.message, tradeId: payload.tradeId });
  }
}

/**
 * Non-blocking emitter for audit events.
 * Enqueues an AUDIT_LOG event to BullMQ.
 */
export async function emitAuditEvent(userId, action, metadata = {}) {
  try {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`[analyticsEmitter] DEV MODE: Direct execution for audit ${action}`);
      processAuditLog({ userId, payload: { action, metadata }, createdAt: new Date() }).catch(err => {
        logger.error(`[analyticsEmitter] Direct audit execution failed`, { error: err.message });
      });
      return;
    }

    await analyticsQueue.add("AUDIT_LOG", {
      userId,
      payload: { action, metadata },
    });
    logger.debug(`[analyticsEmitter] Enqueued AUDIT_LOG event for user ${userId}, action ${action}`);
  } catch (err) {
    logger.error(`[analyticsEmitter] Failed to enqueue AUDIT_LOG event`, { error: err.message, userId, action });
  }
}
