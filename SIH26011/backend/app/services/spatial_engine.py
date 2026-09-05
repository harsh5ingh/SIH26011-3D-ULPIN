from typing import List, Tuple, Dict, Any
from shapely.geometry import Polygon, Point
import numpy as np

class SpatialEngine:
    """
    Volumetric Cadastre Spatial Engine using Shapely 2D Footprint + Vertical Bounds (Zmin, Zmax).
    """

    @staticmethod
    def create_polygon(coords: List[List[float]]) -> Polygon:
        """Create Shapely Polygon from list of [lng, lat] coordinates."""
        if len(coords) < 3:
            raise ValueError("Polygon must have at least 3 points")
        # Ensure closed polygon
        if coords[0] != coords[-1]:
            coords = coords + [coords[0]]
        return Polygon(coords)

    @staticmethod
    def calculate_area(coords: List[List[float]]) -> float:
        """Calculate approximate ground surface area in square meters."""
        poly = SpatialEngine.create_polygon(coords)
        # Approximate conversion for lat/lon in degrees to meters (~111,000m per degree)
        lat_avg = np.mean([p[1] for p in coords])
        lat_factor = 111000.0
        lon_factor = 111000.0 * np.cos(np.radians(lat_avg))
        
        # Scale coordinates to meters relative to origin
        scaled_pts = [((p[0] - coords[0][0]) * lon_factor, (p[1] - coords[0][1]) * lat_factor) for p in coords]
        scaled_poly = Polygon(scaled_pts)
        return float(scaled_poly.area)

    @staticmethod
    def calculate_volume(coords: List[List[float]], z_min: float, z_max: float) -> float:
        """Calculate volumetric capacity (m^3) given footprint and Z range."""
        area = SpatialEngine.calculate_area(coords)
        height = max(0.0, z_max - z_min)
        return float(area * height)

    @staticmethod
    def check_containment_2d(inner_coords: List[List[float]], outer_coords: List[List[float]]) -> Tuple[bool, float]:
        """
        Check if inner polygon is fully contained inside outer polygon.
        Returns (is_contained, containment_percentage).
        """
        inner = SpatialEngine.create_polygon(inner_coords)
        outer = SpatialEngine.create_polygon(outer_coords)
        
        if outer.contains(inner):
            return True, 100.0
        
        intersection = outer.intersection(inner)
        if inner.area == 0:
            return False, 0.0
        
        pct = (intersection.area / inner.area) * 100.0
        return pct >= 99.9, float(pct)

    @staticmethod
    def check_overlap_2d(poly1_coords: List[List[float]], poly2_coords: List[List[float]]) -> Tuple[bool, float]:
        """
        Check 2D horizontal footprint overlap between two polygons.
        Returns (has_overlap, overlap_area_sqm).
        """
        p1 = SpatialEngine.create_polygon(poly1_coords)
        p2 = SpatialEngine.create_polygon(poly2_coords)
        
        if not p1.intersects(p2):
            return False, 0.0
        
        intersection = p1.intersection(p2)
        if intersection.area < 1e-7:
            return False, 0.0
            
        # Convert area to sqm
        lat_avg = np.mean([pt[1] for pt in poly1_coords])
        lat_factor = 111000.0
        lon_factor = 111000.0 * np.cos(np.radians(lat_avg))
        sqm = intersection.area * lat_factor * lon_factor
        return True, float(sqm)

    @staticmethod
    def check_vertical_overlap(z_min1: float, z_max1: float, z_min2: float, z_max2: float, tolerance: float = 0.05) -> Tuple[bool, float]:
        """
        Check vertical elevation overlap between two 3D height ranges.
        Returns (has_overlap, overlap_height_m).
        """
        overlap_min = max(z_min1, z_min2)
        overlap_max = min(z_max1, z_max2)
        overlap_height = overlap_max - overlap_min
        
        if overlap_height > tolerance:
            return True, float(overlap_height)
        return False, 0.0

    @staticmethod
    def check_3d_volumetric_overlap(
        coords1: List[List[float]], z_min1: float, z_max1: float,
        coords2: List[List[float]], z_min2: float, z_max2: float
    ) -> Tuple[bool, float]:
        """
        Check full 3D volumetric overlap between two property units.
        Returns (has_overlap, overlap_volume_cum).
        """
        has_2d, overlap_sqm = SpatialEngine.check_overlap_2d(coords1, coords2)
        if not has_2d:
            return False, 0.0
            
        has_vert, overlap_m = SpatialEngine.check_vertical_overlap(z_min1, z_max1, z_min2, z_max2)
        if not has_vert:
            return False, 0.0
            
        overlap_vol = overlap_sqm * overlap_m
        return True, float(overlap_vol)

    @staticmethod
    def get_bounding_box_3d(coords: List[List[float]], z_min: float, z_max: float) -> Dict[str, float]:
        """Compute 3D axis-aligned bounding box."""
        lngs = [p[0] for p in coords]
        lats = [p[1] for p in coords]
        return {
            "min_lng": float(min(lngs)),
            "max_lng": float(max(lngs)),
            "min_lat": float(min(lats)),
            "max_lat": float(max(lats)),
            "min_z_m": float(z_min),
            "max_z_m": float(z_max)
        }

spatial_engine = SpatialEngine()
