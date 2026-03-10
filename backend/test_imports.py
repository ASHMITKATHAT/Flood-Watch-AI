#!/usr/bin/env python3
"""Quick test to verify all backend requirements import correctly."""

import sys

errors = []
packages = {
    "Flask": lambda: __import__("flask"),
    "flask-cors": lambda: __import__("flask_cors"),
    "python-dotenv": lambda: __import__("dotenv"),
    "FastAPI": lambda: __import__("fastapi"),
    "uvicorn": lambda: __import__("uvicorn"),
    "numpy": lambda: __import__("numpy"),
    "scipy": lambda: __import__("scipy"),
    "pandas": lambda: __import__("pandas"),
    "scikit-learn": lambda: __import__("sklearn"),
    "xgboost": lambda: __import__("xgboost"),
    "lightgbm": lambda: __import__("lightgbm"),
    "joblib": lambda: __import__("joblib"),
    "aiohttp": lambda: __import__("aiohttp"),
    "aiofiles": lambda: __import__("aiofiles"),
    "numba": lambda: __import__("numba"),
    "ujson": lambda: __import__("ujson"),
    "structlog": lambda: __import__("structlog"),
    "requests": lambda: __import__("requests"),
    "psycopg2": lambda: __import__("psycopg2"),
    "tenacity": lambda: __import__("tenacity"),
    "tensorflow": lambda: __import__("tensorflow"),
    "shapely": lambda: __import__("shapely"),
    "pyproj": lambda: __import__("pyproj"),
    "rasterio": lambda: __import__("rasterio"),
    "geopandas": lambda: __import__("geopandas"),
}

for name, importer in packages.items():
    try:
        mod = importer()
        ver = getattr(mod, "__version__", "OK")
        print(f"  [OK] {name}: {ver}")
    except ImportError as e:
        print(f"  [FAIL] {name}: {e}")
        errors.append(name)

print()
if errors:
    print(f"FAILED imports: {', '.join(errors)}")
    sys.exit(1)
else:
    print("ALL IMPORTS SUCCESSFUL!")
    sys.exit(0)
