import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

export async function fetchNews() {
  const { data } = await apiClient.get("/api/news/latest");
  return data.data || [];
}

export async function fetchTickerStats(symbol) {
  const { data } = await apiClient.get(`/api/market/ticker/${symbol}`);
  return data.data;
}

export async function fetchHistoricalCandles(symbol, interval, limit = 240) {
  const { data } = await apiClient.get("/api/market/candles", {
    params: { symbol, interval, limit },
  });
  return data.data || [];
}

export async function fetchWhaleAlerts() {
  const { data } = await apiClient.get("/api/market/alerts/whales");
  return data.data || [];
}

export async function fetchPortfolio(address) {
  const { data } = await apiClient.get(`/api/portfolio/${address}`);
  return data.data;
}

export async function askResearch(query) {
  const { data } = await apiClient.post("/api/ai/research", { query });
  return data;
}
