from fastapi import APIRouter, HTTPException
from typing import List
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import BuildingResponse, FloorResponse, PropertyUnitResponse

router = APIRouter(prefix="/api/buildings", tags=["Buildings"])

@router.get("", response_model=List[BuildingResponse])
def get_buildings():
    return [BuildingResponse(**b.__dict__) for b in repository.buildings.values()]

@router.get("/{building_id}", response_model=BuildingResponse)
def get_building_by_id(building_id: str):
    bld = repository.buildings.get(building_id)
    if not bld:
        bld = next((b for b in repository.buildings.values() if b.building_code.upper() == building_id.upper()), None)
    if not bld:
        raise HTTPException(status_code=404, detail=f"Building '{building_id}' not found.")
    return BuildingResponse(**bld.__dict__)

@router.get("/{building_id}/floors", response_model=List[FloorResponse])
def get_building_floors(building_id: str):
    floors = [f for f in repository.floors.values() if f.building_id == building_id]
    floors.sort(key=lambda x: x.floor_number)
    return [FloorResponse(**f.__dict__) for f in floors]

@router.get("/{building_id}/properties", response_model=List[PropertyUnitResponse])
def get_building_properties(building_id: str):
    units = [u for u in repository.units.values() if u.building_id == building_id]
    return [PropertyUnitResponse(**u.__dict__) for u in units]
