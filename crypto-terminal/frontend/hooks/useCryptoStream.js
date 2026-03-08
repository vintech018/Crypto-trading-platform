import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const CryptoStreamContext = createContext(null);

const SUPPORTED_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const TIMEFRAMES = ["1m", "5m", "1h", "1d"];

const timeframeToSeconds = {
  "1m": 60,
  "5m": 300,
  "1h": 3600,
  "1d": 86400,
};

function getBucketTime(unixSeconds, timeframe) {
  const size = timeframeToSeconds[timeframe] || 60;
  return Math.floor(unixSeconds / size) * size;
}

function upsertCandle(candleList, candle) {
  const next = [...(candleList || [])];
  if (!next.length || next[next.length - 1].time < candle.time) {
    next.push(candle);
    return next.slice(-500);
  }

  const last = next[next.length - 1];
  if (last.time === candle.time) {
    next[next.length - 1] = candle;
  }
  return next;
}

function normalizeCandlePayload(payload) {
  if (!payload?.symbol || payload.time == null) return null;

  return {
    symbol: String(payload.symbol).toUpperCase(),
    interval: payload.interval || "1m",
    candle: {
      time: Number(payload.time),
      open: Number(payload.open),
      high: Number(payload.high),
      low: Number(payload.low),
      close: Number(payload.close),
    },
  };
}

function normalizePricePayload(payload) {
  const symbol = String(payload?.symbol || "").toUpperCase();
  const price = Number(payload?.price);
  if (!symbol || Number.isNaN(price)) return null;

  const tradeTime = payload.tradeTime || Date.now();
  return {
    symbol,
    price,
    tradeTime,
    quantity: Number(payload?.quantity || 0),
    quoteValue: Number(payload?.quoteValue || 0),
  };
}

export function CryptoStreamProvider({ children }) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || backend.replace("http", "ws")).replace(/\/$/, "");

  const [connectionState, setConnectionState] = useState("connecting");
  const [prices, setPrices] = useState({});
  const [candles, setCandles] = useState({});
  const [whaleAlerts, setWhaleAlerts] = useState([]);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const updateQueueRef = useRef([]);
  const flushFrameRef = useRef(null);

  const flushQueue = () => {
    flushFrameRef.current = null;
    if (updateQueueRef.current.length === 0) return;

    const updates = updateQueueRef.current;
    updateQueueRef.current = [];

    setPrices((prev) => {
      let next = { ...prev };
      for (const update of updates) {
        if (update.kind !== "price") continue;
        const current = next[update.payload.symbol];
        const prevPrice = current?.price ?? update.payload.price;

        const history = [...(current?.sparkline || []), update.payload.price].slice(-32);

        next[update.payload.symbol] = {
          symbol: update.payload.symbol,
          price: update.payload.price,
          prevPrice,
          tradeTime: update.payload.tradeTime,
          quantity: update.payload.quantity,
          quoteValue: update.payload.quoteValue,
          sparkline: history,
          direction:
            update.payload.price > prevPrice
              ? "up"
              : update.payload.price < prevPrice
              ? "down"
              : "flat",
        };
      }
      return next;
    });

    setCandles((prev) => {
      let next = { ...prev };

      for (const update of updates) {
        if (update.kind === "candle") {
          const { symbol, interval, candle } = update.payload;
          next[symbol] = next[symbol] || {};
          next[symbol][interval] = upsertCandle(next[symbol][interval], candle);
        }

        if (update.kind === "price") {
          const tick = update.payload;
          const unixSeconds = Math.floor((tick.tradeTime || Date.now()) / 1000);

          for (const interval of TIMEFRAMES) {
            const bucketTime = getBucketTime(unixSeconds, interval);
            next[tick.symbol] = next[tick.symbol] || {};
            const existing = next[tick.symbol][interval] || [];
            const last = existing[existing.length - 1];

            let candle;
            if (!last || last.time < bucketTime) {
              candle = {
                time: bucketTime,
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price,
              };
            } else {
              candle = {
                time: last.time,
                open: last.open,
                high: Math.max(last.high, tick.price),
                low: Math.min(last.low, tick.price),
                close: tick.price,
              };
            }

            next[tick.symbol][interval] = upsertCandle(existing, candle);
          }
        }
      }

      return next;
    });

    setWhaleAlerts((prev) => {
      const incoming = updates
        .filter((update) => update.kind === "alert")
        .map((update) => update.payload);
      if (!incoming.length) return prev;
      return [...incoming, ...prev].slice(0, 50);
    });
  };

  const enqueue = (item) => {
    updateQueueRef.current.push(item);
    if (!flushFrameRef.current) {
      flushFrameRef.current = requestAnimationFrame(flushQueue);
    }
  };

  useEffect(() => {
    let mounted = true;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!mounted) return;
        setConnectionState("connected");
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnectionState("reconnecting");
        reconnectRef.current = setTimeout(connect, 1200);
      };

      ws.onerror = () => {
        setConnectionState("error");
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          const type = message?.type;

          if (type === "price_update" || type === "price") {
            const pricePayload = normalizePricePayload(message);
            if (pricePayload && SUPPORTED_SYMBOLS.includes(pricePayload.symbol)) {
              enqueue({ kind: "price", payload: pricePayload });
            }
            return;
          }

          if (type === "candle" || type === "candle_update") {
            const candlePayload = normalizeCandlePayload(message);
            if (candlePayload && SUPPORTED_SYMBOLS.includes(candlePayload.symbol)) {
              enqueue({ kind: "candle", payload: candlePayload });
            }
            return;
          }

          if (type === "alerts") {
            enqueue({
              kind: "alert",
              payload: {
                id: message.id || `${message.symbol}-${message.tradeTime}-${Math.random()}`,
                symbol: message.symbol,
                message: message.message,
                valueUsd: message.valueUsd,
                tradeTime: message.tradeTime,
                createdAt: message.createdAt,
              },
            });
          }
        } catch (_err) {
          // ignore malformed payloads
        }
      };
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectRef.current);
      if (flushFrameRef.current) cancelAnimationFrame(flushFrameRef.current);
      socketRef.current?.close();
    };
  }, [wsUrl]);

  const api = useMemo(
    () => ({
      connectionState,
      prices,
      candles,
      whaleAlerts,
      setWhaleAlerts,
    }),
    [connectionState, prices, candles, whaleAlerts]
  );

  return <CryptoStreamContext.Provider value={api}>{children}</CryptoStreamContext.Provider>;
}

export function useCryptoStream() {
  const context = useContext(CryptoStreamContext);
  if (!context) {
    throw new Error("useCryptoStream must be used inside CryptoStreamProvider");
  }
  return context;
}
