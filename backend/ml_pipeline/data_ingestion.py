"""
ML Pipeline - Data Ingestion Module
Collects and prepares data for model training
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
import asyncio
from pathlib import Path

from real_data_integration import DataIntegration
from advanced_physics import D8Hydrology
from config import get_config

config = get_config()
logger = logging.getLogger(__name__)

class DataIngestionPipeline:
    """
    Data ingestion pipeline for collecting training data
    """
    
    def __init__(self):
        """Initialize data ingestion pipeline"""
        self.d8 = D8Hydrology()
        self.data_integration = DataIntegration()
        self.data_dir = Path(config.DATA_DIR) / 'ml_datasets'
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    async def collect_training_data(self, locations: List[Dict[str, float]],
                                   days_back: int = 30) -> pd.DataFrame:
        """
        Collect training data from multiple sources
        
        Args:
            locations: List of {'lat': float, 'lon': float, 'name': str}
            days_back: Number of days of historical data to collect
            
        Returns:
            DataFrame with training data
        """
        logger.info(f"Collecting training data for {len(locations)} locations")
        
        all_data = []
        
        for location in locations:
            try:
                location_data = await self._collect_location_data(
                    location['lat'],
                    location['lon'],
                    location.get('name', 'unknown'),
                    days_back
                )
                
                if location_data is not None:
                    all_data.append(location_data)
                    
            except Exception as e:
                logger.error(f"Error collecting data for {location}: {str(e)}")
        
        if not all_data:
            logger.warning("No data collected")
            return pd.DataFrame()
        
        # Combine all data
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Save to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = self.data_dir / f'training_data_{timestamp}.csv'
        combined_df.to_csv(output_file, index=False)
        
        logger.info(f"Training data saved to {output_file}")
        logger.info(f"Collected {len(combined_df)} samples")
        
        return combined_df
    
    async def _collect_location_data(self, lat: float, lon: float,
                                    location_name: str,
                                    days_back: int) -> Optional[pd.DataFrame]:
        """
        Collect data for a single location
        
        Args:
            lat: Latitude
            lon: Longitude
            location_name: Name of location
            days_back: Days of historical data
            
        Returns:
            DataFrame with location data
        """
        try:
            # Extract terrain features
            terrain_features = self._extract_terrain_features(lat, lon)
            
            # Get historical rainfall data (simulated)
            rainfall_data = await self._simulate_historical_rainfall(lat, lon, days_back)
            
            # Combine data
            location_data = []
            
            for rain_event in rainfall_data:
                # Create feature vector
                features = {
                    **terrain_features,
                    'rainfall_mm': rain_event['rainfall_mm'],
                    'antecedent_moisture': rain_event['antecedent_moisture'],
                    'soil_moisture': rain_event['soil_moisture'],
                    'location_name': location_name,
                    'latitude': lat,
                    'longitude': lon,
                    'timestamp': rain_event['timestamp']
                }
                
                # Simulate flood depth (would be real data in production)
                flood_depth = self._simulate_flood_depth(features)
                features['flood_depth_cm'] = flood_depth
                
                location_data.append(features)
            
            return pd.DataFrame(location_data)
            
        except Exception as e:
            logger.error(f"Error collecting location data: {str(e)}")
            return None
    
    def _extract_terrain_features(self, lat: float, lon: float) -> Dict[str, float]:
        """Extract terrain features using D8 hydrology"""
        try:
            # Get cell coordinates
            row, col = self.d8.get_cell_coordinates(lat, lon)
            
            # Calculate features
            if not hasattr(self.d8, 'slope'):
                self.d8.process_complete(save_results=False)
            
            features = {
                'slope_degrees': float(self.d8.slope[row, col]),
                'flow_accumulation': float(np.log1p(self.d8.flow_accumulation[row, col])),
                'distance_to_sink': float(self.d8._calculate_distance_to_sink(row, col)),
                'sink_depth': float(self.d8._get_sink_depth(row, col)),
                'aspect_degrees': float(self.d8.aspect[row, col]) if hasattr(self.d8, 'aspect') else 0,
                'elevation_m': float(self.d8.dem[row, col]) if hasattr(self.d8, 'dem') else 0
            }
            
            return features
            
        except Exception as e:
            logger.warning(f"Error extracting terrain features: {str(e)}")
            return {
                'slope_degrees': 2.0,
                'flow_accumulation': 10.0,
                'distance_to_sink': 500.0,
                'sink_depth': 0.0,
                'aspect_degrees': 0.0,
                'elevation_m': 300.0
            }
    
    async def _simulate_historical_rainfall(self, lat: float, lon: float,
                                           days_back: int) -> List[Dict[str, float]]:
        """
        Simulate historical rainfall data
        
        In production, this would fetch from historical APIs
        """
        rainfall_events = []
        
        # Generate synthetic rainfall events
        np.random.seed(int(lat * 100 + lon))
        
        for i in range(days_back * 3):  # ~3 events per day
            # Random rainfall amount (0-100mm)
            rainfall_mm = np.random.exponential(scale=20)
            if rainfall_mm < 5:  # Skip very light rain
                continue
            
            # Random antecedent moisture (0-1)
            antecedent_moisture = np.random.beta(2, 5)
            
            # Soil moisture depends on rainfall and antecedent
            soil_moisture = min(0.9, 0.3 + (rainfall_mm / 100) + antecedent_moisture * 0.3)
            
            # Simulate timestamp
            days_ago = np.random.uniform(0, days_back)
            timestamp = datetime.now() - timedelta(days=days_ago)
            
            rainfall_events.append({
                'rainfall_mm': rainfall_mm,
                'antecedent_moisture': antecedent_moisture,
                'soil_moisture': soil_moisture,
                'timestamp': timestamp.isoformat()
            })
        
        return rainfall_events
    
    def _simulate_flood_depth(self, features: Dict[str, float]) -> float:
        """
        Simulate flood depth based on features
        
        In production, this would use historical flood records
        """
        # Simple physics-based simulation
        rainfall = features['rainfall_mm']
        slope = features['slope_degrees']
        flow_acc = features['flow_accumulation']
        soil_moisture = features['soil_moisture']
        sink_depth = features['sink_depth']
        
        # Base runoff
        runoff_coeff = 0.3 + soil_moisture * 0.4
        runoff = rainfall * runoff_coeff
        
        # Adjust for terrain
        if slope > 0:
            terrain_factor = 1 / (slope + 1)
        else:
            terrain_factor = 1
        
        # Adjust for flow accumulation
        flow_factor = np.log1p(flow_acc) / 10
        
        # Adjust for sink
        sink_factor = 1 + sink_depth * 5
        
        # Calculate flood depth
        flood_depth = runoff * terrain_factor * flow_factor * sink_factor
        
        # Add noise
        noise = np.random.normal(0, flood_depth * 0.2)
        flood_depth = max(0, flood_depth + noise)
        
        return round(flood_depth, 1)
    
    def create_synthetic_dataset(self, num_samples: int = 10000) -> pd.DataFrame:
        """
        Create synthetic training dataset
        
        Args:
            num_samples: Number of samples to generate
            
        Returns:
            Synthetic dataset
        """
        logger.info(f"Creating synthetic dataset with {num_samples} samples")
        
        np.random.seed(42)
        
        data = []
        
        for i in range(num_samples):
            # Generate random features
            features = {
                'rainfall_mm': np.random.exponential(scale=20),
                'slope_degrees': np.random.exponential(scale=5),
                'flow_accumulation': np.random.exponential(scale=10),
                'soil_moisture': np.random.beta(2, 5),
                'antecedent_moisture': np.random.beta(2, 5),
                'distance_to_sink': np.random.exponential(scale=200),
                'sink_depth': np.random.exponential(scale=0.5),
                'aspect_degrees': np.random.uniform(0, 360),
                'elevation_m': np.random.uniform(100, 500),
                'land_use_code': np.random.choice([1, 2, 3, 4, 5])
            }
            
            # Calculate flood depth using physics
            flood_depth = self._simulate_flood_depth(features)
            features['flood_depth_cm'] = flood_depth
            
            data.append(features)
        
        df = pd.DataFrame(data)
        
        # Save synthetic dataset
        output_file = self.data_dir / 'synthetic_training.csv'
        df.to_csv(output_file, index=False)
        
        logger.info(f"Synthetic dataset saved to {output_file}")
        
        return df