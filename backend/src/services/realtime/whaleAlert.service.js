// backend/src/services/realtime/whaleAlert.service.js
import { broadcast } from './websocket.service.js';
import { WhaleEvent } from '../../models/WhaleEvents.model.js';

const ASSETS = ['BTC', 'ETH', 'SOL'];
const PRICES = { BTC: 83000, ETH: 3000, SOL: 150 };

/**
 * Mock Whale Alert API.
 * Detects large transfers periodically.
 */
export const startWhaleAlerts = () => {
  console.log('[Whale Alerts] Starting monitoring...');
  
  setInterval(async () => {
    // Generate a whale alert every ~20 seconds
    const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    const direction = Math.random() > 0.5 ? 'INFLOW' : 'OUTFLOW'; // INFLOW to exchange (bearish usually), OUTFLOW to private wallet (bullish)
    
    const amount = asset === 'BTC' ? 500 + Math.random() * 1000 : asset === 'ETH' ? 10000 + Math.random() * 20000 : 50000 + Math.random() * 100000;
    const amountUSD = amount * PRICES[asset];
    
    const from = direction === 'INFLOW' ? 'Unknown Wallet' : 'Binance';
    const to = direction === 'INFLOW' ? 'Coinbase' : 'Unknown Wallet';
    
    const alert = {
      asset,
      amount: Math.round(amount),
      amountUSD: Math.round(amountUSD),
      direction,
      from,
      to,
      timestamp: new Date()
    };
    
    try {
      await WhaleEvent.create(alert);
      broadcast('WHALE_ALERT', alert);
    } catch (e) {
      console.error('[Whale Alerts] Save Error', e);
    }
    
  }, 20000);
};
