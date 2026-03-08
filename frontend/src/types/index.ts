// src/types/index.ts
export interface LocationData {
  lat: number;
  lon: number;
  display_name: string;
  village?: string;
  district?: string;
}

export interface PredictionData {
  risk_score: number;
  current: {
    rainfall: number;
    soil_saturation: number;
    topography: {
      slope: number;
      elevation: number;
    };
    humidity: number;
  };
  forecast_24h: {
    rainfall: number;
    soil_saturation: number;
    topography: {
      slope: number;
      elevation: number;
    };
    humidity: number;
  };
  seven_day_rainfall: Array<{
    date: string;
    precipitation: number;
  }>;
  sinks?: Array<{
    lat: number;
    lon: number;
    accumulation: number;
  }>;
}

export interface FloodRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  sinks: Array<{ lat: number; lon: number; accumulation: number }>;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  population: number;
}

export interface SMSData {
  villages: string[];
  language: 'en' | 'hi' | 'mr';
  message: string;
}

export interface HumanReport {
  lat: number;
  lon: number;
  water_level_cm: number;
  description: string;
  photo?: File;
}