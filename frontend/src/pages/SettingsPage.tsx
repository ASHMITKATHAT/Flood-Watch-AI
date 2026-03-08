import React, { useState } from 'react';
import { Bell, Monitor, User, Shield, Sliders, Save, CheckCircle } from 'lucide-react';

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
            className={`w-10 h-5 rounded-full transition-all duration-300 relative ${checked ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-200'} border`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${checked ? 'left-5 bg-neon-cyan shadow-[0_0_6px_rgba(0,240,255,0.4)]' : 'left-0.5 bg-slate-500'}`} />
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">SETTINGS</h1>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">System configuration and preferences</p>
                </div>
                <button onClick={handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider border transition-all
                        ${saved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-neon-cyan/20'}`}>
                    {saved ? <><CheckCircle className="w-4 h-4" /> SAVED</> : <><Save className="w-4 h-4" /> SAVE CHANGES</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Alert Thresholds */}
                <div className="glass-panel p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Sliders className="w-4 h-4 text-neon-orange" />
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Alert Thresholds</span>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm text-gray-700">Flood Risk Level</span><span className="text-sm font-bold font-digital text-neon-orange">{alertThreshold}%</span></div>
                            <input type="range" min={20} max={95} value={alertThreshold} onChange={e => setAlertThreshold(+e.target.value)}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-cyan" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm text-gray-700">Rainfall (mm/hr)</span><span className="text-sm font-bold font-digital text-blue-400">{rainfallAlert}</span></div>
                            <input type="range" min={10} max={200} value={rainfallAlert} onChange={e => setRainfallAlert(+e.target.value)}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><span className="text-sm text-gray-700">Water Level (m)</span><span className="text-sm font-bold font-digital text-red-400">{waterLevelAlert.toFixed(1)}</span></div>
                            <input type="range" min={10} max={60} value={waterLevelAlert * 10} onChange={e => setWaterLevelAlert(+e.target.value / 10)}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400" />
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass-panel p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Notifications</span>
                    </div>
                    <div className="space-y-4">
                        {([['Email Notifications', 'Receive alerts via email', emailNotif, setEmailNotif], ['SMS Notifications', 'Receive alerts via SMS', smsNotif, setSmsNotif], ['Push Notifications', 'Browser push notifications', pushNotif, setPushNotif], ['Sound Alerts', 'Play sound for critical alerts', soundAlerts, setSoundAlerts], ['Critical Only', 'Only notify for critical events', criticalOnly, setCriticalOnly]] as [string, string, boolean, (v: boolean) => void][]).map(([label, desc, val, setter]) => (
                            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <div><div className="text-sm text-gray-900">{label}</div><div className="text-[10px] text-slate-600 font-mono">{desc}</div></div>
                                <Toggle checked={val} onChange={setter} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Display */}
                <div className="glass-panel p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Monitor className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Display</span>
                    </div>
                    <div className="space-y-4">
                        {([['Dark Mode', 'Always-on dark theme', darkMode, setDarkMode], ['Compact View', 'Reduce spacing', compactView, setCompactView], ['Auto Refresh', 'Auto-update data', autoRefresh, setAutoRefresh]] as [string, string, boolean, (v: boolean) => void][]).map(([l, d, v, s]) => (
                            <div key={l} className="flex justify-between items-center py-2 border-b border-gray-100">
                                <div><div className="text-sm text-gray-900">{l}</div><div className="text-[10px] text-slate-600 font-mono">{d}</div></div>
                                <Toggle checked={v} onChange={s} />
                            </div>
                        ))}
                        <div className="flex justify-between items-center py-2">
                            <div><div className="text-sm text-gray-900">Default Map</div></div>
                            <div className="flex bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                                <button onClick={() => setMapDefault('3d')} className={`px-3 py-1 text-[10px] font-mono ${mapDefault === '3d' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>3D</button>
                                <button onClick={() => setMapDefault('2d')} className={`px-3 py-1 text-[10px] font-mono ${mapDefault === '2d' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>2D</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account */}
                <div className="glass-panel p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Account</span>
                    </div>
                    <div className="space-y-3">
                        {[['Commander', 'Ashmit'], ['Role', 'Authority — Admin'], ['Mobile', '+91 925 626 5461'], ['Access', 'Level 5 — Full Control']].map(([l, v]) => (
                            <div key={l} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                                <span className="text-xs text-slate-500 font-mono uppercase">{l}</span>
                                <span className="text-sm text-gray-900">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400">Security verified • 2FA active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
