"""
data_validator.py
Data validation and preprocessing
"""

from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DataValidator:
    """Validates and preprocesses input data"""
    
    def __init__(self):
        self.feature_ranges = {
            'rainfall_mm': (0, 500),
            'rainfall_24h': (0, 1000),
            'humidity_percent': (0, 100),
            'temperature_c': (-50, 60),
            'wind_speed': (0, 100),
            'pressure_hpa': (800, 1100),
            'slope_deg': (0, 90),
            'elevation_m': (-500, 9000),
            'curvature': (-100, 100),
            'flow_accumulation': (0, 100000),
            'soil_saturation': (0, 100),
            'ndvi': (-1, 1),
            'builtup_percentage': (0, 100),
            'water_distance_m': (0, 50000),
            'soil_type_factor': (0, 1),
            'drainage_density': (0, 10)
        }
    
    def validate_features(self, features: Dict) -> Tuple[bool, List[str]]:
        """
        Validate feature values against acceptable ranges
        
        Args:
            features: Dictionary of feature values
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        for feature, value in features.items():
            if feature in self.feature_ranges:
                min_val, max_val = self.feature_ranges[feature]
                if not (min_val <= value <= max_val):
                    errors.append(f"{feature} value {value} outside range [{min_val}, {max_val}]")
        
        return len(errors) == 0, errors
    
    def normalize_features(self, features: Dict) -> Dict:
        """
        Normalize features to 0-1 range
        
        Args:
            features: Raw feature values
            
        Returns:
            Normalized features
        """
        normalized = {}
        
        for feature, value in features.items():
            if feature in self.feature_ranges:
                min_val, max_val = self.feature_ranges[feature]
                if max_val > min_val:
                    normalized[feature] = (value - min_val) / (max_val - min_val)
                else:
                    normalized[feature] = 0.5
            else:
                normalized[feature] = value
        
        return normalized
    
    def impute_missing_values(self, features: Dict) -> Dict:
        """
        Impute missing values with sensible defaults
        
        Args:
            features: Dictionary with possibly missing values
            
        Returns:
            Dictionary with all required features
        """
        defaults = {
            'rainfall_mm': 0,
            'rainfall_24h': 0,
            'humidity_percent': 50,
            'temperature_c': 25,
            'wind_speed': 5,
            'pressure_hpa': 1013,
            'slope_deg': 5,
            'elevation_m': 250,
            'curvature': 0,
            'flow_accumulation': 1000,
            'soil_saturation': 50,
            'ndvi': 0.3,
            'builtup_percentage': 20,
            'water_distance_m': 1000,
            'soil_type_factor': 0.7,
            'drainage_density': 1.5
        }
        
        # Add missing features with defaults
        for feature, default in defaults.items():
            if feature not in features:
                features[feature] = default
                logger.warning(f"Imputed missing feature {feature} with {default}")
        
        return features
    
    def validate_village_data(self, village_data: Dict) -> Dict:
        """
        Validate and prepare village data for prediction
        
        Args:
            village_data: Raw village data
            
        Returns:
            Validated and processed data
        """
        # Extract features
        features = {
            'rainfall_mm': village_data.get('rainfall_mm', 0),
            'rainfall_24h': village_data.get('rainfall_24h', 0),
            'humidity_percent': village_data.get('humidity', 50),
            'temperature_c': village_data.get('temperature', 25),
            'wind_speed': village_data.get('wind_speed', 5),
            'pressure_hpa': village_data.get('pressure', 1013),
            'slope_deg': village_data.get('slope', 5),
            'elevation_m': village_data.get('elevation', 250),
            'curvature': village_data.get('curvature', 0),
            'flow_accumulation': village_data.get('flow_accumulation', 1000),
            'soil_saturation': village_data.get('soil_moisture', 50),
            'ndvi': village_data.get('ndvi', 0.3),
            'builtup_percentage': village_data.get('urban_percentage', 20),
            'water_distance_m': village_data.get('water_distance', 1000),
            'soil_type_factor': village_data.get('soil_type', 0.7),
            'drainage_density': village_data.get('drainage_density', 1.5)
        }
        
        # Impute missing values
        features = self.impute_missing_values(features)
        
        # Validate ranges
        is_valid, errors = self.validate_features(features)
        
        if not is_valid:
            logger.error(f"Validation errors: {errors}")
            # Use defaults for invalid features
            for error in errors:
                feature = error.split()[0]
                if feature in self.feature_ranges:
                    min_val, max_val = self.feature_ranges[feature]
                    features[feature] = (min_val + max_val) / 2
        
        return {
            'features': features,
            'village_name': village_data.get('village_name', 'Unknown'),
            'latitude': village_data.get('latitude', 0),
            'longitude': village_data.get('longitude', 0),
            'population': village_data.get('population', 1000),
            'is_valid': is_valid,
            'validation_errors': errors
        }