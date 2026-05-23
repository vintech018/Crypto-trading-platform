import request from "supertest";
import app from "../../src/app.js";
import { generateTestUser, generateTestToken } from "../helpers/authHelper.js";
import { emitTradeEvent, analyticsQueue } from "../../src/analytics/services/analyticsEmitter.js";
import { jest } from "@jest/globals";

describe("📊 ANALYTICS QUEUE TESTS", () => {
  let token;
  let testUser;

  beforeAll(() => {
    console.log("\n==================================================");
    console.log("[TEST] STARTING ANALYTICS DURABLE QUEUE SUITE");
    console.log("==================================================\n");
  });

  beforeEach(async () => {
    testUser = await generateTestUser();
    token = generateTestToken(testUser._id);
    jest.clearAllMocks();
  });

  describe("↳ Background Event Emitter", () => {
    it("should enqueue a PENDING event to BullMQ", async () => {
      jest.spyOn(analyticsQueue, "add").mockResolvedValue({ id: "mock-job" });

      console.log("[TEST] Emitting offline TRADE_REPLICATION event to background worker...");
      
      await emitTradeEvent({
        userId: testUser._id,
        tradeId: "mock-trade-id",
        asset: "BTC",
        tradeType: "BUY",
        amount: 50000,
        pnl: 0,
        price: 50000,
        quantity: 1
      });

      // Verify BullMQ add was called
      expect(analyticsQueue.add).toHaveBeenCalledWith(
        "TRADE_REPLICATION",
        expect.objectContaining({
          userId: testUser._id,
          payload: expect.objectContaining({ asset: "BTC" })
        })
      );
      
      console.log("[TEST] ✓ Event captured natively by BullMQ durable queue.");
    });
  });

  describe("↳ Queue Statistics Retrieval", () => {
    it("should return the correct queue size from system endpoint", async () => {
      console.log("[TEST] Querying admin queue statistics endpoint...");
      
      // Mock the getJobCounts from BullMQ
      jest.spyOn(analyticsQueue, "getJobCounts").mockResolvedValue({
        waiting: 5,
        active: 2,
        failed: 1
      });

      const res = await request(app)
        .get("/api/system/queues")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.queues.analytics.waiting).toBe(5);
      expect(res.body.data.queues.analytics.failed).toBe(1);
      console.log(`[TEST] ✓ Queue metrics retrieved: ${res.body.data.queues.analytics.waiting} WAITING, ${res.body.data.queues.analytics.failed} FAILED.`);
    });
  });
});
