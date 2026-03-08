import React from 'react';

interface ArcGaugeProps {
    label: string;
    value: number;
    max?: number;
    unit?: string;
    threshold?: number;
    size?: number;
    color?: string;
    status?: string;
    loading?: boolean;
}

const ArcGauge: React.FC<ArcGaugeProps> = ({
    label,
    value,
    max = 100,
    unit = '%',
    threshold,
    size = 120,
    color,
    status,
    loading = false,
}) => {
    const percentage = Math.min((value / max) * 100, 100);
    const isOverThreshold = threshold !== undefined && value >= threshold;

    // Auto color based on percentage
    const gaugeColor = color || (
        isOverThreshold ? '#FF3366' :
            percentage > 70 ? '#F59E0B' :
                '#00F0FF'
    );

    // SVG arc calculation
    const radius = (size - 16) / 2;
    const center = size / 2;
    const strokeWidth = 6;
    const circumference = Math.PI * radius; // half circle
    const dashOffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center glass-panel py-4 px-3 border-glow-cyan">
            <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
                {/* Background arc */}
                <path
                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* Threshold marker */}
                {threshold !== undefined && (
                    <circle
                        cx={center + radius * Math.cos(Math.PI - (threshold / max) * Math.PI)}
                        cy={center - radius * Math.sin((threshold / max) * Math.PI)}
                        r={2}
                        fill="#FF3366"
                        opacity={0.6}
                    />
                )}

                {loading ? (
                    <path
                        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="animate-pulse"
                    />
                ) : (
                    <>
                        <path
                            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                            fill="none"
                            stroke={gaugeColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            style={{
                                filter: `drop-shadow(0 0 6px ${gaugeColor}40)`,
                                transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease',
                            }}
                        />

                        {/* Center value */}
                        <text
                            x={center}
                            y={center - 8}
                            textAnchor="middle"
                            className="font-digital"
                            fill={gaugeColor}
                            fontSize="20"
                            fontWeight="bold"
                            style={{ fontFamily: 'Orbitron, monospace', filter: `drop-shadow(0 0 4px ${gaugeColor}40)` }}
                        >
                            {value.toFixed(1)}
                        </text>
                        <text
                            x={center}
                            y={center + 8}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="10"
                            style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        >
                            {unit}
                        </text>
                    </>
                )}
            </svg>

            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">{label}</span>

            {status && (
                <span className={`text-[9px] font-mono mt-1 px-2 py-0.5 rounded border ${status === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    status === 'elevated' || status === 'warning' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                    {status.toUpperCase()}
                </span>
            )}
        </div>
    );
};

export default ArcGauge;
