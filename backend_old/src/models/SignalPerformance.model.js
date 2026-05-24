// backend/src/models/SignalPerformance.model.js
import mongoose from 'mongoose';

const signalPerformanceSchema = new mongoose.Schema({
  asset: { type: String, required: true, index: true },
  rolling7DayAccuracy: { type: Number, default: 0 },
  allTimeAccuracy: { type: Number, default: 0 },
  totalSignals: { type: Number, default: 0 },
  reliabilityBadge: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'LOW' },
  updatedAt: { type: Date, default: Date.now }
});

export const SignalPerformance = mongoose.model('SignalPerformance', signalPerformanceSchema);
