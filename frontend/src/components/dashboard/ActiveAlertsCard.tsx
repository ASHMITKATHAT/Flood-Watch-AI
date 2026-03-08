import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { fetchActiveAlerts } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';

interface Alert {
    zone: string;
    level: 'critical' | 'high' | 'medium' | 'info';
    message: string;
    time: string;
}

interface ActiveAlertsCardProps {
    alerts?: Alert[];
}

const LEVEL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
    critical: { color: '#f7768e', bg: 'rgba(247,118,142,0.08)', border: 'rgba(247,118,142,0.2)' },
    high: { color: '#ff9e64', bg: 'rgba(255,158,100,0.08)', border: 'rgba(255,158,100,0.2)' },
    medium: { color: '#e0af68', bg: 'rgba(224,175,104,0.08)', border: 'rgba(224,175,104,0.2)' },
    info: { color: '#7dcfff', bg: 'rgba(125,207,255,0.08)', border: 'rgba(125,207,255,0.2)' },
};

const ActiveAlertsCard: React.FC<ActiveAlertsCardProps> = ({ alerts: propAlerts }) => {
    const { activeDistrict } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        if (propAlerts) {
            setAlerts(propAlerts);
            return;
        }

        const loadAlerts = async () => {
            try {
                const data = await fetchActiveAlerts();
                if (data && data.length > 0) {
                    setAlerts(data.map((a: any) => ({
                        zone: a.zone_name || a.zone || 'Unknown Zone',
                        level: (a.severity === 'warning' ? 'high' : a.severity || a.level || 'info') as 'critical' | 'high' | 'medium' | 'info',
                        message: a.description || a.message || 'No description',
                        time: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })));
                } else {
                    setAlerts([]);
                }
            } catch (error) {
                console.error("Failed to load alerts:", error);
                setAlerts([]);
            }
        };

        loadAlerts();

        // Poll every 30 seconds instead of realtime subscription
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, [propAlerts, activeDistrict]);

    const criticalCount = alerts.filter(a => a.level === 'critical').length;

    return (
        <div className="glass-panel p-6 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#f7768e]/20 transition-all duration-200 ease-in-out">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-[10px] font-mono text-[#565f89] uppercase tracking-widest">Active Alerts</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold font-digital text-[#f7768e]">{alerts.length}</span>
                        {criticalCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f7768e]/15 text-[#f7768e] border border-[#f7768e]/30 font-mono font-bold animate-pulse shadow-[0_0_8px_rgba(247,118,142,0.2)]">
                                {criticalCount} CRITICAL
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-2 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/20">
                    <AlertTriangle className="w-5 h-5 text-[#f7768e] animate-pulse" />
                </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {alerts.map((alert, i) => {
                    const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.medium;
                    return (
                        <div
                            key={i}
                            className="p-3 rounded-lg transition-all duration-200 ease-in-out cursor-pointer hover:scale-[1.01] hover:brightness-110"
                            style={{ background: style.bg, border: `1px solid ${style.border}` }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-mono flex items-center gap-1" style={{ color: style.color }}>
                                    <MapPin className="w-3 h-3" />
                                    {alert.zone}
                                </span>
                                <span className="text-[9px] text-[#565f89] font-mono">{alert.time}</span>
                            </div>
                            <p className="text-[11px] text-[#c0caf5]/70 leading-relaxed">{alert.message}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActiveAlertsCard;
