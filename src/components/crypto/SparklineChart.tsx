import React, { useMemo } from 'react';

interface SparklineChartProps {
    data: number[];
    color?: string;
    height?: number;
    width?: number;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
    data,
    color = '#22c55e',
    height = 64,
    width = 160
}) => {
    const path = useMemo(() => {
        if (data.length < 2) return '';

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const padding = 4;
        const effectiveHeight = height - padding * 2;
        const effectiveWidth = width - padding * 2;

        const points = data.map((value, index) => {
            const x = padding + (index / (data.length - 1)) * effectiveWidth;
            const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
            return { x, y };
        });

        const pathData = points.reduce((acc, point, index) => {
            if (index === 0) {
                return `M ${point.x} ${point.y}`;
            }
            // Smooth curve
            const prev = points[index - 1];
            const cpx = (prev.x + point.x) / 2;
            return `${acc} Q ${cpx} ${prev.y} ${point.x} ${point.y}`;
        }, '');

        return pathData;
    }, [data, height, width]);

    const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

    const areaPath = useMemo(() => {
        if (data.length < 2) return '';

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const padding = 4;
        const effectiveHeight = height - padding * 2;
        const effectiveWidth = width - padding * 2;

        const points = data.map((value, index) => {
            const x = padding + (index / (data.length - 1)) * effectiveWidth;
            const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
            return { x, y };
        });

        const linePath = points.reduce((acc, point, index) => {
            if (index === 0) {
                return `M ${point.x} ${point.y}`;
            }
            const prev = points[index - 1];
            const cpx = (prev.x + point.x) / 2;
            return `${acc} Q ${cpx} ${prev.y} ${point.x} ${point.y}`;
        }, '');

        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];

        return `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;
    }, [data, height, width]);

    if (data.length < 2) {
        return <div style={{ width, height }} className="bg-slate-700/50 rounded" />;
    }

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default SparklineChart;
