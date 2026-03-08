import React from 'react';
import { Mountain, CheckCircle } from 'lucide-react';
import { TopographyResult } from '../../services/topographyService';

interface TerrainCardProps {
    topographyData: TopographyResult | null;
}

const TerrainCard: React.FC<TerrainCardProps> = ({ topographyData }) => {
    if (!topographyData) return null;

    const td = topographyData as any;
    const elevation = td.targetElevation ?? topographyData.targetElevation;
    const slope = td.slopeDegrees ?? 0;
    const surroundingAvg = topographyData.surroundingAverage;
    const isOutOfBounds = td.inBounds === false;

    // Elevation status classification
    const elevDiff = elevation - surroundingAvg;
    const elevStatus = elevation < 150
        ? { label: 'Low-Lying Basin', color: '#f7768e', borderAccent: 'border-[#f7768e]/20', bgAccent: 'bg-[#f7768e]/5', desc: 'Water naturally flows toward this area' }
        : elevation > 400
            ? { label: 'High-Altitude Ridge', color: '#9ece6a', borderAccent: 'border-[#9ece6a]/20', bgAccent: 'bg-[#9ece6a]/5', desc: 'Natural drainage advantage' }
            : elevDiff < -2
                ? { label: 'Relative Depression', color: '#e0af68', borderAccent: 'border-[#e0af68]/20', bgAccent: 'bg-[#e0af68]/5', desc: 'Lower than surrounding terrain' }
                : { label: 'Elevated Plateau', color: '#7aa2f7', borderAccent: 'border-[#7aa2f7]/20', bgAccent: 'bg-[#7aa2f7]/5', desc: 'Above surrounding average' };

    // Slope severity classification
    const slopeClass = slope <= 3
        ? { label: 'Water Accumulation Zone', sub: 'High Stagnation Risk — water pools here', color: '#f7768e', barColor: '#f7768e', borderAccent: 'border-[#f7768e]/20', bgAccent: 'bg-[#f7768e]/5' }
        : slope > 10
            ? { label: 'High Velocity Runoff Zone', sub: 'Flash flood risk — rapid water flow', color: '#ff9e64', barColor: '#ff9e64', borderAccent: 'border-[#ff9e64]/20', bgAccent: 'bg-[#ff9e64]/5' }
            : { label: 'Natural Drainage Slope', sub: 'Moderate gradient — water flows smoothly', color: '#9ece6a', barColor: '#9ece6a', borderAccent: 'bg-[#9ece6a]/5', borderAccent2: 'border-[#9ece6a]/20' };

    // Topographic Vulnerability Score (0-100)
    const slopeFactor = Math.max(0, 1 - slope / 15);
    const elevFactor = elevDiff < 0 ? Math.min(1, Math.abs(elevDiff) / 10) : 0;
    const flatFactor = slope <= 3 ? 0.3 : 0;
    const topoScore = Math.round(Math.min(100, (slopeFactor * 50 + elevFactor * 30 + flatFactor * 100)));

    const scoreColor = topoScore >= 70 ? '#f7768e' : topoScore >= 40 ? '#ff9e64' : '#9ece6a';
    const scoreLabel = topoScore >= 70 ? 'CRITICAL' : topoScore >= 40 ? 'MODERATE' : 'LOW';

    // SVG gauge
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (topoScore / 100) * circumference;

    return (
        <div className="glass-panel p-6 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#9ece6a]/20 transition-all duration-200 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#9ece6a]/10 border border-[#9ece6a]/20">
                        <Mountain className="w-5 h-5 text-[#9ece6a]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#c0caf5] tracking-wider">TERRAIN INTELLIGENCE</h3>
                        <span className="text-[10px] font-mono text-[#565f89]">ISRO Cartosat DEM • Offline Terrain Engine</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#9ece6a]/10 border border-[#9ece6a]/20 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5 text-[#9ece6a]" />
                    <span className="text-[9px] font-bold font-mono text-[#9ece6a] tracking-wider">VERIFIED</span>
                </div>
            </div>

            {isOutOfBounds ? (
                <div className="bg-[#f7768e]/5 border border-[#f7768e]/20 rounded-xl p-4 text-center">
                    <span className="text-sm font-bold text-[#f7768e] font-digital tracking-wider">OUT OF BOUNDS</span>
                    <p className="text-[11px] font-mono text-[#f7768e]/70 mt-1">Coordinates outside ISRO DEM coverage area</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Row 1: Elevation + Slope Severity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Absolute Elevation (MSL) */}
                        <div className={`rounded-xl p-4 border border-[#414868] bg-[#1f2335]`}>
                            <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-2">ELEVATION (MSL)</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold font-digital text-[#c0caf5]">{elevation}</span>
                                <span className="text-sm font-mono text-[#565f89]">m</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: elevStatus.color, boxShadow: `0 0 6px ${elevStatus.color}60` }} />
                                <span className="text-xs font-bold font-digital tracking-wider" style={{ color: elevStatus.color }}>{elevStatus.label}</span>
                            </div>
                            <p className="text-[10px] font-mono text-[#565f89] mt-1">{elevStatus.desc}</p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[#565f89]">
                                <span>Surrounding Avg: {surroundingAvg}m</span>
                                <span className="text-[#414868]">|</span>
                                <span style={{ color: elevDiff < 0 ? '#f7768e' : '#9ece6a' }}>Δ {elevDiff > 0 ? '+' : ''}{elevDiff.toFixed(1)}m</span>
                            </div>
                        </div>

                        {/* 2. Terrain Gradient (Slope Severity) */}
                        <div className="rounded-xl p-4 border border-[#414868] bg-[#1f2335]">
                            <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-2">TERRAIN SLOPE</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold font-digital text-[#c0caf5]">{slope.toFixed(1)}</span>
                                <span className="text-sm font-mono text-[#565f89]">°</span>
                            </div>
                            <div className="mt-3 h-2 bg-[#414868]/40 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (slope / 20) * 100)}%`, backgroundColor: slopeClass.barColor, boxShadow: `0 0 6px ${slopeClass.barColor}60` }} />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: slopeClass.color, boxShadow: `0 0 6px ${slopeClass.color}60` }} />
                                <span className="text-xs font-bold font-digital tracking-wider" style={{ color: slopeClass.color }}>{slopeClass.label}</span>
                            </div>
                            <p className="text-[10px] font-mono text-[#565f89] mt-1">{slopeClass.sub}</p>
                        </div>
                    </div>

                    {/* Row 2: Vulnerability Score */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* 3. Topographic Vulnerability Score */}
                        <div className="bg-[#1f2335] rounded-xl p-4 border border-[#414868]">
                            <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-3">TOPOGRAPHIC VULNERABILITY INDEX</span>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
                                    <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
                                        <circle cx="48" cy="48" r={radius} fill="none" stroke="#414868" strokeWidth="8" />
                                        <circle cx="48" cy="48" r={radius} fill="none" stroke={scoreColor} strokeWidth="8"
                                            strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                            strokeLinecap="round" className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 4px ${scoreColor}60)` }} />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold font-digital" style={{ color: scoreColor }}>{topoScore}</span>
                                        <span className="text-[8px] font-mono text-[#565f89]">/100</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: scoreColor, boxShadow: `0 0 6px ${scoreColor}60` }} />
                                        <span className="text-xs font-bold font-digital tracking-wider" style={{ color: scoreColor }}>{scoreLabel} RISK</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-[#565f89] leading-relaxed">
                                        Pre-rainfall terrain vulnerability based on slope gradient and relative elevation analysis.
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] font-mono text-[#565f89]">
                                        <span>Slope Factor: {(slopeFactor * 100).toFixed(0)}%</span>
                                        <span>Elev Factor: {(elevFactor * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
};

export default TerrainCard;
