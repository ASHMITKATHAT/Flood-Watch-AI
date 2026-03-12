import requests
import sys

def test_nasa_api_key(api_key):
    print(f"Testing NASA API Key: {api_key}")
    
    # Test 1: General api.nasa.gov endpoint (APOD)
    url_apod = f"https://api.nasa.gov/planetary/apod?api_key={api_key}"
    try:
        response = requests.get(url_apod, timeout=10)
        print(f"\n[Test 1] General API (APOD) Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ API Key is VALID for api.nasa.gov endpoints.")
        elif response.status_code == 403:
            print("❌ API Key is INVALID or FORBIDDEN for api.nasa.gov.")
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}. Response: {response.text}")
    except Exception as e:
        print(f"Error testing general API: {e}")

    # Test 2: EARTH imagery endpoint (often associated with satellite requests on api.nasa.gov)
    url_earth = f"https://api.nasa.gov/planetary/earth/assets?lon=100.75&lat=1.5&date=2014-02-01&dim=0.15&api_key={api_key}"
    try:
        response = requests.get(url_earth, timeout=10)
        print(f"\n[Test 2] Earth/Satellite API Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ API Key is VALID for Earth imagery endpoints.")
        elif response.status_code == 403:
            print("❌ API Key is INVALID for Earth imagery endpoints.")
        else:
            print(f"⚠️ Response: {response.text}")
    except Exception as e:
        print(f"Error testing Earth API: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        key = sys.argv[1]
    else:
        key = "QcbYiaBuygHvkbOjTmCYBQgmIa8ZABv2kyOSabDB"
    test_nasa_api_key(key)
