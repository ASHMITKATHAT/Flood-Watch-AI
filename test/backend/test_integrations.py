"""
Tests for API integrations
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from backend.real_data_integration import DataIntegration

@pytest.fixture
def data_integration():
    """Create a DataIntegration instance"""
    return DataIntegration()

@pytest.mark.asyncio
async def test_fetch_nasa_gpm_data_success():
    """Test successful NASA GPM data fetch"""
    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {
            'precipitation': [0, 5, 10, 15, 20, 25]
        }
        mock_get.return_value.__aenter__.return_value = mock_response
        
        async with DataIntegration() as di:
            result = await di.fetch_nasa_gpm_data(26.2389, 73.0243)
        
        assert result['data_source'] == 'NASA_GPM'
        assert 'rainfall_mm' in result
        assert result['latitude'] == 26.2389

@pytest.mark.asyncio
async def test_fetch_nasa_gpm_data_fallback():
    """Test NASA GPM data fetch with fallback"""
    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 500  # Server error
        mock_get.return_value.__aenter__.return_value = mock_response
        
        async with DataIntegration() as di:
            result = await di.fetch_nasa_gpm_data(26.2389, 73.0243)
        
        assert result['data_source'] == 'fallback'
        assert result['rainfall_mm'] == 0

@pytest.mark.asyncio
async def test_fetch_openweather_data_success():
    """Test successful OpenWeather data fetch"""
    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {
            'main': {
                'temp': 30.5,
                'humidity': 40,
                'pressure': 1013
            },
            'wind': {
                'speed': 5.0,
                'deg': 180
            },
            'clouds': {'all': 20},
            'weather': [{'description': 'clear sky'}]
        }
        mock_get.return_value.__aenter__.return_value = mock_response
        
        async with DataIntegration() as di:
            result = await di.fetch_openweather_data(26.2389, 73.0243)
        
        assert result['data_source'] == 'OpenWeather'
        assert result['temperature_c'] == 30.5
        assert result['humidity_percent'] == 40

@pytest.mark.asyncio
async def test_fetch_isro_lulc_data_success():
    """Test successful ISRO LULC data fetch"""
    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {
            'features': [{
                'properties': {
                    'LULC_CLASS': 'Agriculture',
                    'CLASS_CODE': 3,
                    'CONFIDENCE': 0.8,
                    'URBAN_PCT': 10,
                    'AGRI_PCT': 60,
                    'FOREST_PCT': 10,
                    'WATER_PCT': 5
                }
            }]
        }
        mock_get.return_value.__aenter__.return_value = mock_response
        
        async with DataIntegration() as di:
            result = await di.fetch_isro_lulc_data(26.2389, 73.0243)
        
        assert result['data_source'] == 'ISRO_Bhuvan_LULC'
        assert result['land_use_class'] == 'Agriculture'
        assert result['land_use_code'] == 3

@pytest.mark.asyncio
async def test_fetch_soil_moisture_data():
    """Test soil moisture data derivation"""
    async with DataIntegration() as di:
        with patch.object(di, 'fetch_nasa_gpm_data') as mock_nasa:
            mock_nasa.return_value = {'cumulative_6h': 25}
            
            result = await di.fetch_soil_moisture_data(26.2389, 73.0243)
        
        assert 'soil_moisture' in result
        assert 0 <= result['soil_moisture'] <= 1

@pytest.mark.asyncio
async def test_fetch_all_data_concurrent():
    """Test fetching all data sources concurrently"""
    with patch.object(DataIntegration, 'fetch_nasa_gpm_data') as mock_nasa, \
         patch.object(DataIntegration, 'fetch_openweather_data') as mock_weather, \
         patch.object(DataIntegration, 'fetch_isro_lulc_data') as mock_isro, \
         patch.object(DataIntegration, 'fetch_soil_moisture_data') as mock_soil:
        
        mock_nasa.return_value = {'rainfall_mm': 25}
        mock_weather.return_value = {'temperature_c': 30}
        mock_isro.return_value = {'land_use_class': 'Agriculture'}
        mock_soil.return_value = {'soil_moisture': 0.4}
        
        async with DataIntegration() as di:
            result = await di.fetch_all_data(26.2389, 73.0243)
        
        assert 'coordinates' in result
        assert 'data_sources' in result
        assert 'composite_metrics' in result
        assert len(result['data_sources']) == 4

@pytest.mark.asyncio
async def test_fetch_all_data_with_errors():
    """Test fetching all data with some sources failing"""
    with patch.object(DataIntegration, 'fetch_nasa_gpm_data') as mock_nasa, \
         patch.object(DataIntegration, 'fetch_openweather_data') as mock_weather:
        
        mock_nasa.side_effect = Exception("NASA API error")
        mock_weather.return_value = {'temperature_c': 30}
        
        async with DataIntegration() as di:
            result = await di.fetch_all_data(26.2389, 73.0243)
        
        assert result['data_sources']['nasa_gpm']['status'] == 'failed'
        assert result['data_sources']['openweather']['status'] == 'success'

def test_calculate_composite_metrics():
    """Test composite metrics calculation"""
    di = DataIntegration()
    
    test_data = {
        'data_sources': {
            'nasa_gpm': {'data': {'rainfall_mm': 50}},
            'openweather': {'data': {'humidity_percent': 80}},
            'soil_moisture': {'data': {'soil_moisture': 0.6}}
        }
    }
    
    metrics = di._calculate_composite_metrics(test_data)
    
    assert 'flood_risk_score' in metrics
    assert 'soil_saturation_percent' in metrics
    assert 'runoff_potential' in metrics
    assert 0 <= metrics['flood_risk_score'] <= 100

def test_cache_mechanism():
    """Test data caching mechanism"""
    di = DataIntegration()
    
    # First call should not be cached
    with patch.object(DataIntegration, '_fetch_raw_data') as mock_fetch:
        mock_fetch.return_value = {'test': 'data'}
        result1 = asyncio.run(di._fetch_with_cache('test_key', lambda: {'test': 'data'}))
        assert mock_fetch.called
    
    # Second call should use cache
    with patch.object(DataIntegration, '_fetch_raw_data') as mock_fetch:
        result2 = asyncio.run(di._fetch_with_cache('test_key', lambda: {'new': 'data'}))
        assert not mock_fetch.called
        assert result2['test'] == 'data'

def test_process_nasa_rainfall():
    """Test NASA rainfall data processing"""
    di = DataIntegration()
    
    # Test with valid data
    valid_data = {'precipitation': [10, 20, 30, 40, 50, 60]}
    result = di._process_nasa_rainfall(valid_data)
    assert result['current'] == 60
    assert len(result['hourly']) == 6
    assert result['cumulative_6h'] == 210
    
    # Test with empty data
    empty_data = {}
    result = di._process_nasa_rainfall(empty_data)
    assert result['current'] == 0
    assert result['cumulative_6h'] == 0

def test_process_lulc_data():
    """Test ISRO LULC data processing"""
    di = DataIntegration()
    
    # Test with valid data
    valid_data = {
        'features': [{
            'properties': {
                'LULC_CLASS': 'Forest',
                'CLASS_CODE': 4,
                'CONFIDENCE': 0.9
            }
        }]
    }
    result = di._process_lulc_data(valid_data)
    assert result['primary_class'] == 'Forest'
    assert result['class_code'] == 4
    assert result['confidence'] == 0.9
    
    # Test with fallback
    invalid_data = {}
    result = di._process_lulc_data(invalid_data)
    assert result['primary_class'] == 'Agriculture'
    assert result['class_code'] == 3

def test_save_data_to_cache():
    """Test saving data to cache file"""
    di = DataIntegration()
    test_data = {'test': 'data'}
    
    with patch('builtins.open') as mock_open, \
         patch('json.dump') as mock_dump, \
         patch('os.makedirs') as mock_makedirs:
        
        di.save_data_to_cache(test_data, 'test_type')
        
        mock_makedirs.assert_called_once()
        mock_open.assert_called_once()
        mock_dump.assert_called_once()