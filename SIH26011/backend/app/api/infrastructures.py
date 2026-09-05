from fastapi import APIRouter
from typing import List, Dict, Any
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import InfrastructureResponse

router = APIRouter(prefix="/api/infrastructures", tags=["Underground & Elevated Infrastructure"])

@router.get("/underground", response_model=List[InfrastructureResponse])
def get_underground_infrastructures():
    return [InfrastructureResponse(**u.__dict__) for u in repository.underground.values()]

@router.get("/elevated", response_model=List[InfrastructureResponse])
def get_elevated_infrastructures():
    return [InfrastructureResponse(**e.__dict__) for e in repository.elevated.values()]
