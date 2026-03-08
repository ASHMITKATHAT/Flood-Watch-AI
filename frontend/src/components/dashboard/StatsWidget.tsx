import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsWidgetProps {
    title: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    alert?: boolean;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({
    title,
    value,
    unit,
    icon,
    trend,
    trendValue,
    alert = false
}) => {
    return (
        <GlassCard className={`p-6 ${alert ? 'border-neon-red/50 bg-neon-red/5' : 'border-blue-500/20'}`} hoverEffect>
            <div className="flex justify-between items-start mb-4">
                <span className="text-gray-500 font-mono text-sm uppercase tracking-wider">{title}</span>
                {icon && <div className={alert ? 'text-neon-red' : 'text-blue-600'}>{icon}</div>}
            </div>

            <div className="flex items-end space-x-2 mb-2">
                <div className={`text-3xl font-bold font-digital ${alert ? 'text-neon-red' : 'text-gray-900'}`}>
                    {value}
                </div>
                {unit && <div className="text-sm text-slate-500 mb-1 font-mono">{unit}</div>}
            </div>

            {trend && (
                <div className="flex items-center text-xs font-mono">
                    {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 text-neon-red" />}
                    {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 text-emerald-400" />}
                    {trend === 'neutral' && <Minus className="w-3 h-3 mr-1 text-gray-500" />}

                    <span className={
                        trend === 'up' ? 'text-neon-red' :
                            trend === 'down' ? 'text-emerald-400' : 'text-gray-500'
                    }>
                        {trendValue}
                    </span>
                    <span className="text-slate-600 ml-1">vs last hour</span>
                </div>
            )}
        </GlassCard>
    );
};

export default StatsWidget;
