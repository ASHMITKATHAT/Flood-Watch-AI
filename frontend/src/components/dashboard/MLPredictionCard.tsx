import React from 'react';
import { Brain, TrendingUp, Droplets, Mountain, Activity, Loader2, WifiOff, Satellite } from 'lucide-react';
import { PredictPayload } from '../../contexts/SimulationContext';

// ── Risk tier logic ──────────────────────────────────────────
type RiskTier = 'safe' | 'warning' | 'critical';

const getTier = (pct: number): RiskTier =>
    pct >= 75 ? 'critical' : pct >= 40 ? 'warning' : 'safe';

const TIER_COLORS: Record<RiskTier, { primary: string; bg: string; border: string; glow: string }> = {
    safe: { primary: '#9ece6a', bg: 'rgba(158,206,106,0.06)', border: 'rgba(158,206,106,0.25)', glow: 'rgba(158,206,106,0.15)' },
    warning: { primary: '#e0af68', bg: 'rgba(224,175,104,0.06)', border: 'rgba(224,175,104,0.25)', glow: 'rgba(224,175,104,0.15)' },
    critical: { primary: '#f7768e', bg: 'rgba(247,118,142,0.06)', border: 'rgba(247,118,142,0.25)', glow: 'rgba(247,118,142,0.2)' },
};

const TIER_LABELS: Record<RiskTier, string> = {
    safe: 'LOW RISK',
    warning: 'ELEVATED RISK',
    critical: 'CRITICAL RISK',
};

// ── XAI helper: generate explanation sentences ───────────────
function buildExplanation(d: PredictPayload): string[] {
    const lines: string[] = [];
    const inp = d.inputs;

    if (inp.rainfall_mm > 30) lines.push(`Heavy rainfall (${inp.rainfall_mm.toFixed(1)} mm) sharply elevates flood probability.`);
    else if (inp.rainfall_mm > 10) lines.push(`Moderate rainfall (${inp.rainfall_mm.toFixed(1)} mm) contributes to elevated risk.`);
    else if (inp.rainfall_mm > 0) lines.push(`Light rainfall detected (${inp.rainfall_mm.toFixed(1)} mm) — minimal contribution.`);
    else lines.push('No recent rainfall detected — reduces flood probability.');

    if (inp.elevation_m < 150) lines.push(`Low elevation (${inp.elevation_m.toFixed(0)}m ASL) — terrain acts as a water collection basin.`);
    else if (inp.elevation_m > 400) lines.push(`High elevation (${inp.elevation_m.toFixed(0)}m ASL) provides natural drainage advantage.`);

    if (inp.slope_degrees < 2) lines.push(`Near-flat terrain (${inp.slope_degrees.toFixed(1)}°) — water pooling risk is high.`);
    else if (inp.slope_degrees > 10) lines.push(`Steep slope (${inp.slope_degrees.toFixed(1)}°) — flash flood runoff potential.`);

    if (inp.sar_flooded_hectares > 0) lines.push(`SAR detects ${inp.sar_flooded_hectares.toFixed(1)} ha of existing surface water.`);

    if (lines.length === 0) lines.push('All contributing factors are within normal parameters.');
    return lines;
}

// ── SVG Gauge ────────────────────────────────────────────────
const RiskGauge: React.FC<{ value: number; color: string; tier: RiskTier }> = ({ value, color, tier }) => {
    const size = 160;
    const strokeW = 10;
    const radius = (size - strokeW) / 2;
    const center = size / 2;
    const circumference = Math.PI * radius; // half-arc
    const progress = Math.min(100, Math.max(0, value));
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
                {/* Track */}
                <path
                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                    fill="none" stroke="rgba(65,72,104,0.5)" strokeWidth={strokeW} strokeLinecap="round"
                />
                {/* Filled arc */}
                <path
                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                    fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    className={tier === 'critical' ? 'ml-gauge-critical-arc' : ''}
                    style={{ filter: `drop-shadow(0 0 8px ${color}60)`, transition: 'stroke-dashoffset 1.2s ease-out' }}
                />
                {/* Center text */}
                <text x={center} y={center - 12} textAnchor="middle" fill={color} fontSize="32" fontWeight="bold"
                    style={{ fontFamily: 'Orbitron, monospace', filter: `drop-shadow(0 0 6px ${color}50)` }}>
                    {progress.toFixed(1)}
                </text>
                <text x={center} y={center + 6} textAnchor="middle" fill="#565f89" fontSize="11"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    % RISK
                </text>
            </svg>
        </div>
    );
};

// ── Factor row component ─────────────────────────────────────
const FactorRow: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext?: string }> = ({ icon, label, value, subtext }) => (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#1f2335] border border-[#414868]">
        <div className="p-1.5 rounded-md bg-[#24283b] border border-[#414868] text-[#565f89] flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-[#565f89] uppercase tracking-widest">{label}</div>
            <div className="text-sm font-bold text-[#c0caf5] font-digital truncate">{value}</div>
        </div>
        {subtext && <span className="text-[9px] font-mono text-[#565f89] flex-shrink-0">{subtext}</span>}
    </div>
);

// ═══════════════════════════════════════════════════════════════
// MLPredictionCard — Presentational Component (reads from props)
// ═══════════════════════════════════════════════════════════════

interface MLPredictionCardProps {
    data: PredictPayload | null;
    isLoading?: boolean;
}

const MLPredictionCard: React.FC<MLPredictionCardProps> = ({ data, isLoading = false }) => {
    // ── Loading state ────────────────────────────────────────
    if (isLoading && !data) {
        return (
            <div className="w-full h-auto flex flex-col gap-3 rounded-lg bg-slate-900 border border-slate-700 p-4 flex-shrink-0 items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#7aa2f7] animate-spin" />
                <span className="text-xs font-mono text-[#565f89] tracking-widest uppercase">Inference Pipeline Running…</span>
                <span className="text-[10px] font-mono text-[#565f89]/70">Fusing Weather + Topo + SAR → RF Model</span>
            </div>
        );
    }

    // ── No data state ────────────────────────────────────────
    if (!data) {
        return (
            <div className="w-full h-auto flex flex-col gap-3 rounded-lg bg-slate-900 border border-slate-700 p-4 flex-shrink-0 items-center justify-center">
                <WifiOff className="w-8 h-8 text-[#565f89]" />
                <span className="text-xs font-bold text-[#565f89] tracking-wider uppercase">No Data</span>
                <span className="text-[10px] font-mono text-[#565f89]/70 text-center max-w-[220px]">Search a location to run the ML prediction pipeline</span>
            </div>
        );
    }

    // ── Derived values ───────────────────────────────────────
    const tier = getTier(data.risk_percentage);
    const colors = TIER_COLORS[tier];
    const explanations = buildExplanation(data);
    const inp = data.inputs;

    return (
        <div
            className={`w-full h-auto flex flex-col gap-3 rounded-lg bg-slate-900 border border-slate-700 p-4 flex-shrink-0 relative overflow-hidden ${tier === 'critical' ? 'ml-card-critical-pulse' : ''}`}
            style={{ borderColor: colors.border, background: colors.bg, boxShadow: `0 0 24px ${colors.glow}` }}
        >
            {/* Ambient glow ring */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${colors.primary}50, transparent 70%)` }} />

            <div className="relative z-10">

                {/* ── Header ────────────────────────────────── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg" style={{ background: `${colors.primary}12`, border: `1px solid ${colors.primary}30` }}>
                            <Brain className="w-5 h-5" style={{ color: colors.primary }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#c0caf5] tracking-wider">ML FLOOD PREDICTOR</h3>
                            <span className="text-[9px] font-mono text-[#565f89]">Phase 5 • {data.engine || 'Ensemble'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
                        <div className={`w-2 h-2 rounded-full ${tier === 'critical' ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: colors.primary, boxShadow: `0 0 6px ${colors.primary}60` }} />
                        <span className="text-[9px] font-bold font-mono tracking-wider" style={{ color: colors.primary }}>
                            {TIER_LABELS[tier]}
                        </span>
                    </div>
                </div>

                {/* ── Master Score Gauge ─────────────────────── */}
                <RiskGauge value={data.risk_percentage} color={colors.primary} tier={tier} />

                {/* ── Confidence + Flood Depth ────────────────── */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-[#1f2335] rounded-lg p-3 border border-[#414868] text-center">
                        <div className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest mb-1">Confidence</div>
                        <div className="text-lg font-bold font-digital text-[#c0caf5]">{(data.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-[#1f2335] rounded-lg p-3 border border-[#414868] text-center">
                        <div className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest mb-1">Flood Depth</div>
                        <div className="text-lg font-bold font-digital text-[#c0caf5]">{data.flood_depth_m.toFixed(2)}m</div>
                    </div>
                </div>

                {/* ── Contributing Factors (XAI) ────────────── */}
                <div className="mt-4">
                    <div className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest mb-2.5">Contributing Factors</div>
                    <div className="space-y-1.5">
                        <FactorRow icon={<Droplets className="w-3.5 h-3.5" />} label="Rainfall"
                            value={inp.rainfall_mm != null ? `${inp.rainfall_mm.toFixed(1)} mm` : 'No Data'}
                            subtext={inp.rainfall_mm > 30 ? '⚠ Heavy' : inp.rainfall_mm > 10 ? '◐ Moderate' : '✓ Light'} />
                        <FactorRow icon={<Mountain className="w-3.5 h-3.5" />} label="Elevation"
                            value={inp.elevation_m != null ? `${inp.elevation_m.toFixed(0)} m ASL` : 'No Data'}
                            subtext={inp.elevation_m < 150 ? '⚠ Low' : inp.elevation_m > 400 ? '✓ High' : '◐ Mid'} />
                        <FactorRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Slope"
                            value={inp.slope_degrees != null ? `${inp.slope_degrees.toFixed(1)}°` : 'No Data'}
                            subtext={inp.slope_degrees < 2 ? '⚠ Flat' : inp.slope_degrees > 10 ? '⚠ Steep' : '✓ Drain'} />
                        <FactorRow icon={<Satellite className="w-3.5 h-3.5" />} label="SAR Inundation"
                            value={inp.sar_flooded_hectares > 0 ? `${inp.sar_flooded_hectares.toFixed(1)} ha` : 'None detected'}
                            subtext={inp.sar_flooded_hectares > 0 ? '⚠ Water' : '✓ Clear'} />
                    </div>
                </div>

                {/* ── XAI Explanation ────────────────────────── */}
                <div className="mt-4 p-3 rounded-lg bg-[#1f2335] border border-[#414868]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="w-3 h-3 text-[#565f89]" />
                        <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest">Explainable AI Insight</span>
                    </div>
                    <p className="text-[11px] font-mono text-[#a9b1d6] leading-relaxed">
                        {explanations.slice(0, 3).join(' ')}
                    </p>
                </div>

                {/* ── Data Sources Badge ─────────────────────── */}
                <div className="mt-4 pt-3 border-t border-[#414868] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7aa2f7] animate-pulse shadow-[0_0_6px_rgba(122,162,247,0.5)]" />
                    <span className="text-[8px] font-mono text-[#565f89] tracking-wider leading-tight">
                        Topo: <strong className="text-[#a9b1d6]">{data.data_sources?.topography || 'N/A'}</strong>
                        {' • '}Weather: <strong className="text-[#a9b1d6]">{data.data_sources?.weather || 'N/A'}</strong>
                        {' • '}SAR: <strong className="text-[#a9b1d6]">{data.data_sources?.sar || 'N/A'}</strong>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MLPredictionCard;
