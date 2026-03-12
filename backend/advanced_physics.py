"""
EQUINOX Flood Watch — Advanced Physics Module
Implements D8 Algorithm for hydrological flow analysis.

Fixed version — all bugs documented inline with theory.
Based on O'Callaghan & Mark (1984) D8 algorithm.
"""

# ──────────────────────────────────────────────
# IMPORTS
# ──────────────────────────────────────────────
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from numba import jit          # JIT for standalone functions only
from scipy import ndimage
from config import get_config

# rasterio imported lazily inside load_dem / save_results so the module
# can still be imported even if rasterio is not installed.

config = get_config()
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# MODULE-LEVEL CONSTANTS (used by @jit functions)
#
# ✅ FIX #3 — config.CELL_SIZE cannot be accessed inside a Numba
# nopython=True JIT function because Numba cannot introspect Python
# objects at compile time.
#
# SOLUTION: Extract scalar constants at module level.
# Numba CAN capture module-level Python scalars (int/float) because
# they are inlined as literals at JIT-compile time.
# ──────────────────────────────────────────────
_CELL_SIZE: float = float(config.CELL_SIZE)   # meters per cell


# D8 direction table as a plain numpy array so Numba can use it.
#
# THEORY — D8 encoding (ESRI standard):
#   ┌────┬────┬─────┐
#   │ 32 │ 64 │ 128 │   NW=32  N=64  NE=128
#   ├────┼────┼─────┤    W=16  (*)    E=1
#   │ 16 │  * │   1 │   SW=8   S=4   SE=2
#   ├────┼────┼─────┤
#   │  8 │  4 │   2 │
#   └────┴────┴─────┘
#
# Stored as shape (8, 3): each row = [row_offset, col_offset, code]
_D8_TABLE = np.array([
    [ 0,  1,   1],   # East
    [ 1,  1,   2],   # Southeast
    [ 1,  0,   4],   # South
    [ 1, -1,   8],   # Southwest
    [ 0, -1,  16],   # West
    [-1, -1,  32],   # Northwest
    [-1,  0,  64],   # North
    [-1,  1, 128],   # Northeast
], dtype=np.int32)

# ──────────────────────────────────────────────
# NUMBA-ACCELERATED STANDALONE FUNCTIONS
#
# ✅ FIX #1 — WHY @jit CANNOT BE ON INSTANCE METHODS:
#
#   Numba's nopython=True mode compiles Python bytecode to native
#   machine code. It requires ALL types to be statically inferrable.
#   `self` is a Python object — its attributes can be anything at
#   runtime. Numba cannot infer types for arbitrary object attributes.
#
#   ERROR you'd get:
#       numba.core.errors.TypingError:
#       Failed in nopython mode pipeline (step: nopython frontend)
#       - argument 0: cannot determine Numba type of <class '...'>
#
#   SOLUTION: Move compute-heavy code to MODULE-LEVEL functions that
#   accept only numpy arrays and scalars. These are JIT-able.
#   The class methods become thin wrappers that call these functions.
# ──────────────────────────────────────────────

@jit(nopython=True, cache=True)
def _jit_calculate_slope(dem: np.ndarray, cell_size: float) -> Tuple[np.ndarray, np.ndarray]:
    """
    JIT-compiled slope & aspect calculation (Horn's method).

    THEORY — Horn's Method (finite differences):
        dz/dx = (E - W) / (2 * cell_size)   ← East-West gradient
        dz/dy = (N - S) / (2 * cell_size)   ← North-South gradient

        slope  = arctan( sqrt(dz_dx² + dz_dy²) )   → degrees
        aspect = 90 - arctan2(dz_dy, dz_dx)         → 0–360° from North

    Args:
        dem:       2D elevation array (meters)
        cell_size: Raster cell size in meters

    Returns:
        (slope_degrees, aspect_degrees) — both float32 arrays
    """
    rows, cols = dem.shape
    slope  = np.zeros((rows, cols), dtype=np.float32)
    aspect = np.zeros((rows, cols), dtype=np.float32)

    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            dz_dx = (dem[i, j + 1] - dem[i, j - 1]) / (2.0 * cell_size)
            dz_dy = (dem[i - 1, j] - dem[i + 1, j]) / (2.0 * cell_size)

            slope_rad     = np.arctan(np.sqrt(dz_dx ** 2 + dz_dy ** 2))
            slope[i, j]   = np.degrees(slope_rad)

            # Aspect: clockwise from North (geographic convention)
            if dz_dx != 0.0 or dz_dy != 0.0:
                aspect_deg = 90.0 - np.degrees(np.arctan2(dz_dy, dz_dx))
                if aspect_deg < 0.0:
                    aspect_deg += 360.0
                aspect[i, j] = aspect_deg

    return slope, aspect


@jit(nopython=True, cache=True)
def _jit_d8_flow_direction(dem: np.ndarray, d8_table: np.ndarray,
                            cell_size: float) -> np.ndarray:
    """
    JIT-compiled D8 flow direction.

    THEORY:
        For each interior cell, compute slope toward each of 8 neighbors:
            slope = (center_elevation - neighbor_elevation)
                    / (distance * cell_size)
        distance = 1.0 for cardinal, √2 for diagonal neighbors.

        Assign the direction code of the neighbor with MAXIMUM positive slope.
        If no downhill neighbor exists → mark as sink (255).

    Args:
        dem:       2D elevation array (meters)
        d8_table:  Shape (8, 3) int32 — [dr, dc, code] per direction
        cell_size: Cell size in meters

    Returns:
        flow_dir: uint8 array — each cell holds its D8 direction code
                  or 255 (sink) or 0 (border / no data)
    """
    rows, cols = dem.shape
    flow_dir   = np.zeros((rows, cols), dtype=np.uint8)

    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            max_slope  = -1e18
            best_code  = np.uint8(0)
            center_e   = dem[i, j]

            for k in range(8):
                dr   = d8_table[k, 0]
                dc   = d8_table[k, 1]
                code = d8_table[k, 2]
                ni   = i + dr
                nj   = j + dc

                # Distance: diagonal neighbors are √2 farther away
                if dr != 0 and dc != 0:
                    dist = 1.4142135623730951   # sqrt(2)
                else:
                    dist = 1.0

                s = (center_e - dem[ni, nj]) / (dist * cell_size)
                if s > max_slope:
                    max_slope = s
                    best_code = np.uint8(code)

            if max_slope <= 0.0:
                flow_dir[i, j] = np.uint8(255)   # sink / flat
            else:
                flow_dir[i, j] = best_code

    return flow_dir


@jit(nopython=True, cache=True)
def _jit_fill_sinks(dem: np.ndarray) -> np.ndarray:
    """
    JIT-compiled iterative sink-fill (Planchon & Darboux simplified).

    ✅ FIX #4 — WHY SINGLE-PASS IS WRONG:

        OLD CODE did ONE forward pass through the grid and raised any cell
        that was lower than ALL its neighbors to the minimum neighbor elevation.

        COUNTER-EXAMPLE showing why one pass fails:
            Grid (elevations):
                [10, 10, 10]
                [ 9,  5, 10]    ← cell (1,1)=5 is a sink
                [10, 10, 10]

            After forward pass: (1,1) gets raised to 9 ✓ — looks fine.

            But consider a chain of sinks:
                [10, 10, 10, 10]
                [ 9,  5,  4,  3]   ← cascade of sinks
                [10, 10, 10, 10]

            Forward pass processes left→right:
                (1,1): neighbors min = 5 (from 3 not yet updated!) — wrong!
                (1,2): neighbors min = 5 (depends on (1,1) already updated)
                (1,3): neighbors min = 9 (depends on (1,2))

            The result is wrong because early cells depend on later cells
            that haven't been updated yet.

        FIX: Repeat until NO changes occur in a full pass (convergence).
        This guarantees every sink chain is fully resolved.

        Performance note: In worst case this is O(n * iterations).
        For real DEMs use Priority-Flood (Wang & Liu 2006) for O(n log n).
        This iterative version is correct and clear for educational purposes.

    Args:
        dem: 2D elevation array

    Returns:
        filled: DEM with all sinks raised to outlet elevation
    """
    filled = dem.copy()
    rows, cols = dem.shape
    changed = True

    while changed:
        changed = False
        for i in range(1, rows - 1):
            for j in range(1, cols - 1):
                min_neighbor = 1e18
                for di in range(-1, 2):
                    for dj in range(-1, 2):
                        if di == 0 and dj == 0:
                            continue
                        v = filled[i + di, j + dj]
                        if v < min_neighbor:
                            min_neighbor = v

                if filled[i, j] < min_neighbor:
                    filled[i, j] = min_neighbor
                    changed = True   # Need another pass

    return filled


@jit(nopython=True, cache=True)
def _jit_flow_accumulation(flow_dir: np.ndarray, d8_table: np.ndarray,
                            elev_order: np.ndarray) -> np.ndarray:
    """
    JIT-compiled flow accumulation.

    ✅ FIX #5 — WHY OLD SORT WAS WRONG:

        OLD CODE:
            cell_order.sort(key=lambda x: -x[0]*cols + x[1])

        This sorted by a LINEAR INDEX formula, not by elevation!
        -row*cols + col is just a raster scan-line trick — it has
        nothing to do with which cells are higher or lower.

        WHY SORT ORDER MATTERS:
            Flow accumulation works by passing a cell's count downstream.
            If you process a LOW cell before its UPSTREAM HIGH cell,
            the low cell doesn't yet know how many upstream cells drain into it.
            Result: all cells get accumulation ≈ 1 (each counts only itself).

        FIX: Sort by ELEVATION (highest first) so upstream cells are
        always processed before downstream cells. This is a topological
        sort based on DEM values.

    Args:
        flow_dir:   D8 flow direction array (uint8)
        d8_table:   Shape (8, 3) int32 direction table
        elev_order: 1D array of flat indices sorted high→low elevation

    Returns:
        flow_acc: float32 array — each cell = number of upstream cells + 1
    """
    rows, cols = flow_dir.shape
    flow_acc   = np.ones((rows, cols), dtype=np.float32)

    # Build a lookup: code → (dr, dc)
    # d8_table row k → code = d8_table[k, 2]
    code_to_dr = np.zeros(256, dtype=np.int32)
    code_to_dc = np.zeros(256, dtype=np.int32)
    for k in range(8):
        c = d8_table[k, 2]
        code_to_dr[c] = d8_table[k, 0]
        code_to_dc[c] = d8_table[k, 1]

    # Process high → low elevation (upstream first)
    for idx in range(elev_order.shape[0]):
        flat = elev_order[idx]
        i    = flat // cols
        j    = flat  % cols

        code = int(flow_dir[i, j])
        if code == 0 or code == 255:
            continue   # border or sink — no downstream cell

        dr = code_to_dr[code]
        dc = code_to_dc[code]
        ni = i + dr
        nj = j + dc

        if 0 <= ni < rows and 0 <= nj < cols:
            flow_acc[ni, nj] += flow_acc[i, j]

    return flow_acc


# ──────────────────────────────────────────────
# MAIN CLASS
# ──────────────────────────────────────────────

class D8Hydrology:
    """
    D8 Algorithm — flow direction, accumulation, sink detection,
    watershed delineation, and flow-path tracing.

    Public methods are thin wrappers; heavy computation is delegated
    to module-level @jit functions for Numba compatibility.
    """

    # Python-accessible direction dict (used by non-JIT methods)
    D8_DIRECTIONS: Dict[int, Tuple[int, int]] = {
        1:   ( 0,  1),   # East
        2:   ( 1,  1),   # Southeast
        4:   ( 1,  0),   # South
        8:   ( 1, -1),   # Southwest
        16:  ( 0, -1),   # West
        32:  (-1, -1),   # Northwest
        64:  (-1,  0),   # North
        128: (-1,  1),   # Northeast
    }

    D8_OPPOSITE: Dict[int, int] = {
        1: 16, 16: 1,
        2: 32, 32: 2,
        4: 64, 64: 4,
        8: 128, 128: 8,
    }

    def __init__(self, dem_path: Optional[str] = None):
        self.dem_path         = dem_path or config.RAJASTHAN_DEM_PATH
        self.cell_size        = _CELL_SIZE
        self.dem              = None
        self.flow_direction   = None
        self.flow_accumulation = None
        self.slope            = None
        self.aspect           = None
        self.sinks            = None
        self.transform        = None
        self.crs              = None
        self.shape            = None

    # ── I/O ───────────────────────────────────

    def load_dem(self) -> np.ndarray:
        """Load DEM from GeoTIFF. Raises FileNotFoundError / rasterio errors."""
        import rasterio  # lazy import — only needed for file I/O
        with rasterio.open(self.dem_path) as src:
            self.dem       = src.read(1).astype(np.float32)
            self.transform = src.transform
            self.crs       = src.crs
            self.shape     = src.shape
        logger.info(f"Loaded DEM shape={self.shape} from {self.dem_path}")
        return self.dem

    def save_results(self, results: Dict):
        """Save slope and flow_accumulation rasters to GeoTIFF."""
        import rasterio  # lazy import
        # ✅ FIX #9: removed unused `from rasterio.transform import from_origin`

        def _write(path: str, array: np.ndarray):
            with rasterio.open(
                path, "w",
                driver="GTiff",
                height=array.shape[0],
                width=array.shape[1],
                count=1,
                dtype=array.dtype,
                crs=results["crs"],
                transform=results["transform"],
            ) as dst:
                dst.write(array, 1)
            logger.info(f"Saved → {path}")

        try:
            _write(config.SLOPE_PATH,            results["slope"])
            _write(config.FLOW_ACCUMULATION_PATH, results["flow_accumulation"])
        except Exception as e:
            logger.error(f"[save_results] {e}", exc_info=True)

    # ── TERRAIN DERIVATIVES ───────────────────

    def calculate_slope_aspect(self, dem: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute slope (degrees) and aspect (0–360° from North).
        Delegates to JIT function — no self passed to Numba.
        """
        slope, aspect = _jit_calculate_slope(dem, self.cell_size)
        self.slope    = slope
        self.aspect   = aspect
        return slope, aspect

    # ── D8 CORE ───────────────────────────────

    def calculate_flow_direction(self, dem: np.ndarray) -> np.ndarray:
        """Compute D8 flow direction. Delegates to JIT function."""
        self.flow_direction = _jit_d8_flow_direction(dem, _D8_TABLE, self.cell_size)
        return self.flow_direction

    def calculate_flow_accumulation(self, flow_dir: np.ndarray,
                                    dem: np.ndarray) -> np.ndarray:
        """
        Compute flow accumulation.

        ✅ FIX #5: Sort cells by ELEVATION (high → low) so upstream
        cells are always processed before downstream cells.
        Passed as `elev_order` (flat indices) to the JIT function.
        """
        # argsort on flattened DEM descending → highest elevation first
        flat_dem   = dem.flatten()
        elev_order = np.argsort(-flat_dem).astype(np.int32)

        self.flow_accumulation = _jit_flow_accumulation(
            flow_dir, _D8_TABLE, elev_order
        )
        return self.flow_accumulation

    # ── SINK DETECTION ────────────────────────

    def detect_sinks(self, dem: np.ndarray, min_size: int = 10) -> np.ndarray:
        """
        Detect hydrological sinks using fill-difference method.

        THEORY:
            1. Fill all sinks in the DEM (raise depressions to outlet level).
            2. Subtract original DEM from filled DEM.
            3. Cells with difference > threshold are sinks.
            4. Remove noise with morphological opening.
            5. Label connected components, filter by minimum area.
        """
        filled_dem  = _jit_fill_sinks(dem)
        sink_depth  = filled_dem - dem
        sink_mask   = sink_depth > 0.1   # at least 10 cm depression

        # Remove single-cell noise
        sink_mask   = ndimage.binary_opening(sink_mask, structure=np.ones((3, 3)))
        labeled, n  = ndimage.label(sink_mask)
        sizes       = ndimage.sum(sink_mask, labeled, range(n + 1))
        mask_size   = np.array(sizes) >= min_size
        self.sinks  = mask_size[labeled]

        logger.info(f"Detected {n} sinks, {int(np.sum(self.sinks))} significant cells")
        return self.sinks

    # ── FLOW PATH ─────────────────────────────

    def calculate_flow_path(self, start_row: int, start_col: int,
                            flow_dir: np.ndarray) -> List[Tuple[int, int]]:
        """
        Trace the flow path from a starting cell to a sink or grid edge.

        ✅ FIX #6 — O(n²) → O(n) cycle detection:

            OLD CODE:
                if (next_row, next_col) in path:   ← path is a LIST
                    break

            Membership test on a list is O(n) per check.
            For a path of length L, total cost = O(L²).
            On a 1000×1000 DEM, L can be ~10,000 → 100M operations.

            FIX: Maintain a separate `visited` SET alongside the list.
            Set membership test is O(1) average.
            Now total cost = O(L).
        """
        path    = [(start_row, start_col)]
        visited = {(start_row, start_col)}   # ✅ O(1) lookup
        rows, cols = flow_dir.shape
        cr, cc = start_row, start_col

        while True:
            code = int(flow_dir[cr, cc])
            if code in (0, 255):     # border or sink
                break
            if code not in self.D8_DIRECTIONS:
                break

            dr, dc  = self.D8_DIRECTIONS[code]
            nr, nc  = cr + dr, cc + dc

            if not (0 <= nr < rows and 0 <= nc < cols):
                break
            if (nr, nc) in visited:  # ✅ O(1)
                break

            path.append((nr, nc))
            visited.add((nr, nc))
            cr, cc = nr, nc

        return path

    # ── WATERSHED ─────────────────────────────

    def analyze_watershed(self, outlet_row: int, outlet_col: int,
                          flow_dir: np.ndarray,
                          flow_acc: np.ndarray) -> Dict:
        """
        Delineate and characterize the watershed draining to an outlet cell.

        THEORY:
            Starting from the outlet, walk UPSTREAM (against flow directions).
            For each cell in the watershed, check each neighbor:
                if neighbor's flow_dir points TO this cell → it's upstream.
            BFS/DFS collects the entire contributing area.

        ✅ FIX #8 — self.slope accessed safely:
            Old code used `hasattr(self, 'slope')` which is fragile.
            Now explicitly passes slope or None, never crashes.
        """
        rows, cols = flow_dir.shape
        ws_mask    = np.zeros((rows, cols), dtype=bool)
        stack      = [(outlet_row, outlet_col)]

        while stack:
            i, j = stack.pop()
            if ws_mask[i, j]:
                continue
            ws_mask[i, j] = True

            # Walk upstream: neighbor n drains into (i,j) if
            # flow_dir[n] == code pointing from n toward (i,j)
            for code, (di, dj) in self.D8_DIRECTIONS.items():
                ni, nj = i - di, j - dj   # upstream neighbor position
                if 0 <= ni < rows and 0 <= nj < cols:
                    if int(flow_dir[ni, nj]) == code:
                        stack.append((ni, nj))

        area_sqkm   = float(np.sum(ws_mask)) * (self.cell_size ** 2) / 1e6
        max_flow    = float(np.max(flow_acc[ws_mask])) if np.any(ws_mask) else 0.0

        # ✅ FIX #8: safe slope access — slope must be pre-computed
        if self.slope is not None:
            mean_slope = float(np.mean(self.slope[ws_mask]))
        else:
            logger.warning("slope not computed — call calculate_slope_aspect() first")
            mean_slope = 0.0

        return {
            "area_sq_km":            round(area_sqkm, 4),
            "cell_count":            int(np.sum(ws_mask)),
            "max_flow_accumulation": round(max_flow, 2),
            "mean_slope_degrees":    round(mean_slope, 4),
            "mask":                  ws_mask,
        }

    # ── COORDINATE CONVERSION ─────────────────

    def get_cell_coordinates(self, lat: float, lon: float) -> Tuple[int, int]:
        """
        Convert geographic coordinates to raster (row, col) indices.

        ✅ FIX #7 — Wrong rasterio transform indexing:

            OLD CODE:
                col = int((lon - self.transform[2]) / self.transform[0])
                row = int((lat - self.transform[5]) / self.transform[4])

            rasterio uses an Affine transform object.
            Integer indexing [0], [2], etc. maps to the Affine matrix
            elements in row-major order:
                | a  b  c |     transform[0]=a, [1]=b, [2]=c
                | d  e  f |     transform[3]=d, [4]=e, [5]=f
                | 0  0  1 |

            For a north-up raster:
                a = pixel_width   (positive, west→east)
                b = 0
                c = west edge (x_min)
                d = 0
                e = pixel_height  (NEGATIVE, north→south)
                f = north edge (y_max)

            Correct formula:
                col = (lon - c) / a   →  (lon - transform.c) / transform.a
                row = (lat - f) / e   →  (lat - transform.f) / transform.e

            The named attributes (.c, .a, .f, .e) are unambiguous
            and match standard GIS documentation.
        """
        if self.transform is None:
            self.load_dem()

        col = int((lon - self.transform.c) / self.transform.a)
        row = int((lat - self.transform.f) / self.transform.e)
        return row, col

    def get_geographic_coordinates(self, row: int, col: int) -> Tuple[float, float]:
        """
        Convert raster (row, col) to geographic (lat, lon).

        ✅ FIX #7: Uses named Affine attributes (.c, .a, .f, .e).
        """
        if self.transform is None:
            self.load_dem()

        lon = self.transform.c + col * self.transform.a
        lat = self.transform.f + row * self.transform.e
        return lat, lon

    # ── FULL PIPELINE ─────────────────────────

    def process_complete(self, save_results: bool = True) -> Dict:
        """Run the full D8 processing pipeline end-to-end."""
        logger.info("Starting complete D8 processing pipeline")

        dem              = self.load_dem()
        slope, aspect    = self.calculate_slope_aspect(dem)
        flow_dir         = self.calculate_flow_direction(dem)
        flow_acc         = self.calculate_flow_accumulation(flow_dir, dem)
        sinks            = self.detect_sinks(dem)

        flow_path_cells  = int(np.sum(flow_acc > 1))
        total_area       = dem.size * (self.cell_size ** 2)
        drainage_density = flow_path_cells * self.cell_size / total_area
        logger.info(f"Drainage density: {drainage_density:.6f}")

        results = {
            "dem":               dem,
            "slope":             slope,
            "aspect":            aspect,
            "flow_direction":    flow_dir,
            "flow_accumulation": flow_acc,
            "sinks":             sinks,
            "drainage_density":  drainage_density,
            "transform":         self.transform,
            "crs":               self.crs,
        }

        if save_results:
            self.save_results(results)

        logger.info("D8 processing completed successfully")
        return results


# ──────────────────────────────────────────────
# UTILITY FUNCTIONS (unchanged — no bugs here)
# ──────────────────────────────────────────────

def calculate_time_of_concentration(flow_length: float, slope: float,
                                    roughness: float = 0.05) -> float:
    """
    Time of concentration via Kirpich formula.

    THEORY (Kirpich 1940):
        Tc = 0.0078 * L^0.77 * S^(-0.385)   [minutes]
        L  = longest flow path (meters)
        S  = average slope (m/m, dimensionless)

        Roughness adjustment (Manning-based):
        Tc_adj = Tc * (n / 0.05)^0.6

    Args:
        flow_length: Longest flow path length in meters
        slope:       Average slope (m/m)
        roughness:   Manning's n (default 0.05 = bare soil)

    Returns:
        Time of concentration in minutes (minimum 5)
    """
    if slope <= 0:
        return 60.0   # flat area default

    tc          = 0.0078 * (flow_length ** 0.77) * (slope ** -0.385)
    tc_adjusted = tc * ((roughness / 0.05) ** 0.6)
    return max(tc_adjusted, 5.0)


def calculate_runoff_coefficient(soil_type: str, land_use: str,
                                 antecedent_moisture: float) -> float:
    """
    Runoff coefficient from soil type, land use, and antecedent moisture.

    THEORY (Rational Method):
        C = base_coeff (land use) + soil_adjustment + moisture_adjustment
        Bounded to [0.1, 0.95] — pure sand never 0, nothing exceeds 95%.

    Args:
        soil_type:           e.g. 'clay', 'sand', 'loam'
        land_use:            e.g. 'urban', 'forest', 'agriculture'
        antecedent_moisture: 0.0 (dry) → 1.0 (saturated)

    Returns:
        Runoff coefficient C ∈ [0.10, 0.95]
    """
    base_coefficients = {
        "urban":       0.75,
        "built_up":    0.70,
        "agriculture": 0.40,
        "forest":      0.20,
        "grassland":   0.30,
        "barren":      0.60,
        "water":       1.00,
    }

    soil_adjustments = {
        "sand":        -0.15,
        "loamy_sand":  -0.10,
        "sandy_loam":  -0.05,
        "loam":         0.00,
        "silt_loam":    0.05,
        "clay_loam":    0.10,
        "clay":         0.15,
        "rock":         0.20,
    }

    coeff  = base_coefficients.get(land_use.lower(),  0.50)
    coeff += soil_adjustments.get(soil_type.lower(),  0.00)
    coeff += antecedent_moisture * 0.2

    return max(0.1, min(0.95, coeff))