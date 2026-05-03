// backend/src/models/SocialSentiment.model.js
import mongoose from 'mongoose';

const socialSentimentSchema = new mongoose.Schema({
  asset: { type: String, required: true, index: true },
  text: { type: String },
  sentiment: { type: String, enum: ['bullish', 'bearish', 'neutral'], required: true },
  source: { type: String, default: 'Twitter' },
  impactScore: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const SocialSentiment = mongoose.model('SocialSentiment', socialSentimentSchema);
