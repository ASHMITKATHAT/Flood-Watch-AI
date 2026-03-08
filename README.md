# Equinox Flood-Watch-AI

"FloodWatch AI is an advanced flood prediction and disaster management platform. It combines machine learning, real-time satellite telemetry, and 3D terrain mapping to forecast risks. Featuring a crowdsourced Human Sensor Network, it delivers mission-critical intelligence through a sleek, highly responsive dashboard."

An advanced ML-powered flood prediction and alert system.

## Project Structure

- **frontend/**: React/Vite SPA for the user interface.
- **backend/**: Flask API with extensive ML capabilities.
- **infrastructure/**: Docker and deployment configurations.
- **templates/**: Backend landing page.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (optional)

### Running Locally

#### Backend

1. Navigate to the root directory.
2. Create virtual environment: `python -m venv .venv`
3. Activate: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Linux/Mac)
4. Install dependencies: `pip install -r backend/requirements.txt`
5. Run: `python backend/main.py`

#### Frontend

1. Navigate to `frontend/`: `cd frontend`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

### Docker

Run the entire stack with:
```bash
docker-compose -f infrastructure/docker-compose.yml up --build
```

## API Documentation

Access the API documentation at `http://localhost:5000/docs` (if configured) or the landing page at `http://localhost:5000/`.

## License

MIT
