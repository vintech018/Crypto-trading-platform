import React, { useMemo } from 'react';

interface AllocationChartProps {
    data: { name: string; value: number; color: string }[];
    size?: number;
}

const AllocationChart: React.FC<AllocationChartProps> = ({ data, size = 200 }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    const segments = useMemo(() => {
        let currentAngle = -90; // Start from top
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 10;
        const innerRadius = radius * 0.6; // Donut hole

        return data.map((item) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Convert angles to radians
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            // Calculate arc points
            const outerX1 = centerX + radius * Math.cos(startRad);
            const outerY1 = centerY + radius * Math.sin(startRad);
            const outerX2 = centerX + radius * Math.cos(endRad);
            const outerY2 = centerY + radius * Math.sin(endRad);
            const innerX1 = centerX + innerRadius * Math.cos(startRad);
            const innerY1 = centerY + innerRadius * Math.sin(startRad);
            const innerX2 = centerX + innerRadius * Math.cos(endRad);
            const innerY2 = centerY + innerRadius * Math.sin(endRad);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
                `M ${outerX1} ${outerY1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}`,
                `L ${innerX2} ${innerY2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`,
                'Z'
            ].join(' ');

            return {
                ...item,
                percentage,
                path: pathData
            };
        });
    }, [data, total, size]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Portfolio Allocation</h3>

            <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Chart */}
                <div className="relative">
                    <svg width={size} height={size} className="transform -rotate-0">
                        {segments.map((segment, index) => (
                            <path
                                key={index}
                                d={segment.path}
                                fill={segment.color}
                                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                style={{
                                    filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))',
                                    transformOrigin: 'center',
                                }}
                            />
                        ))}
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-slate-400 text-xs">Total</p>
                        <p className="text-white font-bold text-lg">{formatCurrency(total)}</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="text-slate-300 text-sm">{segment.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-white font-medium text-sm">
                                    {formatCurrency(segment.value)}
                                </span>
                                <span className="text-slate-500 text-xs ml-2">
                                    ({segment.percentage.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AllocationChart;
