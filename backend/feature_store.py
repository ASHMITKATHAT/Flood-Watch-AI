import pandas as pd
import os
"""
EQUINOX ML Feature Store

A modular script managing the precise feature engineering pipeline required before 
running the Random Forest Model for Flood Prediction.
It ensures that raw telemetry data is correctly sanitized, formatted, and injected 
with critical geospatial constants (like elevation) prior to inference.
"""

# Default static baseline values required by the specific model
DEFAULT_FEATURES = {
    "slope_degrees": 2.5,
    "flow_accumulation": 1000.0,
    "antecedent_moisture": 30.0,
    "distance_to_sink": 500.0,
    "sink_depth": 2.0,
    "aspect_degrees": 180.0,
    "elevation_m": 250.0,
    "land_use_code": 1.0,
    "flood_depth_cm": 0.0 # Used as baseline or lag feature
}

def extract_features(raw_sensor_payload: dict, rainfall_override: float = None) -> pd.DataFrame:
    """
    Transforms a raw JSON payload from physical/human sensors into a standardized 
    Pandas DataFrame suitable for the Random Forest model.
    """
    
    # Extract live dynamic metrics
    soil_moisture = raw_sensor_payload.get("moisture", 40.0) 
    rainfall_mm = rainfall_override if rainfall_override is not None else raw_sensor_payload.get("rainfall_mm", 0.0)
    
    # Compile the final feature array ensuring exact column order/presence
    feature_dict = {
        "rainfall_mm": rainfall_mm,
        "slope_degrees": DEFAULT_FEATURES["slope_degrees"],
        "flow_accumulation": DEFAULT_FEATURES["flow_accumulation"],
        "soil_moisture": soil_moisture,
        "antecedent_moisture": DEFAULT_FEATURES["antecedent_moisture"],
        "distance_to_sink": DEFAULT_FEATURES["distance_to_sink"],
        "sink_depth": DEFAULT_FEATURES["sink_depth"],
        "aspect_degrees": DEFAULT_FEATURES["aspect_degrees"],
        "elevation_m": DEFAULT_FEATURES["elevation_m"],
        "land_use_code": DEFAULT_FEATURES["land_use_code"],
        "flood_depth_cm": DEFAULT_FEATURES["flood_depth_cm"]
    }
    
    # Return as DataFrame for easy sci-kit learn ingestion
    return pd.DataFrame([feature_dict])

def save_offline_batch(df: pd.DataFrame, filename="offline_features.csv"):
    """Saves a batch of prepared features for historical training / retraining."""
    filepath = os.path.join(os.path.dirname(__file__), "data", filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    if os.path.exists(filepath):
        df.to_csv(filepath, mode='a', header=False, index=False)
    else:
        df.to_csv(filepath, mode='w', header=True, index=False)
    
    print(f"[FEATURE STORE] Appended offline batch to {filepath}")
