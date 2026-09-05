from typing import List, Dict, Any, Tuple
from app.models.entities import (
    PropertyUnit, Building, Parcel, Floor, Evidence,
    ValidationResult, ValidationStatus, ValidationSeverity
)
from app.services.spatial_engine import spatial_engine
import uuid
from datetime import datetime

class ValidationEngine:
    """
    Deterministic Topology Validation Engine for GeoVISTA 3D Cadastre.
    Enforces 9 strict spatial and vertical validation rules.
    """

    def validate_property(
        self,
        property_unit: PropertyUnit,
        all_units: List[PropertyUnit],
        building: Building,
        parcel: Parcel,
        floors: List[Floor],
        evidences: List[Evidence]
    ) -> List[ValidationResult]:
        """Execute all 9 validation rules on a given property unit."""
        results: List[ValidationResult] = []
        
        # Rule 1: Parcel Containment
        results.append(self._rule_01_parcel_containment(property_unit, parcel))
        
        # Rule 2: Building Association
        results.append(self._rule_02_building_association(property_unit, building))
        
        # Rule 3: Zmin < Zmax
        results.append(self._rule_03_height_bounds(property_unit))
        
        # Rule 4: Horizontal Unit Overlap (Units on same floor)
        results.append(self._rule_04_horizontal_unit_overlap(property_unit, all_units))
        
        # Rule 5: Vertical Unit Overlap (Units on adjacent floors / underground)
        results.append(self._rule_05_vertical_overlap(property_unit, all_units))
        
        # Rule 6: Floor Monotonicity
        results.append(self._rule_06_floor_monotonicity(property_unit, floors))
        
        # Rule 7: Missing Evidence
        results.append(self._rule_07_missing_evidence(property_unit, evidences))
        
        # Rule 8: Geometry Validity
        results.append(self._rule_08_geometry_validity(property_unit))
        
        # Rule 9: Cross-Source Conflict
        results.append(self._rule_09_cross_source_conflict(property_unit, evidences, building))
        
        return results

    def _rule_01_parcel_containment(self, unit: PropertyUnit, parcel: Parcel) -> ValidationResult:
        is_contained, pct = spatial_engine.check_containment_2d(unit.footprint_2d, parcel.geometry_2d)
        if is_contained:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_01",
                rule_name="Parcel Containment",
                category="2D_TOPOLOGY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message=f"Unit footprint is fully contained within parent parcel {parcel.parcel_code} ({pct:.1f}% containment).",
                details={"containment_percentage": pct, "parcel_code": parcel.parcel_code}
            )
        else:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_01",
                rule_name="Parcel Containment",
                category="2D_TOPOLOGY",
                status=ValidationStatus.FAIL,
                severity=ValidationSeverity.CRITICAL,
                message=f"Unit footprint extends beyond parent parcel {parcel.parcel_code} boundary ({pct:.1f}% containment).",
                details={"containment_percentage": pct, "parcel_code": parcel.parcel_code}
            )

    def _rule_02_building_association(self, unit: PropertyUnit, building: Building) -> ValidationResult:
        if unit.building_id == building.id:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_02",
                rule_name="Building Association",
                category="HIERARCHY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message=f"Property unit correctly associated with parent building {building.building_code}.",
                details={"building_id": building.id, "building_code": building.building_code}
            )
        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_02",
            rule_name="Building Association",
            category="HIERARCHY",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.HIGH,
            message="Property unit has invalid or missing parent building reference.",
            details={"unit_building_id": unit.building_id, "actual_building_id": building.id}
        )

    def _rule_03_height_bounds(self, unit: PropertyUnit) -> ValidationResult:
        if unit.z_max_m > unit.z_min_m:
            height = unit.z_max_m - unit.z_min_m
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_03",
                rule_name="Height Bounds Validity",
                category="3D_GEOMETRY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message=f"Valid vertical height span: {height:.2f}m (Zmin: {unit.z_min_m:.2f}m, Zmax: {unit.z_max_m:.2f}m).",
                details={"z_min_m": unit.z_min_m, "z_max_m": unit.z_max_m, "height_m": height}
            )
        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_03",
            rule_name="Height Bounds Validity",
            category="3D_GEOMETRY",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Invalid Z elevation bounds: Zmin ({unit.z_min_m}m) >= Zmax ({unit.z_max_m}m).",
            details={"z_min_m": unit.z_min_m, "z_max_m": unit.z_max_m}
        )

    def _rule_04_horizontal_unit_overlap(self, unit: PropertyUnit, all_units: List[PropertyUnit]) -> ValidationResult:
        same_floor_units = [u for u in all_units if u.building_id == unit.building_id and u.floor_number == unit.floor_number and u.id != unit.id]
        
        overlapping_units = []
        for other in same_floor_units:
            has_overlap, sqm = spatial_engine.check_overlap_2d(unit.footprint_2d, other.footprint_2d)
            if has_overlap and sqm > 0.1:
                overlapping_units.append((other.unit_number, sqm))

        if not overlapping_units:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_04",
                rule_name="Horizontal Unit Overlap",
                category="2D_TOPOLOGY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message="No horizontal footprint overlap detected with other units on the same floor.",
                details={"same_floor_unit_count": len(same_floor_units)}
            )
        
        conflict_desc = ", ".join([f"Unit {u[0]} ({u[1]:.2f}m²)" for u in overlapping_units])
        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_04",
            rule_name="Horizontal Unit Overlap",
            category="2D_TOPOLOGY",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Horizontal footprint overlap detected on Floor {unit.floor_number} with: {conflict_desc}.",
            details={"conflicts": overlapping_units}
        )

    def _rule_05_vertical_overlap(self, unit: PropertyUnit, all_units: List[PropertyUnit]) -> ValidationResult:
        other_units = [u for u in all_units if u.building_id == unit.building_id and u.id != unit.id]
        
        vertical_conflicts = []
        for other in other_units:
            has_overlap, vol_cum = spatial_engine.check_3d_volumetric_overlap(
                unit.footprint_2d, unit.z_min_m, unit.z_max_m,
                other.footprint_2d, other.z_min_m, other.z_max_m
            )
            if has_overlap and vol_cum > 0.1:
                vertical_conflicts.append({
                    "unit_number": other.unit_number,
                    "floor_number": other.floor_number,
                    "overlap_vol_m3": round(vol_cum, 2),
                    "other_z_min": other.z_min_m,
                    "other_z_max": other.z_max_m
                })

        if not vertical_conflicts:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_05",
                rule_name="Vertical Elevation Overlap",
                category="3D_TOPOLOGY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message="No 3D volumetric elevation overlap detected with any other property units.",
                details={"checked_units": len(other_units)}
            )
        
        conflict_str = "; ".join([f"Unit {c['unit_number']} (Floor {c['floor_number']}, Z:{c['other_z_min']}–{c['other_z_max']}m, {c['overlap_vol_m3']}m³)" for c in vertical_conflicts])
        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_05",
            rule_name="Vertical Elevation Overlap",
            category="3D_TOPOLOGY",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"VERTICAL OVERLAP DETECTED: 3D volume intersects with {conflict_str}.",
            details={"conflicts": vertical_conflicts}
        )

    def _rule_06_floor_monotonicity(self, unit: PropertyUnit, floors: List[Floor]) -> ValidationResult:
        matching_floor = next((f for f in floors if f.building_id == unit.building_id and f.floor_number == unit.floor_number), None)
        if not matching_floor:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_06",
                rule_name="Floor Height Monotonicity",
                category="3D_GEOMETRY",
                status=ValidationStatus.WARNING,
                severity=ValidationSeverity.MEDIUM,
                message=f"No matching floor record found for Floor {unit.floor_number}.",
                details={"floor_number": unit.floor_number}
            )

        # Check if unit elevation bounds fit within the floor bounds
        if unit.z_min_m >= matching_floor.z_min_m - 0.1 and unit.z_max_m <= matching_floor.z_max_m + 0.1:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_06",
                rule_name="Floor Height Monotonicity",
                category="3D_GEOMETRY",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message=f"Unit elevation range (Z:{unit.z_min_m}–{unit.z_max_m}m) complies with Floor {matching_floor.floor_name} bounds (Z:{matching_floor.z_min_m}–{matching_floor.z_max_m}m).",
                details={"floor_z_min": matching_floor.z_min_m, "floor_z_max": matching_floor.z_max_m}
            )

        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_06",
            rule_name="Floor Height Monotonicity",
            category="3D_GEOMETRY",
            status=ValidationStatus.WARNING,
            severity=ValidationSeverity.HIGH,
            message=f"Unit elevation bounds (Z:{unit.z_min_m}–{unit.z_max_m}m) exceed Floor {matching_floor.floor_name} defined bounds (Z:{matching_floor.z_min_m}–{matching_floor.z_max_m}m).",
            details={"floor_z_min": matching_floor.z_min_m, "floor_z_max": matching_floor.z_max_m}
        )

    def _rule_07_missing_evidence(self, unit: PropertyUnit, evidences: List[Evidence]) -> ValidationResult:
        attached_sources = {e.source_type for e in evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)}
        required_sources = {"GIS_PARCEL", "FLOOR_PLAN", "LIDAR", "DRONE_IMAGERY"}
        missing = required_sources - attached_sources

        if not missing:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_07",
                rule_name="Spatial Evidence Completeness",
                category="EVIDENCE",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.LOW,
                message=f"All required spatial evidence sources are attached ({len(attached_sources)} sources verified).",
                details={"attached_sources": list(attached_sources)}
            )

        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_07",
            rule_name="Spatial Evidence Completeness",
            category="EVIDENCE",
            status=ValidationStatus.WARNING,
            severity=ValidationSeverity.MEDIUM,
            message=f"Missing spatial evidence sources: {', '.join(missing)}.",
            details={"missing_sources": list(missing), "attached_sources": list(attached_sources)}
        )

    def _rule_08_geometry_validity(self, unit: PropertyUnit) -> ValidationResult:
        try:
            poly = spatial_engine.create_polygon(unit.footprint_2d)
            if poly.is_valid and not poly.is_empty and poly.area > 0:
                area = spatial_engine.calculate_area(unit.footprint_2d)
                return ValidationResult(
                    id=str(uuid.uuid4()),
                    target_object_id=unit.id,
                    rule_id="RULE_08",
                    rule_name="Geometry Validity",
                    category="2D_GEOMETRY",
                    status=ValidationStatus.PASS,
                    severity=ValidationSeverity.LOW,
                    message=f"Valid 2D footprint geometry with non-zero surface area ({area:.2f} m²).",
                    details={"area_sqm": area}
                )
            else:
                return ValidationResult(
                    id=str(uuid.uuid4()),
                    target_object_id=unit.id,
                    rule_id="RULE_08",
                    rule_name="Geometry Validity",
                    category="2D_GEOMETRY",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.HIGH,
                    message="Invalid 2D footprint polygon geometry (self-intersecting or empty).",
                    details={}
                )
        except Exception as ex:
            return ValidationResult(
                id=str(uuid.uuid4()),
                target_object_id=unit.id,
                rule_id="RULE_08",
                rule_name="Geometry Validity",
                category="2D_GEOMETRY",
                status=ValidationStatus.FAIL,
                severity=ValidationSeverity.CRITICAL,
                message=f"Geometry parsing error: {str(ex)}.",
                details={"error": str(ex)}
            )

    def _rule_09_cross_source_conflict(self, unit: PropertyUnit, evidences: List[Evidence], building: Building) -> ValidationResult:
        # Check for multi-source height conflict scenario (e.g. Floor plan 30m vs Point cloud 27m)
        fp_evidence = next((e for e in evidences if e.source_type == "FLOOR_PLAN"), None)
        pc_evidence = next((e for e in evidences if e.source_type in ("POINT_CLOUD", "LIDAR")), None)

        if fp_evidence and pc_evidence:
            fp_height = fp_evidence.metadata.get("estimated_building_height_m")
            pc_height = pc_evidence.metadata.get("estimated_building_height_m")
            if fp_height and pc_height and abs(fp_height - pc_height) > 1.5:
                return ValidationResult(
                    id=str(uuid.uuid4()),
                    target_object_id=unit.id,
                    rule_id="RULE_09",
                    rule_name="Cross-Source Evidence Conflict",
                    category="EVIDENCE",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.HIGH,
                    message=f"MULTI-SOURCE DATA CONFLICT DETECTED: Floor Plan height ({fp_height}m) disagrees with Point Cloud height ({pc_height}m). Officer review required.",
                    details={
                        "floor_plan_height_m": fp_height,
                        "point_cloud_height_m": pc_height,
                        "discrepancy_m": round(abs(fp_height - pc_height), 2)
                    }
                )

        return ValidationResult(
            id=str(uuid.uuid4()),
            target_object_id=unit.id,
            rule_id="RULE_09",
            rule_name="Cross-Source Evidence Conflict",
            category="EVIDENCE",
            status=ValidationStatus.PASS,
            severity=ValidationSeverity.LOW,
            message="No multi-source data conflict detected across attached spatial sensors.",
            details={}
        )

validation_engine = ValidationEngine()
