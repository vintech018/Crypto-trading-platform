import cron from 'node-cron';
import { processAndStoreNews } from '../services/news.service.js';
import { getTrendingAssets } from '../services/trendEngine.js';
import { aggregateSignals } from '../services/aggregateSignalEngine.js';
import { calculateCorrelations } from '../services/correlationEngine.js';
import { SignalSnapshot } from '../models/SignalSnapshot.model.js';

export const startNewsCronJob = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron Job] Fetching and analyzing news...');
    try {
      const savedCount = await processAndStoreNews();
      console.log(`[Cron Job] News processed successfully. Saved ${savedCount} new articles.`);
      
      console.log('[Cron Job] Generating Intelligence Snapshot...');
      const trending = await getTrendingAssets();
      const signals = await aggregateSignals();
      const correlations = await calculateCorrelations();
      
      await SignalSnapshot.create({
        trending,
        signals,
        correlations
      });
      console.log('[Cron Job] Intelligence Snapshot created.');
    } catch (error) {
      console.error('[Cron Job] Error processing news:', error.message);
    }
  });
  console.log('[Cron Job] News cron job scheduled to run every 15 minutes.');
};
