// backend/src/models/MLWeights.model.js
import mongoose from 'mongoose';

const mlWeightsSchema = new mongoose.Schema({
  asset: { type: String, required: true, index: true },
  weights: {
    news: { type: Number, default: 0.2 },
    momentum: { type: Number, default: 0.2 },
    volume: { type: Number, default: 0.2 },
    whale: { type: Number, default: 0.2 },
    social: { type: Number, default: 0.2 }
  },
  lastOptimized: { type: Date, default: Date.now }
});

export const MLWeights = mongoose.model('MLWeights', mlWeightsSchema);
