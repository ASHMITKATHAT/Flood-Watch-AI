/**
 * EQUINOX API Service Layer
 * All frontend-backend communication goes through here.
 * Vite proxy forwards /api → Flask at localhost:5000
 */

const API_BASE = '/api';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Grid Data ──────────────────────────────────────────────

export interface GridCell {
  lat: number;
  lng: number;
  elevation: number;
  risk: 'critical' | 'high' | 'medium' | 'safe';
  water_depth_m: number;
  status: string;
  row: number;
  col: number;
}

export interface GridDataResponse {
  success: boolean;
  scenario: string;
  center: { lat: number; lng: number };
  grid_size: number;
  cell_count: number;
  cells: GridCell[];
  timestamp: string;
}

export function fetchGridData(scenario: 'live' | 'punjab' = 'live'): Promise<GridDataResponse> {
  return apiFetch(`/grid-data?scenario=${scenario}`);
}

// ─── Scenarios ──────────────────────────────────────────────

export interface TimelineEntry {
  hour: number;
  actual_level: number;
  predicted_level: number;
  rainfall_mm: number;
}

export interface AffectedZone {
  name: string;
  lat: number;
  lng: number;
  peak_depth_m: number;
  risk: string;
}

export interface PunjabScenario {
  success: boolean;
  scenario: string;
  title: string;
  center: { lat: number; lng: number };
  zoom: number;
  summary: {
    total_affected_area_km2: number;
    peak_water_level_m: number;
    villages_affected: number;
    population_displaced: number;
    model_accuracy_pct: number;
  };
  timeline: TimelineEntry[];
  affected_zones: AffectedZone[];
  timestamp: string;
}

export interface LiveScenario {
  success: boolean;
  scenario: string;
  title: string;
  center: { lat: number; lng: number };
  zoom: number;
  current_conditions: {
    rainfall_mm_hr: number;
    wind_speed_kmh: number;
    temperature_c: number;
    humidity_pct: number;
  };
  active_alerts: { zone: string; level: string; water_depth_m: number }[];
  sensor_status: string;
  timestamp: string;
}

export function fetchScenarioPunjab(): Promise<PunjabScenario> {
  return apiFetch('/scenarios/punjab');
}

export function fetchScenarioLive(): Promise<LiveScenario> {
  return apiFetch('/scenarios/live');
}

// ─── Sensors ────────────────────────────────────────────────

export interface SensorData {
  value: number;
  unit: string;
  status: string;
  threshold: number;
}

export interface SensorsResponse {
  success: boolean;
  sensors: {
    soil_moisture: SensorData;
    rainfall_intensity: SensorData;
    district_risk: SensorData;
    dam_water_level: SensorData;
  };
  timestamp: string;
}

export function fetchSensors(): Promise<SensorsResponse> {
  return apiFetch('/sensors');
}

// ─── Telemetry ──────────────────────────────────────────────

export interface TelemetryLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
}

export interface TelemetryResponse {
  success: boolean;
  logs: TelemetryLog[];
  system_uptime: string;
  active_processes: number;
}

export function fetchTelemetry(count = 8): Promise<TelemetryResponse> {
  return apiFetch(`/telemetry?count=${count}`);
}

// ─── Reports ────────────────────────────────────────────────

export interface ReportSubmission {
  mobile: string;
  otp: string;
  description: string;
  latitude: number;
  longitude: number;
  image_name?: string;
}

export interface ReportResponse {
  success: boolean;
  report?: {
    id: string;
    mobile: string;
    description: string;
    location: { lat: number; lng: number };
    image: string;
    status: string;
    verified: boolean;
    timestamp: string;
  };
  message?: string;
  error?: string;
  hint?: string;
}

export function submitReport(data: ReportSubmission): Promise<ReportResponse> {
  return apiFetch('/reports/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Predictions ────────────────────────────────────────────

export interface PredictionParams {
  rainfall_mm: number;
  slope_degrees?: number;
  soil_type?: string;
  flow_accumulation?: number;
  elevation_m?: number;
  village_id?: string;
  village_name?: string;
}

export interface PredictionResponse {
  success: boolean;
  prediction: {
    flood_depth_m: number;
    risk_category: string;
    confidence: number;
    warning_time_minutes: number;
    village_id: string;
    village_name: string;
    timestamp: string;
  };
  input_parameters: Record<string, unknown>;
}

export function fetchPrediction(params: PredictionParams): Promise<PredictionResponse> {
  return apiFetch('/predict', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Health ─────────────────────────────────────────────────

export function fetchHealth(): Promise<{ status: string; ml_model_loaded: boolean; timestamp: string }> {
  return apiFetch('/health');
}

// ─── SAR Inundation (Sentinel-1) ────────────────────────────

export interface SARMetrics {
  status: string;
  lat: number;
  lng: number;
  recent_image_date: string | null;
  flooded_area_hectares: number | null;
  total_area_hectares: number | null;
  flood_fraction_pct: number | null;
  water_pixel_count: number | null;
  threshold_db: number;
  message: string;
}

export interface SARResponse {
  success: boolean;
  data: SARMetrics;
  source: string;
}

export function fetchSARData(lat: number, lng: number, radiusKm = 5): Promise<SARResponse> {
  return apiFetch(`/sar?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
}