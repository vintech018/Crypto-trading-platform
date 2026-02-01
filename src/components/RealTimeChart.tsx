/**
 * RealTimeChart Component
 * 
 * Production-grade candlestick chart with REAL-TIME WebSocket updates.
 * Uses lightweight-charts for rendering and KlineWebSocketService for live data.
 * 
 * CRITICAL ARCHITECTURE (per requirements):
 * 
 * 1. Historical data: Fetched ONCE via REST API (Binance klines)
 * 2. Live data: Streamed via WebSocket (subscribe_kline)
 * 3. Updates: Direct series.update() calls - NO React state!
 * 4. Candle rules:
 *    - isClosed === false → Update current candle (in-progress)
 *    - isClosed === true  → Close candle, start new one
 * 
 * Why no React state for chart data?
 * - React re-renders cause chart flicker
 * - lightweight-charts manages its own internal state
 * - Direct update() = smooth 60fps updates
 * 
 * Why trades cannot drive charts?
 * - Trades are individual transactions, not OHLCV aggregations
 * - Klines are pre-aggregated by Binance at interval boundaries
 * - Klines guarantee no gaps in time series
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { klineWebSocketService, type KlineBar } from '../services/KlineWebSocketService';

interface RealTimeChartProps {
    symbol: string;
    height?: number;
    showVolume?: boolean;
}

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const INTERVALS: { value: Interval; label: string }[] = [
    { value: '1m', label: '1M' },
    { value: '5m', label: '5M' },
    { value: '15m', label: '15M' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
];

const RealTimeChart: React.FC<RealTimeChartProps> = ({
    symbol,
    height = 400,
    showVolume = true,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const candleSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addSeries']> | null>(null);
    const volumeSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addSeries']> | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const [interval, setInterval] = React.useState<Interval>('1h');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLive, setIsLive] = React.useState(false);

    // Initialize chart (only once)
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: 'rgba(99, 102, 241, 0.5)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#6366f1',
                },
                horzLine: {
                    color: 'rgba(99, 102, 241, 0.5)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#6366f1',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
            },
            width: containerRef.current.clientWidth,
            height: height - (showVolume ? 80 : 0),
        });

        chartRef.current = chart;

        // Add candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            wickUpColor: '#22c55e',
        });
        candleSeriesRef.current = candleSeries;

        // Add volume series (histogram)
        if (showVolume) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: '#6366f1',
                priceFormat: { type: 'volume' },
                priceScaleId: '', // Overlay on price scale
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.85, bottom: 0 },
            });
            volumeSeriesRef.current = volumeSeries;
        }

        // Handle resize
        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [height, showVolume]);

    /**
     * Handle real-time kline update.
     * CRITICAL: This is called directly by WebSocket - NO React state!
     */
    const handleKlineUpdate = useCallback((bar: KlineBar, _isClosed: boolean) => {
        if (!candleSeriesRef.current) return;

        // Update candlestick series
        candleSeriesRef.current.update({
            time: bar.time as any,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
        });

        // Update volume series
        if (volumeSeriesRef.current && bar.volume !== undefined) {
            volumeSeriesRef.current.update({
                time: bar.time as any,
                value: bar.volume,
                color: bar.close >= bar.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            });
        }

        // Mark as live when receiving updates
        setIsLive(true);
    }, []);

    // Load historical data and subscribe to live updates
    useEffect(() => {
        if (!candleSeriesRef.current) return;

        const loadDataAndSubscribe = async () => {
            setIsLoading(true);
            setIsLive(false);

            // Unsubscribe from previous
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            try {
                // Fetch historical data from Binance REST API
                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=500`
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                // Convert to chart format
                const candleData = data.map((kline: any[]) => ({
                    time: Math.floor(kline[0] / 1000), // Convert ms to seconds
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                }));

                const volumeData = data.map((kline: any[]) => ({
                    time: Math.floor(kline[0] / 1000),
                    value: parseFloat(kline[5]),
                    color: parseFloat(kline[4]) >= parseFloat(kline[1])
                        ? 'rgba(34, 197, 94, 0.5)'
                        : 'rgba(239, 68, 68, 0.5)',
                }));

                // Set historical data
                candleSeriesRef.current?.setData(candleData);
                if (volumeSeriesRef.current) {
                    volumeSeriesRef.current.setData(volumeData);
                }

                chartRef.current?.timeScale().fitContent();

                console.log(`[Chart] Loaded ${data.length} historical candles for ${symbol}`);

                // Subscribe to live updates
                // CRITICAL: handleKlineUpdate is called directly, not through React state
                unsubscribeRef.current = klineWebSocketService.subscribe(
                    symbol,
                    interval,
                    handleKlineUpdate
                );

                console.log(`[Chart] Subscribed to live klines: ${symbol}@${interval}`);

            } catch (error) {
                console.error('[Chart] Failed to load data:', error);
            }

            setIsLoading(false);
        };

        loadDataAndSubscribe();

        // Cleanup on unmount or when symbol/interval changes
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [symbol, interval, handleKlineUpdate]);

    return (
        <div className="relative">
            {/* Interval selector */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{symbol}/USDT</span>
                    {isLive && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            LIVE
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    {INTERVALS.map((int) => (
                        <button
                            key={int.value}
                            onClick={() => setInterval(int.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${interval === int.value
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {int.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart container */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900/50 border border-white/5">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                        <div className="flex items-center gap-2 text-slate-400">
                            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            Loading chart...
                        </div>
                    </div>
                )}
                <div ref={containerRef} style={{ height }} />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>Data: Binance • Interval: {interval}</span>
                <span>{isLive ? 'Real-time updates via WebSocket' : 'Connecting...'}</span>
            </div>
        </div>
    );
};

export default RealTimeChart;
