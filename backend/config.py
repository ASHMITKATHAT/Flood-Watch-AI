"""
EQUINOX Flood Watch - Configuration Module
Centralized configuration for the entire backend system
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'equinox-flood-watch-secret-key-2024')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # API Keys (from your input)
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
    ISRO_LULC_API_KEY = os.getenv('ISRO_LULC_API_KEY', '')
    NASA_API_KEY = os.getenv('NASA_API_KEY', '')
    
    # SMS Service (Twilio/TextLocal)
    SMS_API_KEY = os.getenv('SMS_API_KEY', '')
    SMS_SENDER_ID = os.getenv('SMS_SENDER_ID', 'EQUINOX')
    
    # File Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    MODELS_DIR = os.path.join(BASE_DIR, 'models')
    LOGS_DIR = os.path.join(BASE_DIR, 'logs')
    UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
    
    # DEM Data Paths
    DEM_DIR = os.path.join(DATA_DIR, 'dem')
    RAJASTHAN_DEM_PATH = os.path.join(DEM_DIR, 'rajasthan_dem.tif')
    SLOPE_PATH = os.path.join(DEM_DIR, 'slope.tif')
    ASPECT_PATH = os.path.join(DEM_DIR, 'aspect.tif')
    FLOW_ACCUMULATION_PATH = os.path.join(DEM_DIR, 'flow_accumulation.tif')
    
    # Google Earth Engine (SAR Engine — Phase 4)
    GEE_KEY_PATH = os.getenv('GEE_KEY_PATH', os.path.join(DATA_DIR, 'gee_key.json'))
    
    # Village Data
    VILLAGES_GEOJSON = os.path.join(DATA_DIR, 'villages', 'rajasthan_villages.geojson')
    VILLAGE_POPULATION_CSV = os.path.join(DATA_DIR, 'villages', 'village_population.csv')
    
    # API Endpoints
    NASA_GPM_API = "https://gpm1.gesdisc.eosdis.nasa.gov/opendap/hyrax/GPM_L3/GPM_3IMERGHH.06/{date}/{file}"
    ISRO_BHUVAN_WMS = "https://bhuvan-ras1.nrsc.gov.in/bhuvan/wms"
    OPENWEATHER_API = "https://api.openweathermap.org/data/2.5/weather"
    
    # Model Parameters
    CELL_SIZE = 30  # meters (ISRO DEM resolution)
    RAIN_RESOLUTION = 10000  # meters (NASA GPM resolution)
    THRESHOLD_YELLOW = 20  # cm for yellow alert
    THRESHOLD_RED = 100  # cm for red alert
    
    # Simulation Parameters
    TIME_STEP = 5  # minutes for simulation steps
    SIMULATION_DURATION = 120  # minutes total simulation
    
    # Alert System
    ALERT_LANGUAGES = ['en', 'hi', 'mr']  # English, Hindi, Marwari
    ALERT_CHECK_INTERVAL = 300  # seconds
    
    # Caching
    CACHE_TIMEOUT = {
        'nasa': 1800,  # 30 minutes
        'weather': 600,  # 10 minutes
        'terrain': 86400,  # 24 hours
    }
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Performance
    MAX_WORKERS = 4
    BATCH_SIZE = 1000
    
    # Coordinates for Rajasthan (default region)
    RAJASTHAN_BOUNDS = {
        'min_lat': 23.0,
        'max_lat': 30.0,
        'min_lon': 69.0,
        'max_lon': 78.0
    }
    
    # Default village for testing
    DEFAULT_VILLAGE = {
        'name': 'Jodhpur',
        'lat': 26.2389,
        'lon': 73.0243,
        'population': 1500000
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """Get configuration instance"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')
    return config.get(config_name, config['default'])