from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import LiDARAnalysisResponse
from app.services.lidar_engine import lidar_engine

router = APIRouter(prefix="/api/lidar", tags=["LiDAR & Point Cloud"])

@router.post("/analyze", response_model=LiDARAnalysisResponse)
def analyze_lidar(data: Dict[str, Any]):
    prop_id = data.get("property_id")
    if not prop_id:
        raise HTTPException(status_code=400, detail="property_id is required.")
    
    analysis = lidar_engine.analyze_point_cloud(prop_id)
    return LiDARAnalysisResponse(**analysis.__dict__)

@router.get("/{property_id}/lidar-analysis", response_model=LiDARAnalysisResponse)
def get_lidar_analysis(property_id: str):
    analysis = lidar_engine.analyze_point_cloud(property_id)
    return LiDARAnalysisResponse(**analysis.__dict__)
