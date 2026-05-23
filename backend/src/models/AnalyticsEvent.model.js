/**
 * AnalyticsEvent.model.js — Durable event queue for PostgreSQL analytics replication
 *
 * ⚠️ ARCHITECTURE NOTE:
 * This collection acts as a reliable buffer. Core trading operations write
 * events here immediately without waiting for PostgreSQL. A background worker
 * polls this collection, attempts to replicate the data to PG, and handles retries.
 */

import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: ["TRADE_REPLICATION", "AUDIT_LOG", "DAILY_PNL", "ASSET_PERFORMANCE", "MONTHLY_PERFORMANCE", "TRADING_STREAK"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      description: "The data required to replicate the event to PostgreSQL",
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// Indexes for efficient queue polling and querying
// 1. Worker polling: quickly find PENDING events sorted by creation time
analyticsEventSchema.index({ status: 1, createdAt: 1 });
// 2. Worker retries: find FAILED events that are eligible for retry
analyticsEventSchema.index({ status: 1, retryCount: 1 });
// 3. User analytics monitoring
analyticsEventSchema.index({ userId: 1, status: 1 });

const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
