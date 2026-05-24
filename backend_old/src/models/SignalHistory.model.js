// backend/src/models/SignalHistory.model.js
import mongoose from 'mongoose';

const signalHistorySchema = new mongoose.Schema({
  asset: { type: String, required: true, index: true },
  signal: { type: String, required: true },
  score: { type: Number },
  priceAtSignal: { type: Number },
  outcome: { type: String, enum: ['PROFIT', 'LOSS', 'PENDING'], default: 'PENDING' },
  pnlPercentage: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
  factors: { type: mongoose.Schema.Types.Mixed }
});

export const SignalHistory = mongoose.model('SignalHistory', signalHistorySchema);
