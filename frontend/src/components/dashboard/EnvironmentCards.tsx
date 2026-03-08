import React from 'react';
import { Thermometer, Wind, Droplets, Eye } from 'lucide-react';

interface EnvMetric {
    label: string;
    value: string;
    unit: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend?: string;
}

interface EnvironmentCardsProps {
    temperature?: number;
    windSpeed?: number;
    humidity?: number;
    visibility?: number;
}

const EnvironmentCards: React.FC<EnvironmentCardsProps> = ({
    temperature,
    windSpeed,
    humidity,
    visibility,
}) => {
    const fmt = (val: number | undefined, decimals = 1): string =>
        val != null ? val.toFixed(decimals) : '--';

    const metrics: EnvMetric[] = [
        { label: 'Temperature', value: fmt(temperature), unit: '\u00B0C', icon: Thermometer, color: '#ff9e64', trend: temperature != null ? `${temperature > 27 ? 'Warm' : 'Cool'}` : undefined },
        { label: 'Wind Speed', value: fmt(windSpeed), unit: 'km/h', icon: Wind, color: '#7dcfff', trend: windSpeed != null ? `${windSpeed > 30 ? 'Gusty' : 'Calm'}` : undefined },
        { label: 'Humidity', value: humidity != null ? humidity.toString() : '--', unit: '%', icon: Droplets, color: '#bb9af7', trend: humidity != null ? `${humidity > 70 ? 'High' : 'Normal'}` : undefined },
        { label: 'Visibility', value: fmt(visibility), unit: 'km', icon: Eye, color: '#9ece6a', trend: visibility != null ? `${visibility < 3 ? 'Poor' : 'Good'}` : undefined },
    ];

    return (
        <div className="grid grid-cols-2 gap-4">
            {metrics.map(metric => {
                const Icon = metric.icon;
                return (
                    <div
                        key={metric.label}
                        className="glass-panel p-6 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#414868]/80 transition-all duration-200 ease-in-out group"
                        style={{ ['--hover-color' as string]: metric.color }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span style={{ color: metric.color }}><Icon className="w-4 h-4 transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_currentColor]" /></span>
                            {metric.trend && (
                                <span className="text-[9px] font-mono text-[#565f89]">{metric.trend}</span>
                            )}
                        </div>
                        <div className="flex items-end gap-1">
                            <span className={`text-xl font-bold font-digital ${metric.value === '--' ? 'text-[#565f89]' : 'text-[#c0caf5]'}`}>{metric.value}</span>
                            <span className="text-[10px] text-[#565f89] font-mono mb-0.5">{metric.unit}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest mt-1 block">{metric.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default EnvironmentCards;
