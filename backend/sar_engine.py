"""
EQUINOX SAR Engine — Sentinel-1 Flood Inundation Detector (Phase 4)
====================================================================
Uses Google Earth Engine (GEE) to query Sentinel-1 C-band SAR imagery
and derive real-time flood inundation masks via VV-polarisation
dB thresholding.

Pipeline:
  1. Authenticate GEE via service-account JSON key.
  2. Query COPERNICUS/S1_GRD (IW mode, VV band) for the last 10 days.
  3. Threshold VV < -18 dB → binary water mask.
  4. Compute flooded area (hectares) within a buffered AOI.
  5. Return a JSON-serialisable dictionary.

Graceful Degradation:
  If gee_key.json is missing or GEE init fails, all public functions
  return a fallback dict with status="GEE_NOT_INITIALIZED" instead of
  raising exceptions.

Author : EQUINOX Phase-4 Auto-Generated
Date   : 2026-02-28
"""

import os
import json as _json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# GEE Initialisation (fail-safe)
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
_env_key_path = os.getenv("GEE_KEY_PATH", "")

# We try multiple common locations using pathlib to be absolutely sure we find the key
_possible_paths = [
    Path(_env_key_path) if _env_key_path and Path(_env_key_path).is_absolute() else None,
    BASE_DIR / _env_key_path if _env_key_path else None,
    BASE_DIR / "data" / "gee_key.json",
    BASE_DIR.parent / "data" / "gee_key.json",
    Path.cwd() / "backend" / "data" / "gee_key.json",
]

GEE_KEY_PATH = None
for p in _possible_paths:
    if p and p.exists():
        GEE_KEY_PATH = p.resolve()
        break

if not GEE_KEY_PATH:
    # Fallback to the default assumption to fail gracefully with a specific error message
    GEE_KEY_PATH = BASE_DIR / "data" / "gee_key.json"

_gee_ready = False

try:
    import ee

    print(f"[SAR-DEBUG] GEE_KEY_PATH resolved to: {GEE_KEY_PATH}")
    print(f"[SAR-DEBUG] File exists: {GEE_KEY_PATH.is_file() if GEE_KEY_PATH else False}")

    if not GEE_KEY_PATH or not GEE_KEY_PATH.is_file():
        raise FileNotFoundError(f"Missing GEE Service Account Key at absolute path: {GEE_KEY_PATH}")

    # Read service account email from the key file
    with open(GEE_KEY_PATH, "r") as _kf:
        _key_data = _json.load(_kf)
    _sa_email = _key_data.get("client_email", "")
    print(f"[SAR-DEBUG] SA email: {_sa_email}")

    credentials = ee.ServiceAccountCredentials(
        email=_sa_email,
        key_file=str(GEE_KEY_PATH),
    )
    import socket
    import threading
    socket.setdefaulttimeout(10)
    
    try:
        print("[SAR-DEBUG] Attempting credentials initialization (15s timeout)...")
        _init_error = [None]
        _init_done = threading.Event()

        def _do_init():
            try:
                ee.Initialize(credentials, opt_url="https://earthengine-highvolume.googleapis.com")
            except Exception as ex:
                _init_error[0] = ex
            finally:
                _init_done.set()

        _t = threading.Thread(target=_do_init, daemon=True)
        _t.start()

        if not _init_done.wait(timeout=15):
            raise TimeoutError("GEE initialization timed out after 15 seconds")

        if _init_error[0]:
            raise _init_error[0]

        _gee_ready = True
        print(f"[SAR-DEBUG] ✅ GEE initialised successfully!")
        logger.info("✅ GEE initialised — SA: %s", _sa_email)
    except Exception as e:
        print(f"GEE Auth FAILED: {str(e)}")
        print(f"[SAR-DEBUG] ❌ GEE Init explicitly failed: {e}")
        _gee_ready = False
        logger.warning(f"GEE initialization failed gracefully. SAR engine disabled. Reason: {e}")

except ImportError:
    print("[SAR-DEBUG] ⚠️ earthengine-api not installed")
    logger.warning("⚠️  earthengine-api not installed. SAR engine disabled.")
except Exception as exc:
    print(f"[SAR-DEBUG] ❌ GEE init FAILED: {type(exc).__name__}: {exc}")
    logger.error("❌ GEE initialisation failed gracefully: %s", exc)
    _gee_ready = False


# ──────────────────────────────────────────────
# Fallback response
# ──────────────────────────────────────────────
def _fallback_response(lat: float, lng: float, reason: str = "GEE_NOT_INITIALIZED") -> dict:
    """Return a safe, JSON-serialisable fallback when GEE is unavailable."""
    return {
        "status": reason,
        "lat": lat,
        "lng": lng,
        "recent_image_date": None,
        "flooded_area_hectares": None,
        "total_area_hectares": None,
        "flood_fraction_pct": None,
        "water_pixel_count": None,
        "threshold_db": -18,
        "message": "GEE is not initialised. Place a valid service-account key at data/gee_key.json.",
    }


# ──────────────────────────────────────────────
# Core public function
# ──────────────────────────────────────────────
def get_inundation_metrics(lat: float, lng: float, radius_km: float = 5) -> dict:
    """
    Fetch real-time flood inundation metrics for a coordinate.

    Args:
        lat:       Latitude  (WGS-84)
        lng:       Longitude (WGS-84)
        radius_km: Search radius around the point (default 5 km)

    Returns:
        dict with keys:
            status               – "OK" | "NO_IMAGES" | "GEE_NOT_INITIALIZED" | "ERROR"
            lat, lng             – echo of input coords
            recent_image_date    – ISO date string of the most recent Sentinel-1 pass
            flooded_area_hectares – area classified as water (VV < -18 dB)
            total_area_hectares  – total AOI area
            flood_fraction_pct   – (flooded / total) * 100
            threshold_db         – the dB threshold used (-18)
            message              – human-readable note
    """
    print(f"[SAR-DEBUG] get_inundation_metrics called: _gee_ready={_gee_ready}, id(module)={id(__import__('sar_engine'))}")
    if not _gee_ready:
        print(f"[SAR-DEBUG] RETURNING FALLBACK — _gee_ready is False")
        return _fallback_response(lat, lng)

    try:
        # ── 1. Geometry ────────────────────────────
        point = ee.Geometry.Point([lng, lat])
        aoi = point.buffer(radius_km * 1000)  # metres

        # ── 2. Sentinel-1 collection ───────────────
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=10)

        s1 = (
            ee.ImageCollection("COPERNICUS/S1_GRD")
            .filterBounds(aoi)
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            .filter(ee.Filter.eq("instrumentMode", "IW"))
            .select("VV")
        )

        count = s1.size().getInfo()
        if count == 0:
            return {
                "status": "NO_IMAGES",
                "lat": lat,
                "lng": lng,
                "recent_image_date": None,
                "flooded_area_hectares": None,
                "total_area_hectares": None,
                "flood_fraction_pct": None,
                "water_pixel_count": 0,
                "threshold_db": -18,
                "message": f"No Sentinel-1 images found within {radius_km} km in the last 10 days.",
            }

        # ── 3. Most recent image ───────────────────
        latest = ee.Image(s1.sort("system:time_start", False).first())
        img_date_ms = latest.get("system:time_start").getInfo()
        img_date = datetime.fromtimestamp(img_date_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")

        # ── 4. Water mask (VV < -18 dB) ────────────
        THRESHOLD_DB = -18
        water_mask = latest.lt(THRESHOLD_DB).rename("water")

        # ── 5. Area calculation ────────────────────
        pixel_area = ee.Image.pixelArea()  # m²

        # Total AOI area
        total_area_m2 = (
            pixel_area
            .clip(aoi)
            .reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi,
                scale=10,         # Sentinel-1 GRD ≈ 10 m resolution
                maxPixels=1e9,
            )
            .get("area")
        )

        # Flooded area
        flooded_area_m2 = (
            water_mask
            .multiply(pixel_area)
            .reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi,
                scale=10,
                maxPixels=1e9,
            )
            .get("water")
        )

        total_ha = (ee.Number(total_area_m2).divide(10000)).getInfo()
        flooded_ha = (ee.Number(flooded_area_m2).divide(10000)).getInfo()
        fraction = round((flooded_ha / total_ha) * 100, 2) if total_ha > 0 else 0.0

        # ── 6. Water pixel count ───────────────────
        water_pixel_count = (
            water_mask
            .reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi,
                scale=10,
                maxPixels=1e9,
            )
            .get("water")
        )
        water_px = int(ee.Number(water_pixel_count).getInfo())

        return {
            "status": "OK",
            "lat": lat,
            "lng": lng,
            "recent_image_date": img_date,
            "flooded_area_hectares": round(flooded_ha, 2),
            "total_area_hectares": round(total_ha, 2),
            "flood_fraction_pct": fraction,
            "water_pixel_count": water_px,
            "threshold_db": THRESHOLD_DB,
            "message": f"Sentinel-1 SAR analysis complete. Image date: {img_date}.",
        }

    except Exception as exc:
        logger.error("SAR engine error: %s", exc, exc_info=True)
        return {
            "status": "ERROR",
            "lat": lat,
            "lng": lng,
            "recent_image_date": None,
            "flooded_area_hectares": None,
            "total_area_hectares": None,
            "flood_fraction_pct": None,
            "water_pixel_count": None,
            "threshold_db": -18,
            "message": f"SAR engine encountered an error: {exc}",
        }


# ──────────────────────────────────────────────
# Quick CLI smoke test
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import json

    logging.basicConfig(level=logging.INFO)
    result = get_inundation_metrics(26.9124, 75.7873)
    print(json.dumps(result, indent=2))
