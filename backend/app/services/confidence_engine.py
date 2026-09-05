from typing import List
from app.models.entities import PropertyUnit, Evidence, ValidationResult, ConfidenceScore, ValidationStatus
from datetime import datetime

class ConfidenceEngine:
    """
    Prototype Technical Confidence Engine for GeoVISTA.
    Calculates weighted confidence score (0-100%) based on 5 parameters:
    - Evidence Completeness (25%)
    - Geometry Quality (25%)
    - Positional Quality (20%)
    - Cross-Source Agreement (20%)
    - Validation Status (10%)
    """

    @staticmethod
    def calculate_confidence(
        unit: PropertyUnit,
        evidences: List[Evidence],
        validation_results: List[ValidationResult]
    ) -> ConfidenceScore:
        # 1. Evidence Completeness (25%)
        # Check attached evidence types (GIS, Drone, LiDAR, Floor Plan, GNSS, DEM/DSM)
        attached_sources = {e.source_type for e in evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)}
        expected_types = {"GIS_PARCEL", "DRONE_IMAGERY", "LIDAR", "FLOOR_PLAN", "GNSS_CORS", "DEM", "DSM"}
        found_count = len(attached_sources.intersection(expected_types))
        evidence_score = min(100.0, (found_count / len(expected_types)) * 100.0)

        # 2. Geometry Quality (25%)
        # Evaluates footprint regularity & vertical bounds sanity
        geom_score = 100.0
        if unit.z_max_m <= unit.z_min_m:
            geom_score -= 50.0
        if unit.area_sqm <= 0:
            geom_score -= 50.0

        # 3. Positional Quality (20%)
        # Checks if GNSS/CORS evidence is attached with high accuracy
        gnss_ev = next((e for e in evidences if e.source_type == "GNSS_CORS"), None)
        positional_score = 95.0 if gnss_ev else 70.0

        # 4. Cross-Source Agreement (20%)
        # Checks for multi-source conflict rule result
        conflict_rule = next((r for r in validation_results if r.rule_id == "RULE_09"), None)
        if conflict_rule and conflict_rule.status == ValidationStatus.FAIL:
            agreement_score = 40.0
        elif conflict_rule and conflict_rule.status == ValidationStatus.WARNING:
            agreement_score = 70.0
        else:
            agreement_score = 95.0

        # 5. Validation Score (10%)
        total_rules = len(validation_results)
        passed_rules = sum(1 for r in validation_results if r.status == ValidationStatus.PASS)
        val_score = (passed_rules / max(1, total_rules)) * 100.0

        # Calculate overall weighted score
        overall = (
            (0.25 * evidence_score) +
            (0.25 * geom_score) +
            (0.20 * positional_score) +
            (0.20 * agreement_score) +
            (0.10 * val_score)
        )
        overall = round(max(0.0, min(100.0, overall)), 1)

        return ConfidenceScore(
            object_id=unit.id,
            overall_score=overall,
            evidence_completeness=round(evidence_score, 1),
            geometry_quality=round(geom_score, 1),
            positional_quality=round(positional_score, 1),
            cross_source_agreement=round(agreement_score, 1),
            validation_score=round(val_score, 1),
            calculation_timestamp=datetime.utcnow().isoformat()
        )

confidence_engine = ConfidenceEngine()
