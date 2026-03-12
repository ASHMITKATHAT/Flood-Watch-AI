import time
from topography_engine import get_terrain_metrics

def test():
    t0 = time.time()
    for i in range(400):
        # Jaipur
        get_terrain_metrics(26.9124, 75.7873)
    t1 = time.time()
    print(f"Time taken: {t1 - t0:.2f} seconds")

if __name__ == '__main__':
    test()
