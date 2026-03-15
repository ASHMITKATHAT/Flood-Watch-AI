import asyncio
import os
import sys

# Ensure backend path is configured to run scripts
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from real_data_integration import DataIntegration
from config import get_config

async def test_nasa_api():
    print("Initializing DataIntegration module...")
    async with DataIntegration() as integrator:
        # Example coordinate (Jaipur, Rajasthan)
        lat = 26.9124
        lng = 75.7873
        
        print(f"\n=============================================")
        print(f"Testing NASA APIs for Coordinates: {lat}, {lng}")
        print(f"=============================================\n")
        
        print(f"Active NASA_API_KEY Configured: {'YES' if os.getenv('NASA_API_KEY') else 'NO'}")
        
        print("\n--- 1. Testing NASA GPM IMERG Rainfall ---")
        try:
            # We explicitly check fetch_nasa_gpm_rainfall (Phase 2)
            rainfall_rate = await integrator.fetch_nasa_gpm_rainfall(lat, lng)
            print(f">>> GPM Rainfall Rate (mm/hr): {rainfall_rate}")
            
            # Additional fetch_nasa_gpm_data check
            rainfall_data = await integrator.fetch_nasa_gpm_data(lat, lng, hours_back=6)
            print(f">>> GPM Hourly Aggregate Data: {rainfall_data.get('hourly_rainfall')}")
            print(f">>> GPM Current Rainfall Data: {rainfall_data.get('rainfall_mm')} mm")
            if 'data_source' in rainfall_data:
                print(f">>> Source Confirmed: {rainfall_data['data_source']}")
                
        except Exception as e:
            print(f"[ERROR] GPM Test Failed: {str(e)}")
            
        print("\n--- 2. Testing NASA SMAP/GLDAS Soil Moisture ---")
        try:
            soil_saturation = await integrator.fetch_nasa_smap_soil(lat, lng)
            print(f">>> Soil Saturation: {soil_saturation}%")
        except Exception as e:
            print(f"[ERROR] SMAP/GLDAS Test Failed: {str(e)}")
            
        print("\n=============================================")
        print("Test Complete.")
        
if __name__ == "__main__":
    asyncio.run(test_nasa_api())
