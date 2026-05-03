// backend/src/services/newsAnalyzer.js

const ASSET_MAP = {
  btc: 'BTC', bitcoin: 'BTC',
  eth: 'ETH', ethereum: 'ETH',
  sol: 'SOL', solana: 'SOL',
  xrp: 'XRP', ripple: 'XRP',
  ada: 'ADA', cardano: 'ADA',
  doge: 'DOGE', dogecoin: 'DOGE',
  dot: 'DOT', polkadot: 'DOT',
  matic: 'MATIC', polygon: 'MATIC',
  link: 'LINK', chainlink: 'LINK',
  avax: 'AVAX', avalanche: 'AVAX',
  bnb: 'BNB', binance: 'BNB',
};

const POSITIVE_WORDS = ['surge', 'jump', 'gain', 'high', 'bull', 'growth', 'adopt', 'approve', 'launch', 'partnership', 'record', 'rally', 'up', 'breakout', 'adoption'];
const NEGATIVE_WORDS = ['crash', 'drop', 'fall', 'low', 'bear', 'hack', 'ban', 'regulate', 'scam', 'fraud', 'lawsuit', 'decline', 'down', 'dump', 'breach', 'steal'];

const NEGATION_WORDS = ['avoids', 'not', 'no', 'prevent', 'prevents', 'avoid', 'without', 'never', 'unlikely', 'stops', 'stop'];

const IMPACT_WEIGHTS = {
  hack: 10,
  ban: 9,
  scam: 8,
  crash: 8,
  lawsuit: 7,
  surge: 7,
  approve: 8,
  partnership: 6,
  adoption: 5,
  launch: 5,
  record: 6,
  fraud: 8,
  breach: 8
};

const SOURCE_WEIGHTS = {
  reuters: 1.2,
  bloomberg: 1.2,
  coindesk: 1.1,
  cointelegraph: 1.1,
  decrypt: 1.1,
  'yahoo finance': 1.1,
  cnbc: 1.1,
  forbes: 1.0,
  default: 0.7
};

/**
 * Advanced logic for determining sentiment, impact score, confidence, and assets
 */
export const analyzeNews = (article) => {
  const text = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();
  
  // Extract source and calculate credibility weight
  const sourceName = (article.source?.name || article.source || '').toLowerCase();
  let credibilityWeight = SOURCE_WEIGHTS.default;
  for (const [source, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (source !== 'default' && sourceName.includes(source)) {
      credibilityWeight = weight;
      break;
    }
  }

  // Calculate Time Decay (Freshness Factor)
  let freshnessFactor = 1.0;
  if (article.publishedAt) {
    const publishedTime = new Date(article.publishedAt).getTime();
    if (!isNaN(publishedTime)) {
      const timeDifferenceHours = (Date.now() - publishedTime) / (1000 * 60 * 60);
      const decayConstant = 24; // 24 hours
      freshnessFactor = Math.exp(-Math.max(0, timeDifferenceHours) / decayConstant);
    }
  }
  
  // 1. Extract affected assets
  const affectedAssets = new Set();
  const words = text.match(/\b(\w+)\b/g) || [];
  
  words.forEach(word => {
    if (ASSET_MAP[word]) affectedAssets.add(ASSET_MAP[word]);
  });

  // 2. Negation Handling & Sentiment & Impact
  let posScore = 0;
  let negScore = 0;
  let maxImpact = 3; // Base impact score
  let keywordMatches = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    let isNegated = false;
    // Look at previous 3 words for negation
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATION_WORDS.includes(words[j])) {
        isNegated = true;
        break;
      }
    }

    if (POSITIVE_WORDS.includes(word)) {
      if (isNegated) negScore++; // "not positive" -> negative
      else posScore++;
      keywordMatches++;
    }
    
    if (NEGATIVE_WORDS.includes(word)) {
      if (isNegated) posScore++; // "not negative" -> positive
      else negScore++;
      keywordMatches++;
    }

    // Impact Weight calculation (ignoring negation for impact as events still matter, 
    // but if you want "no hack" to have low impact, we could reduce it. Let's keep impact high for the topic)
    if (IMPACT_WEIGHTS[word]) {
      // If negated, maybe impact is slightly less, but still high.
      const currentImpact = isNegated ? Math.max(3, IMPACT_WEIGHTS[word] - 3) : IMPACT_WEIGHTS[word];
      if (currentImpact > maxImpact) maxImpact = currentImpact;
    }
  }

  let sentiment = 'neutral';
  if (posScore > negScore) sentiment = 'bullish';
  else if (negScore > posScore) sentiment = 'bearish';

  // Increase maxImpact slightly if there are many sentiment words (magnitude)
  maxImpact += Math.min(2, Math.abs(posScore - negScore));
  
  // Apply Source Credibility and Freshness Factor
  let impactScore = maxImpact * credibilityWeight * freshnessFactor;
  impactScore = Math.min(10, Math.max(1, Math.round(impactScore * 10) / 10));

  // 3. Calculate Confidence (0 - 1)
  // Confidence goes up with more keyword matches and a clear difference between pos/neg
  const totalSentimentWords = posScore + negScore;
  let confidence = 0.3; // Base confidence
  
  if (totalSentimentWords > 0) {
    const purity = Math.abs(posScore - negScore) / totalSentimentWords; // 1 = all pos or all neg
    const frequencyFactor = Math.min(1, totalSentimentWords / 5); // 5+ keywords = max frequency confidence
    confidence = 0.3 + (0.4 * purity) + (0.3 * frequencyFactor);
  } else if (affectedAssets.size > 0) {
    confidence = 0.5; // Has assets but no strong sentiment words
  }
  
  // Apply Time Decay to confidence (older news = less confident in its current relevance)
  confidence = confidence * freshnessFactor;
  
  // Cap at 1.0, round to 2 decimals
  confidence = Math.min(1.0, Math.round(confidence * 100) / 100);

  return {
    sentiment,
    impactScore,
    confidence,
    affectedAssets: Array.from(affectedAssets)
  };
};
