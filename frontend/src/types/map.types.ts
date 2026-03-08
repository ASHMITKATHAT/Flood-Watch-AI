export interface MapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any[];
  };
  properties: {
    [key: string]: any;
  };
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'tile' | 'geojson' | 'heatmap';
  url?: string;
  data?: GeoJSONFeature[];
  visible: boolean;
  opacity: number;
}

export interface VillageInfo {
  id: string;
  name: string;
  population: number;
  riskLevel: number;
  coordinates: [number, number];
  floodHistory: Array<{
    year: number;
    severity: number;
  }>;
}