import os
import re

filename = r'c:\FLOODWATCH_EQUINOX\backend\real_data_integration.py'
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fetch_nasa_gpm_rainfall entirely
new_gpm = '''    async def fetch_nasa_gpm_rainfall(self, lat: float, lng: float) -> float:
        """Fetch NASA POWER precipitation data."""
        try:
            from datetime import datetime, timedelta
            target_date = (datetime.utcnow() - timedelta(days=2)).strftime('%Y%m%d')
            url = 'https://power.larc.nasa.gov/api/temporal/hourly/point'
            params = {
                'parameters': 'PRECTOTCORR',
                'community': 'RE',
                'longitude': lng,
                'latitude': lat,
                'start': target_date,
                'end': target_date,
                'format': 'JSON'
            }
            async with self.session.get(url, params=params, timeout=8.0) as response:
                if response.status == 200:
                    data = await response.json()
                    precip_data = data.get('properties', {}).get('parameter', {}).get('PRECTOTCORR', {})
                    if precip_data:
                        vals = list(precip_data.values())
                        return float(round(vals[-1], 2)) if vals[-1] > 0 else 0.0
                return 0.0
        except Exception as e:
            logger.warning(f"NASA POWER GPM error: {e}")
            return 0.0
'''
content = re.sub(r'    async def fetch_nasa_gpm_rainfall\(self, lat: float, lng: float\) -> float:.*?return 0\.0\n', new_gpm, content, flags=re.DOTALL)

# Replace fetch_nasa_smap_soil entirely
new_smap = '''    async def fetch_nasa_smap_soil(self, lat: float, lng: float) -> float:
        """Fetch NASA POWER soil moisture data."""
        try:
            from datetime import datetime, timedelta
            target_date = (datetime.utcnow() - timedelta(days=2)).strftime('%Y%m%d')
            url = 'https://power.larc.nasa.gov/api/temporal/hourly/point'
            params = {
                'parameters': 'GWETTOP',
                'community': 'RE',
                'longitude': lng,
                'latitude': lat,
                'start': target_date,
                'end': target_date,
                'format': 'JSON'
            }
            async with self.session.get(url, params=params, timeout=8.0) as response:
                if response.status == 200:
                    data = await response.json()
                    soil_data = data.get('properties', {}).get('parameter', {}).get('GWETTOP', {})
                    if soil_data:
                        vals = list(soil_data.values())
                        val = float(vals[-1])
                        # GWETTOP is usually 0 to 1 index, convert to percentage
                        return float(max(0.0, min(100.0, round(val * 100.0, 1))))
                return 0.0
        except Exception as e:
            logger.warning(f"NASA POWER SMAP error: {e}")
            return 0.0
'''
content = re.sub(r'    async def fetch_nasa_smap_soil\(self, lat: float, lng: float\) -> float:.*?return 0\.0\n            return 0\.0\n', new_smap, content, flags=re.DOTALL)

with open(filename, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced functions successfully")
