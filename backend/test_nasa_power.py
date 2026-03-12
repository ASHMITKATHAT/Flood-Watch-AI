import requests
from datetime import datetime, timedelta

def test_nasa_power_api():
    print("Testing NASA POWER API used by app...")
    lat, lon = 26.9124, 75.7873
    target_date = (datetime.utcnow() - timedelta(days=5)).strftime('%Y%m%d')
    
    url = 'https://power.larc.nasa.gov/api/temporal/hourly/point'
    params = {
        'parameters': 'PRECTOTCORR',
        'community': 'RE',
        'longitude': lon,
        'latitude': lat,
        'start': target_date,
        'end': target_date,
        'format': 'JSON'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ NASA POWER API is working!")
            data = response.json()
            precip = data.get("properties", {}).get("parameter", {}).get("PRECTOTCORR", {})
            print(f"Data received: {len(precip)} hourly entries.")
        else:
            print(f"❌ API failed. Response: {response.text}")
    except Exception as e:
        print(f"Error connecting to NASA POWER API: {e}")

if __name__ == "__main__":
    test_nasa_power_api()
