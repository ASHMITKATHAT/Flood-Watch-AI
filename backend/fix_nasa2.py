import os

filename = r'c:\FLOODWATCH_EQUINOX\backend\real_data_integration.py'
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

start1 = content.find('    async def fetch_nasa_gpm_rainfall')
end1 = content.find('    async def fetch_nasa_smap_soil')
if start1 != -1 and end1 != -1:
    old_gpm = content[start1:end1]
    new_gpm = """    async def fetch_nasa_gpm_rainfall(self, lat: float, lng: float) -> float:
        \"\"\"Fetch NASA POWER precipitation data.\"\"\"
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

"""
    content = content.replace(old_gpm, new_gpm)

start2 = content.find('    async def fetch_nasa_smap_soil')
end2 = content.find('    async def fetch_nasa_gpm_data')
if start2 != -1 and end2 != -1:
    old_smap = content[start2:end2]
    new_smap = """    async def fetch_nasa_smap_soil(self, lat: float, lng: float) -> float:
        \"\"\"Fetch NASA POWER soil moisture data.\"\"\"
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

"""
    content = content.replace(old_smap, new_smap)

with open(filename, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File updated. Sizes: GPM replaced={start1!=-1}, SMAP replaced={start2!=-1}")
