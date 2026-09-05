from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import AIAnalysisResponse
from app.services.ai_engine import ai_engine

router = APIRouter(prefix="/api/ai", tags=["AI / ML Capabilities"])

@router.post("/building-extraction", response_model=AIAnalysisResponse)
def run_building_extraction(data: Dict[str, Any]):
    parcel_id = data.get("parcel_id", "parcel-urban-001")
    parcel = repository.parcels.get(parcel_id)
    footprint = parcel.geometry_2d if parcel else [[77.412, 23.259], [77.413, 23.259], [77.413, 23.260], [77.412, 23.260], [77.412, 23.259]]
    
    res = ai_engine.extract_building(parcel_id, footprint)
    repository.ai_analyses.append(res)
    return AIAnalysisResponse(**res.__dict__)

@router.post("/floor-segmentation", response_model=AIAnalysisResponse)
def run_floor_segmentation(data: Dict[str, Any]):
    bld_id = data.get("building_id", "bld-urban-001")
    res = ai_engine.segment_floors(bld_id, total_height_m=18.0, total_floors=5)
    repository.ai_analyses.append(res)
    return AIAnalysisResponse(**res.__dict__)

@router.post("/vertical-delineation", response_model=AIAnalysisResponse)
def run_vertical_delineation(data: Dict[str, Any]):
    flr_id = data.get("floor_id", "floor-b1-3")
    res = ai_engine.delineate_vertical_parcels(building_id="bld-urban-001", floor_id=flr_id, floor_number=3)
    repository.ai_analyses.append(res)
    return AIAnalysisResponse(**res.__dict__)
