import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from physics_engine import AdvancedFloodML
from real_data_integration import DataIntegration
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestPrediction")

def test_flood_engine():
    print("\n--- Testing AdvancedFloodML ---")
    try:
        engine = AdvancedFloodML(model_dir='backend/models')
        print("✅ Engine initialized successfully")
        
        # Test default prediction
        features = {
            'rainfall_mm': 50.0,
            'slope_degrees': 5.0,
            'flow_accumulation': 1000.0,
            'elevation_m': 250.0
        }
        
        print(f"🔮 Predicting with features: {features}")
        result = engine.predict(features)
        
        print("\n📊 Prediction Result:")
        print(f"  Risk Category: {result.risk_category}")
        print(f"  Risk Score: {result.risk_score:.2f}")
        print(f"  Water Depth: {result.water_depth_mm:.2f} mm")
        print(f"  Confidence: {result.confidence:.2f}")
        print(f"  Model Used: {result.model_used}")
        print(f"  Contributing Factors: {result.contributing_factors}")
        
    except Exception as e:
        print(f"❌ Error in AdvancedFloodML: {e}")
        import traceback
        traceback.print_exc()

async def test_data_integration():
    print("\n--- Testing DataIntegration ---")
    try:
        async with DataIntegration() as integrator:
            # Test fallback data fetch
            lat, lon = 26.9124, 75.7873
            print(f"🌍 Fetching data for Jodhpur ({lat}, {lon})")
            
            data = await integrator.fetch_all_data(lat, lon)
            
            print("\n📦 Data Result:")
            print(f"  Sources: {list(data['data_sources'].keys())}")
            
            nasa_status = data['data_sources']['nasa_gpm']['status']
            print(f"  NASA Status: {nasa_status}")
            
            weather_status = data['data_sources']['openweather']['status']
            print(f"  Weather Status: {weather_status}")
            
            metrics = data['composite_metrics']
            print(f"  Composite Metrics: {metrics}")
            
    except Exception as e:
        print(f"❌ Error in DataIntegration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_flood_engine()
    # Run async test
    asyncio.run(test_data_integration())
