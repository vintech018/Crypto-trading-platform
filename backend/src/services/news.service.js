import { fetchCryptoNews } from './newsFetcher.js';
import { analyzeNews } from './newsAnalyzer.js';
import { generateSignal } from './signalEngine.js';
import News from '../models/News.model.js';

export const processAndStoreNews = async () => {
  const articles = await fetchCryptoNews();
  let savedCount = 0;
  
  for (const article of articles) {
    try {
      // Check if exists to prevent duplicates
      const exists = await News.findOne({ url: article.url });
      if (exists) continue;
      
      const analysis = analyzeNews(article);
      const signalData = generateSignal(analysis);
      
      const newArticle = new News({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: new Date(article.publishedAt),
        ...analysis,
        signal: signalData.signal
      });
      
      await newArticle.save();
      savedCount++;
    } catch (error) {
      console.error(`Error saving article ${article.title}:`, error.message);
    }
  }
  
  return savedCount;
};

export const getLatestNews = async (limit = 20, page = 1, asset = null) => {
  const skip = (page - 1) * limit;
  const query = asset ? { affectedAssets: asset.toUpperCase() } : {};
  return await News.find(query).sort({ publishedAt: -1 }).skip(skip).limit(limit);
};

export const getLatestSignals = async (limit = 20) => {
  return await News.find({ signal: { $in: ['BUY', 'SELL'] } })
    .sort({ publishedAt: -1 })
    .limit(limit);
};
