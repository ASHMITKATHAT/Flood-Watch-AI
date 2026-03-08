"""
EQUINOX Flood Watch - Advanced Physics Module
Implements D8 Algorithm for hydrological flow analysis
"""

import numpy as np
import rasterio
from rasterio.windows import Window
from numba import jit
import logging
from typing import Tuple, Dict, List, Optional
from scipy import ndimage
from config import get_config

config = get_config()
logger = logging.getLogger(__name__)

class D8Hydrology:
    """
    D8 Algorithm implementation for flow direction and accumulation
    Based on O'Callaghan & Mark (1984) algorithm
    """
    
    # D8 flow direction encoding (ESRI standard)
    D8_DIRECTIONS = {
        1: (0, 1),    # East
        2: (1, 1),    # Southeast
        4: (1, 0),    # South
        8: (1, -1),   # Southwest
        16: (0, -1),  # West
        32: (-1, -1), # Northwest
        64: (-1, 0),  # North
        128: (-1, 1)  # Northeast
    }
    
    D8_OPPOSITE = {
        1: 16, 16: 1,
        2: 32, 32: 2,
        4: 64, 64: 4,
        8: 128, 128: 8
    }
    
    def __init__(self, dem_path: str = None):
        """
        Initialize D8 hydrology processor
        
        Args:
            dem_path: Path to Digital Elevation Model (DEM) TIFF file
        """
        self.dem_path = dem_path or config.RAJASTHAN_DEM_PATH
        self.cell_size = config.CELL_SIZE
        self.dem = None
        self.flow_direction = None
        self.flow_accumulation = None
        self.sinks = None
        
    def load_dem(self) -> np.ndarray:
        """
        Load DEM data from TIFF file
        
        Returns:
            DEM array
        """
        try:
            with rasterio.open(self.dem_path) as src:
                self.dem = src.read(1)
                self.transform = src.transform
                self.crs = src.crs
                self.shape = src.shape
                
            logger.info(f"Loaded DEM with shape {self.shape}")
            return self.dem
            
        except Exception as e:
            logger.error(f"Error loading DEM: {str(e)}")
            raise
    
    @jit(nopython=True)
    def _calculate_slope(self, dem: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate slope and aspect using finite differences
        
        Args:
            dem: Digital elevation model array
            
        Returns:
            Tuple of (slope, aspect) arrays
        """
        rows, cols = dem.shape
        slope = np.zeros_like(dem, dtype=np.float32)
        aspect = np.zeros_like(dem, dtype=np.float32)
        
        for i in range(1, rows-1):
            for j in range(1, cols-1):
                # Finite differences
                dz_dx = (dem[i, j+1] - dem[i, j-1]) / (2 * config.CELL_SIZE)
                dz_dy = (dem[i-1, j] - dem[i+1, j]) / (2 * config.CELL_SIZE)
                
                # Slope (in degrees)
                slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
                slope[i, j] = np.degrees(slope_rad)
                
                # Aspect
                if dz_dx != 0:
                    aspect_rad = np.arctan2(dz_dy, dz_dx)
                    aspect_deg = 90 - np.degrees(aspect_rad)
                    if aspect_deg < 0:
                        aspect_deg += 360
                    aspect[i, j] = aspect_deg
        
        return slope, aspect
    
    @jit(nopython=True)
    def _d8_flow_direction(self, dem: np.ndarray) -> np.ndarray:
        """
        Calculate D8 flow direction
        
        Args:
            dem: Digital elevation model array
            
        Returns:
            Flow direction array encoded with D8 values
        """
        rows, cols = dem.shape
        flow_dir = np.zeros_like(dem, dtype=np.uint8)
        
        # Pre-calculate all possible slopes
        for i in range(1, rows-1):
            for j in range(1, cols-1):
                max_slope = -np.inf
                best_dir = 0
                current_elev = dem[i, j]
                
                # Check all 8 neighbors
                directions = [
                    (0, 1, 1),    # East
                    (1, 1, 2),    # Southeast
                    (1, 0, 4),    # South
                    (1, -1, 8),   # Southwest
                    (0, -1, 16),  # West
                    (-1, -1, 32), # Northwest
                    (-1, 0, 64),  # North
                    (-1, 1, 128)  # Northeast
                ]
                
                for di, dj, code in directions:
                    ni, nj = i + di, j + dj
                    if 0 <= ni < rows and 0 <= nj < cols:
                        slope = (current_elev - dem[ni, nj]) / (np.sqrt(di*di + dj*dj) * config.CELL_SIZE)
                        if slope > max_slope and slope > 0:
                            max_slope = slope
                            best_dir = code
                
                # If no downhill neighbor, it's a sink/pit
                if best_dir == 0:
                    flow_dir[i, j] = 255  # Mark as sink
                else:
                    flow_dir[i, j] = best_dir
        
        return flow_dir
    
    @jit(nopython=True)
    def _d8_flow_accumulation(self, flow_dir: np.ndarray) -> np.ndarray:
        """
        Calculate flow accumulation using D8 directions
        
        Args:
            flow_dir: Flow direction array
            
        Returns:
            Flow accumulation array
        """
        rows, cols = flow_dir.shape
        flow_acc = np.ones_like(flow_dir, dtype=np.float32)
        
        # Create list of cells in order of flow
        cell_order = []
        for i in range(rows):
            for j in range(cols):
                if flow_dir[i, j] != 255:  # Not a sink
                    cell_order.append((i, j))
        
        # Sort by elevation (approximation)
        cell_order.sort(key=lambda x: -x[0]*cols + x[1])
        
        # Calculate accumulation
        for i, j in cell_order:
            if flow_dir[i, j] != 255:
                # Find downstream cell
                dir_code = flow_dir[i, j]
                if dir_code in D8Hydrology.D8_DIRECTIONS:
                    di, dj = D8Hydrology.D8_DIRECTIONS[dir_code]
                    ni, nj = i + di, j + dj
                    if 0 <= ni < rows and 0 <= nj < cols:
                        flow_acc[ni, nj] += flow_acc[i, j]
        
        return flow_acc
    
    def detect_sinks(self, dem: np.ndarray, min_size: int = 10) -> np.ndarray:
        """
        Detect hydrological sinks (depressions) in DEM
        
        Args:
            dem: Digital elevation model
            min_size: Minimum sink size in cells
            
        Returns:
            Binary array where 1 indicates sink
        """
        # Fill pits/sinks
        filled_dem = self._fill_sinks(dem)
        
        # Difference between filled and original DEM
        sink_depth = filled_dem - dem
        
        # Threshold for meaningful sinks
        sink_mask = (sink_depth > 0.1)  # At least 10cm depth
        
        # Remove small sinks (noise)
        sink_mask = ndimage.binary_opening(sink_mask, structure=np.ones((3,3)))
        
        # Label connected components
        labeled_sinks, num_sinks = ndimage.label(sink_mask)
        
        # Filter by size
        sink_sizes = ndimage.sum(sink_mask, labeled_sinks, range(num_sinks + 1))
        mask_size = sink_sizes >= min_size
        
        # Create final sink mask
        self.sinks = mask_size[labeled_sinks]
        
        logger.info(f"Detected {num_sinks} sinks, {np.sum(self.sinks)} significant cells")
        return self.sinks
    
    @staticmethod
    @jit(nopython=True)
    def _fill_sinks(dem: np.ndarray) -> np.ndarray:
        """
        Simple sink filling algorithm
        
        Args:
            dem: Input DEM
            
        Returns:
            DEM with sinks filled
        """
        filled = dem.copy()
        rows, cols = dem.shape
        
        for i in range(1, rows-1):
            for j in range(1, cols-1):
                # Find minimum neighbor
                min_neighbor = np.inf
                for di in [-1, 0, 1]:
                    for dj in [-1, 0, 1]:
                        if di == 0 and dj == 0:
                            continue
                        ni, nj = i + di, j + dj
                        min_neighbor = min(min_neighbor, filled[ni, nj])
                
                # If cell is lower than all neighbors, raise it
                if filled[i, j] < min_neighbor:
                    filled[i, j] = min_neighbor
        
        return filled
    
    def calculate_flow_path(self, start_row: int, start_col: int, 
                           flow_dir: np.ndarray) -> List[Tuple[int, int]]:
        """
        Calculate flow path from a starting point
        
        Args:
            start_row: Starting row index
            start_col: Starting column index
            flow_dir: Flow direction array
            
        Returns:
            List of (row, col) coordinates along flow path
        """
        path = [(start_row, start_col)]
        rows, cols = flow_dir.shape
        
        current_row, current_col = start_row, start_col
        
        while True:
            dir_code = flow_dir[current_row, current_col]
            
            if dir_code == 255 or dir_code == 0:  # Sink or no data
                break
            
            if dir_code in self.D8_DIRECTIONS:
                di, dj = self.D8_DIRECTIONS[dir_code]
                next_row, next_col = current_row + di, current_col + dj
                
                # Check bounds
                if 0 <= next_row < rows and 0 <= next_col < cols:
                    # Check for cycles
                    if (next_row, next_col) in path:
                        break
                    
                    path.append((next_row, next_col))
                    current_row, current_col = next_row, next_col
                else:
                    break
            else:
                break
        
        return path
    
    def analyze_watershed(self, outlet_row: int, outlet_col: int,
                         flow_dir: np.ndarray, flow_acc: np.ndarray) -> Dict:
        """
        Analyze watershed characteristics
        
        Args:
            outlet_row: Outlet row index
            outlet_col: Outlet column index
            flow_dir: Flow direction array
            flow_acc: Flow accumulation array
            
        Returns:
            Dictionary with watershed metrics
        """
        rows, cols = flow_dir.shape
        
        # Create watershed mask
        watershed_mask = np.zeros_like(flow_dir, dtype=bool)
        stack = [(outlet_row, outlet_col)]
        
        while stack:
            i, j = stack.pop()
            
            if watershed_mask[i, j]:
                continue
                
            watershed_mask[i, j] = True
            
            # Find upstream neighbors
            for dir_code, (di, dj) in self.D8_DIRECTIONS.items():
                ni, nj = i - di, j - dj  # Opposite direction
                if 0 <= ni < rows and 0 <= nj < cols:
                    if flow_dir[ni, nj] == dir_code:
                        stack.append((ni, nj))
        
        # Calculate metrics
        area = np.sum(watershed_mask) * (self.cell_size ** 2) / 1e6  # sq km
        max_flow_acc = np.max(flow_acc[watershed_mask])
        mean_slope = np.mean(self.slope[watershed_mask]) if hasattr(self, 'slope') else 0
        
        return {
            'area_sq_km': area,
            'cell_count': np.sum(watershed_mask),
            'max_flow_accumulation': max_flow_acc,
            'mean_slope_degrees': mean_slope,
            'mask': watershed_mask
        }
    
    def process_complete(self, save_results: bool = True) -> Dict:
        """
        Complete D8 processing pipeline
        
        Args:
            save_results: Whether to save results to files
            
        Returns:
            Dictionary with all processed data
        """
        logger.info("Starting complete D8 processing pipeline")
        
        # Load DEM
        dem = self.load_dem()
        
        # Calculate slope and aspect
        logger.info("Calculating slope and aspect")
        self.slope, self.aspect = self._calculate_slope(dem)
        
        # Calculate flow direction
        logger.info("Calculating D8 flow direction")
        self.flow_direction = self._d8_flow_direction(dem)
        
        # Calculate flow accumulation
        logger.info("Calculating flow accumulation")
        self.flow_accumulation = self._d8_flow_accumulation(self.flow_direction)
        
        # Detect sinks
        logger.info("Detecting hydrological sinks")
        self.sinks = self.detect_sinks(dem)
        
        # Calculate drainage density
        flow_paths = np.sum(self.flow_accumulation > 1)
        total_area = dem.size * (self.cell_size ** 2)
        drainage_density = flow_paths * self.cell_size / total_area
        
        logger.info(f"Drainage density: {drainage_density:.6f}")
        
        results = {
            'dem': dem,
            'slope': self.slope,
            'aspect': self.aspect,
            'flow_direction': self.flow_direction,
            'flow_accumulation': self.flow_accumulation,
            'sinks': self.sinks,
            'drainage_density': drainage_density,
            'transform': self.transform,
            'crs': self.crs
        }
        
        if save_results:
            self.save_results(results)
        
        logger.info("D8 processing completed successfully")
        return results
    
    def save_results(self, results: Dict):
        """Save processing results to TIFF files"""
        try:
            from rasterio.transform import from_origin
            
            # Save slope
            slope_path = config.SLOPE_PATH
            with rasterio.open(
                slope_path, 'w',
                driver='GTiff',
                height=results['slope'].shape[0],
                width=results['slope'].shape[1],
                count=1,
                dtype=results['slope'].dtype,
                crs=results['crs'],
                transform=results['transform']
            ) as dst:
                dst.write(results['slope'], 1)
            
            # Save flow accumulation
            flow_acc_path = config.FLOW_ACCUMULATION_PATH
            with rasterio.open(
                flow_acc_path, 'w',
                driver='GTiff',
                height=results['flow_accumulation'].shape[0],
                width=results['flow_accumulation'].shape[1],
                count=1,
                dtype=results['flow_accumulation'].dtype,
                crs=results['crs'],
                transform=results['transform']
            ) as dst:
                dst.write(results['flow_accumulation'], 1)
            
            logger.info(f"Results saved to {slope_path} and {flow_acc_path}")
            
        except Exception as e:
            logger.error(f"Error saving results: {str(e)}")
    
    def get_cell_coordinates(self, lat: float, lon: float) -> Tuple[int, int]:
        """
        Convert geographic coordinates to cell indices
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Tuple of (row, column) indices
        """
        if not hasattr(self, 'transform'):
            self.load_dem()
        
        # Convert geographic to raster coordinates
        col = int((lon - self.transform[2]) / self.transform[0])
        row = int((lat - self.transform[5]) / self.transform[4])
        
        return row, col
    
    def get_geographic_coordinates(self, row: int, col: int) -> Tuple[float, float]:
        """
        Convert cell indices to geographic coordinates
        
        Args:
            row: Row index
            col: Column index
            
        Returns:
            Tuple of (latitude, longitude)
        """
        if not hasattr(self, 'transform'):
            self.load_dem()
        
        lon = self.transform[2] + col * self.transform[0]
        lat = self.transform[5] + row * self.transform[4]
        
        return lat, lon

# Utility functions
def calculate_time_of_concentration(flow_length: float, slope: float, 
                                   roughness: float = 0.05) -> float:
    """
    Calculate time of concentration using Kirpich formula
    
    Args:
        flow_length: Length of longest flow path (meters)
        slope: Average slope (m/m)
        roughness: Manning's roughness coefficient
        
    Returns:
        Time of concentration in minutes
    """
    if slope <= 0:
        return 60  # Default value for flat areas
    
    # Kirpich formula (minutes)
    tc = 0.0078 * (flow_length ** 0.77) * (slope ** -0.385)
    
    # Adjust for roughness
    tc_adjusted = tc * (roughness / 0.05) ** 0.6
    
    return max(tc_adjusted, 5)  # Minimum 5 minutes

def calculate_runoff_coefficient(soil_type: str, land_use: str, 
                                antecedent_moisture: float) -> float:
    """
    Calculate runoff coefficient based on soil and land use
    
    Args:
        soil_type: Soil type (sand, clay, loam, etc.)
        land_use: Land use type (urban, forest, agriculture, etc.)
        antecedent_moisture: Antecedent moisture condition (0-1)
        
    Returns:
        Runoff coefficient (0-1)
    """
    # Base coefficients by land use
    base_coefficients = {
        'urban': 0.75,
        'built_up': 0.70,
        'agriculture': 0.40,
        'forest': 0.20,
        'grassland': 0.30,
        'barren': 0.60,
        'water': 1.00
    }
    
    # Soil type adjustments
    soil_adjustments = {
        'sand': -0.15,
        'loamy_sand': -0.10,
        'sandy_loam': -0.05,
        'loam': 0.00,
        'silt_loam': 0.05,
        'clay_loam': 0.10,
        'clay': 0.15,
        'rock': 0.20
    }
    
    # Get base coefficient
    coeff = base_coefficients.get(land_use.lower(), 0.50)
    
    # Apply soil adjustment
    coeff += soil_adjustments.get(soil_type.lower(), 0.00)
    
    # Apply antecedent moisture adjustment
    coeff += (antecedent_moisture * 0.2)
    
    # Bound between 0.1 and 0.95
    return max(0.1, min(0.95, coeff))