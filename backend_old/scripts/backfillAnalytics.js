import mongoose from 'mongoose';
import { prisma } from '../src/postgres/client.js';
import Trade from '../src/models/Trade.model.js';
import User from '../src/models/User.model.js';
import { processTradeReplication } from '../src/jobs/analyticsWorker.js';
import { takePortfolioSnapshot } from '../src/jobs/portfolioSnapshot.job.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables manually since this is a standalone script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function backfillAnalytics() {
  console.log('--- Starting Analytics Backfill ---');
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 2. Fetch all trades, sorted from oldest to newest
    console.log('Fetching trades from MongoDB...');
    const trades = await Trade.find().sort({ createdAt: 1 }).lean();
    console.log(`Found ${trades.length} trades to backfill.`);

    if (trades.length === 0) {
      console.log('No trades found. Nothing to backfill.');
    } else {
      // 3. Clear existing analytics data to avoid double-counting
      console.log('Wiping existing PostgreSQL analytics data...');
      await prisma.tradeAnalytics.deleteMany({});
      await prisma.dailyPnL.deleteMany({});
      await prisma.assetPerformance.deleteMany({});
      await prisma.monthlyPerformance.deleteMany({});
      await prisma.tradingStreak.deleteMany({});
      console.log('PostgreSQL analytics tables cleared.');

      // 4. Process each trade sequentially to rebuild aggregations accurately
      let processedCount = 0;
      for (const trade of trades) {
        // Construct the expected payload exactly as analyticsEmitter does
        const payload = {
          userId: trade.userId.toString(),
          tradeId: trade._id.toString(),
          asset: trade.coin,
          tradeType: trade.type,
          amount: trade.totalValue,
          pnl: trade.realisedPnL || 0,
          price: trade.price,
          quantity: trade.quantity,
        };

        const event = {
          userId: payload.userId,
          payload,
          createdAt: trade.createdAt
        };

        try {
          await processTradeReplication(event);
          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`Processed ${processedCount}/${trades.length} trades...`);
          }
        } catch (err) {
          console.error(`Failed to process trade ${trade._id}:`, err);
        }
      }
      console.log(`Successfully backfilled ${processedCount} trades into PostgreSQL.`);
    }

    // 5. Generate portfolio snapshots for all users
    console.log('Fetching users to generate portfolio snapshots...');
    const users = await User.find({}, "_id").lean();
    console.log(`Found ${users.length} users. Generating snapshots...`);
    
    // Clear existing snapshots
    await prisma.portfolioSnapshot.deleteMany({});
    
    let snapshotCount = 0;
    for (const user of users) {
      try {
        await takePortfolioSnapshot(user._id);
        snapshotCount++;
      } catch (err) {
        console.error(`Failed to create snapshot for user ${user._id}:`, err);
      }
    }
    console.log(`Successfully created snapshots for ${snapshotCount} users.`);

    console.log('--- Backfill Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

backfillAnalytics();
