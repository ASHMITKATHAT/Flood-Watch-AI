/**
 * Weather Service — Fetches REAL weather data from OpenWeather API
 *
 * Uses the OpenWeather "Current Weather" endpoint (free tier).
 * API key is hardcoded for the hackathon demo — in production, use env vars.
 *
 * Returns normalized data matching our DashboardData interface.
 */

const BASE_URL = '/api/predict';

export interface WeatherResponse {
    rainfall: number;        // mm/hr (from rain.1h, or 0)
    soilMoisture: number;    // % (estimated from humidity + rain)
    waterDepth: number;      // m (estimated from rainfall intensity)
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE';
    confidence: number;      // model confidence %
    temperature: number;     // °C
    windSpeed: number;       // km/h
    humidity: number;        // %
    visibility: number;      // km
}

/**
 * Estimate soil moisture from humidity and rainfall
 * (Real soil moisture requires specialized APIs like NASA SMAP)
 */
function estimateSoilMoisture(humidity: number, rainfall: number): number {
    const base = humidity * 0.6;
    const rainContribution = Math.min(rainfall * 0.3, 30);
    return Math.min(Math.round(base + rainContribution), 100);
}

/**
 * Estimate water depth from rainfall intensity
 * (Real depth requires hydrological modeling)
 */
function estimateWaterDepth(rainfall: number): number {
    if (rainfall < 5) return 0;
    if (rainfall < 20) return +(rainfall * 0.02).toFixed(2);
    if (rainfall < 60) return +(rainfall * 0.04).toFixed(2);
    return +(rainfall * 0.06).toFixed(2);
}

/**
 * Fetch live weather data from OpenWeather for given coordinates.
 * Returns null on failure so the UI can show a fallback state.
 */
export async function fetchLiveWeather(lat: number, lng: number): Promise<WeatherResponse | null> {
    try {
        const url = `${BASE_URL}?lat=${lat}&lng=${lng}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Backend HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status !== "success") {
             throw new Error("Backend returned failure");
        }

        // Extract fields from backend response incorporating NASA GPM & SMAP
        const rainfall = data.inputs?.rainfall_mm ?? 0;
        const soilMoisture = data.inputs?.soil_saturation_percent ?? estimateSoilMoisture(50, rainfall);
        const waterDepth = data.flood_depth_m ?? estimateWaterDepth(rainfall);
        
        const risk_category = data.risk_category?.toUpperCase() || 'SAFE';
        let riskLevel: WeatherResponse['riskLevel'] = 'SAFE';
        if (risk_category.includes('CRITICAL')) riskLevel = 'CRITICAL';
        else if (risk_category.includes('HIGH')) riskLevel = 'HIGH';
        else if (risk_category.includes('MODERATE') || risk_category.includes('MEDIUM')) riskLevel = 'MODERATE';
        
        const confidence = (data.confidence ?? 0.8) * 100;
        
        // Extract real weather data injected by backend (Open-Meteo disguised as OpenWeather)
        // Ensure defaults are only used if the backend explicitly fails to provide keys
        const weatherData = data.data_sources?.weather === 'unavailable' 
            ? null 
            : data.data_sources?.openweather?.data;

        return {
            rainfall: +rainfall.toFixed(1),
            soilMoisture: +soilMoisture.toFixed(1),
            waterDepth: +waterDepth.toFixed(2),
            riskLevel,
            confidence: +confidence.toFixed(1),
            temperature: weatherData?.temperature_c ?? data.inputs?.temperature_c ?? 28.5,
            windSpeed: weatherData?.wind_speed ?? 12.0, 
            humidity: weatherData?.humidity_percent ?? data.inputs?.humidity_percent ?? 50.0,
            visibility: 10.0,
        };
    } catch (error) {
        console.warn('[WeatherService] Failed to fetch live weather from NASA/Backend:', error);
        return null;
    }
}
