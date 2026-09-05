from fastapi import APIRouter
from typing import Dict, Any
from app.repositories.data_repository import repository
from app.models.entities import VerificationStatus

router = APIRouter(prefix="/api/simulation", tags=["Demo Simulation Scenarios"])

@router.post("/reset")
def reset_simulation():
    """Reset repository data to clean baseline."""
    repository.reset_data()
    return {"message": "Simulation data reset to synthetic baseline successfully."}

@router.post("/spatial-error")
def trigger_spatial_error_scenario():
    """Scenario 4: Trigger Vertical Overlap Error between Unit 301 and Unit 302."""
    u302 = next((u for u in repository.units.values() if u.unit_number == "302"), None)
    if u302:
        u302.z_min_m = 512.5  # Overlaps with 301 (510.5 - 514.0m)
        u302.z_max_m = 516.0
        u302.verification_status = VerificationStatus.CORRECTION_REQUIRED
    return {
        "scenario": "Scenario 4 — Vertical Elevation Overlap",
        "affected_unit": "Unit 302",
        "status": "FAIL",
        "message": "Unit 302 height range set to 512.5m–516.0m, creating 1.5m vertical overlap with Unit 301 (510.5m–514.0m)."
    }

@router.post("/missing-evidence")
def trigger_missing_evidence_scenario():
    """Scenario 8: Remove floor plan evidence for Unit 401."""
    u401 = next((u for u in repository.units.values() if u.unit_number == "401"), None)
    if u401:
        repository.evidences = [e for e in repository.evidences if not (e.object_id == u401.id and e.source_type == "FLOOR_PLAN")]
    return {
        "scenario": "Scenario 8 — Missing Evidence",
        "affected_unit": "Unit 401",
        "message": "Removed Architectural Floor Plan evidence record for Unit 401."
    }

@router.post("/multi-source-conflict")
def trigger_multi_source_conflict_scenario():
    """Scenario 3: Introduce disagreement between Floor Plan and LiDAR point cloud height."""
    fp_ev = next((e for e in repository.evidences if e.source_type == "FLOOR_PLAN" and e.metadata.get("estimated_building_height_m")), None)
    if fp_ev:
        fp_ev.metadata["estimated_building_height_m"] = 30.0
    pc_ev = next((e for e in repository.evidences if e.source_type in ("LIDAR", "POINT_CLOUD") and e.metadata.get("estimated_building_height_m")), None)
    if pc_ev:
        pc_ev.metadata["estimated_building_height_m"] = 27.0

    return {
        "scenario": "Scenario 3 — Multi-Source Evidence Conflict",
        "floor_plan_height_m": 30.0,
        "point_cloud_height_m": 27.0,
        "discrepancy_m": 3.0,
        "message": "Introduced 3.0m height discrepancy between Floor Plan (30m) and Point Cloud (27m)."
    }

@router.post("/rural-structure")
def get_rural_structure_scenario():
    """Scenario 6 & 7: Return rural sensor structure candidate detection results."""
    candidates = [c.__dict__ for c in repository.structure_candidates]
    return {
        "scenario": "Rural Structure Detection & False-Positive Analysis",
        "candidates": candidates
    }
