/**
 * ISRO Cartosat DEM — Offline Terrain Engine
 *
 * Fetches terrain metrics from the local Flask backend
 * which reads pre-computed ISRO DEM and Slope GeoTIFFs.
 *
 * NO external API calls. 100% offline, sub-millisecond response.
 */

const TERRAIN_API = '/api/terrain';

export interface TopographyResult {
    /** Elevation of the target point in meters above sea level */
    targetElevation: number;
    /** Terrain slope in degrees (from pre-computed slope.tif) */
    slopeDegrees: number;
    /** Aspect in degrees (0-360, from pre-computed aspect.tif) */
    aspectDegrees: number | null;
    /** Flow accumulation upstream cell count */
    flowAccumulation: number | null;
    /** Average elevation of surrounding area (approximated from elevation) */
    surroundingAverage: number;
    /** Target - Surrounding average */
    relativeDifference: number;
    /** Human-readable terrain classification */
    terrainType: 'Low-lying Sink/Basin' | 'Elevated Slope' | 'Flat Plains';
    /** Whether the coordinate is within the DEM bounding box */
    inBounds: boolean;
}

/**
 * Classify terrain type from slope degrees.
 * - slope > 5° → Elevated Slope (drainage advantage)
 * - slope < 1° AND low elevation → Low-lying Sink/Basin (flood-prone)
 * - else → Flat Plains (neutral)
 */
function classifyTerrain(slope: number, elevation: number): TopographyResult['terrainType'] {
    if (slope > 5) return 'Elevated Slope';
    if (slope < 1 && elevation < 200) return 'Low-lying Sink/Basin';
    return 'Flat Plains';
}

/**
 * Fetch terrain metrics from the local ISRO DEM backend.
 *
 * @returns TopographyResult or null if the API call fails
 */
export async function calculateTopographyRisk(
    lat: number,
    lng: number
): Promise<TopographyResult | null> {
    try {
        const url = `${TERRAIN_API}?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Terrain API HTTP ${response.status}`);
        }

        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Unknown terrain API error');
        }

        // Out of bounds — return a special result
        if (!json.in_bounds || !json.data) {
            return {
                targetElevation: 0,
                slopeDegrees: 0,
                aspectDegrees: null,
                flowAccumulation: null,
                surroundingAverage: 0,
                relativeDifference: 0,
                terrainType: 'Flat Plains',
                inBounds: false,
            };
        }

        const { elevation_m, slope_degrees, aspect_degrees, flow_accumulation } = json.data;

        // Use slope to estimate relative terrain difference
        const slopeRadians = (slope_degrees * Math.PI) / 180;
        const estimatedRelDiff = +(Math.tan(slopeRadians) * 100).toFixed(2); // rise over 100m run
        const terrainType = classifyTerrain(slope_degrees, elevation_m);

        return {
            targetElevation: +elevation_m.toFixed(1),
            slopeDegrees: +slope_degrees.toFixed(2),
            aspectDegrees: aspect_degrees != null ? +aspect_degrees.toFixed(1) : null,
            flowAccumulation: flow_accumulation,
            surroundingAverage: +(elevation_m - estimatedRelDiff).toFixed(1),
            relativeDifference: estimatedRelDiff,
            terrainType,
            inBounds: true,
        };
    } catch (error) {
        console.warn('[ISRO DEM Engine] Failed to fetch terrain data:', error);
        return null;
    }
}
