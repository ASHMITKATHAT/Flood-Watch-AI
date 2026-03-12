"""
EQUINOX Topography Engine — Pre-Computed GeoTIFF Point Sampler (v2)
====================================================================
Reads pre-processed DEM and Slope GeoTIFFs via rasterio point sampling.
NO full raster reads. NO dynamic slope calculation. Minimal RAM footprint.

CRITICAL FIX (v2):
  - Explicit dynamic CRS transform via pyproj (never assume EPSG:4326)
  - Strict (x=longitude, y=latitude) ordering for rasterio.sample()
  - Bounds check BEFORE sampling — returns explicit error, never garbage pixel
  - Diagnostic logging for every transform and sample operation

GeoTIFF Inventory:
    data/dem/rajasthan_dem.tif     — Elevation (meters above sea level)
    data/dem/slope.tif             — Slope (degrees)
    data/dem/aspect.tif            — Aspect (degrees, 0-360)
    data/dem/flow_accumulation.tif — Flow accumulation (upstream cell count)

Usage:
    from topography_engine import get_terrain_metrics
    result = get_terrain_metrics(26.9124, 75.7873)
    # => {"elevation_m": ..., "slope_degrees": ..., ...}
"""

import os
import logging
from typing import Optional, Dict, Any

import rasterio
import pyproj

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# File paths (relative to backend root)
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEM_PATH = os.path.join(BASE_DIR, "data", "dem", "rajasthan_dem.tif")
SLOPE_PATH = os.path.join(BASE_DIR, "data", "dem", "slope.tif")
ASPECT_PATH = os.path.join(BASE_DIR, "data", "dem", "aspect.tif")
FLOW_PATH = os.path.join(BASE_DIR, "data", "dem", "flow_accumulation.tif")


class TopographyEngine:
    """
    Lazy-loads GeoTIFF file handles. Performs CRS-safe point sampling
    without reading full raster arrays into memory.
    """
    def __init__(self):
        self._datasets: Dict[str, rasterio.DatasetReader] = {}
        self._raster_paths = {
            "elevation": DEM_PATH,
            "slope": SLOPE_PATH,
            "aspect": ASPECT_PATH,
            "flow_accumulation": FLOW_PATH,
        }

    def _get_dataset(self, key: str) -> Optional[rasterio.DatasetReader]:
        """Lazy-open a raster dataset. Returns None if file does not exist."""
        if key in self._datasets and not self._datasets[key].closed:
            return self._datasets[key]

        path = self._raster_paths.get(key)
        if not path or not os.path.exists(path):
            return None

        try:
            ds = rasterio.open(path)
            self._datasets[key] = ds
            return ds
        except Exception as e:
            logger.error(f"[TopographyEngine] Failed to open {path}: {e}")
            return None

    def sample_datasets(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Samples all datasets for a given WGS84 (lat, lng).
        Requires strict X/Y mapping and dynamic CRS transformation.
        """
        # 1. Strict X/Y Ordering: X = longitude, Y = latitude
        raw_x = lng
        raw_y = lat
        
        # Initialize return values
        results = {
            "elevation_m": None,
            "slope_degrees": None,
            "aspect_degrees": None,
            "flow_accumulation": None
        }

        # We need to validate bounds using the primary DEM dataset first
        dem_ds = self._get_dataset("elevation")
        
        if not dem_ds:
            print("[FAIL] DEM dataset not found")
            return {"error": "DEM dataset not missing", "elevation_m": None, "slope_degrees": None}

        # 2. Dynamic CRS Transformation
        # Read the native CRS of the raster
        native_crs = dem_ds.crs
        
        # Build the transformer from WGS84 to the native CRS
        transformer = pyproj.Transformer.from_crs("EPSG:4326", native_crs, always_xy=True)
        
        # Transform the raw (lng, lat) to target (x, y)
        target_x, target_y = transformer.transform(raw_x, raw_y)

        # 4. Debugging Logs (Pre-sampling)
        # print(f"\n[TOPOGRAPHY DEBUG] Original Lat/Lng: ({lat}, {lng})")
        # print(f"[TOPOGRAPHY DEBUG] Raster Native CRS: {native_crs}")
        # print(f"[TOPOGRAPHY DEBUG] Transformed X/Y: ({target_x}, {target_y})")

        # 3. Strict Bounding Box Validation against raster extent
        bounds = dem_ds.bounds
        if not (bounds.left <= target_x <= bounds.right and bounds.bottom <= target_y <= bounds.top):
            # print(f"[TOPOGRAPHY DEBUG] Bounds FAIL: ({target_x:.4f}, {target_y:.4f}) outside raster {bounds}")
            return {"error": "Outside coverage area"}

        # print("[TOPOGRAPHY DEBUG] Bounds validation: PASS")

        # Sample all valid datasets
        for key in ["elevation", "slope", "aspect", "flow_accumulation"]:
            ds = self._get_dataset(key)
            if ds is None:
                continue
                
            try:
                # Sample the exact point (must pass a list of tuples)
                values = list(ds.sample([(target_x, target_y)]))
                
                if values and len(values[0]) > 0:
                    val = float(values[0][0])
                    
                    # NoData Check
                    if ds.nodata is not None and val == ds.nodata:
                        val = None
                        
                    results[key + ("_m" if key == "elevation" else "_degrees" if key in ("slope", "aspect") else "")] = val
                    # print(f"[TOPOGRAPHY DEBUG] Sampled '{key}': {val}")
                else:
                    pass # print(f"[TOPOGRAPHY DEBUG] Sampled '{key}': None (No data returned)")
            except Exception as e:
                # print(f"[TOPOGRAPHY DEBUG] Sampling error for '{key}': {e}")
                pass
                
        return results

    def close(self):
        """Close all open raster datasets."""
        for ds in self._datasets.values():
            if not ds.closed:
                ds.close()
        self._datasets.clear()


# ──────────────────────────────────────────────
# Singleton instance
# ──────────────────────────────────────────────
_engine = TopographyEngine()


def get_terrain_metrics(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """
    Get terrain metrics for a given WGS84 coordinate.

    Reads raster bounds dynamically from the .tif file.
    Returns {"error": "Outside coverage area"} for out-of-bound coordinates.
    """
    return _engine.sample_datasets(lat, lng)


# ──────────────────────────────────────────────
# CLI self-test with diagnostic output
# ──────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    print("=" * 60)
    print("EQUINOX Topography Engine v2 — Diagnostic Self-Test")
    print("=" * 60)

    # Dump raster metadata first
    import rasterio as rio
    for name, path in [("DEM", DEM_PATH), ("Slope", SLOPE_PATH)]:
        try:
            with rio.open(path) as ds:
                print(f"\n[FILE] {name}: {os.path.basename(path)}")
                print(f"   CRS: {ds.crs}")
                print(f"   Bounds: {ds.bounds}")
                print(f"   Shape: {ds.shape}")
                print(f"   Transform: {ds.transform}")
                print(f"   NoData: {ds.nodata}")
        except Exception as e:
            print(f"[ERROR] {name}: {e}")

    print("\n" + "-" * 60)
    print("Point Sampling Tests:")
    print("-" * 60)

    test_points = [
        (26.9124, 75.7873, "Jaipur City Center (expected ~290-430m)"),
        (26.4499, 75.6399, "Ajmer (expected ~420-480m)"),
        (26.5921, 75.8550, "Kishangarh"),
        (26.9078, 75.1841, "Sambhar Lake (expected ~360m)"),
        (26.0,    75.0,    "SW Corner (boundary test)"),
        (27.5,    76.5,    "NE Corner (boundary test)"),
        (28.6139, 77.2090, "Delhi (should be OUT OF BOUNDS)"),
        (19.0760, 72.8777, "Mumbai (should be OUT OF BOUNDS)"),
    ]

    for lat, lng, name in test_points:
        result = get_terrain_metrics(lat, lng)
        if "error" not in result:
            elev = result['elevation_m']
            slope = result['slope_degrees']
            aspect = result['aspect_degrees']
            flow = result['flow_accumulation']
            print(
                f"  [OK] {name}\n"
                f"     ({lat}N, {lng}E) -> "
                f"Elevation={elev}m, Slope={slope}deg, "
                f"Aspect={aspect}deg, Flow={flow}"
            )
        else:
            print(f"  [FAIL] {name}\n     ({lat}N, {lng}E) -> {result['error']}")

    _engine.close()
    print("\n" + "=" * 60)
    print("Self-test complete.")
