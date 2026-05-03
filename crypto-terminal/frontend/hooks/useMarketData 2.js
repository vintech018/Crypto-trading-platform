import { useCallback, useEffect, useMemo, useState } from "react";

import { useCryptoStream } from "./useCryptoStream";
import {
  fetchHistoricalCandles,
  fetchNews,
  fetchTickerStats,
  fetchWhaleAlerts,
} from "../utils/api";

function mergeAlerts(existing, incoming) {
  const map = new Map();
  for (const item of [...incoming, ...existing]) {
    if (!item?.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values()).slice(0, 50);
}

export function useMarketData(selectedSymbol, selectedTimeframe) {
  const { prices, candles, whaleAlerts, setWhaleAlerts, connectionState } = useCryptoStream();

  const [news, setNews] = useState([]);
  const [tickerStats, setTickerStats] = useState({});
  const [historicalCandles, setHistoricalCandles] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  const symbolList = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

  const refreshNews = useCallback(async () => {
    try {
      const payload = await fetchNews();
      setNews(payload);
    } catch (_err) {
      setNews([]);
    }
  }, []);

  const refreshTickerStats = useCallback(async () => {
    const entries = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const stat = await fetchTickerStats(symbol);
          return [symbol, stat];
        } catch (_err) {
          return [symbol, null];
        }
      })
    );

    setTickerStats(Object.fromEntries(entries));
  }, []);

  const refreshWhaleAlerts = useCallback(async () => {
    try {
      const alerts = await fetchWhaleAlerts();
      setWhaleAlerts((prev) => mergeAlerts(prev, alerts));
    } catch (_err) {
      // keep stream-driven alerts
    }
  }, [setWhaleAlerts]);

  const loadHistoricalCandles = useCallback(async () => {
    setChartLoading(true);
    try {
      const data = await fetchHistoricalCandles(selectedSymbol, selectedTimeframe, 240);
      setHistoricalCandles(
        data.map((c) => ({
          time: Math.floor(c.openTime / 1000),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
      );
    } finally {
      setChartLoading(false);
    }
  }, [selectedSymbol, selectedTimeframe]);

  useEffect(() => {
    refreshNews();
    refreshTickerStats();
    refreshWhaleAlerts();

    const newsTimer = setInterval(refreshNews, 60_000);
    const statsTimer = setInterval(refreshTickerStats, 15_000);
    const alertsTimer = setInterval(refreshWhaleAlerts, 20_000);

    return () => {
      clearInterval(newsTimer);
      clearInterval(statsTimer);
      clearInterval(alertsTimer);
    };
  }, [refreshNews, refreshTickerStats, refreshWhaleAlerts]);

  useEffect(() => {
    loadHistoricalCandles();
  }, [loadHistoricalCandles]);

  const liveCandleSeries = useMemo(
    () => candles?.[selectedSymbol]?.[selectedTimeframe] || [],
    [candles, selectedSymbol, selectedTimeframe]
  );

  const mergedCandles = useMemo(() => {
    if (!historicalCandles.length) return liveCandleSeries;
    if (!liveCandleSeries.length) return historicalCandles;

    const map = new Map(historicalCandles.map((candle) => [candle.time, candle]));
    for (const candle of liveCandleSeries) {
      map.set(candle.time, candle);
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }, [historicalCandles, liveCandleSeries]);

  return {
    connectionState,
    prices,
    tickerStats,
    news,
    whaleAlerts,
    mergedCandles,
    chartLoading,
    refreshChart: loadHistoricalCandles,
  };
}
