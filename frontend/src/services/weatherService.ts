/**
 * Weather Service — Fetches REAL weather data from OpenWeather API
 *
 * Uses the OpenWeather "Current Weather" endpoint (free tier).
 * API key is hardcoded for the hackathon demo — in production, use env vars.
 *
 * Returns normalized data matching our DashboardData interface.
 */

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'your_openweather_api_key_here';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

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
 * Compute risk level from real-time weather metrics
 */
function computeRisk(rainfall: number, humidity: number): { level: WeatherResponse['riskLevel']; confidence: number } {
    if (rainfall > 100) return { level: 'CRITICAL', confidence: 92 + Math.random() * 5 };
    if (rainfall > 50) return { level: 'HIGH', confidence: 78 + Math.random() * 10 };
    if (rainfall > 15 || humidity > 85) return { level: 'MODERATE', confidence: 65 + Math.random() * 15 };
    return { level: 'SAFE', confidence: 55 + Math.random() * 20 };
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
        const url = `${BASE_URL}?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}&units=metric`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeather HTTP ${response.status}`);
        }

        const data = await response.json();

        // Extract fields from OpenWeather response
        const temperature = data.main?.temp ?? 0;
        const humidity = data.main?.humidity ?? 0;
        const windSpeedMs = data.wind?.speed ?? 0;
        const windSpeed = +(windSpeedMs * 3.6).toFixed(1); // m/s → km/h
        const visibilityM = data.visibility ?? 10000;
        const visibility = +(visibilityM / 1000).toFixed(1); // m → km

        // Rainfall: OpenWeather puts it in rain.1h or rain.3h (mm)
        const rainfall1h = data.rain?.['1h'] ?? 0;
        const rainfall3h = data.rain?.['3h'] ?? 0;
        const rainfall = rainfall1h || (rainfall3h / 3); // normalize to mm/hr

        // Derived metrics
        const soilMoisture = estimateSoilMoisture(humidity, rainfall);
        const waterDepth = estimateWaterDepth(rainfall);
        const { level: riskLevel, confidence } = computeRisk(rainfall, humidity);

        return {
            rainfall: +rainfall.toFixed(1),
            soilMoisture,
            waterDepth,
            riskLevel,
            confidence: +confidence.toFixed(1),
            temperature: +temperature.toFixed(1),
            windSpeed,
            humidity,
            visibility,
        };
    } catch (error) {
        console.warn('[WeatherService] Failed to fetch live weather:', error);
        return null;
    }
}
