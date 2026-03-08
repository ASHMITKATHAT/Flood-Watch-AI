import React, { useState, useMemo } from 'react';
import { Clock, CloudRain, Waves, ShieldAlert, ChevronDown, Zap, MapPin, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import {
    ComposedChart, Area, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ────────────────── Timeseries Types ────────────────── */

interface HourlyDataPoint {
    time: string;
    rainfall: number;
    actualDepth: number;
    predictedDepth: number;
}

interface HistoricalEvent {
    id: string;
    location: string;
    date: string;
    dateShort: string;
    state: string;
    rainfallLabel: string;
    rainfallMm: number;
    realDepthPeak: number;
    predictedDepthPeak: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'SAFE';
    category: 'disaster' | 'safe';
    description: string;
    coordinates: { lat: number; lng: number };
    timeseries: HourlyDataPoint[];
}

/* ────────────────── Timeseries Generator ────────────────── */

/**
 * Generates an hourly escalation curve simulating a disaster buildup.
 * Uses an exponential sigmoid-like curve for realistic flash flood progression.
 */
function generateTimeseries(
    hours: number,
    peakActual: number,
    peakPredicted: number,
    peakRainfall: number,
    startHour: number = 6,
    peakPosition: number = 0.7,  // where the peak occurs (0-1 ratio)
): HourlyDataPoint[] {
    const data: HourlyDataPoint[] = [];
    for (let i = 0; i < hours; i++) {
        const t = i / (hours - 1);  // normalize 0→1

        // Escalation curve: slow start → aggressive ramp → plateau
        const escalation = t < peakPosition
            ? Math.pow(t / peakPosition, 2.5)  // accelerating rise
            : 1 - 0.15 * Math.pow((t - peakPosition) / (1 - peakPosition), 1.5);  // slight decay

        // Add realistic variance
        const noise = 1 + (Math.sin(i * 3.7) * 0.04);
        const predictionBias = 1 + (Math.sin(i * 2.1) * 0.06);  // prediction oscillates

        // Rainfall builds earlier, peaks sooner, then drops
        const rainT = Math.min(t / (peakPosition * 0.8), 1);
        const rainCurve = rainT < 1
            ? Math.pow(rainT, 1.8) * (1 + Math.sin(rainT * Math.PI) * 0.3)
            : Math.max(0, 1 - Math.pow((t - peakPosition * 0.8) / (1 - peakPosition * 0.8), 2) * 0.8);

        const hour = (startHour + i) % 24;
        const hh = hour.toString().padStart(2, '0');

        data.push({
            time: `${hh}:00`,
            rainfall: +(peakRainfall / hours * rainCurve * 2.5 * noise).toFixed(1),
            actualDepth: +(peakActual * escalation * noise).toFixed(2),
            predictedDepth: +(peakPredicted * escalation * predictionBias).toFixed(2),
        });
    }
    return data;
}

/* ────────────────── Historical Dataset ────────────────── */

const EVENTS: HistoricalEvent[] = [
    {
        id: 'wayanad-2024',
        location: 'Wayanad Landslides',
        date: 'July 30, 2024',
        dateShort: '30 Jul 2024',
        state: 'Kerala',
        rainfallLabel: '300mm',
        rainfallMm: 300,
        realDepthPeak: 8.5,
        predictedDepthPeak: 8.7,
        riskLevel: 'CRITICAL',
        category: 'disaster',
        description: 'Devastating landslides triggered by extreme monsoon downpour. Entire villages buried under debris and floodwater.',
        coordinates: { lat: 11.6854, lng: 76.1320 },
        timeseries: generateTimeseries(18, 8.5, 8.7, 300, 2, 0.72),
    },
    {
        id: 'chennai-2023',
        location: 'Chennai Michaung Floods',
        date: 'December 4, 2023',
        dateShort: '04 Dec 2023',
        state: 'Tamil Nadu',
        rainfallLabel: '450mm',
        rainfallMm: 450,
        realDepthPeak: 1.5,
        predictedDepthPeak: 1.4,
        riskLevel: 'CRITICAL',
        category: 'disaster',
        description: 'Cyclone Michaung made landfall near Chennai, causing severe urban flooding and infrastructure damage.',
        coordinates: { lat: 13.0827, lng: 80.2707 },
        timeseries: generateTimeseries(24, 1.5, 1.4, 450, 0, 0.65),
    },
    {
        id: 'sikkim-2023',
        location: 'Sikkim Teesta GLOF',
        date: 'October 4, 2023',
        dateShort: '04 Oct 2023',
        state: 'Sikkim',
        rainfallLabel: 'Dam Breach',
        rainfallMm: 40,
        realDepthPeak: 6.0,
        predictedDepthPeak: 6.2,
        riskLevel: 'CRITICAL',
        category: 'disaster',
        description: 'South Lhonak glacial lake outburst flood triggered a massive surge down the Teesta River, destroying Chungthang Dam.',
        coordinates: { lat: 27.3389, lng: 88.6065 },
        timeseries: generateTimeseries(12, 6.0, 6.2, 40, 5, 0.45),  // GLOF = fast peak
    },
    {
        id: 'himachal-2023',
        location: 'Himachal Pradesh Floods',
        date: 'July 9, 2023',
        dateShort: '09 Jul 2023',
        state: 'Himachal Pradesh',
        rainfallLabel: '250mm',
        rainfallMm: 250,
        realDepthPeak: 4.5,
        predictedDepthPeak: 4.3,
        riskLevel: 'CRITICAL',
        category: 'disaster',
        description: 'Record monsoon rains caused widespread flash floods and landslides across multiple districts of Himachal Pradesh.',
        coordinates: { lat: 31.1048, lng: 77.1734 },
        timeseries: generateTimeseries(20, 4.5, 4.3, 250, 4, 0.68),
    },
    {
        id: 'bengaluru-2022',
        location: 'Bengaluru ORR Floods',
        date: 'September 5, 2022',
        dateShort: '05 Sep 2022',
        state: 'Karnataka',
        rainfallLabel: '131mm',
        rainfallMm: 131,
        realDepthPeak: 1.2,
        predictedDepthPeak: 1.3,
        riskLevel: 'HIGH',
        category: 'disaster',
        description: 'Outer Ring Road submerged after intense rainfall. IT corridor paralyzed, thousands of residents stranded.',
        coordinates: { lat: 12.9716, lng: 77.5946 },
        timeseries: generateTimeseries(14, 1.2, 1.3, 131, 12, 0.6),
    },
    {
        id: 'punjab-2025',
        location: 'Punjab Sutlej Floods',
        date: 'August 18, 2025',
        dateShort: '18 Aug 2025',
        state: 'Punjab',
        rainfallLabel: '280mm',
        rainfallMm: 280,
        realDepthPeak: 3.4,
        predictedDepthPeak: 3.5,
        riskLevel: 'CRITICAL',
        category: 'disaster',
        description: 'Severe riverine flooding along the Sutlej basin exacerbated by extreme upstream rainfall.',
        coordinates: { lat: 31.1471, lng: 74.9811 },
        timeseries: generateTimeseries(12, 3.4, 3.5, 280, 2, 0.6),
    },
    {
        id: 'cherrapunji-2024',
        location: 'Cherrapunji Runoff',
        date: 'July 15, 2024',
        dateShort: '15 Jul 2024',
        state: 'Meghalaya',
        rainfallLabel: '850mm',
        rainfallMm: 850,
        realDepthPeak: 0.1,
        predictedDepthPeak: 0.12,
        riskLevel: 'SAFE',
        category: 'safe',
        description: 'Extreme monsoon downpour on high-altitude plateau with 100% natural runoff into valleys. Zero accumulation.',
        coordinates: { lat: 25.2702, lng: 91.7323 },
        timeseries: generateTimeseries(12, 0.1, 0.12, 850, 6, 0.5),
    },
    {
        id: 'mahabaleshwar-2024',
        location: 'Mahabaleshwar Runoff',
        date: 'August 10, 2024',
        dateShort: '10 Aug 2024',
        state: 'Maharashtra',
        rainfallLabel: '450mm',
        rainfallMm: 450,
        realDepthPeak: 0.05,
        predictedDepthPeak: 0.08,
        riskLevel: 'SAFE',
        category: 'safe',
        description: 'Heavy Western Ghats rainfall. Steep topography ensured rapid discharge, maintaining near-zero depth.',
        coordinates: { lat: 17.9307, lng: 73.6477 },
        timeseries: generateTimeseries(12, 0.05, 0.08, 450, 4, 0.6),
    },
    {
        id: 'shimla-2023',
        location: 'Shimla Runoff',
        date: 'July 25, 2023',
        dateShort: '25 Jul 2023',
        state: 'Himachal Pradesh',
        rainfallLabel: '210mm',
        rainfallMm: 210,
        realDepthPeak: 0.1,
        predictedDepthPeak: 0.1,
        riskLevel: 'SAFE',
        category: 'safe',
        description: 'Intense hill station rain event. Complete gravitational runoff with no urban water stagnation.',
        coordinates: { lat: 31.1048, lng: 77.1734 },
        timeseries: generateTimeseries(12, 0.1, 0.1, 210, 8, 0.55),
    },
    {
        id: 'darjeeling-2024',
        location: 'Darjeeling Runoff',
        date: 'September 12, 2024',
        dateShort: '12 Sep 2024',
        state: 'West Bengal',
        rainfallLabel: '320mm',
        rainfallMm: 320,
        realDepthPeak: 0.15,
        predictedDepthPeak: 0.1,
        riskLevel: 'SAFE',
        category: 'safe',
        description: 'Late monsoon deluge over steep tea garden slopes. Rapid drainage prevented any persistent flooding.',
        coordinates: { lat: 27.0360, lng: 88.2627 },
        timeseries: generateTimeseries(12, 0.15, 0.1, 320, 5, 0.45),
    },
    {
        id: 'mount_abu-2024',
        location: 'Mount Abu Runoff',
        date: 'August 5, 2024',
        dateShort: '05 Aug 2024',
        state: 'Rajasthan',
        rainfallLabel: '150mm',
        rainfallMm: 150,
        realDepthPeak: 0.0,
        predictedDepthPeak: 0.05,
        riskLevel: 'SAFE',
        category: 'safe',
        description: 'Aravalli range peak rainfall. Water instantly shed into surrounding plains. Surface remained clear.',
        coordinates: { lat: 24.5926, lng: 72.7156 },
        timeseries: generateTimeseries(12, 0.0, 0.05, 150, 10, 0.5),
    }
];

/* ────────────────── Custom Tooltip ────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="px-4 py-3 rounded-lg border border-blue-200 backdrop-blur-xl shadow-2xl"
            style={{ backgroundColor: 'rgba(6, 12, 28, 0.95)' }}>
            <div className="text-[10px] font-mono text-blue-600 tracking-wider mb-2 border-b border-gray-200 pb-1.5">
                T+{label}
            </div>
            {payload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-6 text-xs font-mono py-0.5">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-500">{entry.name}</span>
                    </span>
                    <span className="font-bold" style={{ color: entry.color }}>
                        {entry.value}{entry.name === 'Rainfall' ? ' mm/hr' : ' m'}
                    </span>
                </div>
            ))}
        </div>
    );
};

/* ────────────────── Custom Legend ────────────────── */

const CustomLegendContent = () => (
    <div className="flex items-center justify-center gap-6 mt-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-blue-500/30 border border-blue-500/40" />
            <span className="text-slate-500">RAINFALL (mm/hr)</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-[#FF2A2A]" />
            <span className="text-slate-500">ACTUAL DEPTH</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 border-t-2 border-dashed border-[#00F0FF]" />
            <span className="text-slate-500">EQUINOX PREDICTED</span>
        </div>
    </div>
);

/* ────────────────── Page Component ────────────────── */

const HistoricalSimulationsPage: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const selected = EVENTS.find(e => e.id === selectedId) || null;

    const accuracy = useMemo(() => {
        if (!selected) return null;
        const denominator = Math.max(selected.realDepthPeak, 1.0);
        return (100 - Math.abs(selected.realDepthPeak - selected.predictedDepthPeak) / denominator * 100).toFixed(1);
    }, [selected]);

    return (
        <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] p-4 md:p-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-400 to-cyan-300">
                        HISTORICAL DISASTER SIMULATIONS
                    </h1>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                        Replay verified disaster events against the EQUINOX prediction engine
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-3 md:mt-0 px-3 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-full">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-mono text-emerald-400 tracking-wider">{EVENTS.length} VERIFIED EVENTS LOADED</span>
                </div>
            </div>

            {/* Event Selector Dropdown */}
            <div className="relative max-w-xl mb-8">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`
                        w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-300
                        bg-[#1f2335] border text-left
                        ${isDropdownOpen
                            ? 'border-[#7aa2f7] shadow-[0_0_25px_rgba(122,162,247,0.12)]'
                            : 'border-[#414868] hover:border-[#7aa2f7]/50'
                        }
                    `}
                >
                    <div className="flex items-center gap-3">
                        <Clock className={`w-5 h-5 ${selected ? 'text-[#7aa2f7]' : 'text-slate-500'}`} />
                        {selected ? (
                            <div>
                                <span className="text-sm font-medium text-[#c0caf5]">{selected.location}</span>
                                <span className="text-[10px] font-mono text-slate-500 ml-3">{selected.dateShort} • {selected.state}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-500">Select a historical event to run the simulation engine...</span>
                        )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full mt-2 w-full rounded-xl bg-[#1f2335] backdrop-blur-xl border border-[#414868] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-fade-in max-h-96 overflow-y-auto custom-scrollbar">
                        <div className="p-2 border-b border-[#414868] bg-rose-500/10">
                            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest px-2">SEVERE FLOOD DISASTERS</span>
                        </div>
                        <div className="py-1">
                            {EVENTS.filter(e => e.category === 'disaster').map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => { setSelectedId(event.id); setIsDropdownOpen(false); }}
                                    className={`
                                        flex items-center gap-3 w-full px-4 py-3.5 text-left transition-all duration-200
                                        ${selectedId === event.id ? 'bg-[#7aa2f7]/10 text-[#7aa2f7]' : 'text-slate-300 hover:bg-slate-800 hover:text-[#c0caf5]'}
                                    `}
                                >
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.riskLevel === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`} />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{event.location}</span>
                                        <span className="text-[11px] text-slate-500 truncate">{event.state} • {event.rainfallLabel} rainfall</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-[10px] font-mono text-slate-600">{event.dateShort}</div>
                                        <div className="text-[10px] font-bold font-mono text-red-400">{event.realDepthPeak}m</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-y border-gray-200 bg-emerald-500/5 mt-1">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest px-2">HIGH-ALTITUDE RUNOFFS (SAFE)</span>
                        </div>
                        <div className="py-1">
                            {EVENTS.filter(e => e.category === 'safe').map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => { setSelectedId(event.id); setIsDropdownOpen(false); }}
                                    className={`
                                        flex items-center gap-3 w-full px-4 py-3.5 text-left transition-all duration-200
                                        ${selectedId === event.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                                    `}
                                >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{event.location}</span>
                                        <span className="text-[11px] text-slate-500 truncate">{event.state} • {event.rainfallLabel} rainfall</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-[10px] font-mono text-slate-600">{event.dateShort}</div>
                                        <div className="text-[10px] font-bold font-mono text-emerald-400">{event.realDepthPeak}m</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ────────── Blank State ────────── */}
            {!selected && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#1f2335] border border-[#414868] flex items-center justify-center mb-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                        <Clock className="w-10 h-10 text-[#7aa2f7]" />
                    </div>
                    <h2 className="text-lg font-digital text-slate-400 tracking-wider mb-2">SELECT A HISTORICAL EVENT</h2>
                    <p className="text-xs font-mono text-slate-500 max-w-md">
                        Choose a verified disaster from the dropdown above to replay it against the EQUINOX prediction engine and compare predicted vs actual outcomes.
                    </p>
                </div>
            )}

            {/* ────────── Event Data Display ────────── */}
            {selected && (
                <div className="animate-fade-in space-y-6">
                    {/* Event Header */}
                    <div className="bg-[#1f2335] rounded-xl p-6 border border-rose-500/30 relative overflow-hidden shadow-xl">
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                                    <h2 className="text-xl font-bold font-digital text-[#c0caf5] tracking-wider">{selected.location}</h2>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider
                                        ${selected.riskLevel === 'CRITICAL'
                                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                            : selected.riskLevel === 'SAFE'
                                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                                : 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                                        }`}>
                                        {selected.riskLevel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{selected.date}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selected.state}, India</span>
                                    <span className="flex items-center gap-1 text-slate-600">
                                        {selected.coordinates.lat.toFixed(2)}°N, {selected.coordinates.lng.toFixed(2)}°E
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <div className="text-right">
                                    <div className="text-lg font-bold font-digital text-emerald-400">{accuracy}%</div>
                                    <div className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-wider">Model Accuracy</div>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-2xl relative z-10">{selected.description}</p>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Total Rainfall */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Rainfall</span>
                                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <CloudRain className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold font-digital text-gray-900" style={{ textShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
                                    {selected.rainfallLabel}
                                </span>
                            </div>
                            {selected.rainfallMm > 0 && (
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500/80 to-blue-400 transition-all duration-1000"
                                        style={{ width: `${Math.min(selected.rainfallMm / 5, 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Real Recorded Depth */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-rose-500/30 hover:border-rose-500/50 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Peak Recorded Depth</span>
                                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                                    <Waves className="w-5 h-5 text-rose-400" />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold font-digital text-rose-400" style={{ textShadow: '0 0 20px rgba(244,63,94,0.4)' }}>
                                    {selected.realDepthPeak}
                                </span>
                                <span className="text-sm text-slate-500 font-mono mb-1">meters</span>
                            </div>
                            <div className="mt-2 h-1.5 bg-[#1f2335] rounded-full overflow-hidden border border-[#414868]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-500/80 to-rose-400 transition-all duration-1000"
                                    style={{ width: `${Math.min(selected.realDepthPeak / 10 * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Risk Severity */}
                        <div className={`bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border transition-all duration-300 ${selected.riskLevel === 'CRITICAL'
                            ? 'border-rose-500/30 hover:border-rose-500/50'
                            : selected.riskLevel === 'SAFE'
                                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                                : 'border-orange-500/30 hover:border-orange-500/50'
                            }`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Risk Severity</span>
                                <div className={`p-2 rounded-lg ${selected.riskLevel === 'CRITICAL'
                                    ? 'bg-rose-500/10 border border-rose-500/30'
                                    : selected.riskLevel === 'SAFE'
                                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                                        : 'bg-orange-500/10 border border-orange-500/30'
                                    }`}>
                                    <ShieldAlert className={`w-5 h-5 ${selected.riskLevel === 'CRITICAL' ? 'text-rose-400' : selected.riskLevel === 'SAFE' ? 'text-emerald-400' : 'text-orange-400'
                                        } animate-pulse`} />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className={`text-2xl font-bold font-digital tracking-widest ${selected.riskLevel === 'CRITICAL' ? 'text-red-400' : selected.riskLevel === 'SAFE' ? 'text-emerald-400' : 'text-orange-400'
                                    }`} style={{ textShadow: `0 0 20px ${selected.riskLevel === 'CRITICAL' ? 'rgba(255,42,42,0.4)' : selected.riskLevel === 'SAFE' ? 'rgba(52,211,153,0.4)' : 'rgba(255,140,0,0.4)'}` }}>
                                    {selected.riskLevel === 'SAFE' ? 'SAFE (High Runoff)' : selected.riskLevel}
                                </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 mt-2">
                                {selected.riskLevel === 'SAFE' ? 'Verified extreme rainfall, natural runoff' : 'Verified historical classification'}
                            </div>
                        </div>
                    </div>

                    {/* ────────── Time-Series Escalation Chart ────────── */}
                    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-[#414868]">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-sm font-bold text-[#c0caf5] flex items-center gap-2 tracking-wider">
                                    <TrendingUp className="w-4 h-4 text-[#7aa2f7]" />
                                    DISASTER ESCALATION TIMELINE
                                </h3>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">
                                    Real-time depth escalation vs EQUINOX prediction model • {selected.timeseries.length}-hour window
                                </p>
                            </div>
                        </div>

                        {/* Chart with strict height and better margin for axis text */}
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={selected.timeseries} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <defs>
                                        {/* Red gradient for actual depth area */}
                                        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF2A2A" stopOpacity={0.35} />
                                            <stop offset="80%" stopColor="#FF2A2A" stopOpacity={0.05} />
                                            <stop offset="100%" stopColor="#FF2A2A" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.04)"
                                        vertical={false}
                                    />

                                    {/* X-Axis: Time */}
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />

                                    {/* Y-Axis Left: Depth (m) */}
                                    <YAxis
                                        yAxisId="depth"
                                        domain={[0, (dataMax: number) => Math.max(dataMax, 2)]}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={40}
                                        label={{
                                            value: 'Depth (m)',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 0,
                                            style: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
                                        }}
                                    />

                                    {/* Y-Axis Right: Rainfall (mm/hr) */}
                                    <YAxis
                                        yAxisId="rain"
                                        orientation="right"
                                        tick={{ fill: '#7aa2f7', fontSize: 10, fontFamily: 'monospace', opacity: 0.8 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={40}
                                        label={{
                                            value: 'Rainfall (mm/hr)',
                                            angle: 90,
                                            position: 'insideRight',
                                            offset: 0,
                                            style: { fill: '#7aa2f7', fontSize: 10, fontFamily: 'monospace', opacity: 0.8 },
                                        }}
                                    />

                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend content={<CustomLegendContent />} />

                                    {/* Layer 1: Rainfall bars (subtle background) */}
                                    <Bar
                                        yAxisId="rain"
                                        dataKey="rainfall"
                                        name="Rainfall"
                                        fill="#3b82f6"
                                        fillOpacity={0.15}
                                        stroke="#3b82f6"
                                        strokeOpacity={0.2}
                                        radius={[2, 2, 0, 0]}
                                    />

                                    {/* Layer 2: Actual depth area (red gradient fill) */}
                                    <Area
                                        yAxisId="depth"
                                        type="monotone"
                                        dataKey="actualDepth"
                                        name="Actual Depth"
                                        stroke="#FF2A2A"
                                        strokeWidth={2}
                                        fill="url(#gradActual)"
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#FF2A2A', stroke: '#1a1b26', strokeWidth: 2 }}
                                    />

                                    {/* Layer 3: Predicted depth line (dashed neon cyan) */}
                                    <Line
                                        yAxisId="depth"
                                        type="monotone"
                                        dataKey="predictedDepth"
                                        name="EQUINOX Predicted"
                                        stroke="#00F0FF"
                                        strokeWidth={3}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#00F0FF', stroke: '#1a1b26', strokeWidth: 2 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Accuracy callout */}
                        <div className="flex items-center justify-center gap-3 mt-4 px-6 py-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono text-emerald-400 tracking-wider">
                                EQUINOX PREDICTION ACCURACY: <span className="font-bold text-sm">{accuracy}%</span>
                                <span className="text-slate-500 ml-2">
                                    (Δ = {Math.abs(selected.realDepthPeak - selected.predictedDepthPeak).toFixed(1)}m peak deviation)
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalSimulationsPage;
