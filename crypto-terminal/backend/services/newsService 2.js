const axios = require("axios");

const cryptoPanicClient = axios.create({
  baseURL: process.env.CRYPTOPANIC_BASE_URL || "https://cryptopanic.com/api/v1/posts/",
  timeout: 10_000,
});

async function fetchLatestNews(limit = 15) {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;
  if (!apiKey) {
    return [];
  }

  const { data } = await cryptoPanicClient.get("", {
    params: {
      auth_token: apiKey,
      kind: "news",
      public: "true",
      filter: "hot",
    },
  });

  return (data?.results || []).slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source?.title || "Unknown",
    publishedAt: item.published_at,
    url: item.url,
    sentiment: item.votes?.important > 0 ? "bullish" : "neutral",
    currencies: (item.currencies || []).map((currency) => currency.code),
  }));
}

module.exports = {
  fetchLatestNews,
};
