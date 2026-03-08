"""
physics_engine.py - Advanced Machine Learning Flood Prediction Engine
Combines RandomForest, XGBoost, and Neural Networks for ensemble prediction
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd
import joblib
import pickle
import json
import warnings
warnings.filterwarnings('ignore')

from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import logging

# ML Libraries
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

import xgboost as xgb
import lightgbm as lgb

# TensorFlow imports with fallback
TF_AVAILABLE = False
print("Warning: TensorFlow imports bypassed to prevent boot-hanging on Windows.")

# Custom imports with fallbacks
try:
    from config import Config
except ImportError:
    class Config:
        MODEL_DIR = "models"
        DATA_DIR = "data"

try:
    from real_data_integration import NASAIntegration, OpenWeatherIntegration
except ImportError:
    class NASAIntegration:
        def __init__(self): pass
        def fetch_data(self): return {}
    class OpenWeatherIntegration:
        def __init__(self): pass
        def fetch_data(self): return {}

try:
    from bhuvan_integration import ISROBhuvanIntegration
except ImportError:
    class ISROBhuvanIntegration:
        def __init__(self): pass
        def fetch_terrain(self): return {}

try:
    from advanced_physics import D8Hydrology
except ImportError:
    class D8Hydrology:
        def __init__(self): pass
        def calculate_flow(self): return {}

try:
    from ml_pipeline.feature_engineering import FloodFeatureEngineer
except ImportError:
    class FloodFeatureEngineer:
        def __init__(self):
            pass
        
        def engineer_features(self, data):
            return data

logger = logging.getLogger(__name__)

class ModelType(Enum):
    """Supported ML model types"""
    RANDOM_FOREST = "random_forest"
    XGBOOST = "xgboost"
    LIGHTGBM = "lightgbm"
    NEURAL_NETWORK = "neural_network"
    ENSEMBLE = "ensemble"
    GRADIENT_BOOSTING = "gradient_boosting"

@dataclass
class PredictionResult:
    """Structured prediction result"""
    risk_score: float
    water_depth_mm: float
    confidence: float
    risk_category: str
    contributing_factors: List[str]
    model_used: str
    timestamp: datetime
    features: Dict[str, float]

class AdvancedFloodML:
    """
    Professional Machine Learning System for Flood Prediction
    Ensemble of multiple models with automated retraining and monitoring
    """
    
    def __init__(self, model_dir: str = 'models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize models
        self.models = {}
        self.scaler = RobustScaler()
        self.feature_encoder = None
        self.feature_importance = {}
        
        # Feature configuration
        self.feature_config = {
            'core_features': [
                'rainfall_mm', 'rainfall_24h', 'humidity_percent',
                'temperature_c', 'wind_speed', 'pressure_hpa',
                'slope_deg', 'elevation_m', 'curvature',
                'flow_accumulation', 'soil_saturation',
                'ndvi', 'builtup_percentage', 'water_distance_m',
                'soil_type_factor', 'drainage_density'
            ],
            'derived_features': [
                'rainfall_intensity', 'soil_moisture_index',
                'topographic_wetness', 'runoff_coefficient',
                'flood_susceptibility_index'
            ]
        }
        # ... (Keep your existing imports at the top) ...


        
        # Model hyperparameters
        self.hyperparameters = {
            'random_forest': {
                'n_estimators': 200,
                'max_depth': 15,
                'min_samples_split': 5,
                'min_samples_leaf': 2,
                'max_features': 'sqrt',
                'random_state': 42
            },
            'xgboost': {
                'n_estimators': 300,
                'max_depth': 8,
                'learning_rate': 0.05,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'random_state': 42
            },
            'lightgbm': {
                'n_estimators': 300,
                'max_depth': 7,
                'learning_rate': 0.05,
                'num_leaves': 31,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'random_state': 42
            }
        }
        
        # API Integrations (with fallbacks)
        try:
            self.nasa = NASAIntegration()
            self.weather = OpenWeatherIntegration()
            self.bhuvan = ISROBhuvanIntegration()
            self.hydrology = D8Hydrology()
            self.feature_engineer = FloodFeatureEngineer()
        except:
            self.nasa = NASAIntegration()
            self.weather = OpenWeatherIntegration()
            self.bhuvan = ISROBhuvanIntegration()
            self.hydrology = D8Hydrology()
            self.feature_engineer = FloodFeatureEngineer()
        
        # Model metadata
        self.metadata = {
            'version': '3.0.0',
            'ensemble_weights': {'rf': 0.3, 'xgb': 0.3, 'lgb': 0.2, 'nn': 0.2},
            'last_trained': None,
            'performance_metrics': {},
            'feature_importance': {}
        }
        
        # Monitoring
        self.prediction_history = []
        self.performance_history = []
        self.feature_names = []
        
        # Load or train models
        self._initialize_models()
        
        logger.info(f"AdvancedFloodML v{self.metadata['version']} initialized")
    
    def _initialize_models(self):
        """Initialize or load ML models"""
        try:
            self._load_saved_models()
            logger.info("ML models loaded from storage")
        except Exception as e:
            logger.warning(f"Could not load models: {e}. Training new models...")
            self.train_models()
    
    def train_models(self, retrain: bool = False):
        """
        Train all ML models with enhanced feature engineering
        
        Args:
            retrain: Force retraining even if models exist
        """
        if not retrain and all(m in self.models for m in ['rf', 'xgb', 'lgb', 'nn']):
            logger.info("Models already trained. Use retrain=True to force retraining")
            return
        
        logger.info("Starting model training pipeline...")
        
        # Step 1: Prepare training data
        X_train, X_test, y_train, y_test = self._prepare_training_data()
        
        # Step 2: Train individual models
        logger.info("Training Random Forest...")
        self.models['rf'] = self._train_random_forest(X_train, y_train)
        
        logger.info("Training XGBoost...")
        self.models['xgb'] = self._train_xgboost(X_train, y_train)
        
        logger.info("Training LightGBM...")
        self.models['lgb'] = self._train_lightgbm(X_train, y_train)
        
        # Step 3: Train Neural Network if TensorFlow available
        if TF_AVAILABLE:
            logger.info("Training Neural Network...")
            self.models['nn'] = self._train_neural_network(X_train, y_train)
        else:
            logger.warning("TensorFlow not available. Skipping Neural Network training.")
            self.models['nn'] = None
        
        # Step 4: Create ensemble
        self.models['ensemble'] = self._create_ensemble()
        
        # Step 5: Evaluate models
        self._evaluate_models(X_test, y_test)
        
        # Step 6: Calculate feature importance
        self._calculate_feature_importance(X_train)
        
        # Step 7: Save models
        self._save_models()
        
        logger.info("Model training completed successfully")
    
    def _prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data from historical and synthetic sources"""
        # Generate synthetic data
        synthetic_data = self._generate_synthetic_data(n_samples=5000)
        
        # Feature engineering
        X = synthetic_data.drop(['water_depth_mm', 'flood_occurred'], axis=1)
        y_depth = synthetic_data['water_depth_mm']
        y_occurrence = synthetic_data['flood_occurred']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_depth, test_size=0.2, random_state=42, stratify=y_occurrence
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Save feature names
        self.feature_names = X.columns.tolist()
        
        return X_train_scaled, X_test_scaled, y_train.values, y_test.values
    
    def _generate_synthetic_data(self, n_samples: int = 10000) -> pd.DataFrame:
        """Generate synthetic training data with realistic distributions"""
        logger.info(f"Generating {n_samples} synthetic training samples")
        
        np.random.seed(42)
        
        # Define realistic value ranges for Rajasthan
        feature_ranges = {
            'rainfall_mm': (0, 150, 'exponential'),
            'rainfall_24h': (0, 120, 'exponential'),
            'humidity_percent': (20, 95, 'normal'),
            'temperature_c': (15, 45, 'normal'),
            'wind_speed': (0, 20, 'exponential'),
            'pressure_hpa': (1000, 1020, 'normal'),
            'slope_deg': (0, 30, 'beta'),
            'elevation_m': (100, 1000, 'normal'),
            'curvature': (-10, 10, 'normal'),
            'flow_accumulation': (100, 5000, 'lognormal'),
            'soil_saturation': (10, 100, 'beta'),
            'ndvi': (0, 0.8, 'beta'),
            'builtup_percentage': (0, 60, 'beta'),
            'water_distance_m': (50, 5000, 'lognormal'),
            'soil_type_factor': [0.3, 0.5, 0.7, 0.9, 1.0],
            'drainage_density': (0, 5, 'beta')
        }
        
        # Generate features
        data = {}
        for feature, params in feature_ranges.items():
            if isinstance(params, list):  # Categorical
                data[feature] = np.random.choice(params, n_samples)
            else:
                min_val, max_val, dist_type = params
                if dist_type == 'normal':
                    mean = (min_val + max_val) / 2
                    std = (max_val - min_val) / 6
                    data[feature] = np.random.normal(mean, std, n_samples)
                elif dist_type == 'exponential':
                    scale = (max_val - min_val) / 3
                    data[feature] = np.random.exponential(scale, n_samples) + min_val
                elif dist_type == 'beta':
                    data[feature] = np.random.beta(2, 2, n_samples) * (max_val - min_val) + min_val
                elif dist_type == 'lognormal':
                    data[feature] = np.random.lognormal(np.log((min_val + max_val) / 2), 0.5, n_samples)
        
        df = pd.DataFrame(data)
        
        # Generate realistic water depth based on features
        df['water_depth_mm'] = self._calculate_synthetic_water_depth(df)
        
        # Generate flood occurrence (1 if water depth > threshold)
        df['flood_occurred'] = (df['water_depth_mm'] > 100).astype(int)
        
        # Clip unrealistic values
        df['water_depth_mm'] = np.clip(df['water_depth_mm'], 0, 500)
        
        return df
    
    def _calculate_synthetic_water_depth(self, df: pd.DataFrame) -> np.ndarray:
        """Calculate realistic water depth from features"""
        # Physical model for water depth
        water_depth = (
            df['rainfall_mm'] * 0.5 +
            df['rainfall_24h'] * 0.3 +
            df['soil_saturation'] * 0.2 +
            (1 - df['elevation_m'] / 1000) * 100 +
            df['flow_accumulation'] * 0.01 +
            np.random.exponential(20, len(df))
        )
        
        # Adjust based on other factors
        water_depth *= (1 + df['builtup_percentage'] / 200)  # Urban areas
        water_depth *= (1 - df['slope_deg'] / 100)  # Steeper slopes drain faster
        water_depth *= df['soil_type_factor']  # Soil type affects infiltration
        
        return water_depth
    
    def _train_random_forest(self, X_train: np.ndarray, y_train: np.ndarray) -> RandomForestRegressor:
        """Train Random Forest model"""
        model = RandomForestRegressor(
            **self.hyperparameters['random_forest'],
            n_jobs=-1,
            verbose=0
        )
        model.fit(X_train, y_train)
        return model
    
    def _train_xgboost(self, X_train: np.ndarray, y_train: np.ndarray) -> xgb.XGBRegressor:
        """Train XGBoost model"""
        model = xgb.XGBRegressor(
            **self.hyperparameters['xgboost'],
            n_jobs=-1,
            verbosity=0
        )
        model.fit(X_train, y_train)
        return model
    
    def _train_lightgbm(self, X_train: np.ndarray, y_train: np.ndarray) -> lgb.LGBMRegressor:
        """Train LightGBM model"""
        model = lgb.LGBMRegressor(
            **self.hyperparameters['lightgbm'],
            n_jobs=-1,
            verbose=-1
        )
        model.fit(X_train, y_train)
        return model
    
    def _train_neural_network(self, X_train: np.ndarray, y_train: np.ndarray) -> Union[Model, None]:
        """Train Neural Network model"""
        if not TF_AVAILABLE:
            return None
        
        n_features = X_train.shape[1]
        
        model = Sequential([
            Input(shape=(n_features,)),
            Dense(128, activation='relu'),
            BatchNormalization(),
            Dropout(0.3),
            Dense(64, activation='relu'),
            BatchNormalization(),
            Dropout(0.3),
            Dense(32, activation='relu'),
            Dense(1, activation='linear')
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        # Callbacks
        callbacks = [
            EarlyStopping(patience=20, restore_best_weights=True),
            ModelCheckpoint(
                os.path.join(self.model_dir, 'best_nn_model.h5'),
                save_best_only=True
            )
        ]
        
        # Train
        model.fit(
            X_train, y_train,
            epochs=50,
            batch_size=32,
            validation_split=0.2,
            callbacks=callbacks,
            verbose=0
        )
        
        return model
    
    def _create_ensemble(self) -> VotingRegressor:
        """Create ensemble of models"""
        estimators = []
        if 'rf' in self.models:
            estimators.append(('rf', self.models['rf']))
        if 'xgb' in self.models:
            estimators.append(('xgb', self.models['xgb']))
        if 'lgb' in self.models:
            estimators.append(('lgb', self.models['lgb']))
        
        if estimators:
            ensemble = VotingRegressor(estimators=estimators, weights=[0.4, 0.3, 0.3])
            return ensemble
        return None
    
    def _evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray):
        """Evaluate all models and update performance metrics"""
        metrics = {}
        
        for name, model in self.models.items():
            if model is None:
                continue
                
            if name == 'ensemble':
                # Ensemble predictions
                predictions = []
                weights = []
                if 'rf' in self.models and self.models['rf'] is not None:
                    predictions.append(self.models['rf'].predict(X_test))
                    weights.append(0.4)
                if 'xgb' in self.models and self.models['xgb'] is not None:
                    predictions.append(self.models['xgb'].predict(X_test))
                    weights.append(0.3)
                if 'lgb' in self.models and self.models['lgb'] is not None:
                    predictions.append(self.models['lgb'].predict(X_test))
                    weights.append(0.3)
                
                if predictions:
                    weights = np.array(weights) / sum(weights)
                    y_pred = sum(w * p for w, p in zip(weights, predictions))
                else:
                    continue
            elif name == 'nn' and TF_AVAILABLE:
                y_pred = model.predict(X_test).flatten()
            else:
                y_pred = model.predict(X_test)
            
            # Calculate metrics
            metrics[name] = {
                'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred))),
                'mae': float(mean_absolute_error(y_test, y_pred)),
                'r2': float(r2_score(y_test, y_pred)),
                'explained_variance': float(np.var(y_pred) / np.var(y_test) if np.var(y_test) > 0 else 0)
            }
        
        self.metadata['performance_metrics'] = metrics
        self.metadata['last_trained'] = datetime.now().isoformat()
        
        # Log best model
        if metrics:
            best_model = min(
                metrics.items(),
                key=lambda x: x[1]['rmse']
            )
            logger.info(f"Best model: {best_model[0]} with RMSE: {best_model[1]['rmse']:.2f}")
    
    def _calculate_feature_importance(self, X_train: np.ndarray):
        """Calculate and store feature importance"""
        # Use Random Forest feature importance
        if 'rf' in self.models and self.models['rf'] is not None:
            importances = self.models['rf'].feature_importances_
            self.feature_importance = dict(zip(self.feature_names, importances))
            
            # Sort by importance
            self.feature_importance = dict(sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            ))
            
            # Store in metadata
            self.metadata['feature_importance'] = {
                k: float(v) for k, v in list(self.feature_importance.items())[:10]
            }
            
            logger.info("Top 5 important features:")
            for feature, importance in list(self.feature_importance.items())[:5]:
                logger.info(f"  {feature}: {importance:.3f}")
    
    def predict(self, features: Dict[str, float]) -> PredictionResult:
        """
        Make flood prediction using ensemble of models
        
        Args:
            features: Dictionary of feature values
            
        Returns:
            PredictionResult object
        """
        # Prepare features
        feature_vector = self._prepare_feature_vector(features)
        
        # Make predictions with all models
        predictions = {}
        
        for name, model in self.models.items():
            if model is None:
                continue
                
            try:
                if name == 'nn' and TF_AVAILABLE:
                    # Neural network expects 2D array
                    pred = model.predict(feature_vector.reshape(1, -1))[0][0]
                else:
                    pred = model.predict(feature_vector.reshape(1, -1))[0]
                predictions[name] = float(pred)
            except Exception as e:
                logger.error(f"Error predicting with {name}: {e}")
                continue
        
        # Ensemble prediction (weighted average)
        if predictions:
            weights = self.metadata['ensemble_weights']
            total_weight = 0
            ensemble_pred = 0
            
            for name, pred in predictions.items():
                weight = weights.get(name, 0)
                ensemble_pred += weight * pred
                total_weight += weight
            
            if total_weight > 0:
                ensemble_pred /= total_weight
            else:
                ensemble_pred = sum(predictions.values()) / len(predictions)
        else:
            # Fallback prediction
            ensemble_pred = 50.0  # Default fallback
        
        # Calculate risk score (normalize water depth to 0-1)
        water_depth_mm = max(0, ensemble_pred)
        risk_score = self._calculate_risk_score(water_depth_mm, features)
        
        # Determine risk category
        risk_category = self._determine_risk_category(risk_score)
        
        # Calculate confidence (agreement between models)
        confidence = self._calculate_prediction_confidence(predictions)
        
        # Identify contributing factors
        contributing_factors = self._identify_contributing_factors(features)
        
        # Create result
        result = PredictionResult(
            risk_score=risk_score,
            water_depth_mm=water_depth_mm,
            confidence=confidence,
            risk_category=risk_category,
            contributing_factors=contributing_factors,
            model_used='ensemble',
            timestamp=datetime.now(),
            features=features
        )
        
        # Log prediction
        self._log_prediction(result)
        
        return result
    
    def _prepare_feature_vector(self, features: Dict[str, float]) -> np.ndarray:
        """Prepare feature vector for prediction"""
        if not self.feature_names:
            self.feature_names = list(features.keys())
        
        # Ensure all required features are present
        feature_vector = []
        missing_features = []
        
        for feature in self.feature_names:
            if feature in features:
                feature_vector.append(features[feature])
            else:
                # Use median or default value
                default_value = self._get_feature_default(feature)
                feature_vector.append(default_value)
                missing_features.append(feature)
        
        if missing_features:
            logger.warning(f"Missing features: {missing_features}. Using default values.")
        
        # Scale features
        feature_vector = np.array(feature_vector)
        if hasattr(self.scaler, 'scale_') and self.scaler.scale_ is not None:
            feature_vector = self.scaler.transform(feature_vector.reshape(1, -1)).flatten()
        
        return feature_vector
    
    def _get_feature_default(self, feature: str) -> float:
        """Get default value for a feature"""
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
        return defaults.get(feature, 0)
    
    def _calculate_risk_score(self, water_depth: float, features: Dict) -> float:
        """Calculate comprehensive risk score (0-1)"""
        # Physical risk factors
        rainfall_factor = min(1.0, features.get('rainfall_mm', 0) / 100)
        soil_factor = features.get('soil_saturation', 50) / 100
        elevation_factor = max(0, 1 - (features.get('elevation_m', 250) / 1000))
        slope_factor = max(0, 1 - (features.get('slope_deg', 5) / 30))
        urban_factor = min(1.0, features.get('builtup_percentage', 0) / 50)
        
        # Weighted risk calculation
        weights = {
            'water_depth': 0.3,
            'rainfall': 0.25,
            'soil': 0.15,
            'elevation': 0.1,
            'slope': 0.1,
            'urban': 0.1
        }
        
        risk_score = (
            min(1.0, water_depth / 500) * weights['water_depth'] +
            rainfall_factor * weights['rainfall'] +
            soil_factor * weights['soil'] +
            elevation_factor * weights['elevation'] +
            slope_factor * weights['slope'] +
            urban_factor * weights['urban']
        )
        
        return min(1.0, max(0.0, risk_score))
    
    def _determine_risk_category(self, risk_score: float) -> str:
        """Determine risk category based on score"""
        if risk_score >= 0.8:
            return "EXTREME"
        elif risk_score >= 0.6:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MODERATE"
        elif risk_score >= 0.2:
            return "LOW"
        else:
            return "MINIMAL"
    
    def _calculate_prediction_confidence(self, predictions: Dict[str, float]) -> float:
        """Calculate confidence based on model agreement"""
        if not predictions:
            return 0.5
        
        values = list(predictions.values())
        if len(values) <= 1:
            return 0.5
        
        # Confidence is inverse of standard deviation
        std_dev = np.std(values)
        mean_val = np.mean(values)
        
        if mean_val == 0:
            return 0.5
        
        cv = std_dev / mean_val if mean_val != 0 else 1.0
        confidence = 1.0 - min(cv, 1.0)
        
        return max(0.3, min(1.0, confidence))
    
    def _identify_contributing_factors(self, features: Dict) -> List[str]:
        """Identify top factors contributing to flood risk"""
        factors = []
        
        # Check each feature against thresholds
        if features.get('rainfall_mm', 0) > 50:
            factors.append(f"Heavy rainfall ({features['rainfall_mm']:.1f} mm)")
        
        if features.get('soil_saturation', 0) > 80:
            factors.append(f"High soil saturation ({features['soil_saturation']:.0f}%)")
        
        if features.get('builtup_percentage', 0) > 40:
            factors.append(f"Urban area ({features['builtup_percentage']:.0f}% built-up)")
        
        if features.get('elevation_m', 250) < 200:
            factors.append(f"Low elevation ({features['elevation_m']:.0f} m)")
        
        if features.get('slope_deg', 5) < 3:
            factors.append("Flat terrain (poor drainage)")
        
        # Add feature importance based factors
        if self.feature_importance:
            important_features = list(self.feature_importance.keys())[:3]
            for feature in important_features:
                if feature in features:
                    value = features[feature]
                    if feature == 'rainfall_mm' and value > 30:
                        factors.append(f"High {feature.replace('_', ' ')}: {value:.1f}")
                    elif feature == 'flow_accumulation' and value > 1000:
                        factors.append(f"High {feature.replace('_', ' ')}: {value:.0f}")
        
        return factors[:5]  # Return top 5 factors
    
    def _log_prediction(self, result: PredictionResult):
        """Log prediction for monitoring and retraining"""
        log_entry = {
            'timestamp': result.timestamp.isoformat(),
            'risk_score': result.risk_score,
            'water_depth_mm': result.water_depth_mm,
            'confidence': result.confidence,
            'risk_category': result.risk_category,
            'model_used': result.model_used,
            'features': result.features
        }
        
        self.prediction_history.append(log_entry)
        
        # Keep only recent history
        if len(self.prediction_history) > 1000:
            self.prediction_history = self.prediction_history[-1000:]
    
    def _save_models(self):
        """Save all models and metadata"""
        # Save individual models
        for name, model in self.models.items():
            if model is None:
                continue
                
            try:
                if name == 'nn' and TF_AVAILABLE:
                    model_path = os.path.join(self.model_dir, f'{name}_model.h5')
                    model.save(model_path)
                else:
                    model_path = os.path.join(self.model_dir, f'{name}_model.pkl')
                    joblib.dump(model, model_path)
            except Exception as e:
                logger.error(f"Error saving model {name}: {e}")
        
        # Save scaler
        try:
            scaler_path = os.path.join(self.model_dir, 'feature_scaler.pkl')
            joblib.dump(self.scaler, scaler_path)
        except Exception as e:
            logger.error(f"Error saving scaler: {e}")
        
        # Save metadata
        try:
            metadata_path = os.path.join(self.model_dir, 'model_metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(self.metadata, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
        
        # Save feature importance
        try:
            importance_path = os.path.join(self.model_dir, 'feature_importance.json')
            with open(importance_path, 'w') as f:
                json.dump(self.feature_importance, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving feature importance: {e}")
        
        logger.info(f"Models saved to {self.model_dir}")
    
    def _load_saved_models(self):
        """Load saved models from disk"""
        # Load metadata
        metadata_path = os.path.join(self.model_dir, 'model_metadata.json')
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metadata: {e}")
        
        # Load scaler
        scaler_path = os.path.join(self.model_dir, 'feature_scaler.pkl')
        if os.path.exists(scaler_path):
            try:
                loaded_scaler = joblib.load(scaler_path)
                # Verify scaler was actually fitted before using it
                if hasattr(loaded_scaler, 'scale_') and loaded_scaler.scale_ is not None:
                    self.scaler = loaded_scaler
                else:
                    logger.warning("Scaler file loaded but not fitted — using fresh scaler")
            except Exception as e:
                logger.error(f"Error loading scaler: {e}")
        
        # Load feature importance
        importance_path = os.path.join(self.model_dir, 'feature_importance.json')
        if os.path.exists(importance_path):
            try:
                with open(importance_path, 'r') as f:
                    self.feature_importance = json.load(f)
            except Exception as e:
                logger.error(f"Error loading feature importance: {e}")
        
        # Load models
        model_files = {
            'rf': 'rf_model.pkl',
            'xgb': 'xgb_model.pkl',
            'lgb': 'lgb_model.pkl',
            'nn': 'nn_model.h5'
        }
        
        for name, filename in model_files.items():
            model_path = os.path.join(self.model_dir, filename)
            if os.path.exists(model_path):
                try:
                    if name == 'nn' and TF_AVAILABLE:
                        self.models[name] = load_model(model_path)
                    else:
                        self.models[name] = joblib.load(model_path)
                except Exception as e:
                    logger.error(f"Error loading model {name}. Bypassing invalid weights: {e}")
                    self.models[name] = None
        
        # Recreate ensemble
        if all(m in self.models for m in ['rf', 'xgb', 'lgb']):
            self.models['ensemble'] = self._create_ensemble()
    
    def get_model_info(self) -> Dict:
        """Get model information and statistics"""
        return {
            'status': 'ready' if self.models else 'not_trained',
            'metadata': self.metadata,
            'models_loaded': list(self.models.keys()),
            'feature_count': len(self.feature_names) if hasattr(self, 'feature_names') else 0,
            'prediction_history_count': len(self.prediction_history),
            'feature_importance_top5': dict(list(self.feature_importance.items())[:5]) if self.feature_importance else {}
        }
    
    def retrain_if_needed(self, performance_threshold: float = 0.7) -> bool:
        """
        Check if retraining is needed based on performance degradation
        
        Args:
            performance_threshold: Minimum acceptable R² score
        """
        # For now, retrain periodically
        last_trained_str = self.metadata.get('last_trained')
        if last_trained_str:
            try:
                last_trained = datetime.fromisoformat(last_trained_str.replace('Z', '+00:00'))
                days_since_training = (datetime.now() - last_trained).days
                
                if days_since_training > 30:  # Retrain every 30 days
                    logger.info(f"Retraining models (last trained {days_since_training} days ago)")
                    self.train_models(retrain=True)
                    return True
            except Exception as e:
                logger.error(f"Error checking retraining need: {e}")
        
        return False

    def generate_village_risk(self, village_data: Dict) -> Dict:
        """Generate village-level risk assessment"""
        prediction = self.predict(village_data)
        
        return {
            'village_name': village_data.get('village_name', 'Unknown'),
            'risk_score': prediction.risk_score,
            'water_depth_cm': prediction.water_depth_mm / 10,
            'risk_category': prediction.risk_category,
            'confidence': prediction.confidence,
            'recommended_action': self._get_recommended_action(prediction.risk_category),
            'contributing_factors': prediction.contributing_factors,
            'timestamp': prediction.timestamp.isoformat()
        }
    
    def _get_recommended_action(self, risk_category: str) -> str:
        """Get recommended action based on risk category"""
        actions = {
            'EXTREME': 'IMMEDIATE EVACUATION: Move to higher ground immediately',
            'HIGH': 'PREPARE TO EVACUATE: Gather essential items and monitor water levels',
            'MODERATE': 'STAY ALERT: Monitor local conditions, avoid low-lying areas',
            'LOW': 'STAY INFORMED: Keep updated with weather forecasts',
            'MINIMAL': 'NORMAL ACTIVITIES: No immediate threat detected'
        }
        return actions.get(risk_category, 'Stay informed')


# Global instance for easy import
_ml_engine = None

def get_ml_engine() -> AdvancedFloodML:
    """Singleton pattern to get ML engine instance"""
    global _ml_engine
    if _ml_engine is None:
        _ml_engine = AdvancedFloodML()
    return _ml_engine

def predict_flood_risk(features: Dict) -> float:
    """
    Backward compatibility function
    Used by existing code to get risk score
    """
    try:
        ml_engine = get_ml_engine()
        result = ml_engine.predict(features)
        return result.risk_score
    except Exception as e:
        print(f"Error in predict_flood_risk: {e}")
        # Fallback to simple calculation
        rainfall = features.get('rainfall_mm', 0)
        if rainfall > 50:
            return 0.8
        elif rainfall > 30:
            return 0.5
        elif rainfall > 10:
            return 0.3
        else:
            return 0.1


# For backward compatibility with existing code
FloodPredictor = AdvancedFloodML


if __name__ == "__main__":
    print("[*] Testing Advanced Flood ML Engine...")
    
    # Initialize engine
    engine = AdvancedFloodML()
    
    # Get model info
    info = engine.get_model_info()
    print(f"Model Status: {info['status']}")
    print(f"Models Loaded: {info['models_loaded']}")
    
    # Test prediction
    print("\n[*] Testing prediction...")
    test_features = {
        'rainfall_mm': 45.2,
        'rainfall_24h': 60.5,
        'humidity_percent': 85.3,
        'temperature_c': 28.7,
        'wind_speed': 12.3,
        'pressure_hpa': 1012.5,
        'slope_deg': 8.2,
        'elevation_m': 245.6,
        'curvature': -2.1,
        'flow_accumulation': 1250.8,
        'soil_saturation': 78.9,
        'ndvi': 0.45,
        'builtup_percentage': 35.2,
        'water_distance_m': 850.3,
        'soil_type_factor': 0.8,
        'drainage_density': 2.3
    }
    
    try:
        result = engine.predict(test_features)
        print(f"[OK] Risk Score: {result.risk_score:.3f}")
        print(f"[OK] Risk Category: {result.risk_category}")
        print(f"[OK] Water Depth: {result.water_depth_mm:.1f} mm")
        print(f"[OK] Confidence: {result.confidence:.2f}")
        print(f"[OK] Contributing Factors: {result.contributing_factors}")
    except Exception as e:
        print(f"[ERROR] Prediction error: {e}")
    
    print("\n[OK] Advanced ML Engine test completed!")