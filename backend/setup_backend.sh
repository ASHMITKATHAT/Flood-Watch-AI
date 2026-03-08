#!/bin/bash

# EQUINOX Flood Watch Backend Setup Script

echo "Setting up EQUINOX Flood Watch Backend..."

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "Creating directory structure..."
mkdir -p data/dem data/villages data/historical data/realtime data/ml_datasets
mkdir -p models logs uploads/reports

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please update .env file with your API keys"
fi

# Download sample DEM data (if not present)
if [ ! -f data/dem/rajasthan_dem.tif ]; then
    echo "Downloading sample DEM data..."
    # This would download from ISRO Bhuvan or other source
    # For now, create a placeholder
    echo "DEM data placeholder - replace with actual DEM" > data/dem/rajasthan_dem.tif
fi

# Initialize database (if using SQL)
echo "Initializing database..."
python -c "
from config import get_config
config = get_config()
print('Configuration loaded successfully')
print(f'Data directory: {config.DATA_DIR}')
"

# Create default models
echo "Creating default ML models..."
python -c "
from physics_engine import FloodPhysicsEngine
engine = FloodPhysicsEngine()
print('Physics engine initialized successfully')
"

echo ""
echo "Setup complete!"
echo ""
echo "To run the backend:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Update .env file with your API keys"
echo "3. Run: python app.py"
echo ""
echo "Or for production:"
echo "gunicorn --worker-class eventlet -w 1 app:app"