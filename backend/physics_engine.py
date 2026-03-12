"""
physics_engine.py - Advanced Machine Learning Flood Prediction Engine
Combines RandomForest, XGBoost, and LightGBM for ensemble prediction.
"""
from __future__ import annotations

import os
import json
import logging
import warnings
import itertools
from collections import deque
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import RobustScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.impute import SimpleImputer

warnings.filterwarnings("ignore")

try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model, Sequential
    from tensorflow.keras.layers import Input, Dense, BatchNormalization, Dropout
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TF_AVAILABLE = True
except Exception as e:
    TF_AVAILABLE = False

try:
    from config import Config
except ImportError:
    class Config:
        MODEL_DIR = "models"
        DATA_DIR  = "data"

try:
    from real_data_integration import NASAIntegration, OpenWeatherIntegration
except ImportError:
    class NASAIntegration:
        def fetch_data(self): return {}
    class OpenWeatherIntegration:
        def fetch_data(self): return {}

try:
    from bhuvan_integration import ISROBhuvanIntegration
except ImportError:
    class ISROBhuvanIntegration:
        def fetch_terrain(self): return {}

try:
    from advanced_physics import D8Hydrology
except ImportError:
    class D8Hydrology:
        def calculate_flow(self): return {}

try:
    from ml_pipeline.feature_engineering import FloodFeatureEngineer
except ImportError:
    class FloodFeatureEngineer:
        def engineer_features(self, data): return data

logger = logging.getLogger(__name__)


class ModelType(Enum):
    RANDOM_FOREST     = "random_forest"
    XGBOOST           = "xgboost"
    LIGHTGBM          = "lightgbm"
    NEURAL_NETWORK    = "neural_network"
    ENSEMBLE          = "ensemble"
    GRADIENT_BOOSTING = "gradient_boosting"


@dataclass
class PredictionResult:
    risk_score:           float
    water_depth_mm:       float
    confidence:           float
    risk_category:        str
    contributing_factors: List[str]
    model_used:           str
    timestamp:            datetime
    features:             Dict[str, float]


class AdvancedFloodML:
    """Ensemble ML system for flood prediction (RF + XGBoost + LightGBM + optional NN)."""

    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        self.models:             Dict[str, Any]   = {}
        self.scaler:             RobustScaler      = RobustScaler()
        self.feature_importance: Dict[str, float] = {}
        self.feature_names:      List[str]         = []

        self.feature_config = {
            "core_features": [
                "rainfall_mm", "rainfall_24h", "humidity_percent",
                "temperature_c", "wind_speed", "pressure_hpa",
                "slope_deg", "elevation_m", "curvature",
                "flow_accumulation", "soil_saturation",
                "ndvi", "builtup_percentage", "water_distance_m",
                "soil_type_factor", "drainage_density",
            ],
            "derived_features": [
                "rainfall_intensity", "soil_moisture_index",
                "topographic_wetness", "runoff_coefficient",
                "flood_susceptibility_index",
            ],
        }

        self.hyperparameters = {
            "random_forest": {
                "n_estimators":    200,
                "max_depth":       15,
                "min_samples_split": 5,
                "min_samples_leaf":  2,
                "max_features":    "sqrt",
                "random_state":    42,
            },
            "xgboost": {
                "n_estimators":    300,
                "max_depth":       8,
                "learning_rate":   0.05,
                "subsample":       0.8,
                "colsample_bytree": 0.8,
                "random_state":    42,
            },
            "lightgbm": {
                "n_estimators":    300,
                "max_depth":       7,
                "learning_rate":   0.05,
                "num_leaves":      31,
                "subsample":       0.8,
                "colsample_bytree": 0.8,
                "random_state":    42,
            },
        }

        self.nasa            = NASAIntegration()
        self.weather         = OpenWeatherIntegration()
        self.bhuvan          = ISROBhuvanIntegration()
        self.hydrology       = D8Hydrology()
        self.feature_engineer = FloodFeatureEngineer()

        self.metadata = {
            "version":          "3.0.0",
            "ensemble_weights": {"rf": 0.4, "xgb": 0.3, "lgb": 0.3},
            "last_trained":     None,
            "performance_metrics": {},
            "feature_importance":  {},
        }

        # Bounded history — prevents unbounded memory growth
        self.prediction_history: deque = deque(maxlen=1000)
        self.performance_history: List = []

        self._initialize_models()
        logger.info(f"AdvancedFloodML v{self.metadata['version']} initialized")

    # ── INIT / TRAIN ──────────────────────────────────────────────────────────

    def _initialize_models(self):
        try:
            self._load_saved_models()
            logger.info("ML models loaded from storage")
        except Exception as e:
            logger.warning(f"Could not load models: {e}. Training new models...")
            self.train_models()

    def train_models(self, retrain: bool = False):
        required = {"rf", "xgb", "lgb"}
        if not retrain and required.issubset(self.models):
            logger.info("Models already trained. Use retrain=True to force retraining.")
            return

        logger.info("Starting model training pipeline...")
        X_train, X_test, y_train, y_test = self._prepare_training_data()

        logger.info("Training Random Forest...")
        self.models["rf"] = self._train_random_forest(X_train, y_train)

        logger.info("Training XGBoost...")
        self.models["xgb"] = self._train_xgboost(X_train, y_train)

        logger.info("Training LightGBM...")
        self.models["lgb"] = self._train_lightgbm(X_train, y_train)

        if TF_AVAILABLE:
            logger.info("Training Neural Network...")
            self.models["nn"] = self._train_neural_network(X_train, y_train)
        else:
            logger.warning("TensorFlow not available — skipping Neural Network.")
            self.models["nn"] = None

        self._evaluate_models(X_test, y_test)
        self._calculate_feature_importance(X_train)
        self._save_models()
        logger.info("Model training completed successfully.")

    # ── DATA PREPARATION ──────────────────────────────────────────────────────

    def _prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        synthetic_data = self._generate_synthetic_data(n_samples=5000)

        X          = synthetic_data.drop(["water_depth_mm", "flood_occurred"], axis=1)
        y_depth    = synthetic_data["water_depth_mm"]
        y_occurred = synthetic_data["flood_occurred"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y_depth, test_size=0.2, random_state=42, stratify=y_occurred
        )

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled  = self.scaler.transform(X_test)
        self.feature_names = X.columns.tolist()

        return X_train_scaled, X_test_scaled, y_train.values, y_test.values

    def _generate_synthetic_data(self, n_samples: int = 10000) -> pd.DataFrame:
        # Guard: never generate fake data in production
        env = os.environ.get("FLASK_ENV", "") or os.environ.get("APP_ENV", "")
        if env.lower() in ("production", "prod"):
            raise RuntimeError(
                "Synthetic data generation is prohibited in production. "
                "Provide a real training dataset."
            )

        logger.info(f"Generating {n_samples} synthetic training samples")
        np.random.seed(42)

        feature_ranges = {
            "rainfall_mm":       (0,   150, "exponential"),
            "rainfall_24h":      (0,   120, "exponential"),
            "humidity_percent":  (20,   95, "normal"),
            "temperature_c":     (15,   45, "normal"),
            "wind_speed":        (0,    20, "exponential"),
            "pressure_hpa":      (1000, 1020, "normal"),
            "slope_deg":         (0,    30, "beta"),
            "elevation_m":       (100, 1000, "normal"),
            "curvature":         (-10,  10, "normal"),
            "flow_accumulation": (100, 5000, "lognormal"),
            "soil_saturation":   (10,  100, "beta"),
            "ndvi":              (0,   0.8, "beta"),
            "builtup_percentage": (0,   60, "beta"),
            "water_distance_m":  (50, 5000, "lognormal"),
            "soil_type_factor":  [0.3, 0.5, 0.7, 0.9, 1.0],
            "drainage_density":  (0,    5, "beta"),
        }

        data: Dict[str, np.ndarray] = {}
        for feature, params in feature_ranges.items():
            if isinstance(params, list):
                data[feature] = np.random.choice(params, n_samples)
            else:
                lo, hi, dist = params
                if dist == "normal":
                    mu  = (lo + hi) / 2
                    sig = (hi - lo) / 6
                    data[feature] = np.random.normal(mu, sig, n_samples)
                elif dist == "exponential":
                    data[feature] = np.random.exponential((hi - lo) / 3, n_samples) + lo
                elif dist == "beta":
                    data[feature] = np.random.beta(2, 2, n_samples) * (hi - lo) + lo
                elif dist == "lognormal":
                    data[feature] = np.random.lognormal(np.log((lo + hi) / 2), 0.5, n_samples)

        df = pd.DataFrame(data)
        df["water_depth_mm"] = np.clip(self._calculate_synthetic_water_depth(df), 0, 500)
        df["flood_occurred"] = (df["water_depth_mm"] > 100).astype(int)
        return df

    def _calculate_synthetic_water_depth(self, df: pd.DataFrame) -> np.ndarray:
        depth = (
            df["rainfall_mm"]      * 0.5
            + df["rainfall_24h"]   * 0.3
            + df["soil_saturation"] * 0.2
            + (1 - df["elevation_m"] / 1000) * 100
            + df["flow_accumulation"] * 0.01
            + np.random.exponential(20, len(df))
        )
        depth *= (1 + df["builtup_percentage"] / 200)
        depth *= (1 - df["slope_deg"] / 100)
        depth *= df["soil_type_factor"]
        return depth

    # ── MODEL TRAINERS ────────────────────────────────────────────────────────

    def _train_random_forest(self, X: np.ndarray, y: np.ndarray) -> RandomForestRegressor:
        model = RandomForestRegressor(**self.hyperparameters["random_forest"], n_jobs=-1, verbose=0)
        model.fit(X, y)
        return model

    def _train_xgboost(self, X: np.ndarray, y: np.ndarray) -> xgb.XGBRegressor:
        model = xgb.XGBRegressor(**self.hyperparameters["xgboost"], n_jobs=-1, verbosity=0)
        model.fit(X, y)
        return model

    def _train_lightgbm(self, X: np.ndarray, y: np.ndarray) -> lgb.LGBMRegressor:
        model = lgb.LGBMRegressor(**self.hyperparameters["lightgbm"], n_jobs=-1, verbose=-1)
        model.fit(X, y)
        return model

    def _train_neural_network(self, X: np.ndarray, y: np.ndarray) -> Optional[Any]:
        if not TF_AVAILABLE:
            return None

        n_features = X.shape[1]
        model = Sequential([
            Input(shape=(n_features,)),
            Dense(128, activation="relu"),
            BatchNormalization(),
            Dropout(0.3),
            Dense(64, activation="relu"),
            BatchNormalization(),
            Dropout(0.3),
            Dense(32, activation="relu"),
            Dense(1,  activation="linear"),
        ])
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mse", metrics=["mae"])

        callbacks = [
            EarlyStopping(patience=20, restore_best_weights=True),
            ModelCheckpoint(
                os.path.join(self.model_dir, "best_nn_model.h5"),
                save_best_only=True,
            ),
        ]
        model.fit(
            X, y,
            epochs=50, batch_size=32,
            validation_split=0.2,
            callbacks=callbacks,
            verbose=0,
        )
        return model

    # ── EVALUATION ────────────────────────────────────────────────────────────

    def _evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray):
        metrics: Dict[str, Dict] = {}
        weights = self.metadata["ensemble_weights"]

        for name, model in self.models.items():
            if model is None or name == "ensemble":
                continue
            try:
                if name == "nn" and TF_AVAILABLE:
                    y_pred = model.predict(X_test).flatten()
                else:
                    y_pred = model.predict(X_test)

                metrics[name] = {
                    "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
                    "mae":  float(mean_absolute_error(y_test, y_pred)),
                    "r2":   float(r2_score(y_test, y_pred)),
                }
            except Exception as e:
                logger.error(f"Evaluation failed for {name}: {e}")

        # Weighted ensemble evaluation
        preds, ws = [], []
        for name in ("rf", "xgb", "lgb"):
            m = self.models.get(name)
            if m is not None:
                preds.append(m.predict(X_test))
                ws.append(weights.get(name, 1.0))
        if preds:
            ws_arr = np.array(ws) / sum(ws)
            ens_pred = sum(w * p for w, p in zip(ws_arr, preds))
            metrics["ensemble"] = {
                "rmse": float(np.sqrt(mean_squared_error(y_test, ens_pred))),
                "mae":  float(mean_absolute_error(y_test, ens_pred)),
                "r2":   float(r2_score(y_test, ens_pred)),
            }

        self.metadata["performance_metrics"] = metrics
        self.metadata["last_trained"] = datetime.now(timezone.utc).isoformat()

        if metrics:
            best = min(metrics.items(), key=lambda x: x[1]["rmse"])
            logger.info(f"Best model: {best[0]}  RMSE={best[1]['rmse']:.2f}  R²={best[1]['r2']:.3f}")

    def _calculate_feature_importance(self, X_train: np.ndarray):
        rf = self.models.get("rf")
        if rf is None or not self.feature_names:
            return

        importances = getattr(rf, "feature_importances_", np.array([]))
        self.feature_importance = dict(
            sorted(
                zip(self.feature_names, importances),
                key=lambda x: float(x[1]),
                reverse=True,
            )
        )
        top10 = dict(itertools.islice(self.feature_importance.items(), 10))
        self.metadata["feature_importance"] = {k: float(v) for k, v in top10.items()}

        logger.info("Top 5 features:")
        for feat, imp in itertools.islice(self.feature_importance.items(), 5):
            logger.info(f"  {feat}: {float(imp):.3f}")

    # ── PREDICTION ────────────────────────────────────────────────────────────

    def predict(self, features: Dict[str, float]) -> PredictionResult:
        feature_vector = self._prepare_feature_vector(features)
        weights        = self.metadata.get("ensemble_weights", {})

        raw_preds: Dict[str, float] = {}
        for name, model in self.models.items():
            if model is None or name == "ensemble":
                continue
            try:
                if name == "nn" and TF_AVAILABLE:
                    p = float(model.predict(feature_vector.reshape(1, -1))[0][0])
                else:
                    p = float(model.predict(feature_vector.reshape(1, -1))[0])
                raw_preds[name] = p
            except Exception as e:
                logger.error(f"Prediction error [{name}]: {e}")

        if raw_preds:
            total_w = sum(float(weights.get(n, 1.0)) for n in raw_preds)
            if total_w > 0:
                ensemble_val = sum(
                    float(weights.get(n, 1.0)) * v for n, v in raw_preds.items()
                ) / total_w
            else:
                ensemble_val = float(np.mean(list(raw_preds.values())))
        else:
            ensemble_val = 50.0
            logger.warning("No models produced predictions — using fallback value.")

        water_depth_mm   = float(max(0.0, ensemble_val))
        risk_score       = self._calculate_risk_score(water_depth_mm, features)
        risk_category    = self._determine_risk_category(risk_score)
        confidence       = self._calculate_prediction_confidence(raw_preds)
        factors          = self._identify_contributing_factors(features)

        result = PredictionResult(
            risk_score=risk_score,
            water_depth_mm=water_depth_mm,
            confidence=confidence,
            risk_category=risk_category,
            contributing_factors=factors,
            model_used="ensemble",
            timestamp=datetime.now(timezone.utc),
            features=features,
        )
        self._log_prediction(result)
        return result

    def _prepare_feature_vector(self, features: Dict[str, float]) -> np.ndarray:
        if not self.feature_names:
            self.feature_names = list(features.keys())

        missing: List[str] = []
        vec = []
        for feat in self.feature_names:
            if feat in features:
                vec.append(features[feat])
            else:
                vec.append(self._get_feature_default(feat))
                missing.append(feat)

        if missing:
            logger.warning(f"Missing features (using defaults): {missing}")

        arr = np.array(vec, dtype=np.float64)
        if hasattr(self.scaler, "scale_") and self.scaler.scale_ is not None:
            arr = self.scaler.transform(arr.reshape(1, -1)).flatten()
        return arr

    @staticmethod
    def _get_feature_default(feature: str) -> float:
        defaults = {
            "rainfall_mm":       0.0,
            "rainfall_24h":      0.0,
            "humidity_percent":  50.0,
            "temperature_c":     25.0,
            "wind_speed":        5.0,
            "pressure_hpa":      1013.0,
            "slope_deg":         5.0,
            "elevation_m":       250.0,
            "curvature":         0.0,
            "flow_accumulation": 1000.0,
            "soil_saturation":   50.0,
            "ndvi":              0.3,
            "builtup_percentage": 20.0,
            "water_distance_m":  1000.0,
            "soil_type_factor":  0.7,
            "drainage_density":  1.5,
        }
        return defaults.get(feature, 0.0)

    @staticmethod
    def _calculate_risk_score(water_depth: float, features: Dict) -> float:
        rainfall_f  = min(1.0, features.get("rainfall_mm", 0)    / 100)
        soil_f      = features.get("soil_saturation", 50)         / 100
        elev_f      = max(0.0, 1 - features.get("elevation_m", 250) / 1000)
        slope_f     = max(0.0, 1 - features.get("slope_deg", 5)   / 30)
        urban_f     = min(1.0, features.get("builtup_percentage", 0) / 50)

        score = (
            min(1.0, water_depth / 500) * 0.30
            + rainfall_f * 0.25
            + soil_f     * 0.15
            + elev_f     * 0.10
            + slope_f    * 0.10
            + urban_f    * 0.10
        )
        return float(min(1.0, max(0.0, score)))

    @staticmethod
    def _determine_risk_category(risk_score: float) -> str:
        if   risk_score >= 0.8: return "EXTREME"
        elif risk_score >= 0.6: return "HIGH"
        elif risk_score >= 0.4: return "MODERATE"
        elif risk_score >= 0.2: return "LOW"
        else:                   return "MINIMAL"

    @staticmethod
    def _calculate_prediction_confidence(predictions: Dict[str, float]) -> float:
        values = list(predictions.values())
        if len(values) <= 1:
            return 0.5
        mean_val = np.mean(values)
        if mean_val == 0:
            return 0.5
        cv = np.std(values) / abs(mean_val)
        return float(max(0.3, min(1.0, 1.0 - min(cv, 1.0))))

    def _identify_contributing_factors(self, features: Dict) -> List[str]:
        factors: List[str] = []

        if features.get("rainfall_mm", 0) > 50:
            factors.append(f"Heavy rainfall ({features['rainfall_mm']:.1f} mm)")
        if features.get("soil_saturation", 0) > 80:
            factors.append(f"High soil saturation ({features['soil_saturation']:.0f}%)")
        if features.get("builtup_percentage", 0) > 40:
            factors.append(f"Urban area ({features['builtup_percentage']:.0f}% built-up)")
        if features.get("elevation_m", 250) < 200:
            factors.append(f"Low elevation ({features['elevation_m']:.0f} m)")
        if features.get("slope_deg", 5) < 3:
            factors.append("Flat terrain (poor drainage)")

        if self.feature_importance:
            for feat in itertools.islice(self.feature_importance, 3):
                val = features.get(feat)
                if val is None:
                    continue
                if feat == "rainfall_mm" and val > 30:
                    factors.append(f"High {feat.replace('_', ' ')}: {val:.1f}")
                elif feat == "flow_accumulation" and val > 1000:
                    factors.append(f"High {feat.replace('_', ' ')}: {val:.0f}")

        return factors[:5]

    def _log_prediction(self, result: PredictionResult):
        self.prediction_history.append({
            "timestamp":     result.timestamp.isoformat(),
            "risk_score":    result.risk_score,
            "water_depth_mm": result.water_depth_mm,
            "confidence":    result.confidence,
            "risk_category": result.risk_category,
            "model_used":    result.model_used,
            "features":      result.features,
        })

    # ── PERSISTENCE ───────────────────────────────────────────────────────────

    def _save_models(self):
        for name, model in self.models.items():
            if model is None or name == "ensemble":
                continue
            try:
                if name == "nn" and TF_AVAILABLE:
                    model.save(os.path.join(self.model_dir, f"{name}_model.h5"))
                else:
                    joblib.dump(model, os.path.join(self.model_dir, f"{name}_model.pkl"))
            except Exception as e:
                logger.error(f"Error saving model {name}: {e}")

        try:
            joblib.dump(self.scaler, os.path.join(self.model_dir, "feature_scaler.pkl"))
        except Exception as e:
            logger.error(f"Error saving scaler: {e}")

        try:
            with open(os.path.join(self.model_dir, "model_metadata.json"), "w") as f:
                json.dump(self.metadata, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")

        try:
            with open(os.path.join(self.model_dir, "feature_importance.json"), "w") as f:
                json.dump(self.feature_importance, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving feature importance: {e}")

        logger.info(f"Models saved to {self.model_dir}")

    def _load_saved_models(self):
        metadata_path = os.path.join(self.model_dir, "model_metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path) as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metadata: {e}")

        scaler_path = os.path.join(self.model_dir, "feature_scaler.pkl")
        if os.path.exists(scaler_path):
            try:
                loaded = joblib.load(scaler_path)
                if hasattr(loaded, "scale_") and loaded.scale_ is not None:
                    self.scaler = loaded
                else:
                    logger.warning("Scaler on disk is not fitted — using fresh scaler.")
            except Exception as e:
                logger.error(f"Error loading scaler: {e}")

        importance_path = os.path.join(self.model_dir, "feature_importance.json")
        if os.path.exists(importance_path):
            try:
                with open(importance_path) as f:
                    self.feature_importance = json.load(f)
            except Exception as e:
                logger.error(f"Error loading feature importance: {e}")

        model_files = {
            "rf":  "rf_model.pkl",
            "xgb": "xgb_model.pkl",
            "lgb": "lgb_model.pkl",
            "nn":  "nn_model.h5",
        }
        for name, filename in model_files.items():
            path = os.path.join(self.model_dir, filename)
            if not os.path.exists(path):
                continue
            try:
                if name == "nn" and TF_AVAILABLE:
                    self.models[name] = load_model(path)
                else:
                    self.models[name] = joblib.load(path)
            except Exception as e:
                logger.error(f"Error loading model {name}: {e}")
                self.models[name] = None

        if not self.models:
            raise RuntimeError("No valid models found on disk.")

    # ── MONITORING ────────────────────────────────────────────────────────────

    def get_model_info(self) -> Dict:
        return {
            "status":                  "ready" if self.models else "not_trained",
            "metadata":                self.metadata,
            "models_loaded":           list(self.models.keys()),
            "feature_count":           len(self.feature_names),
            "prediction_history_count": len(self.prediction_history),
            "feature_importance_top5": dict(
                itertools.islice(self.feature_importance.items(), 5)
            ) if self.feature_importance else {},
        }

    def retrain_if_needed(self, performance_threshold: float = 0.7) -> bool:
        last_str = self.metadata.get("last_trained")
        if not last_str:
            return False
        try:
            last_dt = datetime.fromisoformat(last_str)
            # Make timezone-aware if naive
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            days_elapsed = (datetime.now(timezone.utc) - last_dt).days
            if days_elapsed > 30:
                logger.info(f"Retraining models (last trained {days_elapsed} days ago)")
                self.train_models(retrain=True)
                return True
        except Exception as e:
            logger.error(f"retrain_if_needed error: {e}")
        return False

    # ── VILLAGE RISK ──────────────────────────────────────────────────────────

    def generate_village_risk(self, village_data: Dict) -> Dict:
        pred = self.predict(village_data)
        return {
            "village_name":        village_data.get("village_name", "Unknown"),
            "risk_score":          pred.risk_score,
            "water_depth_cm":      pred.water_depth_mm / 10,
            "risk_category":       pred.risk_category,
            "confidence":          pred.confidence,
            "recommended_action":  self._get_recommended_action(pred.risk_category),
            "contributing_factors": pred.contributing_factors,
            "timestamp":           pred.timestamp.isoformat(),
        }

    @staticmethod
    def _get_recommended_action(risk_category: str) -> str:
        actions = {
            "EXTREME":  "IMMEDIATE EVACUATION: Move to higher ground immediately",
            "HIGH":     "PREPARE TO EVACUATE: Gather essential items and monitor water levels",
            "MODERATE": "STAY ALERT: Monitor local conditions, avoid low-lying areas",
            "LOW":      "STAY INFORMED: Keep updated with weather forecasts",
            "MINIMAL":  "NORMAL ACTIVITIES: No immediate threat detected",
        }
        return actions.get(risk_category, "Stay informed")


# ── MODULE-LEVEL HELPERS ──────────────────────────────────────────────────────

_ml_engine: Optional[AdvancedFloodML] = None


def get_ml_engine() -> AdvancedFloodML:
    global _ml_engine
    if _ml_engine is None:
        _ml_engine = AdvancedFloodML()
    return _ml_engine


def predict_flood_risk(features: Dict) -> float:
    try:
        return get_ml_engine().predict(features).risk_score
    except Exception as e:
        logger.error(f"predict_flood_risk fallback triggered: {e}")
        rain = features.get("rainfall_mm", 0)
        if   rain > 50: return 0.8
        elif rain > 30: return 0.5
        elif rain > 10: return 0.3
        else:           return 0.1


FloodPredictor = AdvancedFloodML


if __name__ == "__main__":
    engine = AdvancedFloodML()
    info   = engine.get_model_info()
    logger.info(f"Status: {info['status']}  Models: {info['models_loaded']}")

    test_features = {
        "rainfall_mm": 45.2, "rainfall_24h": 60.5, "humidity_percent": 85.3,
        "temperature_c": 28.7, "wind_speed": 12.3, "pressure_hpa": 1012.5,
        "slope_deg": 8.2, "elevation_m": 245.6, "curvature": -2.1,
        "flow_accumulation": 1250.8, "soil_saturation": 78.9, "ndvi": 0.45,
        "builtup_percentage": 35.2, "water_distance_m": 850.3,
        "soil_type_factor": 0.8, "drainage_density": 2.3,
    }

    result = engine.predict(test_features)
    logger.info(f"Risk={result.risk_score:.3f}  Category={result.risk_category}  "
                f"Depth={result.water_depth_mm:.1f}mm  Confidence={result.confidence:.2f}")