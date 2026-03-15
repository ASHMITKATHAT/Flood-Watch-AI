import React from 'react';
import { CloudRain } from 'lucide-react';

interface RainfallCardProps {
    currentRate?: number | null;
}

const RainfallCard: React.FC<RainfallCardProps> = ({ currentRate }) => {
    const hasData = currentRate != null;
    const displayRate = hasData ? currentRate.toFixed(1) : 'No Data';
    const severity = hasData
        ? currentRate > 30 ? 'Heavy' : currentRate > 10 ? 'Moderate' : currentRate > 0 ? 'Light' : 'None'
        : '--';

    const severityColor = hasData
        ? currentRate > 30 ? '#f7768e' : currentRate > 10 ? '#e0af68' : '#9ece6a'
        : '#565f89';

    return (
        <div className="glass-panel p-6 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#7aa2f7]/20 transition-all duration-200 ease-in-out">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-[10px] font-mono text-[#565f89] uppercase tracking-widest">Rainfall Rate</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className={`text-2xl font-bold font-digital ${hasData ? 'text-[#c0caf5]' : 'text-[#565f89]'}`}>
                            {displayRate}
                        </span>
                        {hasData && <span className="text-xs text-[#565f89] font-mono mb-1">mm</span>}
                    </div>
                </div>
                <div className="p-2 rounded-lg bg-[#7aa2f7]/10 border border-[#7aa2f7]/20">
                    <CloudRain className="w-5 h-5 text-[#7aa2f7]" />
                </div>
            </div>

            {/* Severity indicator */}
            <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: severityColor }} />
                <span className="text-xs font-bold font-digital tracking-wider" style={{ color: severityColor }}>
                    {severity}
                </span>
                <span className="text-[9px] font-mono text-[#565f89] ml-auto">NASA GPM IMERG</span>
            </div>
        </div>
    );
};

export default RainfallCard;
