import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { fetchActiveAlerts } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const LiveTicker: React.FC = () => {
    const { activeDistrict } = useAuth();
    const [alerts, setAlerts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAlerts = async () => {
            try {
                const data = await fetchActiveAlerts();
                if (data && data.length > 0) {
                    setAlerts(data.slice(0, 5).map((a: any) => `ALERT (${a.zone_name || a.zone || 'Unknown'}): ${a.description || a.message || 'No description'}`));
                } else {
                    setAlerts(["SYSTEM OPTIMAL: No critical alerts at this time."]);
                }
            } catch (error) {
                console.error("Failed to fetch live alerts:", error);
                setAlerts(["SYSTEM OPTIMAL: No critical alerts at this time."]);
            } finally {
                setLoading(false);
            }
        };

        loadAlerts();

        // Poll every 30 seconds
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, [activeDistrict]);

    if (loading) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full h-10 bg-[#16161e]/95 border-t border-[#f7768e]/20 flex items-center z-[1000] overflow-hidden backdrop-blur-sm">
            <div className="bg-gradient-to-r from-[#f7768e] to-[#f7768e]/80 h-full px-4 flex items-center z-10 shadow-[4px_0_12px_rgba(247,118,142,0.2)]">
                <AlertCircle className="w-4 h-4 text-[#16161e] mr-2 animate-pulse" />
                <span className="text-[#16161e] font-bold text-xs font-mono tracking-wider">LIVE ALERTS</span>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="animate-ticker whitespace-nowrap inline-block text-[#f7768e]/80 text-sm font-mono py-2">
                    {alerts.map((alert, index) => (
                        <span key={index} className="mx-8 inline-flex items-center">
                            <span className="w-1.5 h-1.5 bg-[#f7768e] rounded-full mr-2 shadow-[0_0_6px_rgba(247,118,142,0.5)]"></span>
                            {alert}
                        </span>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {alerts.map((alert, index) => (
                        <span key={`dup-${index}`} className="mx-8 inline-flex items-center">
                            <span className="w-1.5 h-1.5 bg-[#f7768e] rounded-full mr-2 shadow-[0_0_6px_rgba(247,118,142,0.5)]"></span>
                            {alert}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LiveTicker;
