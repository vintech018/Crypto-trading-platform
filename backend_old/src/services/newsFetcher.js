import { env } from "../config/env.js";

export const fetchCryptoNews = async () => {
  const apiKey = env.GNEWS_API_KEY;
  if (!apiKey) {
    console.warn("GNEWS_API_KEY is not defined. Skipping news fetch.");
    return [];
  }

  // Fetch from GNews API
  // Using query 'crypto OR cryptocurrency OR bitcoin OR ethereum'
  const url = `https://gnews.io/api/v4/search?q=crypto OR cryptocurrency OR bitcoin OR ethereum&lang=en&max=20&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GNews API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error("Error fetching news:", error.message);
    throw error;
  }
};
