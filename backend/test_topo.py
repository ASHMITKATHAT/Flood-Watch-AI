from topography_engine import TopographyEngine
import time

print("Loading Topography Engine...")
start = time.time()
topo = TopographyEngine()
end = time.time()
print(f"Loaded rasters in {end-start:.2f} seconds.")

# Test location in Rajasthan (Jaipur)
lat, lon = 26.9124, 75.7873

try:
    print(f"Querying topography for {lat}, {lon}...")
    start = time.time()
    data = topo.sample_datasets(lat, lon)
    end = time.time()
    print(f"Queried in {end-start:.2f} seconds.")
    from pprint import pprint
    pprint(data)
    print("✅ Topography integration with new SRTM data is completely successful!")
except Exception as e:
    print(f"❌ Failed: {e}")
