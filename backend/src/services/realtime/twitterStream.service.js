// backend/src/services/realtime/twitterStream.service.js
import { broadcast } from './websocket.service.js';
import { SocialSentiment } from '../../models/SocialSentiment.model.js';

const ASSETS = ['BTC', 'ETH', 'SOL'];
const SENTIMENTS = ['bullish', 'bearish', 'neutral'];

/**
 * Mock Twitter/X Stream.
 * Generates mock tweets regarding tracked crypto assets.
 */
export const startTwitterStream = () => {
  console.log('[Twitter Stream] Connecting to stream...');
  
  setInterval(async () => {
    // Generate a random mock tweet every ~10 seconds
    const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    const sentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];
    
    let text = '';
    if (sentiment === 'bullish') {
      text = `Massive inflow for ${asset} just spotted. Huge breakout incoming! 🚀 #Crypto`;
    } else if (sentiment === 'bearish') {
      text = `Warning: Huge ${asset} wallet moved to exchange. Expect a dump soon! 📉`;
    } else {
      text = `${asset} consolidating at current support levels. Waiting for a move.`;
    }
    
    const impactScore = sentiment === 'neutral' ? 0.3 : Math.round((0.5 + Math.random() * 0.5) * 10) / 10;
    
    const tweet = {
      asset,
      text,
      sentiment,
      impactScore,
      source: 'Twitter',
      timestamp: new Date()
    };
    
    try {
      await SocialSentiment.create(tweet);
      broadcast('TWITTER_UPDATE', tweet);
    } catch (e) {
      console.error('[Twitter Stream] Save Error', e);
    }
    
  }, 10000);
};
