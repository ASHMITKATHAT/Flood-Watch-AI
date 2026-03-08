"""
feature_engineering.py - Professional feature engineering for flood prediction
"""

import numpy as np
import pandas as pd
from typing import Dict, List
from sklearn.preprocessing import PolynomialFeatures
import logging

logger = logging.getLogger(__name__)

class FloodFeatureEngineer:
    """Advanced feature engineering for flood prediction"""
    
    def __init__(self):
        self.poly = PolynomialFeatures(degree=2, interaction_only=True)
        self.feature_cache = {}
    
    def engineer_features(self, raw_features: Dict) -> Dict:
        """
        Create engineered features from raw data
        
        Args:
            raw_features: Dictionary of raw feature values
            
        Returns:
            Dictionary with engineered features
        """
        features = raw_features.copy()
        
        # 1. Create interaction terms
        features.update(self._create_interactions(raw_features))
        
        # 2. Create derived hydrological features
        features.update(self._create_hydrological_features(raw_features))
        
        # 3. Create temporal features
        features.update(self._create_temporal_features())
        
        # 4. Create spatial features
        features.update(self._create_spatial_features(raw_features))
        
        # 5. Create composite indices
        features.update(self._create_composite_indices(raw_features))
        
        logger.debug(f"Engineered {len(features)} features from {len(raw_features)} raw features")
        return features
    
    def _create_interactions(self, features: Dict) -> Dict:
        """Create interaction terms between important features"""
        interactions = {}
        
        # Rainfall × Soil Saturation
        if 'rainfall_mm' in features and 'soil_saturation' in features:
            interactions['rainfall_soil_interaction'] = (
                features['rainfall_mm'] * features['soil_saturation'] / 100
            )
        
        # Slope × Flow Accumulation
        if 'slope_deg' in features and 'flow_accumulation' in features:
            interactions['slope_flow_interaction'] = (
                features['slope_deg'] * np.log1p(features['flow_accumulation'])
            )
        
        # Elevation × Urban Percentage
        if 'elevation_m' in features and 'builtup_percentage' in features:
            interactions['elevation_urban_interaction'] = (
                (1000 - features['elevation_m']) * features['builtup_percentage'] / 100
            )
        
        return interactions
    
    def _create_hydrological_features(self, features: Dict) -> Dict:
        """Create hydrological derived features"""
        hydro_features = {}
        
        # Runoff coefficient (simplified)
        if 'rainfall_mm' in features and 'soil_saturation' in features:
            # Higher saturation = more runoff
            runoff_coeff = min(1.0, features['soil_saturation'] / 100)
            hydro_features['runoff_coefficient'] = runoff_coeff
        
        # Topographic Wetness Index (TWI)
        if 'slope_deg' in features and 'flow_accumulation' in features:
            slope_rad = np.radians(features['slope_deg'])
            slope_tan = np.tan(slope_rad)
            if slope_tan > 0:
                twi = np.log(features['flow_accumulation'] / slope_tan)
                hydro_features['topographic_wetness_index'] = twi
        
        # Stream Power Index (SPI)
        if 'flow_accumulation' in features and 'slope_deg' in features:
            spi = features['flow_accumulation'] * np.tan(np.radians(features['slope_deg']))
            hydro_features['stream_power_index'] = spi
        
        # Compound Topographic Index (CTI)
        if all(k in features for k in ['slope_deg', 'curvature', 'flow_accumulation']):
            cti = features['flow_accumulation'] / (
                features['slope_deg'] + 1e-6 * (features['curvature'] + 100)
            )
            hydro_features['compound_topographic_index'] = cti
        
        return hydro_features
    
    def _create_temporal_features(self) -> Dict:
        """Create temporal features"""
        from datetime import datetime
        
        temporal = {}
        now = datetime.now()
        
        # Time of year features
        temporal['day_of_year'] = now.timetuple().tm_yday
        temporal['month_sin'] = np.sin(2 * np.pi * now.month / 12)
        temporal['month_cos'] = np.cos(2 * np.pi * now.month / 12)
        
        # Monsoon season indicator
        temporal['is_monsoon'] = 1 if 6 <= now.month <= 9 else 0
        
        # Hour of day (for diurnal patterns)
        temporal['hour_sin'] = np.sin(2 * np.pi * now.hour / 24)
        temporal['hour_cos'] = np.cos(2 * np.pi * now.hour / 24)
        
        return temporal
    
    def _create_spatial_features(self, features: Dict) -> Dict:
        """Create spatial features"""
        spatial = {}
        
        # Distance to water normalized
        if 'water_distance_m' in features:
            spatial['water_proximity'] = 1 / (features['water_distance_m'] + 1)
        
        # Elevation ratio (relative to region)
        if 'elevation_m' in features:
            # Rajasthan average elevation ~ 300m
            spatial['elevation_ratio'] = features['elevation_m'] / 300
        
        # Slope position index
        if 'slope_deg' in features and 'curvature' in features:
            spatial['slope_position'] = features['slope_deg'] * (features['curvature'] + 10)
        
        return spatial
    
    def _create_composite_indices(self, features: Dict) -> Dict:
        """Create composite flood susceptibility indices"""
        indices = {}
        
        # Flood Susceptibility Index (FSI)
        fsi_components = []
        
        if 'rainfall_mm' in features:
            fsi_components.append(min(1.0, features['rainfall_mm'] / 100))
        
        if 'soil_saturation' in features:
            fsi_components.append(features['soil_saturation'] / 100)
        
        if 'elevation_m' in features:
            fsi_components.append(1 - min(1.0, features['elevation_m'] / 1000))
        
        if 'slope_deg' in features:
            fsi_components.append(1 - min(1.0, features['slope_deg'] / 30))
        
        if fsi_components:
            indices['flood_susceptibility_index'] = np.mean(fsi_components)
        
        # Urban Flood Risk Index (UFRI)
        if 'builtup_percentage' in features and 'drainage_density' in features:
            indices['urban_flood_risk_index'] = (
                features['builtup_percentage'] / 50 *
                (1 / (features['drainage_density'] + 0.1))
            )
        
        # Rapid Response Flood Index (RRFI)
        if 'rainfall_mm' in features and 'flow_accumulation' in features:
            indices['rapid_response_index'] = (
                features['rainfall_mm'] *
                np.log1p(features['flow_accumulation']) / 100
            )
        
        return indices
    
    def get_feature_categories(self) -> Dict[str, List[str]]:
        """Get categorized feature list"""
        return {
            'meteorological': ['rainfall_mm', 'rainfall_24h', 'humidity_percent', 
                              'temperature_c', 'wind_speed', 'pressure_hpa'],
            'topographic': ['slope_deg', 'elevation_m', 'curvature', 
                           'flow_accumulation', 'drainage_density'],
            'hydrological': ['soil_saturation', 'water_distance_m', 
                            'topographic_wetness_index', 'stream_power_index'],
            'land_use': ['ndvi', 'builtup_percentage', 'soil_type_factor'],
            'temporal': ['day_of_year', 'month_sin', 'month_cos', 'is_monsoon'],
            'composite': ['flood_susceptibility_index', 'urban_flood_risk_index', 
                         'rapid_response_index']
        }