import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSimulation } from '../contexts/SimulationContext';
import { Radio, Clock, MapPin, AlertOctagon, Shield } from 'lucide-react';
import DisasterMap from '../components/map/DisasterMap';
import LiveTicker from '../components/dashboard/LiveTicker';
import TelemetryTerminal from '../components/dashboard/TelemetryTerminal';
import ArcGauge from '../components/dashboard/ArcGauge';
import PredictionChart from '../components/dashboard/PredictionChart';
import { fetchScenarioPunjab, fetchScenarioLive, type TimelineEntry, type AffectedZone } from '../services/api';
import { fetchSensorData, fetchActiveAlerts } from '../services/apiClient';
import { getDistrictLabel } from '../utils/districts';

const AuthorityDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [utcTime, setUtcTime] = useState('');
    const { mode } = useSimulation();
    const scenario: 'live' | 'punjab' = mode === 'simulate' ? 'punjab' : 'live';
    const [sensors, setSensors] = useState<{
        soil_moisture: any;
        rainfall_intensity: any;
        active_alerts: any;
        water_depth: any;
        empty?: boolean;
    } | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [accuracy, setAccuracy] = useState<number | undefined>();
    const [affectedZones, setAffectedZones] = useState<AffectedZone[]>([]);
    const [scenarioTitle, setScenarioTitle] = useState('Live Monitor — Rajasthan');

    const districtId = user?.district_id || 'jaipur_01';

    // UTC Clock
    useEffect(() => {
        const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch dashboard metrics from backend API
    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const [sensorData, alertData] = await Promise.all([
                    fetchSensorData(),
                    fetchActiveAlerts()
                ]);

                window.dispatchEvent(new Event('supabase_online'));

                const latest = sensorData && sensorData.length > 0 ? sensorData[0] : null;

                if (latest) {
                    setSensors({
                        soil_moisture: { value: latest.moisture || 0, unit: '%', status: (latest.moisture || 0) > 80 ? 'critical' : 'normal', threshold: 80 },
                        rainfall_intensity: { value: 45, unit: 'mm/hr', status: 'elevated', threshold: 50 },
                        active_alerts: { value: alertData?.length ?? 0, unit: '', status: (alertData?.length ?? 0) > 0 ? 'warning' : 'normal', threshold: 5 },
                        water_depth: { value: latest.water_level || 0, unit: 'm', status: (latest.water_level || 0) > 3 ? 'critical' : 'normal', threshold: 2.5 },
                        empty: false
                    });
                } else {
                    setSensors({ empty: true } as any);
                }
            } catch (err) {
                console.error("API fetch failed:", err);
                window.dispatchEvent(new Event('supabase_offline'));
            }
        };

        loadMetrics();

        // Poll every 30 seconds
        const interval = setInterval(loadMetrics, 30000);
        return () => clearInterval(interval);
    }, [districtId]);

    // Fetch scenario data
    const loadScenario = useCallback(async (s: 'live' | 'punjab') => {
        try {
            if (s === 'punjab') {
                const res = await fetchScenarioPunjab();
                if (res.success) {
                    setTimeline(res.timeline);
                    setAccuracy(res.summary.model_accuracy_pct);
                    setAffectedZones(res.affected_zones);
                    setScenarioTitle(res.title);
                }
            } else {
                const res = await fetchScenarioLive();
                if (res.success) {
                    setTimeline([]);
                    setAccuracy(undefined);
                    setAffectedZones([]);
                    setScenarioTitle(res.title);
                }
            }
        } catch (err) {
            console.error('Scenario fetch failed:', err);
        }
    }, []);

    useEffect(() => {
        loadScenario(scenario);
    }, [scenario, loadScenario]);



    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6 overflow-hidden relative">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 glass-panel border-b border-blue-200 shadow-[0_0_20px_rgba(0,240,255,0.1)] animate-fade-in gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-digital tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-white">COMMAND CENTER</h1>
                    <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-blue-600 font-mono uppercase tracking-widest">CMD: {user?.name}</p>
                        <span className="text-slate-600">|</span>
                        <p className="text-xs text-blue-600 font-mono uppercase tracking-widest">REGION: {getDistrictLabel(districtId).toUpperCase()}</p>
                        <span className="text-slate-600">|</span>
                        <p className="text-xs text-gray-500 font-mono">{scenarioTitle}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    <div className="hidden md:flex items-center px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg">
                        <Clock className="w-3 h-3 text-blue-600 mr-2" />
                        <span className="text-xs font-digital text-blue-600 tracking-wider">{utcTime} UTC</span>
                    </div>
                    <div className="flex items-center px-3 py-1 bg-red-900/20 border border-red-500/50 rounded-full animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                        <span className="text-xs font-bold text-red-500">LIVE</span>
                    </div>
                    <button onClick={logout} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-700 rounded text-sm font-mono border border-gray-200 transition-colors">
                        LOGOUT
                    </button>
                </div>
            </header>

            {/* Arc Reactor Gauges Check For Empty */}
            {sensors && sensors.empty ? (
                <div className="flex justify-center items-center p-8 bg-gray-50 border border-gray-100 rounded-xl mb-5">
                    <p className="font-mono text-slate-500 font-bold uppercase tracking-widest text-sm flex items-center">
                        <AlertOctagon className="w-5 h-5 mr-3 text-slate-600" />
                        No active sensors found
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 stagger-children">
                    <ArcGauge
                        label="Soil Moisture"
                        value={sensors?.soil_moisture?.value ?? 0}
                        unit={sensors?.soil_moisture?.unit ?? '%'}
                        threshold={sensors?.soil_moisture?.threshold}
                        status={sensors?.soil_moisture?.status}
                        loading={!sensors}
                    />
                    <ArcGauge
                        label="Rainfall Rate"
                        value={sensors?.rainfall_intensity?.value ?? 0}
                        max={120}
                        unit={sensors?.rainfall_intensity?.unit ?? 'mm/hr'}
                        threshold={sensors?.rainfall_intensity?.threshold}
                        status={sensors?.rainfall_intensity?.status}
                        loading={!sensors}
                    />
                    <ArcGauge
                        label="Active Alerts"
                        value={sensors?.active_alerts?.value ?? 0}
                        max={20}
                        unit={sensors?.active_alerts?.unit ?? ''}
                        threshold={sensors?.active_alerts?.threshold}
                        status={sensors?.active_alerts?.status}
                        loading={!sensors}
                    />
                    <ArcGauge
                        label="Predicted Water Depth"
                        value={sensors?.water_depth?.value ?? 0}
                        max={10}
                        unit={sensors?.water_depth?.unit ?? 'm'}
                        threshold={sensors?.water_depth?.threshold}
                        status={sensors?.water_depth?.status}
                        loading={!sensors}
                    />
                </div>
            )}

            {/* Main Grid: Map + Prediction + Zones */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pb-14" style={{ height: 'calc(100vh - 340px)' }}>

                {/* Map */}
                <div className="md:col-span-8 glass-panel p-0 overflow-hidden border border-gray-200 relative min-h-[400px]">
                    <div className="absolute top-0 left-0 p-2 z-[500] bg-white/90 backdrop-blur rounded-br-lg border-b border-r border-gray-200">
                        <div className="text-xs font-mono text-blue-600 flex items-center">
                            <Radio className="w-3 h-3 mr-2 animate-pulse" />
                            {scenario === 'live' ? 'LIVE SATELLITE UPLINK' : 'HISTORICAL DATA REPLAY'}
                        </div>
                    </div>
                    <DisasterMap scenario={scenario} />
                </div>

                {/* Right sidebar */}
                <div className="md:col-span-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar">

                    {/* Prediction Chart (visible in Punjab mode) */}
                    {scenario === 'punjab' && timeline.length > 0 && (
                        <div className="min-h-[250px] animate-fade-in">
                            <PredictionChart data={timeline} accuracy={accuracy} title="FLOOD EVENT: PUNJAB 2025" />
                        </div>
                    )}

                    {/* Affected Zones */}
                    <div className="glass-panel flex-1 overflow-hidden flex flex-col border-l border-red-500/30 bg-red-950/5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-red-400 flex items-center tracking-wider">
                                <AlertOctagon className="w-4 h-4 mr-2 animate-pulse" />
                                {scenario === 'punjab' ? 'FLOOD ZONES' : 'ACTIVE ALERTS'}
                            </h3>
                            {affectedZones.length > 0 && (
                                <span className="bg-red-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{affectedZones.length}</span>
                            )}
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar stagger-children">
                            {affectedZones.length > 0 ? affectedZones.map((zone, i) => (
                                <div key={i} className="p-3 bg-gray-100 border border-gray-100 hover:border-red-500/40 rounded-lg transition-all cursor-pointer group">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-mono text-slate-500">{zone.name}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${zone.risk === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                                            zone.risk === 'high' ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
                                                'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                                            }`}>{zone.risk.toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                        <span className="flex items-center">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {zone.lat.toFixed(3)}°N, {zone.lng.toFixed(3)}°E
                                        </span>
                                        <span className="font-digital text-red-400 text-sm font-bold">{zone.peak_depth_m}m</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                                    <Shield className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-mono">NO ACTIVE ALERTS</span>
                                    <span className="text-[10px] text-slate-700 mt-1">All zones nominal</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Telemetry Terminal */}
            <TelemetryTerminal />
            <LiveTicker />
        </div>
    );
};

export default AuthorityDashboard;
