import React, { useState } from 'react';
import { Bell, AlertTriangle, Filter, Search, ShieldAlert, AlertOctagon, Info } from 'lucide-react';

interface Alert {
    id: string;
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Active' | 'Investigating' | 'Resolved';
    location: string;
    timestamp: string;
}

const MOCK_ALERTS: Alert[] = [
    {
        id: 'ALT-2024-089',
        title: 'Flash Flood Warning',
        description: 'Severe structural threat detected along riverbank due to sudden discharge from upstream dam.',
        priority: 'Critical',
        status: 'Active',
        location: 'Jaipur - Sanganer',
        timestamp: '10 mins ago',
    },
    {
        id: 'ALT-2024-088',
        title: 'Water Level Exceeds Threshold',
        description: 'Sensor data indicates water level at 4.2m, passing the 4.0m threshold at primary reservoir.',
        priority: 'High',
        status: 'Active',
        location: 'Kota Reservoir',
        timestamp: '45 mins ago',
    },
    {
        id: 'ALT-2024-087',
        title: 'Sensor Offline',
        description: 'Telemetry terminal lost connection with node 42 in the northern district.',
        priority: 'Medium',
        status: 'Investigating',
        location: 'Ajmer North',
        timestamp: '2 hours ago',
    },
    {
        id: 'ALT-2024-086',
        title: 'Mild Ground Saturation',
        description: 'Soil moisture levels indicating elevated saturation; monitor for landslide risk if rain continues.',
        priority: 'Low',
        status: 'Resolved',
        location: 'Udaipur Slopes',
        timestamp: '1 day ago',
    },
];

const priorityConfig = {
    Critical: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: AlertOctagon },
    High: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle },
    Medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: ShieldAlert },
    Low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info },
};

const statusConfig = {
    Active: { color: 'text-rose-400' },
    Investigating: { color: 'text-amber-400' },
    Resolved: { color: 'text-emerald-400' },
};

const AlertsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAlerts = MOCK_ALERTS.filter(alert =>
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">
                        SYSTEM ALERTS
                    </h1>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">Real-time threat monitoring and incident response tracking</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1f2335] text-[#c0caf5] border border-[#414868] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#7aa2f7] transition-colors placeholder:text-slate-500"
                        />
                    </div>
                    <button className="flex items-center justify-center p-2 bg-[#1f2335] border border-[#414868] rounded-lg text-slate-400 hover:text-[#7aa2f7] hover:border-[#7aa2f7]/50 transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-[#414868] rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#414868] bg-[#1a1b26]/50">
                                <th className="py-4 px-6 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">Alert ID / Title</th>
                                <th className="py-4 px-6 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">Location</th>
                                <th className="py-4 px-6 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">Priority</th>
                                <th className="py-4 px-6 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">Status</th>
                                <th className="py-4 px-6 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAlerts.length > 0 ? (
                                filteredAlerts.map((alert) => {
                                    const priorityCfg = priorityConfig[alert.priority];
                                    const statusCfg = statusConfig[alert.status];
                                    const PriorityIcon = priorityCfg.icon;

                                    return (
                                        <tr key={alert.id} className="border-b border-[#414868]/30 hover:bg-[#1f2335] transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg border ${priorityCfg.bg} ${priorityCfg.border} mt-1 flex-shrink-0`}>
                                                        <PriorityIcon className={`w-4 h-4 ${priorityCfg.color}`} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-[#c0caf5] group-hover:text-[#7aa2f7] transition-colors">{alert.title}</div>
                                                        <div className="text-[10px] font-mono text-slate-500 mt-1">{alert.id}</div>
                                                        <div className="text-xs text-slate-400 mt-1.5 max-w-md hidden md:block">{alert.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-slate-300">{alert.location}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold border ${priorityCfg.bg} ${priorityCfg.color} ${priorityCfg.border}`}>
                                                    {alert.priority}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.color.replace('text-', 'bg-')}`}></span>
                                                    <span className="text-slate-300">{alert.status}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{alert.timestamp}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-20" />
                                        <div className="text-slate-400 font-mono text-sm">No alerts found matching your criteria.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AlertsPage;
