import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { TimelineEntry } from '../../services/api';

interface PredictionChartProps {
    data: TimelineEntry[];
    title?: string;
    accuracy?: number;
}

const PredictionChart: React.FC<PredictionChartProps> = ({
    data,
    title = 'PREDICTED vs ACTUAL WATER LEVELS',
    accuracy,
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="glass-panel h-full flex items-center justify-center text-gray-400 font-mono text-sm">
                <BarChart3 className="w-5 h-5 mr-2" />
                AWAITING DATA FEED...
            </div>
        );
    }

    const chartData = data.map(d => ({
        name: `T+${d.hour}h`,
        actual: d.actual_level,
        predicted: d.predicted_level,
        rainfall: d.rainfall_mm,
    }));

    return (
        <div className="glass-panel border border-gray-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                    {title}
                </h3>
                <div className="flex items-center space-x-4">
                    {accuracy !== undefined && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                            ACCURACY: {accuracy}%
                        </span>
                    )}
                    <div className="flex space-x-4 text-[10px] font-mono text-gray-600">
                        <div className="flex items-center"><span className="w-2 h-2 bg-red-600 rounded-sm mr-1" />ACTUAL</div>
                        <div className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-sm mr-1" />PREDICTED</div>
                    </div>
                </div>
            </div>

            <div style={{ width: '100%', height: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <defs>
                            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={5}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                            label={{ value: 'Water Level (m)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 9 } }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e5e7eb',
                                borderRadius: '8px',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '11px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                            itemStyle={{ color: '#111827' }}
                            labelStyle={{ color: '#6b7280' }}
                        />
                        <ReferenceLine y={4} stroke="#DC2626" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: 'CRITICAL', fill: '#DC2626', fontSize: 9 }} />
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#DC2626"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#DC2626', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 2 }}
                            name="Actual Level"
                        />
                        <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="#0284C7"
                            strokeWidth={2}
                            strokeDasharray="8 4"
                            dot={{ r: 3, fill: '#0284C7', strokeWidth: 0 }}
                            name="Predicted Level"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PredictionChart;
