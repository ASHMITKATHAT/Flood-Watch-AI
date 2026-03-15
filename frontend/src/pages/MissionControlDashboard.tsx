import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSimulation } from '../contexts/SimulationContext';
import { Loader2, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { getDistrictLabel } from '../utils/districts';
import CinematicGlobe from '../components/map/CinematicGlobe';
import RainfallCard from '../components/dashboard/RainfallCard';
import ActiveAlertsCard from '../components/dashboard/ActiveAlertsCard';
import EnvironmentCards from '../components/dashboard/EnvironmentCards';
import LiveTicker from '../components/dashboard/LiveTicker';
import SARTelemetryPanel from '../components/dashboard/SARTelemetryPanel';
import MLPredictionCard from '../components/dashboard/MLPredictionCard';
import TerrainCard from '../components/dashboard/TerrainCard';
import DataProvenanceCard from '../components/dashboard/DataProvenanceCard';
import SearchBar from '../components/dashboard/SearchBar';



const MissionControlDashboard: React.FC = () => {
    const { user, activeDistrict } = useAuth();
    const {
        mode,
        coordinates,
        dashboardData,
        predictData,
        isLoadingWeather,
        topographyData,
        hasSearched,
    } = useSimulation();

    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const isSuperAdmin = user?.adminRole === 'super_admin';

    // Disable auto-fetch on mount to prevent "random data" showing before user search
    useEffect(() => {
        // Only auto-open the panel if a search has been performed
        if (hasSearched) {
            setIsRightPanelOpen(true);
        }
    }, [hasSearched]);


    return (
        <div className="flex-1 w-full h-full relative overflow-hidden text-[#c0caf5]">
            {/* The Map as Background Hero */}
            <div className="absolute inset-0 z-0 bg-[#1a1b26]">
                <CinematicGlobe />
                {/* Subtle scan line overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                    <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7dcfff]/20 to-transparent animate-scan-line" />
                </div>
            </div>

            {/* Overlay Container wrapped over everything */}
            <div className="z-10 absolute inset-0 pointer-events-none w-full h-full p-4 md:p-6 flex flex-col overflow-hidden">
                
                {/* Top Header: Floating Transparent Layer with Strict Zones */}
                <header className="absolute top-4 w-full px-6 flex justify-between items-start z-50 pointer-events-none">
                    
                    {/* Left Zone: Logo only */}
                    <div className="flex items-center gap-4 flex-shrink-0 pointer-events-auto">
                        <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-[#7dcfff] drop-shadow-[0_0_12px_rgba(125,207,255,0.4)] whitespace-nowrap bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[#414868]">
                            MISSION CONTROL
                        </h1>
                    </div>

                    {/* Center Zone: Search Bar / Restricted Access */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex justify-center pointer-events-auto">
                        {isSuperAdmin ? (
                            <SearchBar />
                        ) : (
                            <div className="flex items-center gap-3 bg-[#e0af68]/10 border border-[#e0af68]/20 rounded-xl px-4 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-md">
                                <Lock className="w-5 h-5 text-[#e0af68] flex-shrink-0" />
                                <div className="whitespace-nowrap">
                                    <div className="text-[9px] font-mono text-[#e0af68]/70 uppercase tracking-widest">RESTRICTED ACCESS</div>
                                    <div className="text-sm font-bold font-digital text-[#e0af68] tracking-wider">
                                        {getDistrictLabel(activeDistrict).toUpperCase()} DISTRICT
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Zone: Status Badges (Trimmed) */}
                    <div className="flex items-center gap-x-4 flex-shrink-0 pointer-events-auto live-class">
                        {isLoadingWeather && (
                            <div className="flex items-center px-3 py-1 bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 rounded-full animate-pulse flex-shrink-0 backdrop-blur-md">
                                <Loader2 className="w-3 h-3 text-[#7aa2f7] mr-2 animate-spin flex-shrink-0" />
                                <span className="text-[10px] font-bold text-[#7aa2f7] tracking-wider whitespace-nowrap">FETCHING API</span>
                            </div>
                        )}
                        {mode === 'simulate' ? (
                            <div className="flex items-center px-3 py-1 bg-[#f7768e]/10 border border-[#f7768e]/20 rounded-full flex-shrink-0 backdrop-blur-md">
                                <div className="w-2 h-2 bg-[#f7768e] rounded-full mr-2 animate-pulse shadow-[0_0_8px_rgba(247,118,142,0.5)] flex-shrink-0" />
                                <span className="text-[10px] font-bold text-[#f7768e] tracking-wider whitespace-nowrap">SIMULATION</span>
                            </div>
                        ) : (
                            <div className="flex items-center px-3 py-1 bg-[#f7768e]/10 border border-[#f7768e]/20 rounded-full flex-shrink-0 backdrop-blur-md ">
                                <div className="w-2 h-2 bg-[#f7768e] rounded-full mr-14 animate-pulse shadow-[0_0_8px_rgba(247,118,142,0.5)] flex-shrink-0" />
                                <span className="text-[10px] font-bold text-[#f7768e] tracking-wider whitespace-nowrap">LIVE</span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 flex flex-col xl:flex-row justify-between gap-5 min-h-0 relative pointer-events-none">
                    
                    {/* Left Side Container (Terminals) */}
                    <div className="flex flex-col justify-end flex-1 min-w-0 pb-[80px]">
                        {/* Bottom Left: Terminals */}
                        <LiveTicker />
                    </div>

                    {/* Right: Sidebar Cards Drawer Toggle & Container */}
                    
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center justify-center w-8 h-16 bg-slate-900/90 border border-[#414868] border-r-0 rounded-l-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-slate-800 transition-colors pointer-events-auto ${isRightPanelOpen ? 'mr-96' : ''} transition-all duration-300 ease-in-out`}
                    >
                        {isRightPanelOpen ? (
                            <ChevronRight className="w-5 h-5 text-[#7dcfff]" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 text-[#7dcfff]" />
                        )}
                    </button>

                    {/* Animated Sliding Panel */}
                    <div 
                        className={`absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md border-l border-[#414868] shadow-2xl z-50 flex flex-col gap-4 overflow-y-auto custom-scrollbar p-4 pointer-events-auto
                        transform ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}
                    >
                            <>
                                <RainfallCard currentRate={predictData?.inputs?.rainfall_mm ?? dashboardData?.rainfall ?? null} />
                                <EnvironmentCards
                                    temperature={dashboardData?.temperature}
                                    humidity={dashboardData?.humidity}
                                    soilSaturation={predictData?.inputs?.soil_saturation_percent}
                                />
                                <ActiveAlertsCard />
                                <TerrainCard topographyData={topographyData} />
                                <SARTelemetryPanel
                                    lat={coordinates.lat}
                                    lng={coordinates.lng}
                                />
                                <MLPredictionCard
                                    data={predictData}
                                    isLoading={isLoadingWeather}
                                />
                                <DataProvenanceCard />
                            </>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionControlDashboard;
