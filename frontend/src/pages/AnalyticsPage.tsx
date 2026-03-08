import React, { useState } from 'react';
import { BarChart3, TrendingUp, Droplets, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TREND_DATA = [
    { month: 'Jul', risk: 45, rainfall: 180, waterLevel: 2.1 },
    { month: 'Aug', risk: 72, rainfall: 320, waterLevel: 3.5 },
    { month: 'Sep', risk: 88, rainfall: 410, waterLevel: 4.2 },
    { month: 'Oct', risk: 65, rainfall: 220, waterLevel: 2.8 },
    { month: 'Nov', risk: 30, rainfall: 80, waterLevel: 1.2 },
    { month: 'Dec', risk: 15, rainfall: 20, waterLevel: 0.8 },
    { month: 'Jan', risk: 10, rainfall: 15, waterLevel: 0.5 },
    { month: 'Feb', risk: 25, rainfall: 45, waterLevel: 1.0 },
];

const DISTRICT_DATA = [
    { name: 'Jaipur', risk: 92, reports: 156, population: '3.1M', trend: '+12%' },
    { name: 'Kota', risk: 85, reports: 98, population: '1.0M', trend: '+8%' },
    { name: 'Ajmer', risk: 71, reports: 72, population: '0.5M', trend: '+5%' },
    { name: 'Udaipur', risk: 58, reports: 45, population: '0.5M', trend: '-3%' },
    { name: 'Jodhpur', risk: 32, reports: 21, population: '1.1M', trend: '-8%' },
    { name: 'Bikaner', risk: 18, reports: 8, population: '0.6M', trend: '-2%' },
    { name: 'Ludhiana', risk: 89, reports: 134, population: '1.6M', trend: '+15%' },
    { name: 'Patna', risk: 78, reports: 112, population: '2.0M', trend: '+10%' },
];

const DAILY_DATA = [
    { day: 'Mon', rainfall: 45, waterLevel: 1.8, alerts: 3 },
    { day: 'Tue', rainfall: 62, waterLevel: 2.3, alerts: 5 },
    { day: 'Wed', rainfall: 85, waterLevel: 3.1, alerts: 8 },
    { day: 'Thu', rainfall: 120, waterLevel: 3.8, alerts: 12 },
    { day: 'Fri', rainfall: 95, waterLevel: 3.5, alerts: 9 },
    { day: 'Sat', rainfall: 55, waterLevel: 2.5, alerts: 4 },
    { day: 'Sun', rainfall: 35, waterLevel: 1.9, alerts: 2 },
];

const TOOLTIP_STYLE = { background: 'rgba(6,13,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' };

const AnalyticsPage: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

    const getRiskColor = (risk: number) => {
        if (risk > 80) return '#FF2A2A';
        if (risk > 60) return '#FF8C00';
        if (risk > 40) return '#F5C542';
        return '#10B981';
    };

    return (
        <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] p-4 md:p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">ANALYTICS CENTER</h1>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">Historical trends, risk analysis, and predictive insights</p>
                </div>
                <div className="flex bg-[#1f2335] rounded-lg border border-[#414868] overflow-hidden">
                    {(['7d', '30d', '90d'] as const).map(range => (
                        <button key={range} onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 text-[10px] font-mono tracking-wider transition-all ${timeRange === range ? 'bg-[#7aa2f7]/20 text-[#7aa2f7]' : 'text-slate-500 hover:text-slate-300'}`}>
                            {range.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Avg Flood Risk', value: '72.3%', icon: AlertTriangle, color: '#FF8C00', sub: '↑ 12% from last month' },
                    { label: 'Total Rainfall', value: '1,290mm', icon: Droplets, color: '#3B82F6', sub: '↑ 28% above normal' },
                    { label: 'Peak Water Level', value: '4.2m', icon: TrendingUp, color: '#FF2A2A', sub: 'Recorded Sep 15' },
                    { label: 'Total Alerts', value: '347', icon: BarChart3, color: '#8B5CF6', sub: '43 active now' },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-slate-900/80 backdrop-blur-md p-4 border border-[#414868] rounded-xl hover:border-[#7aa2f7]/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                            </div>
                            <div className="text-xl font-bold font-digital" style={{ color: stat.color }}>{stat.value}</div>
                            <span className="text-[9px] text-slate-500 font-mono">{stat.sub}</span>
                        </div>
                    );
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
                {/* Flood Risk Trend */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 border border-[#414868] rounded-xl hover:border-[#7aa2f7]/50 transition-all">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Flood Risk Trend (Monthly)</div>
                    <div style={{ width: '100%', height: 256 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={TREND_DATA}>
                                <defs>
                                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FF8C00" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#FF8C00" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Area type="monotone" dataKey="risk" stroke="#FF8C00" fill="url(#riskGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rainfall vs Water Level */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 border border-[#414868] rounded-xl hover:border-[#7aa2f7]/50 transition-all">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Rainfall vs Water Level (Weekly)</div>
                    <div style={{ width: '100%', height: 256 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={DAILY_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }} />
                                <Bar yAxisId="left" dataKey="rainfall" fill="#3B82F6" opacity={0.6} radius={[2, 2, 0, 0]} name="Rainfall (mm)" />
                                <Line yAxisId="right" type="monotone" dataKey="waterLevel" stroke="#FF2A2A" strokeWidth={2} dot={{ r: 3, fill: '#1a1b26', strokeWidth: 2 }} name="Water Level (m)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* District Risk Table */}
            <div className="bg-slate-900/80 backdrop-blur-md p-5 border border-[#414868] rounded-xl hover:border-[#7aa2f7]/50 transition-all">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4">District Risk Assessment</div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#414868]">
                                {['District', 'Risk Score', 'Reports', 'Population', 'Trend', 'Risk Level'].map(h => (
                                    <th key={h} className="text-[10px] font-mono text-slate-500 uppercase tracking-wider py-3 px-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DISTRICT_DATA.map((d) => (
                                <tr key={d.name} className="border-b border-[#414868]/30 hover:bg-[#1f2335] transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-[#c0caf5]">{d.name}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-[#1f2335] rounded-full overflow-hidden border border-[#414868]">
                                                <div className="h-full rounded-full" style={{ width: `${d.risk}%`, background: getRiskColor(d.risk) }} />
                                            </div>
                                            <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(d.risk) }}>{d.risk}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-xs font-mono text-slate-400">{d.reports}</td>
                                    <td className="py-3 px-4 text-xs font-mono text-slate-400">{d.population}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-mono font-bold ${d.trend.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'}`}>{d.trend}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider" style={{ color: getRiskColor(d.risk), background: getRiskColor(d.risk) + '15', borderColor: getRiskColor(d.risk) + '30' }}>
                                            {d.risk > 80 ? 'CRITICAL' : d.risk > 60 ? 'HIGH' : d.risk > 40 ? 'MEDIUM' : 'SAFE'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
