import os
import time
import asyncio
import joblib
import numpy as np
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import neon_db as db

# Phase-5: Top-level engine imports (loaded once, not per-request)
import topography_engine
import sar_engine
from real_data_integration import DataIntegration

load_dotenv()

# Preload Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "random_forest_model.pkl")
ml_model = None

def load_model():
    global ml_model
    try:
        print(f"Loading ML model from {MODEL_PATH}...")
        ml_model = joblib.load(MODEL_PATH)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")

# Calculate Risk Level
def get_risk_level(water_depth: float) -> str:
    if water_depth > 3.5:
        return 'critical'
    elif water_depth > 2.0:
        return 'warning'
    return 'info'

# Fast API Lifecycle Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    # Start the continuous background loop
    asyncio.create_task(autonomous_inference_loop())
    yield
    print("Shutting down the server...")


app = FastAPI(lifespan=lifespan, title="EQUINOX ML Inference API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class PredictionRequest(BaseModel):
    location_id: str
    rainfall_rate: float
    soil_moisture: float

class PredictionResponse(BaseModel):
    water_depth: float
    risk_level: str
    success: bool
    message: str = ""


# ---- API ENDPOINTS ----

@app.get("/api/active_alerts")
async def get_active_alerts():
    """Fetch all active alerts from Neon DB. No mock data."""
    try:
        alerts = db.fetch_all("active_alerts", conditions={"is_active": True})
        if alerts and len(alerts) > 0:
            return alerts
        return []
    except Exception as e:
        print(f"Error fetching active alerts: {e}")
        return JSONResponse(status_code=500, content={"error": "Database connection failed", "code": 500})

@app.get("/api/sensor_data")
async def get_sensor_data():
    """Fetch all sensor data from Neon DB."""
    data = db.fetch_all("sensor_data")
    return {"data": data}

@app.get("/api/civilian_reports")
async def get_civilian_reports():
    """Fetch all civilian reports from Neon DB."""
    data = db.fetch_all("civilian_reports")
    return {"data": data}

@app.post("/api/civilian_reports")
async def create_civilian_report(report: dict):
    """Create a new civilian report."""
    result = db.insert_row("civilian_reports", report)
    return {"data": result, "success": result is not None}


@app.get("/api/predict")
async def predict_flood_risk(lat: float, lng: float):
    """Phase 5 — Fusion Engine: fuses weather + topography + SAR → ML risk score."""
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML Model not loaded.")

    # ── A) Fetch Weather + Soil Moisture Data (Strict) ──
    try:
        async with DataIntegration() as di:
            weather_data = await di.fetch_nasa_gpm_data(lat, lng, hours_back=6)
            rain_data = weather_data.get('rainfall_mm', 0.0)
            
            soil_data = await di.fetch_soil_moisture_data(lat, lng)
            soil_moisture = soil_data.get('soil_moisture', 50.0)
            
            # Dynamic Feature Engineering: antecedent_moisture
            import aiohttp
            async with aiohttp.ClientSession() as session:
                hist_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=precipitation&past_days=3"
                async with session.get(hist_url, timeout=10) as resp:
                    if resp.status == 200:
                        hist_data = await resp.json()
                        precip_array = hist_data.get('hourly', {}).get('precipitation', [])
                        antecedent_moisture = sum(precip_array) if precip_array else 30.0
                    else:
                        antecedent_moisture = 30.0
    except Exception as e:
        print(f"[PREDICT] Weather/Soil Fetch Error: {e}")
        raise HTTPException(status_code=424, detail="Failed Dependency: Core sensor API offline (Weather/Soil)")

    # ── B) Fetch Topography Data (Strict) ──
    try:
        topo_data = topography_engine.get_terrain_metrics(lat, lng)
        if topo_data and "error" in topo_data:
            raise Exception(topo_data["error"])
        elevation = topo_data.get("elevation_m")
        slope = topo_data.get("slope_degrees")
        flow_acc = topo_data.get("flow_accumulation")
        aspect = topo_data.get("aspect_degrees")
        if elevation is None:
            raise Exception("No elevation data returned")
    except Exception as e:
        print(f"[PREDICT] Topography Fetch Error: {e}")
        raise HTTPException(status_code=424, detail="Failed Dependency: Core sensor API offline (Topography)")

    # ── C) Fetch SAR Data (Strict) ──
    try:
        sar_data_full = await asyncio.to_thread(
            sar_engine.get_inundation_metrics, lat, lng, 5
        )
        sar_data = sar_data_full.get('flooded_area_hectares')
        if sar_data is None:
            if sar_data_full.get('status') == 'GEE_NOT_INITIALIZED':
                 sar_data = 0.0 # Graceful fallback only if GEE is intentionally bypassed for local dev
            else:
                 raise Exception("No SAR data returned")
    except Exception as e:
        print(f"[PREDICT] SAR Fetch Error: {e}")
        raise HTTPException(status_code=424, detail="Failed Dependency: Core sensor API offline (SAR)")

    # ── 3. Strict Feature Alignment ──
    # Note: distance_to_sink, sink_depth, and land_use_code have been purged due to static hardcoding.
    # TODO: Model Retraining Required! Need to update .pkl feature shape to mathematically match this new live array.
    features = np.array([[
        rain_data,              # rainfall_mm
        slope,                  # slope_degrees
        flow_acc,               # flow_accumulation
        soil_moisture,          # soil_moisture (live integration)
        antecedent_moisture,    # antecedent_moisture (dynamic open-meteo summation)
        aspect,                 # aspect_degrees
        elevation,              # elevation_m
        sar_data,               # sar_flooded_hectares (live satellite feed directly integrated)
        0.0,                    # flood_depth_cm (initial state)
    ]])

    try:
        # ── 4. Inference ──
        if hasattr(ml_model, 'predict_proba'):
            # Binary classifier path
            risk_prob = ml_model.predict_proba(features)[0][1]
        else:
            # Regressor path (current model: RandomForestRegressor)
            raw_pred = float(ml_model.predict(features)[0])
            print(f"[PREDICT] Raw model output (predicted depth): {raw_pred:.3f} m")
            # Normalize: >3.5 m = 100% risk
            risk_prob = min(1.0, max(0.0, raw_pred / 3.5))

        risk_percentage = round(float(risk_prob * 100), 2)

        # ── 5. Rich Response Payload ──
        return {
            "risk_percentage": risk_percentage,
            "elevation": elevation,
            "slope": slope,
            "flow_accumulation": flow_acc,
            "soil_moisture": soil_moisture,
            "rainfall_mm": rain_data,
            "sar_inundation": sar_data,
            "sar_details": sar_data_full,
            "status": "success",
        }
    except Exception as e:
        print(f"[PREDICT] Inference Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sar")
async def get_sar_data(lat: float, lng: float, radius_km: float = 5):
    """Serve Sentinel-1 SAR flood inundation metrics."""
    try:
        # EarthEngine is purely synchronous. Run in a thread to prevent blocking event loop.
        metrics = await asyncio.to_thread(sar_engine.get_inundation_metrics, lat, lng, radius_km)
        return {
            "success": True,
            "data": metrics,
            "source": "Sentinel-1 GRD (Google Earth Engine)"
        }
    except Exception as e:
        print(f"SAR Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/terrain")
async def get_terrain(lat: float, lng: float):
    """Serve offline ISRO Cartosat DEM terrain metrics."""
    try:
        metrics = await asyncio.to_thread(topography_engine.get_terrain_metrics, lat, lng)
        return {
            "success": True,
            "data": metrics,
            "source": "ISRO Cartosat DEM (Offline Validation Node)"
        }
    except Exception as e:
        print(f"Terrain Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def autonomous_inference_loop():
    print("Starting autonomous inference loop...")
    while True:
        try:
            if ml_model:
                cutoff_time = pd.Timestamp.utcnow() - pd.Timedelta(seconds=60)
                cutoff_str = cutoff_time.isoformat()
                
                logs = db.fetch_gte('sensor_data', 'timestamp', cutoff_str)
                
                if logs:
                    print(f"Processing {len(logs)} sensor logs autonomously...")
                    insertions = []
                    
                    for log in logs:
                        features = pd.DataFrame([{
                            "rainfall_mm": 20.0,
                            "slope_degrees": 2.5,
                            "flow_accumulation": 1000.0,
                            "soil_moisture": log.get('moisture', 50.0),
                            "antecedent_moisture": 30.0,
                            "distance_to_sink": 500.0,
                            "sink_depth": 2.0,
                            "aspect_degrees": 180.0,
                            "elevation_m": 250.0,
                            "land_use_code": 1.0,
                            "flood_depth_cm": 0.0
                        }])
                        
                        pred_depth = round(float(ml_model.predict(features)[0]), 2)
                        risk = get_risk_level(pred_depth)
                        
                        insertions.append({
                            "location_id": str(log.get('latitude', '')) + "," + str(log.get('longitude', '')),
                            "water_depth": pred_depth,
                            "risk_level": risk
                        })

                    if insertions:
                        db.insert_rows('sensor_data', insertions)
                        print(f"Auto-inserted {len(insertions)} sensor_data predictions.")

        except Exception as e:
            print(f"Autonomous loop error: {e}")
        
        await asyncio.sleep(60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
