import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoVISTA — Geospatial Volumetric Intelligence & Spatial Topology Architecture"
    PROBLEM_STATEMENT_ID: str = "PS26011"
    PROBLEM_STATEMENT_TITLE: str = "3D ULPIN Generation and Vertical Property Mapping System"
    ORGANIZATION: str = "Ministry of Rural Development"
    DEPARTMENT: str = "Department of Land Resources (DoLR)"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    RANDOM_SEED: int = 42
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
