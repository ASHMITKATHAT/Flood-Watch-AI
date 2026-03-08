import React, { useState } from 'react';
import { HelpCircle, BookOpen, MessageCircle, ChevronDown, ChevronRight, Zap, Shield, Globe, Radio } from 'lucide-react';

interface FaqItem { q: string; a: string; }

const FAQ_ITEMS: FaqItem[] = [
    { q: 'How does the flood risk prediction work?', a: 'Our ML model (FloodNet) combines satellite data (NASA GPM, ISRO CartoDEM), IoT sensor readings, weather forecasts, and historical patterns to generate flood risk predictions with 94%+ accuracy. The model runs every 30 minutes.' },
    { q: 'What does each risk level mean?', a: 'CRITICAL: Immediate danger, evacuation recommended. HIGH: Significant risk, prepare for potential flooding. MEDIUM: Moderate risk, stay alert. SAFE: Low risk, normal conditions.' },
    { q: 'How are Human Sensor reports verified?', a: 'Reports go through a 3-stage process: automated validation (location/consistency check), cross-reference with sensor data, and manual verification by field coordinators. Typical verification time: 5-15 minutes.' },
    { q: 'Can I export data for analysis?', a: 'Yes. Navigate to Analytics > Export. You can export historical data in CSV, JSON, or PDF format. Data is available for the last 12 months.' },
    { q: 'How do I configure alert thresholds?', a: 'Go to Settings > Alert Thresholds. You can adjust flood risk, rainfall, and water level thresholds. Changes take effect immediately for new alerts.' },
    { q: 'What satellite data sources are used?', a: 'Primary sources: NASA GPM (precipitation), ISRO CartoDEM (elevation), Sentinel-1 SAR (flood extent), NASA SMAP (soil moisture), NOAA GOES (weather). Data refresh: 15-60 minutes depending on source.' },
];

const SYSTEM_STATUS = [
    { name: 'ML Prediction Engine', status: 'online', latency: '45ms' },
    { name: 'IoT Sensor Grid', status: 'online', latency: '120ms' },
    { name: 'Satellite Data Feed', status: 'online', latency: '2.1s' },
    { name: 'Alert Distribution', status: 'online', latency: '30ms' },
    { name: 'Map Tile Server', status: 'online', latency: '85ms' },
    { name: 'Database Cluster', status: 'online', latency: '12ms' },
];

const HelpPage: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
            <div className="mb-6">
                <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">HELP CENTER</h1>
                <p className="text-[11px] font-mono text-slate-500 mt-1">Quick start guide, FAQ, and system information</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Quick Start */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="glass-panel p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Quick Start Guide</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { icon: Globe, title: '3D Globe', desc: 'Drag to rotate, click risk markers for details. Toggle between 3D Globe and 2D Risk Map.', color: '#00F0FF' },
                                { icon: Radio, title: 'Live Monitoring', desc: 'Dashboard updates every 30 seconds. Red LIVE badge indicates active data stream.', color: '#FF2A2A' },
                                { icon: Shield, title: 'Human Sensor', desc: 'Submit field reports with location, severity, and photos. Track report verification status.', color: '#8B5CF6' },
                                { icon: Zap, title: 'Alerts System', desc: 'Configure thresholds in Settings. Critical alerts trigger SMS/email automatically.', color: '#FF8C00' },
                            ].map(item => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className="w-4 h-4" style={{ color: item.color }} />
                                            <span className="text-sm font-bold text-gray-900">{item.title}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="glass-panel p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Frequently Asked Questions</span>
                        </div>
                        <div className="space-y-2">
                            {FAQ_ITEMS.map((faq, i) => (
                                <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 transition-all">
                                        <span className="text-sm text-gray-900 pr-4">{faq.q}</span>
                                        {openFaq === i ? <ChevronDown className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                                    </button>
                                    {openFaq === i && (
                                        <div className="px-3 pb-3 animate-fade-in">
                                            <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{faq.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* System Status */}
                    <div className="glass-panel p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">System Status</span>
                        </div>
                        <div className="space-y-3">
                            {SYSTEM_STATUS.map(sys => (
                                <div key={sys.name} className="flex justify-between items-center py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                                        <span className="text-xs text-gray-700">{sys.name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500">{sys.latency}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                            <span className="text-[10px] font-mono text-emerald-400">ALL SYSTEMS OPERATIONAL</span>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="glass-panel p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Support</span>
                        </div>
                        <div className="space-y-3 text-xs">
                            {[['Emergency Hotline', '1800-180-FLOOD'], ['Technical Support', 'support@floodwatch.gov.in'], ['NDMA Control Room', '011-26701728'], ['State EOC', '0141-2227355']].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="text-slate-500 font-mono">{l}</span>
                                    <span className="text-blue-600 font-mono">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Version Info */}
                    <div className="glass-panel p-5 border border-gray-200">
                        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">System Info</div>
                        <div className="space-y-2">
                            {[['Version', 'EQUINOX v2.4.1'], ['Build', '2026.02.20'], ['ML Model', 'FloodNet v3.2'], ['Uptime', '99.97%']].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-1">
                                    <span className="text-[10px] text-slate-600 font-mono">{l}</span>
                                    <span className="text-[10px] text-gray-700 font-mono">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;
