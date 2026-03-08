# 🌊 EQUINOX: Flood Intelligence Backend

> A Python-based Machine Learning Inference Server powering the EQUINOX early-warning dashboard.

## Overview
This backend operates as the core computational engine for the EQUINOX system. It loads a pre-trained `scikit-learn` Random Forest architecture into a lighting-fast FastAPI wrapper, constantly interacting with a Supabase PostgreSQL instance to calculate and broadcast real-time flood predictions.

## Stack & Architecture
- **Framework:** FastAPI / Uvicorn (ASGI)
- **Data Engineering:** Pandas & NumPy
- **Machine Learning:** Scikit-Learn (Joblib)
- **Database:** Supabase (PostgreSQL / PostgREST)

## Directory Structure
- `main.py` - Core server, REST endpoints, and the autonomous Supabase ingestion Background Task.
- `doomsday_sim.py` - Hackathon Pitch Script: Simulates a rapid 2-minute catastrophic flood scenario.
- `performance_monitor.py` - ASGI Middleware to natively track Request/Response Latency in MS.
- `data_backup.py` - A cron-like utility scheduler dumping Supabase records into JSON payloads locally.
- `feature_store.py` - ML Feature Pipeline. Sanitizes live telemetry against required topographical baseline constants.
- `gunicorn.conf.py` - Production worker configuration.
- `models/` - Storage for compiled `.pkl` joblib weights (e.g., `random_forest_model.pkl`).

## Configuration
Requires a `.env` file at the root of `backend/`:
```env
SUPABASE_URL=https://<YOUR_INSTANCE>.supabase.co
SUPABASE_KEY=<YOUR_SERVICE_KEY>
```

## Running the Server
```bash
# Develop
python main.py

# Production
gunicorn -c gunicorn.conf.py main:app
```
