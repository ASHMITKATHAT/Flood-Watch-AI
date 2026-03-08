import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Satellite, Radio, ShieldCheck, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { fetchSARData, SARMetrics } from '../../services/api';

interface SARTelemetryPanelProps {
    lat?: number;
    lng?: number;
    radiusKm?: number;
}

type PanelState = 'loading' | 'loaded' | 'error';

const SARTelemetryPanel: React.FC<SARTelemetryPanelProps> = ({
    lat = 26.9124,
    lng = 75.7873,
    radiusKm = 5,
}) => {
    const [state, setState] = useState<PanelState>('loading');
    const [sarData, setSarData] = useState<SARMetrics | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [loadingPhase, setLoadingPhase] = useState(0);
    const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const LOADING_PHASES = [
        'Initiating Microwave Penetration Scan...',
        'Bypassing Cloud Cover...',
        'Querying Sentinel-1 GRD Archive...',
        'Applying VV Polarisation Threshold...',
        'Computing Inundation Mask...',
        'Calculating Flood Extent...',
    ];

    // Cycle loading text
    useEffect(() => {
        if (state === 'loading') {
            setLoadingPhase(0);
            phaseInterval.current = setInterval(() => {
                setLoadingPhase(p => (p + 1) % LOADING_PHASES.length);
            }, 2400);
        } else if (phaseInterval.current) {
            clearInterval(phaseInterval.current);
        }
        return () => { if (phaseInterval.current) clearInterval(phaseInterval.current); };
    }, [state]);

    const fetchData = useCallback(async () => {
        setState('loading');
        setErrorMsg('');
        try {
            const res = await fetchSARData(lat, lng, radiusKm);
            setSarData(res.data);

            if (res.data.status === 'ERROR' || res.data.status === 'GEE_NOT_INITIALIZED') {
                setErrorMsg(res.data.message);
                setState('error');
            } else {
                setState('loaded');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Radar Link Offline');
            setState('error');
        }
    }, [lat, lng, radiusKm]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ──
    const isFlooded = sarData && sarData.flooded_area_hectares != null && sarData.flooded_area_hectares > 0;
    const floodColor = isFlooded ? '#f7768e' : '#9ece6a';
    const floodBg = isFlooded ? 'rgba(247,118,142,0.06)' : 'rgba(158,206,106,0.06)';

    // ── Loading State ──
    if (state === 'loading') {
        return (
            <div className="glass-panel p-6 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative overflow-hidden">
                {/* Radar sweep animation */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="sar-sweep" />
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#7aa2f7]/10 border border-[#7aa2f7]/20">
                                <Satellite className="w-5 h-5 text-[#7aa2f7] animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#c0caf5] tracking-wider">LIVE SAR INUNDATION RADAR</h3>
                                <span className="text-[10px] font-mono text-[#565f89]">Sentinel-1 C-Band • Copernicus</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 rounded-full animate-pulse">
                            <Radio className="w-3.5 h-3.5 text-[#7aa2f7]" />
                            <span className="text-[9px] font-bold font-mono text-[#7aa2f7] tracking-wider">SCANNING</span>
                        </div>
                    </div>

                    {/* Animated scan visualization */}
                    <div className="flex items-center justify-center py-8">
                        <div className="relative" style={{ width: 120, height: 120 }}>
                            {/* Concentric radar rings */}
                            {[40, 52, 64].map((r, i) => (
                                <svg key={r} className="absolute inset-0" width="120" height="120" viewBox="0 0 120 120">
                                    <circle
                                        cx="60" cy="60" r={r} fill="none"
                                        stroke="#7aa2f7" strokeWidth="1" opacity={0.15 + i * 0.08}
                                        strokeDasharray="4 4"
                                    />
                                </svg>
                            ))}
                            {/* Sweep line */}
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom"
                                style={{
                                    width: 2,
                                    height: 60,
                                    background: 'linear-gradient(to top, #7aa2f7, transparent)',
                                    animation: 'sar-rotate 2.5s linear infinite',
                                }}
                            />
                            {/* Center dot */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#7aa2f7]" style={{ boxShadow: '0 0 12px #7aa2f7' }} />
                        </div>
                    </div>

                    {/* Phase text */}
                    <div className="text-center">
                        <p className="text-xs font-mono text-[#7aa2f7] font-bold tracking-wider animate-pulse">
                            {LOADING_PHASES[loadingPhase]}
                        </p>
                        <p className="text-[10px] font-mono text-[#565f89] mt-2">GEE processing may take 10–30 seconds</p>
                    </div>
                </div>

                <style>{`
                    @keyframes sar-rotate {
                        from { transform: translateX(-50%) rotate(0deg); }
                        to { transform: translateX(-50%) rotate(360deg); }
                    }
                    .sar-sweep {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: linear-gradient(180deg, rgba(122,162,247,0.04) 0%, transparent 40%);
                        animation: sar-sweep-move 3s ease-in-out infinite;
                    }
                    @keyframes sar-sweep-move {
                        0%, 100% { transform: translateY(-10%); opacity: 0.5; }
                        50% { transform: translateY(10%); opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    // ── Error State ──
    if (state === 'error') {
        return (
            <div className="glass-panel p-6 border border-[#f7768e]/30 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#f7768e]/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/20">
                            <WifiOff className="w-5 h-5 text-[#f7768e]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#c0caf5] tracking-wider">LIVE SAR INUNDATION RADAR</h3>
                            <span className="text-[10px] font-mono text-[#565f89]">Sentinel-1 C-Band • Copernicus</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#f7768e]/5 border border-[#f7768e]/20 rounded-xl p-4 text-center">
                    <WifiOff className="w-8 h-8 text-[#f7768e]/70 mx-auto mb-2" />
                    <span className="text-sm font-bold font-digital text-[#f7768e] tracking-wider block">RADAR LINK OFFLINE</span>
                    <p className="text-[10px] font-mono text-[#f7768e]/80 mt-2 max-w-[280px] mx-auto">{errorMsg}</p>
                </div>

                <button
                    onClick={fetchData}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1f2335] hover:bg-[#292e42] border border-[#414868] rounded-lg transition-colors duration-200"
                >
                    <RefreshCw className="w-3.5 h-3.5 text-[#a9b1d6]" />
                    <span className="text-xs font-mono text-[#a9b1d6] font-bold tracking-wider">RETRY SCAN</span>
                </button>
            </div>
        );
    }

    // ── Loaded State ──
    const floodHa = sarData?.flooded_area_hectares ?? 0;
    const totalHa = sarData?.total_area_hectares ?? 0;
    const fractionPct = sarData?.flood_fraction_pct ?? 0;
    const pixelCount = sarData?.water_pixel_count ?? 0;
    const imageDate = sarData?.recent_image_date ?? 'N/A';
    const isNoImages = sarData?.status === 'NO_IMAGES';

    return (
        <div
            className="glass-panel p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 ease-in-out relative overflow-hidden"
            style={{
                borderColor: isFlooded ? 'rgba(247,118,142,0.3)' : 'rgba(158,206,106,0.2)',
                background: floodBg,
                boxShadow: isFlooded ? '0 0 20px rgba(247,118,142,0.08), 0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.3)',
            }}
        >
            {/* Subtle background pulse for flood detection */}
            {isFlooded && (
                <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full animate-pulse opacity-20"
                    style={{ background: `radial-gradient(circle, rgba(247,118,142,0.3), transparent 70%)` }}
                />
            )}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: `${floodColor}10`, border: `1px solid ${floodColor}30` }}>
                            <Satellite className="w-5 h-5" style={{ color: floodColor }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#c0caf5] tracking-wider">LIVE SAR INUNDATION RADAR</h3>
                            <span className="text-[10px] font-mono text-[#565f89]">Sentinel-1 C-Band • Copernicus</span>
                        </div>
                    </div>
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: `${floodColor}10`, border: `1px solid ${floodColor}30` }}
                    >
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: floodColor }} />
                        <span className="text-[9px] font-bold font-mono tracking-wider" style={{ color: floodColor }}>
                            {isNoImages ? 'NO DATA' : isFlooded ? 'FLOOD DETECTED' : 'CLEAR'}
                        </span>
                    </div>
                </div>

                {isNoImages ? (
                    <div className="bg-[#e0af68]/5 border border-[#e0af68]/20 rounded-xl p-4 text-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-[#e0af68] mx-auto mb-1" />
                        <span className="text-xs font-mono text-[#e0af68] font-bold">No Sentinel-1 passes in the last 10 days</span>
                    </div>
                ) : (
                    <>
                        {/* Flood Extent — Primary metric */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="rounded-xl p-4 border" style={{ background: `${floodColor}06`, borderColor: `${floodColor}25` }}>
                                <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-2">DETECTED FLOOD EXTENT</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold font-digital" style={{ color: floodColor }}>
                                        {floodHa.toLocaleString()}
                                    </span>
                                    <span className="text-sm font-mono text-[#565f89]">ha</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: floodColor }} />
                                    <span className="text-xs font-bold font-digital tracking-wider" style={{ color: floodColor }}>
                                        {isFlooded ? 'INUNDATION ACTIVE' : 'NO INUNDATION'}
                                    </span>
                                </div>
                                {/* Flood fraction bar */}
                                <div className="mt-3 h-2 bg-[#414868]/40 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${Math.min(100, fractionPct * 2)}%`,
                                            backgroundColor: floodColor,
                                            boxShadow: `0 0 8px ${floodColor}40`,
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-[#565f89] mt-1 block">
                                    {fractionPct}% of {totalHa.toLocaleString()} ha AOI
                                </span>
                            </div>

                            {/* Water pixel count + satellite pass */}
                            <div className="space-y-3">
                                <div className="rounded-xl p-4 border bg-[#1f2335] border-[#414868]">
                                    <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-2">WATER PIXELS</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-bold font-digital text-[#7aa2f7]">{pixelCount.toLocaleString()}</span>
                                        <span className="text-[10px] font-mono text-[#565f89]">px @ 10m</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#565f89] mt-1 block">VV &lt; {sarData?.threshold_db ?? -18} dB threshold</span>
                                </div>

                                <div className="rounded-xl p-4 border bg-[#1f2335] border-[#414868]">
                                    <span className="text-[9px] font-mono text-[#565f89] uppercase tracking-widest block mb-1">LAST SATELLITE PASS</span>
                                    <span className="text-lg font-bold font-digital text-[#c0caf5] tracking-wider">{imageDate}</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Source badge + refresh */}
                <div className="flex items-center justify-between pt-3 border-t border-[#414868]">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#9ece6a] flex-shrink-0" />
                        <div>
                            <span className="text-[10px] font-bold text-[#a9b1d6] block">Copernicus Sentinel-1 (Microwave Band)</span>
                            <span className="text-[9px] font-mono text-[#565f89]">Google Earth Engine • 10m resolution</span>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-1.5 rounded-lg bg-[#1f2335] hover:bg-[#292e42] border border-[#414868] transition-colors"
                        title="Re-scan"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-[#565f89]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SARTelemetryPanel;
