/**
 * EQUINOX District Registry
 * Maps district_id → display name, center coordinates, and zoom level.
 * Used by the super_admin dropdown and for map flyTo logic.
 */

export interface DistrictInfo {
    id: string;
    label: string;
    center: { lat: number; lng: number };
    zoom: number;
}

export const DISTRICTS: DistrictInfo[] = [
    // ── Rajasthan (within ISRO DEM coverage: 75°–76.5°E, 26°–27.5°N) ──
    { id: 'jaipur_01', label: 'Jaipur', center: { lat: 26.9124, lng: 75.7873 }, zoom: 12 },
    { id: 'ajmer_01', label: 'Ajmer', center: { lat: 26.4499, lng: 75.6399 }, zoom: 12 },
    { id: 'tonk_01', label: 'Tonk', center: { lat: 26.1665, lng: 75.7885 }, zoom: 12 },
    { id: 'dausa_01', label: 'Dausa', center: { lat: 26.8839, lng: 76.3378 }, zoom: 12 },
    { id: 'kishangarh_01', label: 'Kishangarh', center: { lat: 26.5921, lng: 75.8550 }, zoom: 13 },
    { id: 'dudu_01', label: 'Dudu', center: { lat: 26.6087, lng: 75.5710 }, zoom: 13 },
    { id: 'sambhar_01', label: 'Sambhar Lake', center: { lat: 26.9078, lng: 75.1841 }, zoom: 13 },
    { id: 'chaksu_01', label: 'Chaksu', center: { lat: 26.6050, lng: 75.9470 }, zoom: 13 },
    { id: 'phulera_01', label: 'Phulera', center: { lat: 26.8720, lng: 75.2430 }, zoom: 13 },
    { id: 'malpura_01', label: 'Malpura', center: { lat: 26.2830, lng: 75.3630 }, zoom: 13 },
    { id: 'niwai_01', label: 'Niwai', center: { lat: 26.3590, lng: 75.9210 }, zoom: 13 },
    // ── Other major cities ──
    { id: 'delhi_01', label: 'Delhi', center: { lat: 28.6139, lng: 77.2090 }, zoom: 11 },
    { id: 'wayanad_01', label: 'Wayanad', center: { lat: 11.6854, lng: 76.1320 }, zoom: 11 },
    { id: 'chennai_01', label: 'Chennai', center: { lat: 13.0827, lng: 80.2707 }, zoom: 11 },
    { id: 'mumbai_01', label: 'Mumbai', center: { lat: 19.0760, lng: 72.8777 }, zoom: 11 },
    { id: 'kolkata_01', label: 'Kolkata', center: { lat: 22.5726, lng: 88.3639 }, zoom: 11 },
    { id: 'assam_01', label: 'Guwahati', center: { lat: 26.1445, lng: 91.7362 }, zoom: 11 },
    { id: 'kerala_01', label: 'Kochi', center: { lat: 9.9312, lng: 76.2673 }, zoom: 11 },
    { id: 'punjab_01', label: 'Ludhiana', center: { lat: 30.9010, lng: 75.8573 }, zoom: 11 },
];

export const DISTRICT_MAP: Record<string, DistrictInfo> = Object.fromEntries(
    DISTRICTS.map(d => [d.id, d])
);

/** Get display label for a district_id, fallback to the id itself */
export const getDistrictLabel = (id: string): string =>
    DISTRICT_MAP[id]?.label ?? id.replace('_', ' ');
