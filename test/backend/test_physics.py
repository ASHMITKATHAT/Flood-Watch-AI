"""
Tests for physics engine and D8 hydrology
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pytest
import numpy as np
from backend.advanced_physics import D8Hydrology, calculate_runoff_coefficient, calculate_time_of_concentration
from backend.physics_engine import FloodPhysicsEngine

@pytest.fixture
def sample_dem():
    """Create a sample DEM for testing"""
    # Create a simple 5x5 DEM with a depression in the middle
    dem = np.array([
        [100, 100, 100, 100, 100],
        [100, 80, 80, 80, 100],
        [100, 80, 70, 80, 100],
        [100, 80, 80, 80, 100],
        [100, 100, 100, 100, 100]
    ], dtype=np.float32)
    return dem

@pytest.fixture
def d8_hydrology():
    """Create D8 hydrology instance"""
    return D8Hydrology()

def test_d8_flow_direction(sample_dem):
    """Test D8 flow direction calculation"""
    d8 = D8Hydrology()
    
    with pytest.raises(Exception):
        # Should fail without DEM loaded
        d8._d8_flow_direction(sample_dem)
    
    # Test with manual calculation
    d8.dem = sample_dem
    flow_dir = d8._d8_flow_direction(sample_dem)
    
    assert flow_dir.shape == sample_dem.shape
    # Center cell should be a sink (255)
    assert flow_dir[2, 2] == 255
    # Edge cells should have valid flow directions
    assert flow_dir[0, 0] != 255

def test_d8_flow_accumulation():
    """Test flow accumulation calculation"""
    d8 = D8Hydrology()
    
    # Create a simple flow direction matrix
    flow_dir = np.array([
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],  # All flow east
        [0, 1, 1, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
    ], dtype=np.uint8)
    
    flow_acc = d8._d8_flow_accumulation(flow_dir)
    
    assert flow_acc.shape == flow_dir.shape
    # Last column should have highest accumulation
    assert np.argmax(flow_acc[2]) == 4

def test_sink_detection(sample_dem):
    """Test hydrological sink detection"""
    d8 = D8Hydrology()
    d8.dem = sample_dem
    
    sinks = d8.detect_sinks(sample_dem, min_size=1)
    
    assert sinks.shape == sample_dem.shape
    # Center should be detected as sink
    assert sinks[2, 2] == True
    # Corners should not be sinks
    assert sinks[0, 0] == False

def test_fill_sinks(sample_dem):
    """Test sink filling algorithm"""
    d8 = D8Hydrology()
    
    filled = d8._fill_sinks(sample_dem)
    
    assert filled.shape == sample_dem.shape
    # Center should be raised
    assert filled[2, 2] >= 80
    # Original high points should remain
    assert filled[0, 0] == 100

def test_calculate_slope(sample_dem):
    """Test slope calculation"""
    d8 = D8Hydrology()
    
    slope, aspect = d8._calculate_slope(sample_dem)
    
    assert slope.shape == sample_dem.shape
    assert aspect.shape == sample_dem.shape
    # Center should have low slope (depression)
    assert slope[2, 2] < slope[0, 0]
    # Values should be in degrees
    assert np.all(slope >= 0)

def test_calculate_flow_path(d8_hydrology):
    """Test flow path calculation"""
    # Create a simple flow direction matrix
    flow_dir = np.array([
        [1, 1, 1, 1, 1],  # All flow east
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1]
    ], dtype=np.uint8)
    
    path = d8_hydrology.calculate_flow_path(0, 0, flow_dir)
    
    assert len(path) > 0
    # Should flow to the east edge
    assert path[-1][1] == 4  # Last column

def test_analyze_watershed(d8_hydrology):
    """Test watershed analysis"""
    # Mock the necessary attributes
    d8_hydrology.flow_direction = np.ones((5, 5), dtype=np.uint8)
    d8_hydrology.flow_accumulation = np.ones((5, 5), dtype=np.float32)
    d8_hydrology.slope = np.zeros((5, 5), dtype=np.float32)
    
    watershed = d8_hydrology.analyze_watershed(2, 2, 
                                               d8_hydrology.flow_direction,
                                               d8_hydrology.flow_accumulation)
    
    assert 'area_sq_km' in watershed
    assert 'cell_count' in watershed
    assert 'max_flow_accumulation' in watershed
    assert 'mean_slope_degrees' in watershed

def test_calculate_time_of_concentration():
    """Test time of concentration calculation"""
    # Test with valid inputs
    tc = calculate_time_of_concentration(1000, 0.01)  # 1km length, 1% slope
    assert tc > 0
    assert isinstance(tc, float)
    
    # Test with zero slope (should return default)
    tc_zero = calculate_time_of_concentration(1000, 0)
    assert tc_zero == 60
    
    # Test with roughness adjustment
    tc_rough = calculate_time_of_concentration(1000, 0.01, 0.1)
    assert tc_rough > tc  # Higher roughness should increase time

def test_calculate_runoff_coefficient():
    """Test runoff coefficient calculation"""
    # Test urban area
    coeff_urban = calculate_runoff_coefficient('clay', 'urban', 0.5)
    assert 0.7 <= coeff_urban <= 0.9
    
    # Test forest area
    coeff_forest = calculate_runoff_coefficient('sand', 'forest', 0.3)
    assert 0.1 <= coeff_forest <= 0.3
    
    # Test with high antecedent moisture
    coeff_wet = calculate_runoff_coefficient('loam', 'agriculture', 0.9)
    coeff_dry = calculate_runoff_coefficient('loam', 'agriculture', 0.1)
    assert coeff_wet > coeff_dry
    
    # Test bounds
    coeff = calculate_runoff_coefficient('rock', 'built_up', 1.0)
    assert 0.1 <= coeff <= 0.95

def test_physics_engine_initialization():
    """Test physics engine initialization"""
    engine = FloodPhysicsEngine()
    
    assert engine.d8 is not None
    assert hasattr(engine, 'models')
    assert hasattr(engine, 'scaler')

def test_extract_features():
    """Test feature extraction"""
    engine = FloodPhysicsEngine()
    
    # Mock D8 attributes
    engine.d8.slope = np.array([[2.5]])
    engine.d8.flow_accumulation = np.array([[10]])
    engine.d8.sinks = np.array([[0]])
    
    features = engine.extract_features(26.2389, 73.0243, 50.0)
    
    assert 'rainfall_mm' in features
    assert 'slope_degrees' in features
    assert 'flow_accumulation' in features
    assert 'soil_moisture' in features
    assert features['rainfall_mm'] == 50.0

def test_physics_prediction():
    """Test physics-based prediction"""
    engine = FloodPhysicsEngine()
    
    test_features = {
        'rainfall_mm': 50.0,
        'slope_degrees': 2.5,
        'flow_accumulation': 12.3,
        'soil_moisture': 0.4,
        'land_use_code': 3,
        'sink_depth': 0,
        'distance_to_sink': 500
    }
    
    depth = engine._physics_prediction(test_features)
    
    assert isinstance(depth, float)
    assert depth >= 0
    assert depth <= 500  # Should not exceed max depth

def test_ai_prediction():
    """Test AI-based prediction"""
    engine = FloodPhysicsEngine()
    
    test_features = {
        'rainfall_mm': 50.0,
        'slope_degrees': 2.5,
        'flow_accumulation': 12.3,
        'soil_moisture': 0.4,
        'antecedent_moisture': 0.6,
        'land_use_code': 3,
        'distance_to_sink': 500,
        'sink_depth': 0,
        'time_of_concentration': 30
    }
    
    # Test with untrained models (should fall back to physics)
    depth = engine._ai_prediction(test_features)
    assert isinstance(depth, float)
    
    # Test with mocked trained models
    with pytest.raises(Exception):
        # This would test with actual model prediction
        pass

def test_predict_flood_depth():
    """Test complete flood depth prediction"""
    engine = FloodPhysicsEngine()
    
    test_features = {
        'rainfall_mm': 50.0,
        'slope_degrees': 2.5,
        'flow_accumulation': 12.3,
        'soil_moisture': 0.4,
        'antecedent_moisture': 0.6,
        'land_use_code': 3,
        'distance_to_sink': 500,
        'sink_depth': 0,
        'time_of_concentration': 30,
        'row': 0,
        'col': 0,
        'lat': 26.2389,
        'lon': 73.0243
    }
    
    prediction = engine.predict_flood_depth(test_features)
    
    assert 'physics_depth_cm' in prediction
    assert 'ai_depth_cm' in prediction
    assert 'predicted_depth_cm' in prediction
    assert 'risk_level' in prediction
    assert 'confidence' in prediction
    assert 'time_to_flood_minutes' in prediction

def test_calculate_risk_level():
    """Test risk level calculation"""
    engine = FloodPhysicsEngine()
    
    assert engine._calculate_risk_level(5) == 'green'
    assert engine._calculate_risk_level(25) == 'yellow'
    assert engine._calculate_risk_level(75) == 'orange'
    assert engine._calculate_risk_level(125) == 'red'

def test_calculate_time_to_flood():
    """Test time to flood calculation"""
    engine = FloodPhysicsEngine()
    
    test_features = {
        'rainfall_mm': 50.0,
        'time_of_concentration': 30,
        'distance_to_sink': 100
    }
    
    time = engine._calculate_time_to_flood(test_features, 75)
    
    assert isinstance(time, float)
    assert 5 <= time <= 120  # Within bounds

def test_village_risk_prediction():
    """Test village risk prediction"""
    engine = FloodPhysicsEngine()
    
    # Test with single point
    result = engine.predict_village_risk('Test Village', 50.0)
    
    assert 'village_name' in result
    assert 'overall_risk' in result
    assert 'max_depth_cm' in result
    
    # Test with boundary
    boundary = [
        [26.23, 73.02],
        [26.24, 73.02],
        [26.24, 73.03],
        [26.23, 73.03]
    ]
    
    result_with_boundary = engine.predict_village_risk('Test Village', 50.0, boundary)
    assert 'affected_area_percentage' in result_with_boundary
    assert 'population_at_risk' in result_with_boundary