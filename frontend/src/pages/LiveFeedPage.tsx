import React, { useState, useEffect, useRef } from 'react';
import { Radio, AlertTriangle, Droplets, Cpu, Cloud, ChevronDown } from 'lucide-react';

interface FeedEvent {
    id: number;
    type: 'alert' | 'sensor' | 'system' | 'weather';
    severity: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    detail: string;
    time: string;
    source: string;
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    alert: AlertTriangle,
    sensor: Droplets,
    system: Cpu,
    weather: Cloud,
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#FF2A2A',
    warning: '#FF8C00',
    info: '#00F0FF',
    success: '#10B981',
};

const INITIAL_EVENTS: FeedEvent[] = [
    { id: 1, type: 'alert', severity: 'critical', title: 'Flash Flood Warning Issued', detail: 'NWS issues flash flood warning for Jaipur district. Expected 120mm rainfall in next 6 hours.', time: '17:42:31', source: 'NDMA Alert System' },
    { id: 2, type: 'sensor', severity: 'warning', title: 'Water Level Rising — Chambal River', detail: 'Sensor CRM-042 reports water level at 3.8m (threshold: 4.0m). Rate: +0.3m/hr.', time: '17:41:15', source: 'IoT Sensor Grid' },
    { id: 3, type: 'weather', severity: 'info', title: 'Precipitation Update — Heavy Rain Band', detail: 'IMD radar detects heavy rain band moving NE at 35km/h. ETA Jaipur: 2 hours.', time: '17:40:02', source: 'IMD Satellite' },
    { id: 4, type: 'system', severity: 'success', title: 'Model Prediction Updated', detail: 'FloodNet ML model retrained with latest data. Prediction accuracy: 94.2%. Next update: 18:00.', time: '17:38:45', source: 'ML Pipeline' },
    { id: 5, type: 'alert', severity: 'warning', title: 'Evacuation Advisory — Kota Riverside', detail: 'District admin issues advisory for low-lying areas along Chambal. Shelters activated.', time: '17:36:20', source: 'District EOC' },
    { id: 6, type: 'sensor', severity: 'critical', title: 'Dam Overflow Warning — Bisalpur', detail: 'Bisalpur Dam at 98.2% capacity. Gates 2 & 5 opened. Downstream alert active.', time: '17:35:01', source: 'CWC Telemetry' },
    { id: 7, type: 'weather', severity: 'info', title: 'Soil Moisture Update', detail: 'NASA SMAP reports soil saturation at 82% for Rajasthan region. Runoff potential: HIGH.', time: '17:33:44', source: 'NASA SMAP' },
    { id: 8, type: 'system', severity: 'info', title: 'Sensor Grid Health Check', detail: '142/150 sensors online. 8 sensors offline in Bikaner cluster. Maintenance dispatched.', time: '17:30:12', source: 'Sensor Monitor' },
    { id: 9, type: 'alert', severity: 'critical', title: 'Bridge Structural Alert', detail: 'Vibration sensors on NH48 bridge detect anomaly. Load capacity reduced to 50%.', time: '17:28:55', source: 'Infrastructure Monitor' },
    { id: 10, type: 'sensor', severity: 'warning', title: 'Rainfall Rate Spike', detail: 'Station JRP-07 reports 45mm/hr rainfall rate. Historical 95th percentile exceeded.', time: '17:25:30', source: 'Rain Gauge Network' },
];

const NEW_EVENTS: FeedEvent[] = [
    { id: 100, type: 'alert', severity: 'critical', title: 'New Flood Zone Detected', detail: 'Satellite imagery confirms flooding in Sanganer basin. Estimated area: 2.4 sq km.', time: '', source: 'ISRO SAR' },
    { id: 101, type: 'sensor', severity: 'warning', title: 'Groundwater Level Alert', detail: 'Piezometer PZ-18 shows rapid groundwater rise. Subsurface saturation imminent.', time: '', source: 'Groundwater Monitor' },
    { id: 102, type: 'weather', severity: 'info', title: 'Wind Speed Increasing', detail: 'Anemometer reports 42km/h gusts. Structural warnings for temporary shelters.', time: '', source: 'Weather Station' },
];

const LiveFeedPage: React.FC = () => {
    const [events, setEvents] = useState<FeedEvent[]>(INITIAL_EVENTS);
    const [filter, setFilter] = useState<string>('all');
    const [paused, setPaused] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);
    const newEventIndex = useRef(0);

    // Simulate live events
    useEffect(() => {
        if (paused) return;
        const interval = setInterval(() => {
            const template = NEW_EVENTS[newEventIndex.current % NEW_EVENTS.length];
            const newEvent = {
                ...template,
                id: Date.now(),
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            };
            setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
            newEventIndex.current++;
        }, 8000);
        return () => clearInterval(interval);
    }, [paused]);

    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

    return (
        <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] p-4 md:p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">
                        LIVE FEED
                    </h1>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">Real-time system events, sensor data, and field intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPaused(!paused)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider border transition-all
                            ${paused ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'}`}>
                        <Radio className="w-3 h-3" />
                        {paused ? 'RESUME' : 'LIVE'}
                    </button>
                    <div className="relative">
                        <select value={filter} onChange={e => setFilter(e.target.value)}
                            className="bg-[#1f2335] border border-[#414868] rounded-lg px-3 py-1.5 text-[10px] font-mono text-[#c0caf5] appearance-none pr-8 outline-none">
                            <option value="all">ALL EVENTS</option>
                            <option value="alert">ALERTS</option>
                            <option value="sensor">SENSORS</option>
                            <option value="system">SYSTEM</option>
                            <option value="weather">WEATHER</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Event count badges */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { type: 'all', label: 'All', count: events.length },
                    { type: 'alert', label: 'Alerts', count: events.filter(e => e.type === 'alert').length },
                    { type: 'sensor', label: 'Sensors', count: events.filter(e => e.type === 'sensor').length },
                    { type: 'system', label: 'System', count: events.filter(e => e.type === 'system').length },
                    { type: 'weather', label: 'Weather', count: events.filter(e => e.type === 'weather').length },
                ].map(item => (
                    <button key={item.type} onClick={() => setFilter(item.type)}
                        className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider border transition-all
                            ${filter === item.type ? 'bg-[#7aa2f7]/20 text-[#7aa2f7] border-[#7aa2f7]/40' : 'text-slate-500 border-[#414868] hover:text-slate-300'}`}>
                        {item.label} ({item.count})
                    </button>
                ))}
            </div>

            {/* Events */}
            <div ref={feedRef} className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                {filtered.map(event => {
                    const Icon = EVENT_ICONS[event.type];
                    const color = SEVERITY_COLORS[event.severity];
                    return (
                        <div key={event.id} className="bg-slate-900/80 backdrop-blur-md p-4 border border-[#414868] hover:border-[#7aa2f7]/50 rounded-xl transition-all duration-300 animate-fade-in">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                                        <Icon className="w-4 h-4" style={{ color }} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-medium text-[#c0caf5]">{event.title}</span>
                                        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 ml-3">{event.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-1.5">{event.detail}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider" style={{ color, background: `${color}10`, borderColor: `${color}30` }}>{event.severity}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">{event.source}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LiveFeedPage;
