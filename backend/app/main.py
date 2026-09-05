from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Import API routers
from app.api import parcels, buildings, properties, reviews, reports, lidar, ai, search, simulation, audit, infrastructures

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        f"Official Backend API for {settings.PROJECT_NAME} ({settings.PROBLEM_STATEMENT_ID}).\n\n"
        "Provides 3D cadastral volumetric mapping, proposed 3D spatial identifier generation, "
        "multi-sensor spatial evidence aggregation, deterministic 9-rule topology validation, "
        "prototype technical confidence scoring, and human-in-the-loop review workflows."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(parcels.router)
app.include_router(buildings.router)
app.include_router(properties.router)
app.include_router(infrastructures.router)
app.include_router(reviews.router)
app.include_router(reports.router)
app.include_router(lidar.router)
app.include_router(ai.router)
app.include_router(search.router)
app.include_router(simulation.router)
app.include_router(audit.router)

@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint returning system status."""
    return {
        "status": "HEALTHY",
        "project": settings.PROJECT_NAME,
        "problem_statement": settings.PROBLEM_STATEMENT_ID,
        "title": settings.PROBLEM_STATEMENT_TITLE,
        "organization": settings.ORGANIZATION,
        "department": settings.DEPARTMENT,
        "privacy": "This prototype processes only project/demo data and files explicitly selected by the user. It does not scan personal files or folders."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
