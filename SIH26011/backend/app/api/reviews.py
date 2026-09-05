from fastapi import APIRouter, HTTPException
from typing import List
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import ReviewCaseResponse, CorrectPropertyRequest, ReviewDecisionRequest, PropertyUnitResponse
from app.models.entities import VerificationStatus, RoleEnum
from app.services.review_engine import review_engine
from app.services.validation_engine import validation_engine

router = APIRouter(prefix="/api/reviews", tags=["Reviews & Verification"])

@router.get("", response_model=List[ReviewCaseResponse])
def get_review_cases():
    return [ReviewCaseResponse(**c.__dict__) for c in repository.review_cases.values()]

@router.get("/{case_id}", response_model=ReviewCaseResponse)
def get_review_case(case_id: str):
    case = repository.review_cases.get(case_id)
    if not case:
        case = next((c for c in repository.review_cases.values() if c.property_id == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail=f"Review case '{case_id}' not found.")
    return ReviewCaseResponse(**case.__dict__)

@router.post("/{case_id}/approve", response_model=ReviewCaseResponse)
def approve_review_case(case_id: str, req: ReviewDecisionRequest):
    case = get_review_case(case_id)
    case_obj = repository.review_cases[case.id]
    
    # Update review status
    updated_case = review_engine.update_review_status(
        case_obj, VerificationStatus.APPROVED, "Officer R. K. Sharma", req.reason
    )
    
    # Update property unit status in repository
    unit = repository.units.get(case_obj.property_id)
    if unit:
        unit.verification_status = VerificationStatus.APPROVED
        unit.under_review_note = None
        
    return ReviewCaseResponse(**updated_case.__dict__)

@router.post("/{case_id}/reject", response_model=ReviewCaseResponse)
def reject_review_case(case_id: str, req: ReviewDecisionRequest):
    case = get_review_case(case_id)
    case_obj = repository.review_cases[case.id]
    
    updated_case = review_engine.update_review_status(
        case_obj, VerificationStatus.REJECTED, "Officer R. K. Sharma", req.reason
    )
    
    unit = repository.units.get(case_obj.property_id)
    if unit:
        unit.verification_status = VerificationStatus.REJECTED
        unit.under_review_note = f"Rejected: {req.reason}"
        
    return ReviewCaseResponse(**updated_case.__dict__)

@router.post("/{case_id}/correct", response_model=PropertyUnitResponse)
def correct_property_geometry(case_id: str, req: CorrectPropertyRequest):
    """
    Officer Correction endpoint.
    Modifies property Zmin/Zmax bounds or 2D footprint, increments revision, updates state, and re-validates.
    """
    case = get_review_case(case_id)
    case_obj = repository.review_cases[case.id]
    unit = repository.units.get(case_obj.property_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Associated property unit for case '{case_id}' not found.")

    prev_values = {"z_min_m": unit.z_min_m, "z_max_m": unit.z_max_m, "footprint_2d": unit.footprint_2d}
    changed_fields = []
    new_values = {}

    if req.z_min_m is not None:
        unit.z_min_m = req.z_min_m
        changed_fields.append("z_min_m")
        new_values["z_min_m"] = req.z_min_m

    if req.z_max_m is not None:
        unit.z_max_m = req.z_max_m
        changed_fields.append("z_max_m")
        new_values["z_max_m"] = req.z_max_m

    if req.footprint_2d is not None:
        unit.footprint_2d = req.footprint_2d
        changed_fields.append("footprint_2d")
        new_values["footprint_2d"] = req.footprint_2d

    unit.revision_number += 1
    
    # Re-validate property unit
    bld = repository.buildings.get(unit.building_id)
    parcel = repository.parcels.get(unit.parcel_id)
    floors = list(repository.floors.values())
    all_units = list(repository.units.values())
    evs = [e for e in repository.evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)]
    
    val_results = validation_engine.validate_property(unit, all_units, bld, parcel, floors, evs)
    failed = [r for r in val_results if r.status == "FAIL"]

    if not failed:
        unit.verification_status = VerificationStatus.APPROVED
        unit.under_review_note = None
        review_engine.update_review_status(case_obj, VerificationStatus.APPROVED, "Officer R. K. Sharma", f"Correction accepted: {req.reason}. Re-validation PASSED.")
    else:
        unit.verification_status = VerificationStatus.CORRECTION_REQUIRED
        unit.under_review_note = f"Correction re-validation failed: {failed[0].message}"

    # Log revision and audit
    review_engine.create_revision(
        property_id=unit.id,
        revision_number=unit.revision_number,
        actor_role=RoleEnum.INSPECTION_OFFICER,
        changed_fields=changed_fields,
        previous_values=prev_values,
        new_values=new_values,
        reason=req.reason
    )

    review_engine.log_audit(
        actor_role=RoleEnum.INSPECTION_OFFICER,
        object_id=unit.id,
        object_type="PropertyUnit",
        action="PROPERTY_CORRECTED",
        previous_state=prev_values,
        new_state=new_values,
        notes=f"Officer corrected geometry: {req.reason}"
    )

    return PropertyUnitResponse(**unit.__dict__)
