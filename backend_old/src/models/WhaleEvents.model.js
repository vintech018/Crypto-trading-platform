// backend/src/models/WhaleEvents.model.js
import mongoose from 'mongoose';

const whaleEventSchema = new mongoose.Schema({
  asset: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  amountUSD: { type: Number },
  direction: { type: String, enum: ['INFLOW', 'OUTFLOW'], required: true },
  from: { type: String },
  to: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const WhaleEvent = mongoose.model('WhaleEvent', whaleEventSchema);
