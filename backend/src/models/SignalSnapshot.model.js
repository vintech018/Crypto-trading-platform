// backend/src/models/SignalSnapshot.model.js
import mongoose from 'mongoose';

const signalSnapshotSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  trending: [{
    asset: String,
    mentions: Number
  }],
  signals: [{
    asset: String,
    signal: String,
    strength: Number,
    aggregatedScore: Number,
    articleCount: Number,
    metrics: {
      bullish: Number,
      bearish: Number,
      avgImpact: Number,
      avgConfidence: Number
    }
  }],
  correlations: [{
    asset: String,
    signal: String,
    priceChange: Number,
    correlationScore: Number,
    signalAccuracy: String
  }]
}, {
  timestamps: true
});

export const SignalSnapshot = mongoose.model('SignalSnapshot', signalSnapshotSchema);
