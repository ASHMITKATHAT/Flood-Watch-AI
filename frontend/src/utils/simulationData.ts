/**
 * Simulation Data Payloads
 * Hardcoded extreme weather data for demo/simulation mode
 */

export interface DashboardData {
    rainfall: number;
    soilMoisture: number;
    waterDepth: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE';
    confidence: number;
    temperature: number;
    windSpeed: number;
    humidity: number;
    visibility: number;
}

/** Flash flood extreme event payload — 2025 scenario */
export const EXTREME_FLOOD_2025: DashboardData = {
    rainfall: 300,
    soilMoisture: 95,
    waterDepth: 5.8,
    riskLevel: 'CRITICAL',
    confidence: 94.2,
    temperature: 22.1,
    windSpeed: 85.6,
    humidity: 98,
    visibility: 0.3,
};

/** Normal/moderate live defaults */
export const LIVE_DEFAULTS: DashboardData = {
    rainfall: 12.5,
    soilMoisture: 42,
    waterDepth: 0.8,
    riskLevel: 'MODERATE',
    confidence: 72.0,
    temperature: 28.5,
    windSpeed: 24.3,
    humidity: 62,
    visibility: 8.2,
};

/** Cities known to be at high elevation — topography override */
export const HIGH_ELEVATION_CITIES: string[] = [
    'shimla',
    'mount abu',
    'manali',
    'darjeeling',
    'ooty',
    'mussoorie',
    'nainital',
    'gangtok',
];

/** Mock elevation (meters) for known high-altitude cities */
export const ELEVATION_MAP: Record<string, number> = {
    shimla: 2276,
    'mount abu': 1220,
    manali: 2050,
    darjeeling: 2042,
    ooty: 2240,
    mussoorie: 2005,
    nainital: 2084,
    gangtok: 1650,
};

/** Sparkline data for simulation vs live */
export const EXTREME_SPARKLINE = [
    { t: '1h', v: 45 }, { t: '2h', v: 120 }, { t: '3h', v: 210 },
    { t: '4h', v: 280 }, { t: '5h', v: 310 }, { t: '6h', v: 295 },
    { t: 'now', v: 300 },
];

export const LIVE_SPARKLINE = [
    { t: '1h', v: 8 }, { t: '2h', v: 12 }, { t: '3h', v: 10 },
    { t: '4h', v: 15 }, { t: '5h', v: 14 }, { t: '6h', v: 11 },
    { t: 'now', v: 12 },
];
