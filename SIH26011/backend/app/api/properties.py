from fastapi import APIRouter, HTTPException
from typing import List
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import (
    PropertyUnitResponse, PropertyGeometryResponse, EvidenceResponse,
    ConfidenceScoreResponse, ValidationSummaryResponse, ValidationResultResponse
)
from app.services.spatial_engine import spatial_engine
from app.services.confidence_engine import confidence_engine
from app.services.validation_engine import validation_engine

router = APIRouter(prefix="/api/properties", tags=["Properties"])

@router.get("", response_model=List[PropertyUnitResponse])
def get_properties():
    return [PropertyUnitResponse(**u.__dict__) for u in repository.units.values()]

@router.get("/{property_id}", response_model=PropertyUnitResponse)
def get_property_by_id(property_id: str):
    unit = repository.units.get(property_id)
    if not unit:
        unit = next((u for u in repository.units.values() if u.proposed_3d_id.upper() == property_id.upper() or u.property_code.upper() == property_id.upper()), None)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Property unit '{property_id}' not found.")
    return PropertyUnitResponse(**unit.__dict__)

@router.get("/{property_id}/geometry", response_model=PropertyGeometryResponse)
def get_property_geometry(property_id: str):
    unit = get_property_by_id(property_id)
    unit_obj = repository.units[unit.id]
    
    area = spatial_engine.calculate_area(unit_obj.footprint_2d)
    volume = spatial_engine.calculate_volume(unit_obj.footprint_2d, unit_obj.z_min_m, unit_obj.z_max_m)
    bbox = spatial_engine.get_bounding_box_3d(unit_obj.footprint_2d, unit_obj.z_min_m, unit_obj.z_max_m)
    
    return PropertyGeometryResponse(
        id=unit_obj.id,
        proposed_3d_id=unit_obj.proposed_3d_id,
        footprint_2d=unit_obj.footprint_2d,
        z_min_m=unit_obj.z_min_m,
        z_max_m=unit_obj.z_max_m,
        bounding_box_3d=bbox,
        area_sqm=round(area, 2),
        volume_cum=round(volume, 2)
    )

@router.get("/{property_id}/evidence", response_model=List[EvidenceResponse])
def get_property_evidence(property_id: str):
    unit = get_property_by_id(property_id)
    evs = [e for e in repository.evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)]
    return [EvidenceResponse(**e.__dict__) for e in evs]

@router.get("/{property_id}/confidence", response_model=ConfidenceScoreResponse)
def get_property_confidence(property_id: str):
    unit = get_property_by_id(property_id)
    unit_obj = repository.units[unit.id]
    evs = [e for e in repository.evidences if e.object_id in (unit_obj.id, unit_obj.building_id, unit_obj.parcel_id)]
    
    bld = repository.buildings.get(unit_obj.building_id)
    parcel = repository.parcels.get(unit_obj.parcel_id)
    floors = list(repository.floors.values())
    all_units = list(repository.units.values())
    
    val_results = validation_engine.validate_property(unit_obj, all_units, bld, parcel, floors, evs)
    score_obj = confidence_engine.calculate_confidence(unit_obj, evs, val_results)
    
    return ConfidenceScoreResponse(**score_obj.__dict__)

@router.get("/{property_id}/validation", response_model=ValidationSummaryResponse)
def get_property_validation(property_id: str):
    unit = get_property_by_id(property_id)
    unit_obj = repository.units[unit.id]
    
    bld = repository.buildings.get(unit_obj.building_id)
    parcel = repository.parcels.get(unit_obj.parcel_id)
    floors = list(repository.floors.values())
    all_units = list(repository.units.values())
    evs = [e for e in repository.evidences if e.object_id in (unit_obj.id, unit_obj.building_id, unit_obj.parcel_id)]
    
    val_results = validation_engine.validate_property(unit_obj, all_units, bld, parcel, floors, evs)
    
    passed = sum(1 for r in val_results if r.status == "PASS")
    warnings = sum(1 for r in val_results if r.status == "WARNING")
    failed = sum(1 for r in val_results if r.status == "FAIL")
    
    overall = "PASS" if failed == 0 and warnings == 0 else ("WARNING" if failed == 0 else "FAIL")
    
    return ValidationSummaryResponse(
        property_id=unit_obj.id,
        overall_status=overall,
        total_rules_checked=len(val_results),
        passed_rules=passed,
        warning_rules=warnings,
        failed_rules=failed,
        results=[ValidationResultResponse(**r.__dict__) for r in val_results]
    )

@router.post("/{property_id}/validate", response_model=ValidationSummaryResponse)
def run_property_validation(property_id: str):
    return get_property_validation(property_id)
