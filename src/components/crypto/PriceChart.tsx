import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface PriceChartProps {
    data: { time: string; price: number }[];
    color?: string;
    height?: number;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

const PriceChart: React.FC<PriceChartProps> = ({
    data,
    color = '#818cf8',
    height = 300
}) => {
    const [activeRange, setActiveRange] = useState<TimeRange>('1M');
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; price: number; time: string } | null>(null);

    const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

    const filteredData = useMemo(() => {
        // For demo, just use all data for all ranges
        // In real app, you'd filter based on the time range
        return data;
    }, [data, activeRange]);

    const { path, areaPath, points } = useMemo(() => {
        if (filteredData.length < 2) return { path: '', areaPath: '', points: [] };

        const prices = filteredData.map(d => d.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        const padding = { top: 20, right: 20, bottom: 40, left: 20 };
        const width = 800;
        const effectiveHeight = height - padding.top - padding.bottom;
        const effectiveWidth = width - padding.left - padding.right;

        const pts = filteredData.map((d, index) => {
            const x = padding.left + (index / (filteredData.length - 1)) * effectiveWidth;
            const y = padding.top + effectiveHeight - ((d.price - min) / range) * effectiveHeight;
            return { x, y, price: d.price, time: d.time };
        });

        const pathData = pts.reduce((acc, point, index) => {
            if (index === 0) return `M ${point.x} ${point.y}`;
            const prev = pts[index - 1];
            const cpx = (prev.x + point.x) / 2;
            return `${acc} Q ${cpx} ${prev.y} ${point.x} ${point.y}`;
        }, '');

        const lastPt = pts[pts.length - 1];
        const firstPt = pts[0];
        const area = `${pathData} L ${lastPt.x} ${height - padding.bottom} L ${firstPt.x} ${height - padding.bottom} Z`;

        return { path: pathData, areaPath: area, points: pts };
    }, [filteredData, height]);

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 800;

        // Find closest point
        let closest = points[0];
        let minDist = Infinity;
        for (const pt of points) {
            const dist = Math.abs(pt.x - x);
            if (dist < minDist) {
                minDist = dist;
                closest = pt;
            }
        }

        if (closest) {
            setHoveredPoint(closest);
        }
    };

    const gradientId = 'price-chart-gradient';

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    {hoveredPoint ? (
                        <>
                            <p className="text-2xl font-bold text-white">{formatPrice(hoveredPoint.price)}</p>
                            <p className="text-slate-400 text-sm">{formatDate(hoveredPoint.time)}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-2xl font-bold text-white">
                                {formatPrice(filteredData[filteredData.length - 1]?.price || 0)}
                            </p>
                            <p className="text-slate-400 text-sm">Current price</p>
                        </>
                    )}
                </div>

                {/* Time range selector */}
                <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
                    {timeRanges.map((range) => (
                        <button
                            key={range}
                            onClick={() => setActiveRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeRange === range
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="relative">
                <svg
                    width="100%"
                    height={height}
                    viewBox={`0 0 800 ${height}`}
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-crosshair"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((ratio) => (
                        <line
                            key={ratio}
                            x1="20"
                            y1={20 + (height - 60) * ratio}
                            x2="780"
                            y2={20 + (height - 60) * ratio}
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Area fill */}
                    <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        d={areaPath}
                        fill={`url(#${gradientId})`}
                    />

                    {/* Line */}
                    <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Hover indicator */}
                    {hoveredPoint && (
                        <>
                            <line
                                x1={hoveredPoint.x}
                                y1="20"
                                x2={hoveredPoint.x}
                                y2={height - 40}
                                stroke="rgba(255,255,255,0.2)"
                                strokeDasharray="4 4"
                            />
                            <circle
                                cx={hoveredPoint.x}
                                cy={hoveredPoint.y}
                                r="6"
                                fill={color}
                                stroke="white"
                                strokeWidth="2"
                            />
                        </>
                    )}
                </svg>
            </div>
        </div>
    );
};

export default PriceChart;
