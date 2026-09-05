# GeoVISTA — Volumetric Cadastral Data Model

## Conceptual Hierarchy

```
Land Parcel (2D Cadastral Base)
  ├── Building Structure
  │     ├── Floor Level (-1..N)
  │     │     └── Property Unit (Volumetric 3D Cadastre)
  │     └── Attached Sensor Evidence
  ├── Underground Infrastructure (Basement, Utility Corridors, Pipelines)
  └── Elevated Infrastructure (Metro Corridors, Flyovers, Air Rights)
```

## Core Entities & Schemas

### 1. Parcel
- `id`: UUID string
- `parcel_code`: e.g. "P001"
- `state`, `district`, `locality`, `village`: Administrative context
- `geometry_2d`: Closed coordinate ring `[[lng, lat], ...]`
- `area_sqm`: Approximate surface area
- `area_type`: `URBAN` | `RURAL`
- `land_use`: `RESIDENTIAL_COMMERCIAL`, `AGRICULTURAL`, etc.

### 2. Building
- `id`, `building_code`, `parcel_id`
- `name`: e.g. "Navkar Heights Apartment"
- `total_floors`, `basement_floors`
- `footprint_2d`: Extrusion footprint polygon
- `ground_elevation_m`: Elevation above sea level (AMSL)
- `total_height_m`: Height from ground to roof

### 3. PropertyUnit (Volumetric Cadastre MVP)
- `id`, `proposed_3d_id`: Standardized 3D identifier
- `parcel_id`, `building_id`, `floor_id`
- `floor_number`, `unit_number`
- `z_min_m`, `z_max_m`: Absolute vertical bounds in meters AMSL
- `footprint_2d`: Unit boundary polygon
- `verification_status`: `NOT_YET_VERIFIED`, `UNDER_REVIEW`, `CORRECTION_REQUIRED`, `APPROVED`, `REJECTED`
- `technical_confidence`: Float 0-100%
- `revision_number`: Version integer incremented upon officer modification

### 4. Evidence (Common Multi-Sensor Model)
- `id`, `object_id`, `object_type`
- `source_type`: `GIS_PARCEL`, `DRONE_IMAGERY`, `LIDAR`, `POINT_CLOUD`, `FLOOR_PLAN`, `GNSS_CORS`, `DEM`, `DSM`, `AI_DERIVED`, `SYSTEM_DERIVED`, `SYNTHETIC_DEMO`
- `source_reference`, `acquisition_date`, `processing_method`, `quality_score`
- `is_synthetic`: Always explicitly `True` for demo records

### 5. Underground & Elevated Infrastructure
- Extends volumetric bounds below ground ($Z < \text{ground}$) or above ground ($Z > \text{building}$)
- Includes types: `BASEMENT_PARKING`, `PIPELINE`, `CABLE_TUNNEL`, `ELEVATED_METRO`, `FLYOVER`
