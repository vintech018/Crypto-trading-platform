import request from "supertest";
import app from "../../src/app.js";
import { generateTestUser, generateTestToken } from "../helpers/authHelper.js";
import Wallet from "../../src/models/Wallet.model.js";
import Holding from "../../src/models/Holding.model.js";
import Trade from "../../src/models/Trade.model.js";
import Ledger from "../../src/models/Ledger.model.js";

describe("📈 TRADING ENGINE TESTS", () => {
  let token;
  let testUser;

  beforeAll(() => {
    console.log("\n==================================================");
    console.log("[TEST] STARTING CORE TRADING ENGINE REGRESSION SUITE");
    console.log("==================================================\n");
  });

  beforeEach(async () => {
    testUser = await generateTestUser();
    token = generateTestToken(testUser._id);
  });

  describe("↳ Ledger & Deposits", () => {
    it("should successfully deposit funds and update wallet balance", async () => {
      console.log("[TEST] Simulating fiat deposit to wallet...");
      const res = await request(app)
        .post("/api/trade/deposit")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 10000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(10000);

      // Verify Wallet & Ledger in DB
      const wallet = await Wallet.findOne({ userId: testUser._id });
      expect(wallet.balance).toBe(10000);

      const ledger = await Ledger.findOne({ userId: testUser._id });
      expect(ledger.type).toBe("DEPOSIT");
      expect(ledger.amount).toBe(10000);
      console.log("[TEST] ✓ Deposit verified. Ledger entry created successfully.");
    });
  });

  describe("↳ Execution Engine (Buy & Sell)", () => {
    beforeEach(async () => {
      // Seed initial balance
      await request(app)
        .post("/api/trade/deposit")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 100000 }); // $100k
    });

    it("should execute BUY and deduct balance", async () => {
      console.log("[TEST] Executing BUY order for BTC...");
      const res = await request(app)
        .post("/api/trade/buy")
        .set("Authorization", `Bearer ${token}`)
        .send({ coin: "BTC", quantity: 1, price: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletBalance).toBe(50000); // 100k - 50k

      // Verify Holding
      const holding = await Holding.findOne({ userId: testUser._id, coin: "BTC" });
      expect(holding.quantity).toBe(1);
      expect(holding.avgBuyPrice).toBe(50000);

      // Verify Trade
      const trade = await Trade.findOne({ userId: testUser._id, type: "BUY" });
      expect(trade.coin).toBe("BTC");
      expect(trade.quantity).toBe(1);
      console.log(`[TEST] ✓ BUY execution successful. Holdings updated to ${trade.quantity} BTC.`);
    });

    it("should reject BUY with insufficient balance", async () => {
      console.log("[TEST] Attempting BUY order exceeding wallet balance...");
      const res = await request(app)
        .post("/api/trade/buy")
        .set("Authorization", `Bearer ${token}`)
        .send({ coin: "BTC", quantity: 3, price: 50000 }); // Cost 150k > 100k

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient balance/i);
      console.log(`[TEST] ✓ Risk engine rejected illegal order: ${res.body.message}`);
    });

    it("should execute SELL and realize PNL correctly", async () => {
      console.log("[TEST] Executing SELL order to calculate realized PnL...");
      // Execute Buy
      await request(app)
        .post("/api/trade/buy")
        .set("Authorization", `Bearer ${token}`)
        .send({ coin: "ETH", quantity: 10, price: 2000 }); // Cost 20k, Balance: 80k

      // Execute Partial Sell
      const res = await request(app)
        .post("/api/trade/sell")
        .set("Authorization", `Bearer ${token}`)
        .send({ coin: "ETH", quantity: 5, price: 3000 }); // Revenue 15k, Profit: 5 * 1000 = 5000

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.realisedPnL).toBe(5000);
      expect(res.body.data.walletBalance).toBe(95000); // 80k + 15k

      // Verify Holding Updated
      const holding = await Holding.findOne({ userId: testUser._id, coin: "ETH" });
      expect(holding.quantity).toBe(5);

      // Verify Ledger
      const sellLedger = await Ledger.findOne({ userId: testUser._id, type: "SELL" });
      expect(sellLedger.amount).toBe(15000);
      console.log(`[TEST] ✓ SELL execution successful. Realized PnL: +$${res.body.data.realisedPnL}`);
    });

    it("should reject SELL if holding is insufficient", async () => {
      console.log("[TEST] Attempting naked short-sell (illegal)...");
      const res = await request(app)
        .post("/api/trade/sell")
        .set("Authorization", `Bearer ${token}`)
        .send({ coin: "SOL", quantity: 10, price: 100 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/don't hold any/i);
      console.log(`[TEST] ✓ Risk engine rejected naked short: ${res.body.message}`);
    });
  });
});
