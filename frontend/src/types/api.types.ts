export interface FloodPrediction {
  id: string;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  riskLevel: number;
  confidence: number;
  predictedDepth?: number;
  factors: {
    rainfall: number;
    soilMoisture: number;
    terrain: number;
    historical: number;
  };
  timestamp: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: string;
  forecast: Array<{
    date: string;
    rainfall: number;
    temp: number;
  }>;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location: string;
  timestamp: string;
  expiresAt?: string;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

export interface SensorData {
  id: string;
  type: 'rainfall' | 'water_level' | 'soil_moisture';
  value: number;
  unit: string;
  location: string;
  timestamp: string;
  status: 'active' | 'warning' | 'error';
}

export interface Report {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident';
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
}