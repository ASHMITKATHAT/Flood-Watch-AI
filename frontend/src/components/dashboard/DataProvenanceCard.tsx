import React from 'react';
import { CheckCircle } from 'lucide-react';

const DataProvenanceCard: React.FC = () => {
    return (
        <div className="glass-panel p-5 border border-[#414868] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#9ece6a]/20 transition-all duration-200 ease-in-out">
            <span className="text-[10px] font-mono text-[#565f89] uppercase tracking-widest block mb-4">DATA PROVENANCE</span>
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#9ece6a] flex-shrink-0" />
                    <div>
                        <span className="text-xs font-bold text-[#c0caf5] block">ISRO Cartosat-1 DEM</span>
                        <span className="text-[10px] font-mono text-[#565f89] mt-0.5 block">Resolution: 30m/pixel</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#9ece6a] flex-shrink-0" />
                    <div>
                        <span className="text-xs font-bold text-[#c0caf5] block">Pre-Computed Slope Grid</span>
                        <span className="text-[10px] font-mono text-[#565f89] mt-0.5 block">GDAL-processed • GeoTIFF</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#9ece6a] flex-shrink-0" />
                    <div>
                        <span className="text-xs font-bold text-[#c0caf5] block">Offline Point Sampling</span>
                        <span className="text-[10px] font-mono text-[#565f89] mt-0.5 block">Zero API dependency • rasterio</span>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#414868] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#9ece6a] animate-pulse shadow-[0_0_6px_rgba(158,206,106,0.5)]" />
                    <span className="text-[10px] font-mono text-[#9ece6a] tracking-wider font-bold">CRS: EPSG:4326 (WGS84)</span>
                </div>
            </div>
        </div>
    );
};

export default DataProvenanceCard;
