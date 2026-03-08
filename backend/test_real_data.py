import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from real_data_integration import DataIntegration
import neon_db as db

async def test_live_apis():
    print("Initializing Real-Time Data Pipeline...")
    print(f"OpenWeather Key Configured: {bool(os.getenv('OPENWEATHER_API_KEY'))}")
    print(f"ISRO Key Configured: {bool(os.getenv('ISRO_LULC_API_KEY'))}")
    print(f"NASA Key Configured: {bool(os.getenv('NASA_API_KEY'))}")
    
    lat = 26.9124
    lon = 75.7873
    
    async with DataIntegration() as integration:
        print(f"Fetching multispectral real data for coordinates: {lat}, {lon}")
        data = await integration.fetch_all_data(lat, lon)
        
        print("\n--- Live Data Received ---")
        weather_data = data.get('data_sources', {}).get('openweather', {}).get('data', {})
        print(f"🌡️ Temperature: {weather_data.get('temperature_c')}°C")
        print(f"☁️ Weather: {weather_data.get('weather_description')}")
        
        soil_data = data.get('data_sources', {}).get('soil_moisture', {}).get('data', {})
        print(f"🌱 Soil Moisture: {soil_data.get('soil_moisture_percent')}%")
        
        nasa_data = data.get('data_sources', {}).get('nasa_gpm', {}).get('data', {})
        print(f"🌧️ NASA Precipitation: {nasa_data.get('rainfall_mm')} mm")
        
        print("\nPushing combined live telemetry to Neon DB sensor_data...")
        metrics = data.get('composite_metrics', {})
        risk_score = metrics.get('flood_risk_score', 0)
        risk_level = "critical" if risk_score > 75 else "warning" if risk_score > 40 else "safe"
        
        payload = {
            "location_id": "API-LIVE-JPR",
            "latitude": lat,
            "longitude": lon,
            "moisture": soil_data.get('soil_moisture_percent', 35.0),
            "water_level": metrics.get('runoff_potential', 0) / 10.0,
            "water_flow": weather_data.get('wind_speed_mps', 5.0) * 10,
            "risk_level": risk_level
        }
        try:
            db.insert_row("sensor_data", payload)
            print("✅ Successfully injected real API telemetry into EQUINOX DB!")
        except Exception as e:
            print(f"❌ Failed to push to DB: {e}")

if __name__ == "__main__":
    asyncio.run(test_live_apis())
