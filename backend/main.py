"""
╔══════════════════════════════════════════════════════════╗
║        FLOOD-WATCH AI — EQUINOX ML Inference API         ║
║        Production-Ready Backend  |  FastAPI + Neon DB    ║
╚══════════════════════════════════════════════════════════╝

Fixes Applied:
  [1] Feature shape mismatch fixed (autonomous loop = predict endpoint)
  [2] CORS wildcard + credentials bug fixed
  [3] aiohttp import moved to top-level
  [4] API Key Authentication added on all sensitive routes
  [5] Pydantic input validation for lat/lng
  [6] Rate Limiting via slowapi
  [7] In-memory Prediction Cache (5 min TTL)
  [8] print() replaced with proper logging
  [9] Health check + Model info endpoints added
 [10] Hardcoded values removed from autonomous loop
 [11] POST used for /api/predict (correct HTTP semantics)
"""

# ─────────────────────────────────────────────
# IMPORTS
# ─────────────────────────────────────────────
import os
import time
import logging
import asyncio
import joblib
import aiohttp                       # FIX #3 — Moved to top level
import numpy as np
import pandas as pd
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

from slowapi import Limiter          # pip install slowapi
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import neon_db as db
import topography_engine
import sar_engine
from real_data_integration import DataIntegration

load_dotenv()


# ─────────────────────────────────────────────
# LOGGING SETUP  (FIX #8 — No more print())
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("flood_watch.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("FloodWatch")


# ─────────────────────────────────────────────
# ENVIRONMENT / CONFIG
# ─────────────────────────────────────────────
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "models", "random_forest_model.pkl")
API_SECRET   = os.getenv("API_SECRET_KEY", "change-me-in-production")  # Set in .env
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CACHE_TTL    = int(os.getenv("CACHE_TTL_SECONDS", "300"))   # 5 minutes default


# ─────────────────────────────────────────────
# ML MODEL (loaded once at startup)
# ─────────────────────────────────────────────
ml_model = None

def load_model():
    global ml_model
    try:
        logger.info(f"Loading ML model from {MODEL_PATH} ...")
        ml_model = joblib.load(MODEL_PATH)
        logger.info(
            f"Model loaded ✓ | type={type(ml_model).__name__} "
            f"| features={getattr(ml_model, 'n_features_in_', '?')}"
        )
    except Exception as e:
        logger.error(f"Model load FAILED: {e}", exc_info=True)


# ─────────────────────────────────────────────
# PREDICTION CACHE  (FIX #7)
# ─────────────────────────────────────────────
# Key: (lat_rounded, lng_rounded) → (timestamp, result_dict)
# Precision: 3 decimals ≈ 111 metre grid — same cell = same cache entry
_prediction_cache: dict = {}

def _cache_get(lat: float, lng: float) -> Optional[dict]:
    key = (round(lat, 3), round(lng, 3))
    entry = _prediction_cache.get(key)
    if entry and (time.time() - entry["ts"] < CACHE_TTL):
        logger.info(f"Cache HIT for ({lat}, {lng})")
        return entry["data"]
    return None

def _cache_set(lat: float, lng: float, data: dict):
    key = (round(lat, 3), round(lng, 3))
    _prediction_cache[key] = {"ts": time.time(), "data": data}


# ─────────────────────────────────────────────
# RISK LEVEL HELPER
# ─────────────────────────────────────────────
def get_risk_level(water_depth: float) -> str:
    if water_depth > 3.5:
        return "critical"
    elif water_depth > 2.0:
        return "warning"
    return "info"


# ─────────────────────────────────────────────
# CANONICAL FEATURE BUILDER  (FIX #1)
# ─────────────────────────────────────────────
# ONE place to build features → both /api/predict AND autonomous loop use this.
# If you change the model, change ONLY this function.
FEATURE_NAMES = [
    "rainfall_mm",
    "slope_degrees",
    "flow_accumulation",
    "soil_moisture",
    "antecedent_moisture",
    "aspect_degrees",
    "elevation_m",
    "sar_flooded_hectares",
    "flood_depth_cm",
]

def build_feature_array(
    rainfall_mm: float,
    slope_degrees: float,
    flow_accumulation: float,
    soil_moisture: float,
    antecedent_moisture: float,
    aspect_degrees: float,
    elevation_m: float,
    sar_flooded_hectares: float,
    flood_depth_cm: float = 0.0,
) -> np.ndarray:
    """Returns shape (1, 9) numpy array aligned to current model."""
    return np.array([[
        rainfall_mm,
        slope_degrees,
        flow_accumulation,
        soil_moisture,
        antecedent_moisture,
        aspect_degrees,
        elevation_m,
        sar_flooded_hectares,
        flood_depth_cm,
    ]])


# ─────────────────────────────────────────────
# RATE LIMITER  (FIX #6)
# ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ─────────────────────────────────────────────
# API KEY AUTH  (FIX #4)
# ─────────────────────────────────────────────
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

async def require_api_key(api_key: str = Depends(api_key_scheme)):
    """Dependency — attach to any route that needs protection."""
    if not api_key or api_key != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing API key.")
    return api_key


# ─────────────────────────────────────────────
# SCHEMAS  (FIX #5 — Validation added)
# ─────────────────────────────────────────────
class PredictRequest(BaseModel):
    lat: float
    lng: float

    @field_validator("lat")
    @classmethod
    def lat_range(cls, v):
        if not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90 and 90.")
        return round(v, 6)

    @field_validator("lng")
    @classmethod
    def lng_range(cls, v):
        if not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180 and 180.")
        return round(v, 6)


class CivilianReport(BaseModel):
    latitude: float
    longitude: float
    description: str
    severity: Optional[str] = "low"   # low | medium | high
    reporter_name: Optional[str] = "Anonymous"

    @field_validator("severity")
    @classmethod
    def severity_enum(cls, v):
        if v not in ("low", "medium", "high"):
            raise ValueError("severity must be 'low', 'medium', or 'high'.")
        return v


class PredictionResponse(BaseModel):
    risk_percentage: float
    elevation: float
    slope: float
    flow_accumulation: float
    soil_moisture: float
    rainfall_mm: float
    sar_inundation: float
    sar_details: dict
    cached: bool = False
    status: str = "success"


# ─────────────────────────────────────────────
# LIFESPAN (startup / shutdown)
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    load_model()
    asyncio.create_task(autonomous_inference_loop())
    logger.info("🚀 FloodWatch API started.")
    yield
    # ── Shutdown ──
    logger.info("🛑 FloodWatch API shutting down.")


# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = FastAPI(
    lifespan=lifespan,
    title="EQUINOX — Flood Watch AI",
    description="Real-time flood risk prediction using ML + SAR + Topography + Weather fusion.",
    version="2.0.0",
)

# ── Rate limiter error handler ──
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"error": "Too many requests. Please slow down.", "code": 429},
    )

# ── State ──
app.state.limiter = limiter


# ─────────────────────────────────────────────
# CORS  (FIX #2 — wildcard + credentials bug)
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # Set ALLOWED_ORIGINS in .env
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════

# ── Health Check  (FIX #9) ──────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Kubernetes / Docker liveness probe."""
    return {
        "status": "healthy",
        "model_loaded": ml_model is not None,
        "timestamp": pd.Timestamp.utcnow().isoformat(),
        "version": app.version,
    }


@app.get("/api/model/info", tags=["System"])
async def model_info(_: str = Depends(require_api_key)):
    """Details about the currently loaded ML model."""
    if ml_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return {
        "model_type": type(ml_model).__name__,
        "n_estimators": getattr(ml_model, "n_estimators", "N/A"),
        "feature_count": getattr(ml_model, "n_features_in_", "N/A"),
        "feature_names": FEATURE_NAMES,
    }


# ── Alerts ──────────────────────────────────────
@app.get("/api/active_alerts", tags=["Alerts"])
async def get_active_alerts():
    """Fetch all active alerts from Neon DB."""
    try:
        alerts = db.fetch_all("active_alerts", conditions={"is_active": True})
        return alerts if alerts else []
    except Exception as e:
        logger.error(f"DB error (active_alerts): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed.")


# ── Sensor Data ──────────────────────────────────
@app.get("/api/sensor_data", tags=["Sensors"])
async def get_sensor_data(_: str = Depends(require_api_key)):
    """Fetch all sensor data from Neon DB (auth required)."""
    try:
        data = db.fetch_all("sensor_data")
        return {"data": data}
    except Exception as e:
        logger.error(f"DB error (sensor_data): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error.")


# ── Civilian Reports ─────────────────────────────
@app.get("/api/civilian_reports", tags=["Reports"])
async def get_civilian_reports():
    """Fetch all civilian reports."""
    try:
        data = db.fetch_all("civilian_reports")
        return {"data": data}
    except Exception as e:
        logger.error(f"DB error (civilian_reports GET): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error.")


@app.post("/api/civilian_reports", tags=["Reports"])
@limiter.limit("5/minute")   # Spam prevention
async def create_civilian_report(request: Request, report: CivilianReport):
    """Submit a new civilian flood report."""
    try:
        result = db.insert_row("civilian_reports", report.model_dump())
        if result is None:
            raise HTTPException(status_code=500, detail="Insert failed.")
        logger.info(f"New civilian report: {report.latitude},{report.longitude} | {report.severity}")
        return {"data": result, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DB error (civilian_reports POST): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error.")


# ── Core Prediction  (FIX #1, #3, #6, #7, #11) ──
@app.post("/api/predict", response_model=PredictionResponse, tags=["ML Inference"])
@limiter.limit("10/minute")
async def predict_flood_risk(
    request: Request,
    body: PredictRequest,
    _: str = Depends(require_api_key),
):
    """
    Phase-5 Fusion Engine
    Weather (NASA GPM) + Topography (ISRO Cartosat) + SAR (Sentinel-1) → RF Model → Risk %
    """
    lat, lng = body.lat, body.lng

    # ── Cache check ──
    cached = _cache_get(lat, lng)
    if cached:
        return {**cached, "cached": True}

    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML Model not loaded.")

    # ── A) Weather + Soil Moisture ──────────────────
    try:
        async with DataIntegration() as di:
            weather_data    = await di.fetch_nasa_gpm_data(lat, lng, hours_back=6)
            rain_data       = float(weather_data.get("rainfall_mm", 0.0))

            soil_data       = await di.fetch_soil_moisture_data(lat, lng)
            soil_moisture   = float(soil_data.get("soil_moisture", 50.0))

        # Antecedent moisture from Open-Meteo (past 3 days precipitation)
        hist_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&hourly=precipitation&past_days=3"
        )
        async with aiohttp.ClientSession() as session:
            async with session.get(hist_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    hist_json         = await resp.json()
                    precip_array      = hist_json.get("hourly", {}).get("precipitation", [])
                    antecedent_moisture = float(sum(precip_array)) if precip_array else 30.0
                else:
                    antecedent_moisture = 30.0

    except Exception as e:
        logger.error(f"[PREDICT] Weather/Soil error @ ({lat},{lng}): {e}", exc_info=True)
        raise HTTPException(
            status_code=424,
            detail="Failed Dependency: Weather/Soil API offline.",
        )

    # ── B) Topography ────────────────────────────────
    try:
        topo_data     = topography_engine.get_terrain_metrics(lat, lng)
        if topo_data and "error" in topo_data:
            raise ValueError(topo_data["error"])
        elevation     = float(topo_data["elevation_m"])
        slope         = float(topo_data["slope_degrees"])
        flow_acc      = float(topo_data["flow_accumulation"])
        aspect        = float(topo_data["aspect_degrees"])
        if elevation is None:
            raise ValueError("No elevation returned from DEM.")
    except Exception as e:
        logger.error(f"[PREDICT] Topography error @ ({lat},{lng}): {e}", exc_info=True)
        raise HTTPException(
            status_code=424,
            detail="Failed Dependency: Topography (Cartosat DEM) offline.",
        )

    # ── C) SAR ───────────────────────────────────────
    try:
        sar_data_full = await asyncio.to_thread(
            sar_engine.get_inundation_metrics, lat, lng, 5
        )
        sar_data = sar_data_full.get("flooded_area_hectares")
        if sar_data is None:
            if sar_data_full.get("status") == "GEE_NOT_INITIALIZED":
                logger.warning("[PREDICT] GEE bypassed — using 0.0 for SAR (local dev mode)")
                sar_data = 0.0
            else:
                raise ValueError("No SAR data returned from GEE.")
        sar_data = float(sar_data)
    except Exception as e:
        logger.error(f"[PREDICT] SAR error @ ({lat},{lng}): {e}", exc_info=True)
        raise HTTPException(
            status_code=424,
            detail="Failed Dependency: SAR (Sentinel-1 / GEE) offline.",
        )

    # ── D) Build Feature Array (canonical function) ──
    features = build_feature_array(
        rainfall_mm        = rain_data,
        slope_degrees      = slope,
        flow_accumulation  = flow_acc,
        soil_moisture      = soil_moisture,
        antecedent_moisture= antecedent_moisture,
        aspect_degrees     = aspect,
        elevation_m        = elevation,
        sar_flooded_hectares = sar_data,
        flood_depth_cm     = 0.0,
    )

    # ── E) Inference ─────────────────────────────────
    try:
        if hasattr(ml_model, "predict_proba"):
            # Binary classifier path
            risk_prob = float(ml_model.predict_proba(features)[0][1])
        else:
            # Regressor path (RandomForestRegressor)
            raw_pred  = float(ml_model.predict(features)[0])
            logger.info(f"[PREDICT] Raw depth prediction: {raw_pred:.3f} m")
            risk_prob = min(1.0, max(0.0, raw_pred / 3.5))

        risk_percentage = round(risk_prob * 100, 2)

    except Exception as e:
        logger.error(f"[PREDICT] Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    # ── F) Build & cache response ────────────────────
    result = {
        "risk_percentage"  : risk_percentage,
        "elevation"        : elevation,
        "slope"            : slope,
        "flow_accumulation": flow_acc,
        "soil_moisture"    : soil_moisture,
        "rainfall_mm"      : rain_data,
        "sar_inundation"   : sar_data,
        "sar_details"      : sar_data_full,
        "cached"           : False,
        "status"           : "success",
    }
    _cache_set(lat, lng, result)
    logger.info(f"[PREDICT] ({lat},{lng}) → risk={risk_percentage}%")
    return result


# ── SAR ──────────────────────────────────────────
@app.get("/api/sar", tags=["Data Sources"])
@limiter.limit("15/minute")
async def get_sar_data(
    request: Request,
    lat: float,
    lng: float,
    radius_km: float = 5,
    _: str = Depends(require_api_key),
):
    """Sentinel-1 SAR flood inundation metrics via Google Earth Engine."""
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=422, detail="Invalid lat/lng range.")
    try:
        metrics = await asyncio.to_thread(sar_engine.get_inundation_metrics, lat, lng, radius_km)
        return {
            "success": True,
            "data"   : metrics,
            "source" : "Sentinel-1 GRD (Google Earth Engine)",
        }
    except Exception as e:
        logger.error(f"SAR endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Terrain ──────────────────────────────────────
@app.get("/api/terrain", tags=["Data Sources"])
@limiter.limit("15/minute")
async def get_terrain(
    request: Request,
    lat: float,
    lng: float,
    _: str = Depends(require_api_key),
):
    """ISRO Cartosat DEM terrain metrics (offline validation node)."""
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=422, detail="Invalid lat/lng range.")
    try:
        metrics = await asyncio.to_thread(topography_engine.get_terrain_metrics, lat, lng)
        return {
            "success": True,
            "data"   : metrics,
            "source" : "ISRO Cartosat DEM (Offline Validation Node)",
        }
    except Exception as e:
        logger.error(f"Terrain endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════
#  AUTONOMOUS INFERENCE LOOP  (FIX #1 + #10)
# ═══════════════════════════════════════════════════
async def autonomous_inference_loop():
    """
    Background task: every 60 s, pick up fresh sensor_data rows,
    fetch REAL weather for each location, run inference, store predictions.

    FIX #1  → uses build_feature_array() — same 9-feature shape as /api/predict
    FIX #10 → no hardcoded rainfall/slope values; fetches live open-meteo data
    """
    logger.info("⚙️  Autonomous inference loop started.")

    while True:
        try:
            if ml_model is None:
                logger.warning("[AUTO] Model not ready, skipping cycle.")
                await asyncio.sleep(60)
                continue

            cutoff_str = (pd.Timestamp.utcnow() - pd.Timedelta(seconds=60)).isoformat()
            logs       = db.fetch_gte("sensor_data", "timestamp", cutoff_str)

            if not logs:
                logger.debug("[AUTO] No new sensor rows.")
                await asyncio.sleep(60)
                continue

            logger.info(f"[AUTO] Processing {len(logs)} sensor rows...")
            insertions = []

            for log in logs:
                lat = log.get("latitude")
                lng = log.get("longitude")
                if lat is None or lng is None:
                    continue

                # ── Fetch live weather for this sensor location ──
                try:
                    rain_data           = 0.0
                    antecedent_moisture = 30.0
                    open_url = (
                        f"https://api.open-meteo.com/v1/forecast"
                        f"?latitude={lat}&longitude={lng}"
                        f"&hourly=precipitation&past_days=3"
                        f"&forecast_days=0"
                    )
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            open_url,
                            timeout=aiohttp.ClientTimeout(total=8),
                        ) as resp:
                            if resp.status == 200:
                                jd           = await resp.json()
                                precip       = jd.get("hourly", {}).get("precipitation", [])
                                rain_data    = float(precip[-1]) if precip else 0.0
                                antecedent_moisture = float(sum(precip))
                except Exception as we:
                    logger.warning(f"[AUTO] Weather fetch failed for ({lat},{lng}): {we}")

                # ── Fetch topography (sync → thread) ──
                try:
                    topo     = await asyncio.to_thread(topography_engine.get_terrain_metrics, lat, lng)
                    slope    = float(topo.get("slope_degrees",   2.5))
                    flow_acc = float(topo.get("flow_accumulation", 500.0))
                    aspect   = float(topo.get("aspect_degrees",  180.0))
                    elevation= float(topo.get("elevation_m",     250.0))
                except Exception as te:
                    logger.warning(f"[AUTO] Topo fetch failed for ({lat},{lng}): {te}")
                    slope, flow_acc, aspect, elevation = 2.5, 500.0, 180.0, 250.0

                soil_moisture = float(log.get("moisture", 50.0))

                # ── Build features using canonical function ──
                features = build_feature_array(
                    rainfall_mm         = rain_data,
                    slope_degrees       = slope,
                    flow_accumulation   = flow_acc,
                    soil_moisture       = soil_moisture,
                    antecedent_moisture = antecedent_moisture,
                    aspect_degrees      = aspect,
                    elevation_m         = elevation,
                    sar_flooded_hectares= 0.0,   # SAR skipped in auto-loop (GEE quota)
                    flood_depth_cm      = 0.0,
                )

                pred_depth = round(float(ml_model.predict(features)[0]), 2)
                risk       = get_risk_level(pred_depth)

                insertions.append({
                    "location_id" : f"{lat},{lng}",
                    "water_depth" : pred_depth,
                    "risk_level"  : risk,
                    "source"      : "auto_inference",
                })

            if insertions:
                db.insert_rows("predictions", insertions)   # separate table!
                logger.info(f"[AUTO] Inserted {len(insertions)} predictions.")

        except Exception as e:
            logger.error(f"[AUTO] Loop error: {e}", exc_info=True)

        await asyncio.sleep(60)


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,        # reload=True only for dev
        log_level="info",
    )