// backend/src/models/News.model.js
import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  content: {
    type: String
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    default: 'Unknown'
  },
  sentiment: {
    type: String,
    enum: ['bullish', 'bearish', 'neutral'],
    default: 'neutral'
  },
  impactScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 1
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  signal: {
    type: String,
    enum: ['BUY', 'SELL', 'HOLD'],
    default: 'HOLD'
  },
  affectedAssets: [{
    type: String
  }],
  publishedAt: {
    type: Date,
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for efficient querying
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ affectedAssets: 1 });

const News = mongoose.model('News', newsSchema);

export default News;
