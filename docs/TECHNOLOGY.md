# GeoVISTA — Technology Stack & Architectural Decisions

## Backend Architecture
- **Framework:** FastAPI (Python 3.11/3.13) — High performance asynchronous REST API
- **Data Validation:** Pydantic V2 schemas with strict typing
- **Spatial Topology:** Shapely 2.0+ (OGC polygon intersection, containment, Hausdorff distance)
- **Synthetic Modeling:** Faker (Indian administrative context) + NumPy + controlled elevation math
- **Testing:** Pytest with HTTPX AsyncClient (100% strict pass rate)
- **Database Abstraction:** In-Memory Repository with JSON export/import; designed for PostGIS migration

## Frontend Architecture
- **Framework:** React 18+ with TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (Government portal clean theme)
- **3D Visualization:** Three.js / React Three Fiber / Drei
- **Icons:** Lucide React

## MVP vs Production Horizon
| Component | MVP Prototype | Production Target |
|---|---|---|
| Cadastre Model | Footprint 2D + Z-bounds | Full CityGML / LandInfra 3D Solids |
| Spatial DB | Memory / SQLite | PostgreSQL 16 + PostGIS 3.4 3D |
| LiDAR Engine | Controlled cross-section simulation | Full PDAL streaming pipeline |
| AI Extraction | Deterministic rule-assisted ML | DeepLabV3+ / YOLOv9 building segmentation |
| 3D Viewer | Three.js R3F Canvas | CesiumJS with OGC 3D Tiles 1.1 |
