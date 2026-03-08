import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSimulation } from '../contexts/SimulationContext';
import { Clock, Zap, Loader2, Lock } from 'lucide-react';
import { DISTRICT_MAP, getDistrictLabel } from '../utils/districts';
import CinematicGlobe from '../components/map/CinematicGlobe';
import RainfallCard from '../components/dashboard/RainfallCard';
import ActiveAlertsCard from '../components/dashboard/ActiveAlertsCard';
import EnvironmentCards from '../components/dashboard/EnvironmentCards';
import TelemetryTerminal from '../components/dashboard/TelemetryTerminal';
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
        locationName,
        coordinates,
        dashboardData,
        predictData,
        isLoadingWeather,
        topographyData,
        setCoordinates,
        setLocationName,
        fetchLiveData,
    } = useSimulation();

    const [utcTime, setUtcTime] = useState('');
    const isSuperAdmin = user?.adminRole === 'super_admin';

    useEffect(() => {
        const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-fetch weather data when activeDistrict changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const districtInfo = DISTRICT_MAP[activeDistrict];
        if (districtInfo) {
            setCoordinates({ lat: districtInfo.center.lat, lng: districtInfo.center.lng, zoom: districtInfo.zoom });
            setLocationName(districtInfo.label);
            fetchLiveData(districtInfo.center.lat, districtInfo.center.lng);
        }
    }, [activeDistrict]);


    return (
        <div className="w-screen h-screen overflow-hidden text-[#c0caf5]">
            {/* The Map as Background Hero */}
            <div className="w-full h-screen fixed top-0 left-0 z-0 bg-[#1a1b26]">
                <CinematicGlobe />
                {/* Subtle scan line overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                    <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7dcfff]/20 to-transparent animate-scan-line" />
                </div>
            </div>

            {/* Overlay Container wrapped over everything */}
            <div className="z-10 absolute inset-0 pointer-events-none w-full h-full p-4 md:p-6 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 animate-slide-up pointer-events-auto z-20 w-full">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-[#7dcfff] drop-shadow-[0_0_12px_rgba(125,207,255,0.4)]">
                                MISSION CONTROL
                            </h1>
                            <div className="flex items-center gap-3 mt-1 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#414868]">
                                <span className="text-[10px] font-mono text-[#7aa2f7]/70 uppercase tracking-widest">
                                    CMD: {user?.name || 'OPERATOR'}
                                </span>
                                <span className="text-[#292e42]">|</span>
                                <span className="text-[10px] font-mono text-[#7aa2f7]/70 uppercase tracking-widest">
                                    REGION: {getDistrictLabel(activeDistrict).toUpperCase()}
                                </span>
                                <span className="text-[#292e42]">|</span>
                                <span className="text-[10px] font-mono text-[#565f89] truncate max-w-[200px]">
                                    {locationName}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-3 flex-wrap bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-[#414868]">
                        <div className="flex items-center px-3 py-1.5 bg-[#1f2335] border border-[#292e42] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                            <Clock className="w-3 h-3 text-[#7dcfff] mr-2" />
                            <span className="text-xs font-digital text-[#7dcfff] tracking-wider">{utcTime} UTC</span>
                        </div>
                        {isLoadingWeather && (
                            <div className="flex items-center px-3 py-1 bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 rounded-full animate-pulse">
                                <Loader2 className="w-3 h-3 text-[#7aa2f7] mr-2 animate-spin" />
                                <span className="text-[10px] font-bold text-[#7aa2f7] tracking-wider">FETCHING API</span>
                            </div>
                        )}
                        {mode === 'simulate' ? (
                            <div className="flex items-center px-3 py-1 bg-[#f7768e]/10 border border-[#f7768e]/20 rounded-full">
                                <div className="w-2 h-2 bg-[#f7768e] rounded-full mr-2 animate-pulse shadow-[0_0_8px_rgba(247,118,142,0.5)]" />
                                <span className="text-[10px] font-bold text-[#f7768e] tracking-wider">SIMULATION</span>
                            </div>
                        ) : (
                            <div className="flex items-center px-3 py-1 bg-[#f7768e]/10 border border-[#f7768e]/20 rounded-full">
                                <div className="w-2 h-2 bg-[#f7768e] rounded-full mr-2 animate-pulse shadow-[0_0_8px_rgba(247,118,142,0.5)]" />
                                <span className="text-[10px] font-bold text-[#f7768e] tracking-wider">LIVE</span>
                            </div>
                        )}
                        <div className="flex items-center px-3 py-1 bg-[#9ece6a]/10 border border-[#9ece6a]/20 rounded-full">
                            <Zap className="w-3 h-3 text-[#9ece6a] mr-1.5" />
                            <span className="text-[10px] font-mono text-[#9ece6a] tracking-wider">SYSTEMS NOMINAL</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col xl:flex-row justify-between gap-5 min-h-0">
                    
                    {/* Left Side Container */}
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                        {/* Top Left: Search / Restricted */}
                        <div className="pointer-events-auto z-20 max-w-xl">
                            {isSuperAdmin ? (
                                <SearchBar />
                            ) : (
                                <div className="flex items-center gap-3 bg-[#e0af68]/10 border border-[#e0af68]/20 rounded-xl px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.2)] bg-slate-900/80 backdrop-blur-md">
                                    <Lock className="w-5 h-5 text-[#e0af68] flex-shrink-0" />
                                    <div>
                                        <div className="text-[9px] font-mono text-[#e0af68]/70 uppercase tracking-widest">RESTRICTED ACCESS</div>
                                        <div className="text-sm font-bold font-digital text-[#e0af68] tracking-wider">
                                            {getDistrictLabel(activeDistrict).toUpperCase()} DISTRICT
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Left: Terminals */}
                        <TelemetryTerminal />
                        <LiveTicker />
                    </div>

                    {/* Right: Sidebar Cards */}
                    <div className="absolute right-4 top-4 bottom-4 w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar stagger-children pointer-events-auto z-20 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-[#414868] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                        <RainfallCard currentRate={predictData?.inputs?.rainfall_mm ?? dashboardData?.rainfall ?? null} />
                        <EnvironmentCards
                            temperature={dashboardData?.temperature}
                            windSpeed={dashboardData?.windSpeed}
                            humidity={dashboardData?.humidity}
                            visibility={dashboardData?.visibility}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionControlDashboard;
