import sys, traceback
sys.path.append('.')
from real_data_integration import DataIntegration
import asyncio
async def test():
    di = DataIntegration()
    await di.__aenter__()
    try:
        print('Triggering timeout... watch retries in output.')
        precip = await di._fetch_open_meteo_precipitation(26.9124, 75.7873)
        print(precip)
    except Exception as e:
        print(f'\nCAUGHT EXCEPTION: {e}\n')
        traceback.print_exc()
    finally:
        await di.__aexit__(None, None, None)
asyncio.run(test())
