import React, { useState } from 'react';
import { Bell, Monitor, User, Shield, Sliders, Save, CheckCircle, Terminal } from 'lucide-react';
import TelemetryTerminal from '../components/dashboard/TelemetryTerminal';

const SettingsPage: React.FC = () => {
    const [saved, setSaved] = useState(false);
    const [alertThreshold, setAlertThreshold] = useState(70);
    const [rainfallAlert, setRainfallAlert] = useState(50);
    const [waterLevelAlert, setWaterLevelAlert] = useState(3.0);
    const [emailNotif, setEmailNotif] = useState(true);
    const [smsNotif, setSmsNotif] = useState(true);
    const [pushNotif, setPushNotif] = useState(false);
    const [soundAlerts, setSoundAlerts] = useState(true);
    const [criticalOnly, setCriticalOnly] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const [compactView, setCompactView] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [mapDefault, setMapDefault] = useState<'3d' | '2d'>('3d');

    const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
        <button onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full transition-all duration-300 relative border ${checked ? 'bg-blue-500/20 border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
            <div className={`absolute top-[1px] w-4 h-4 rounded-full transition-all duration-300 ${checked ? 'left-[21px] bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'left-[3px] bg-slate-500'}`} />
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-[#c0caf5] p-4 md:p-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-[#7dcfff] drop-shadow-[0_0_12px_rgba(125,207,255,0.4)]">SYSTEM SETTINGS</h1>
                    <p className="text-[11px] font-mono text-[#565f89] mt-1">System configuration and preferences</p>
                </div>
                <button onClick={handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider border transition-all
                        ${saved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]'}`}>
                    {saved ? <><CheckCircle className="w-4 h-4" /> SAVED</> : <><Save className="w-4 h-4" /> SAVE CHANGES</>}
                </button>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Alert Thresholds */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
                        <Sliders className="w-4 h-4 text-[#e0af68]" />
                        <span className="text-xs font-mono text-[#565f89] uppercase tracking-widest">Alert Thresholds</span>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm">Flood Risk Level</span><span className="text-sm font-bold font-digital text-[#e0af68]">{alertThreshold}%</span></div>
                            <input type="range" min={20} max={95} value={alertThreshold} onChange={e => setAlertThreshold(+e.target.value)}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e0af68] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(224,175,104,0.6)]" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm">Rainfall (mm/hr)</span><span className="text-sm font-bold font-digital text-blue-400">{rainfallAlert}</span></div>
                            <input type="range" min={10} max={200} value={rainfallAlert} onChange={e => setRainfallAlert(+e.target.value)}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(96,165,250,0.6)]" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm">Water Level (m)</span><span className="text-sm font-bold font-digital text-[#f7768e]">{waterLevelAlert.toFixed(1)}</span></div>
                            <input type="range" min={10} max={60} value={waterLevelAlert * 10} onChange={e => setWaterLevelAlert(+e.target.value / 10)}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f7768e] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(247,118,142,0.6)]" />
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
                        <Bell className="w-4 h-4 text-[#bb9af7]" />
                        <span className="text-xs font-mono text-[#565f89] uppercase tracking-widest">Notifications</span>
                    </div>
                    <div className="space-y-4">
                        {([['Email Notifications', 'Receive alerts via email', emailNotif, setEmailNotif], ['SMS Notifications', 'Receive alerts via SMS', smsNotif, setSmsNotif], ['Push Notifications', 'Browser push notifications', pushNotif, setPushNotif], ['Sound Alerts', 'Play sound for critical alerts', soundAlerts, setSoundAlerts], ['Critical Only', 'Only notify for critical events', criticalOnly, setCriticalOnly]] as [string, string, boolean, (v: boolean) => void][]).map(([label, desc, val, setter]) => (
                            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                                <div><div className="text-sm">{label}</div><div className="text-[10px] text-[#565f89] font-mono">{desc}</div></div>
                                <Toggle checked={val} onChange={setter} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Display */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
                        <Monitor className="w-4 h-4 text-[#9ece6a]" />
                        <span className="text-xs font-mono text-[#565f89] uppercase tracking-widest">Display</span>
                    </div>
                    <div className="space-y-4">
                        {([['Dark Mode', 'Always-on dark theme', darkMode, setDarkMode], ['Compact View', 'Reduce spacing', compactView, setCompactView], ['Auto Refresh', 'Auto-update data', autoRefresh, setAutoRefresh]] as [string, string, boolean, (v: boolean) => void][]).map(([l, d, v, s]) => (
                            <div key={l} className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                <div><div className="text-sm">{l}</div><div className="text-[10px] text-[#565f89] font-mono">{d}</div></div>
                                <Toggle checked={v} onChange={s} />
                            </div>
                        ))}
                        <div className="flex justify-between items-center py-2">
                            <div><div className="text-sm">Default Map</div></div>
                            <div className="flex bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                <button onClick={() => setMapDefault('3d')} className={`px-4 py-1.5 text-xs font-mono transition-colors ${mapDefault === '3d' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-[#565f89] hover:bg-slate-800'}`}>3D</button>
                                <button onClick={() => setMapDefault('2d')} className={`px-4 py-1.5 text-xs font-mono transition-colors ${mapDefault === '2d' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-[#565f89] hover:bg-slate-800'}`}>2D</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account */}
                <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
                        <User className="w-4 h-4 text-[#7aa2f7]" />
                        <span className="text-xs font-mono text-[#565f89] uppercase tracking-widest">Account</span>
                    </div>
                    <div className="space-y-3">
                        {[['Commander', 'Ashmit'], ['Role', 'Authority — Admin'], ['Mobile', '+91 925 626 5461'], ['Access', 'Level 5 — Full Control']].map(([l, v]) => (
                            <div key={l} className="flex justify-between py-2 border-b border-slate-800/50 last:border-0">
                                <span className="text-xs text-[#565f89] font-mono uppercase">{l}</span>
                                <span className="text-sm text-[#c0caf5]">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 p-3 rounded-lg bg-[#9ece6a]/10 border border-[#9ece6a]/20 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#9ece6a]" />
                        <span className="text-[10px] font-mono text-[#9ece6a] tracking-widest">SECURITY VERIFIED • 2FA ACTIVE</span>
                    </div>
                </div>
            </div>

            {/* System Telemetry Module */}
            <div className="max-w-7xl mx-auto">
                 <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                     <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
                         <Terminal className="w-4 h-4 text-[#7dcfff]" />
                         <span className="text-xs font-mono text-[#565f89] uppercase tracking-widest">System Logs / Telemetry</span>
                     </div>
                     <div className="h-80 relative">
                         <TelemetryTerminal />
                     </div>
                 </div>
            </div>
            <div className="h-10"></div>
        </div>
    );
};

export default SettingsPage;
