from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import (
    ParcelResponse,
    BuildingResponse,
    InfrastructureResponse,
    StructureCandidateResponse,
    EvidenceResponse
)

router = APIRouter(prefix="/api/parcels", tags=["Parcels"])

@router.get("", response_model=List[ParcelResponse])
def get_parcels(area_type: Optional[str] = Query(None, description="Filter by URBAN or RURAL")):
    parcels = list(repository.parcels.values())
    if area_type:
        parcels = [p for p in parcels if p.area_type == area_type.upper()]
    return [ParcelResponse(**p.__dict__) for p in parcels]

@router.get("/{parcel_id}", response_model=ParcelResponse)
def get_parcel_by_id(parcel_id: str):
    parcel = repository.parcels.get(parcel_id)
    if not parcel:
        # Search by parcel_code
        parcel = next((p for p in repository.parcels.values() if p.parcel_code.upper() == parcel_id.upper()), None)
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel with ID or code '{parcel_id}' not found.")
    return ParcelResponse(**parcel.__dict__)

@router.get("/{parcel_id}/buildings", response_model=List[BuildingResponse])
def get_buildings_for_parcel(parcel_id: str):
    p = get_parcel_by_id(parcel_id)
    buildings = [b for b in repository.buildings.values() if b.parcel_id == p.id]
    return [BuildingResponse(**b.__dict__) for b in buildings]

@router.get("/{parcel_id}/infrastructures", response_model=List[InfrastructureResponse])
def get_infrastructures_for_parcel(parcel_id: str):
    p = get_parcel_by_id(parcel_id)
    infras = [i for i in list(repository.underground.values()) + list(repository.elevated.values()) if i.parcel_id == p.id]
    return [InfrastructureResponse(**i.__dict__) for i in infras]

@router.get("/{parcel_id}/candidates", response_model=List[StructureCandidateResponse])
def get_candidates_for_parcel(parcel_id: str):
    p = get_parcel_by_id(parcel_id)
    cands = [c for c in repository.structure_candidates if c.parcel_id == p.id]
    return [StructureCandidateResponse(**c.__dict__) for c in cands]

@router.get("/{parcel_id}/evidence", response_model=List[EvidenceResponse])
def get_evidence_for_parcel(parcel_id: str):
    p = get_parcel_by_id(parcel_id)
    evs = [e for e in repository.evidences if e.object_id == p.id]
    return [EvidenceResponse(**e.__dict__) for e in evs]
