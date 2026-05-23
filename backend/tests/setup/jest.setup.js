import { jest } from "@jest/globals";
import { connectTestDB, closeTestDB, clearTestDB } from "./test-db.js";
// --- Global Mocks to Protect External Services ---

// 1. Mock Cloudinary to prevent real uploads during tests
jest.unstable_mockModule("../../src/utils/cloudinary.js", () => ({
  uploadStream: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test-cloud/image/upload/v1234/test-avatar.png",
    public_id: "test-avatar-id"
  }),
  deleteAsset: jest.fn().mockResolvedValue({ result: "ok" }),
  isCloudinaryConfigured: jest.fn().mockReturnValue(true)
}));

// 2. Mock Socket.io/Websockets to prevent broadcasting errors
jest.unstable_mockModule("../../src/websocket.js", () => ({
  initWebSocket: jest.fn(),
  getIO: jest.fn(),
  emitTradeUpdate: jest.fn(),
  emitPriceUpdate: jest.fn(),
  emitPositionClosed: jest.fn()
}));

// 3. Mock Prisma Client to isolate PostgreSQL
jest.unstable_mockModule("@prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {
        this.tradeAnalytics = {
          create: jest.fn().mockResolvedValue({ id: 1 }),
          aggregate: jest.fn().mockResolvedValue({ _sum: { pnl: 0, amount: 0 } }),
          findMany: jest.fn().mockResolvedValue([])
        };
        this.dailyPnL = {
          upsert: jest.fn().mockResolvedValue({ id: 1 }),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        };
        this.assetPerformance = {
          upsert: jest.fn().mockResolvedValue({ id: 1 }),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        };
        this.monthlyPerformance = {
          upsert: jest.fn().mockResolvedValue({ id: 1 }),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        };
        this.tradingStreak = {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        };
        this.portfolioSnapshot = {
          create: jest.fn().mockResolvedValue({ id: 1 })
        };
      }
      async $connect() {}
      async $disconnect() {}
    }
  };
});

// 4. Mock BullMQ
jest.unstable_mockModule("bullmq", () => {
  return {
    Queue: class {
      constructor() {}
      add = jest.fn().mockResolvedValue({ id: "mock-job-id" });
      getJobCounts = jest.fn().mockResolvedValue({ waiting: 0, active: 0, failed: 0 });
      getWorkers = jest.fn().mockResolvedValue([]);
    },
    Worker: class {
      constructor() {}
      on = jest.fn();
      close = jest.fn().mockResolvedValue(true);
    }
  };
});

// 5. Mock rate-limit-redis
jest.unstable_mockModule("rate-limit-redis", () => ({
  RedisStore: class {
    constructor() {}
    async increment() { return { totalHits: 1, resetTime: new Date() }; }
    async decrement() {}
    async resetKey() {}
  }
}));

// Setup Global DB hooks
// MongoMemoryServer downloads a binary on first run — needs extra time
beforeAll(async () => {
  await connectTestDB();
}, 120_000);

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeTestDB();
}, 30_000);
