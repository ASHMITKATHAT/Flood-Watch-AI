import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import {
    DashboardData,
    EXTREME_FLOOD_2025,
    HIGH_ELEVATION_CITIES,
    ELEVATION_MAP,
} from '../utils/simulationData';
import { fetchLiveWeather, WeatherResponse } from '../services/weatherService';
import { calculateTopographyRisk, TopographyResult } from '../services/topographyService';

export type SimMode = 'live' | 'simulate';

// ── Unified Predict Payload (Single Source of Truth) ─────────
export interface PredictPayload {
    risk_percentage: number;
    risk_category: string;
    confidence: number;
    flood_depth_m: number;
    inputs: {
        elevation_m: number;
        slope_degrees: number;
        flow_accumulation: number;
        rainfall_mm: number;
        sar_flooded_hectares: number;
        soil_saturation_percent: number;
    };
    data_sources: {
        topography: string;
        weather: string;
        sar: string;
    };
    engine: string;
}

interface Coordinates {
    lat: number;
    lng: number;
    zoom: number;
}

interface SimulationContextType {
    mode: SimMode;
    setMode: (mode: SimMode) => void;
    locationName: string;
    setLocationName: (name: string) => void;
    coordinates: Coordinates;
    setCoordinates: (coords: Coordinates) => void;
    dashboardData: DashboardData | null;
    predictData: PredictPayload | null;
    isHighElevation: boolean;
    elevationMeters: number | null;
    topographyOverride: boolean;
    effectiveRiskLevel: DashboardData['riskLevel'] | null;
    isLoadingWeather: boolean;
    fetchLiveData: (lat: number, lng: number) => Promise<void>;
    hasSearched: boolean;
    topographyData: TopographyResult | null;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<SimMode>('live');
    const [locationName, setLocationName] = useState('Search a location to begin...');
    const [coordinates, setCoordinates] = useState<Coordinates>({
        lat: 26.9124,
        lng: 75.7873,
        zoom: 5,
    });
    const [liveWeatherData, setLiveWeatherData] = useState<WeatherResponse | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [topographyData, setTopographyData] = useState<TopographyResult | null>(null);
    const [predictData, setPredictData] = useState<PredictPayload | null>(null);

    // Determine elevation status
    const normalizedName = locationName.toLowerCase().trim();
    const isHighElevation = HIGH_ELEVATION_CITIES.some(city =>
        normalizedName.includes(city)
    );
    const elevationMeters = Object.entries(ELEVATION_MAP).find(
        ([city]) => normalizedName.includes(city)
    )?.[1] ?? null;

    // Topography override: high elevation + simulation mode = risk mitigated
    const topographyOverride = mode === 'simulate' && isHighElevation;

    // Dashboard data: null on initial load, live weather after search, extreme flood in simulation
    const dashboardData: DashboardData | null = useMemo(() => {
        if (mode === 'simulate') return { ...EXTREME_FLOOD_2025 };
        if (!hasSearched || !liveWeatherData) return null;
        return { ...liveWeatherData };
    }, [mode, hasSearched, liveWeatherData]);

    // Effective risk level after topography override
    const effectiveRiskLevel: DashboardData['riskLevel'] | null = useMemo(() => {
        if (!dashboardData) return null;
        return topographyOverride ? 'SAFE' : dashboardData.riskLevel;
    }, [dashboardData, topographyOverride]);

    // ── Fetch unified prediction from /api/predict ───────────
    const fetchPredictData = useCallback(async (lat: number, lng: number): Promise<PredictPayload | null> => {
        try {
            const resp = await fetch(`/api/predict?lat=${lat}&lng=${lng}`);
            if (!resp.ok) return null;
            const json = await resp.json();
            if (json.status !== 'success') return null;
            return json as PredictPayload;
        } catch {
            console.warn('[SimulationContext] /api/predict fetch failed');
            return null;
        }
    }, []);

    // Fetch live weather, topography, AND unified prediction in parallel
    const fetchLiveData = useCallback(async (lat: number, lng: number) => {
        setIsLoadingWeather(true);
        setHasSearched(true);
        try {
            const [weatherData, topoData, prediction] = await Promise.all([
                fetchLiveWeather(lat, lng),
                calculateTopographyRisk(lat, lng),
                fetchPredictData(lat, lng),
            ]);

            if (weatherData) {
                setLiveWeatherData(weatherData);
            }
            if (topoData) {
                setTopographyData(topoData);
            }
            setPredictData(prediction);
        } catch (err) {
            console.warn('[SimulationContext] Data fetch failed:', err);
        } finally {
            setIsLoadingWeather(false);
        }
    }, [fetchPredictData]);

    // Auto-fetch data on initial load to populate the dashboard immediately
    React.useEffect(() => {
        if (!hasSearched) {
            fetchLiveData(coordinates.lat, coordinates.lng);
        }
    }, []);

    const value = useMemo(() => ({
        mode,
        setMode,
        locationName,
        setLocationName,
        coordinates,
        setCoordinates,
        dashboardData,
        predictData,
        isHighElevation,
        elevationMeters,
        topographyOverride,
        effectiveRiskLevel,
        isLoadingWeather,
        fetchLiveData,
        hasSearched,
        topographyData,
    }), [mode, locationName, coordinates, dashboardData, predictData, isHighElevation, elevationMeters, topographyOverride, effectiveRiskLevel, isLoadingWeather, fetchLiveData, hasSearched, topographyData]);

    return (
        <SimulationContext.Provider value={value}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};
