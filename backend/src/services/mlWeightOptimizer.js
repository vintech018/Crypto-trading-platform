// backend/src/services/mlWeightOptimizer.js
import { SignalHistory } from '../models/SignalHistory.model.js';
import { MLWeights } from '../models/MLWeights.model.js';

const LEARNING_RATE = 0.01;
const EPOCHS = 100;

export const optimizeWeights = async () => {
  const assets = ['BTC', 'ETH', 'SOL'];
  
  for (const asset of assets) {
    // Fetch signals with outcomes and factors
    const signals = await SignalHistory.find({ 
      asset, 
      outcome: { $in: ['PROFIT', 'LOSS'] },
      factors: { $exists: true } 
    });
    
    if (signals.length < 10) continue; // Need minimum samples to train

    // Initialize weights evenly or fetch current
    let wModel = await MLWeights.findOne({ asset });
    let weights = wModel ? wModel.weights : { news: 0.2, momentum: 0.2, volume: 0.2, whale: 0.2, social: 0.2 };
    
    // Gradient Descent
    for (let epoch = 0; epoch < EPOCHS; epoch++) {
      let grad = { news: 0, momentum: 0, volume: 0, whale: 0, social: 0 };
      let errorSum = 0;

      signals.forEach(sig => {
        const target = sig.outcome === 'PROFIT' ? 1 : 0;
        
        // Ensure factors exist
        const factors = sig.factors || { news: 0, momentum: 0, volume: 0, whale: 0, social: 0 };
        
        // Calculate predicted probability (using simple linear combination and sigmoid)
        const z = (weights.news * factors.news) +
                  (weights.momentum * factors.momentum) +
                  (weights.volume * factors.volume) +
                  (weights.whale * factors.whale) +
                  (weights.social * factors.social);
                  
        const pred = 1 / (1 + Math.exp(-z));
        const error = pred - target;
        errorSum += Math.abs(error);

        // Calculate gradients
        grad.news += error * factors.news;
        grad.momentum += error * factors.momentum;
        grad.volume += error * factors.volume;
        grad.whale += error * factors.whale;
        grad.social += error * factors.social;
      });

      // Update weights
      const m = signals.length;
      weights.news -= LEARNING_RATE * (grad.news / m);
      weights.momentum -= LEARNING_RATE * (grad.momentum / m);
      weights.volume -= LEARNING_RATE * (grad.volume / m);
      weights.whale -= LEARNING_RATE * (grad.whale / m);
      weights.social -= LEARNING_RATE * (grad.social / m);
    }
    
    // Normalize weights so they sum to 1
    const sumW = Math.abs(weights.news) + Math.abs(weights.momentum) + Math.abs(weights.volume) + Math.abs(weights.whale) + Math.abs(weights.social);
    if (sumW > 0) {
      weights.news = Math.abs(weights.news) / sumW;
      weights.momentum = Math.abs(weights.momentum) / sumW;
      weights.volume = Math.abs(weights.volume) / sumW;
      weights.whale = Math.abs(weights.whale) / sumW;
      weights.social = Math.abs(weights.social) / sumW;
    }

    await MLWeights.findOneAndUpdate(
      { asset },
      { weights, lastOptimized: new Date() },
      { upsert: true, new: true }
    );
  }
};
