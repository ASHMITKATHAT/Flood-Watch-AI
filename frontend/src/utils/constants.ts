export const constants = {
  // Risk levels
  RISK_LEVELS: {
    LOW: { min: 0, max: 30, color: '#10b981', label: 'Low' },
    MEDIUM: { min: 31, max: 70, color: '#f59e0b', label: 'Medium' },
    HIGH: { min: 71, max: 100, color: '#ef4444', label: 'High' },
  },

  // Alert types
  ALERT_TYPES: {
    INFO: 'info',
    WARNING: 'warning',
    DANGER: 'danger',
  },

  // API endpoints
  API_ENDPOINTS: {
    PREDICTIONS: '/api/predictions',
    WEATHER: '/api/weather',
    ALERTS: '/api/alerts',
    REPORTS: '/api/reports',
    SENSORS: '/api/sensors',
    VILLAGES: '/api/villages',
  },

  // Map defaults
  MAP_DEFAULTS: {
    CENTER: { lat: 26.9124, lng: 75.7873 }, // Rajasthan center
    ZOOM: 10,
    MIN_ZOOM: 8,
    MAX_ZOOM: 18,
  },

  // Time intervals (in milliseconds)
  INTERVALS: {
    REFRESH_DATA: 60000, // 1 minute
    WEBSOCKET_RECONNECT: 5000,
    CACHE_EXPIRY: 300000, // 5 minutes
  },

  // Units
  UNITS: {
    RAINFALL: 'mm',
    TEMPERATURE: '°C',
    DISTANCE: 'km',
    SPEED: 'km/h',
  },

  // Colors
  COLORS: {
    PRIMARY: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    DANGER: '#ef4444',
    INFO: '#6b7280',
  },
};