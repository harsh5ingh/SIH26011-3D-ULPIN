from fastapi import APIRouter, Query
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import SearchResponse, SearchResultItem

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("", response_model=SearchResponse)
def search_application_data(q: str = Query(..., min_length=1, description="Search query text")):
    query = q.strip().upper()
    results: list[SearchResultItem] = []

    # 1. Search Property Units
    for u in repository.units.values():
        if (query in u.proposed_3d_id.upper() or
            query in u.property_code.upper() or
            query in u.unit_number.upper() or
            query in u.primary_use.upper()):
            results.append(SearchResultItem(
                id=u.id,
                type="PROPERTY_UNIT",
                title=f"Unit {u.unit_number} — {u.primary_use}",
                subtitle=f"Proposed 3D ID: {u.proposed_3d_id}",
                proposed_3d_id=u.proposed_3d_id,
                status=u.verification_status
            ))

    # 2. Search Parcels
    for p in repository.parcels.values():
        if (query in p.parcel_code.upper() or
            query in p.locality.upper() or
            (p.village and query in p.village.upper()) or
            query in p.state.upper() or
            query in p.district.upper()):
            results.append(SearchResultItem(
                id=p.id,
                type="PARCEL",
                title=f"Parcel {p.parcel_code} ({p.locality})",
                subtitle=f"Land Use: {p.land_use} | Area: {p.area_sqm:.1f} m²",
                proposed_3d_id=None,
                status=p.status
            ))

    # 3. Search Buildings
    for b in repository.buildings.values():
        if (query in b.building_code.upper() or query in b.name.upper()):
            results.append(SearchResultItem(
                id=b.id,
                type="BUILDING",
                title=f"{b.name} ({b.building_code})",
                subtitle=f"Floors: {b.total_floors} | Structure: {b.structure_type}",
                proposed_3d_id=None,
                status=b.status
            ))

    # 4. Search Underground / Elevated Infrastructure
    for ug in repository.underground.values():
        if query in ug.infrastructure_code.upper() or query in ug.name.upper():
            results.append(SearchResultItem(
                id=ug.id,
                type="UNDERGROUND_INFRASTRUCTURE",
                title=f"{ug.name} ({ug.infrastructure_code})",
                subtitle=f"Z: {ug.z_min_m}m to {ug.z_max_m}m",
                proposed_3d_id=ug.proposed_3d_id,
                status=ug.verification_status
            ))

    for ev in repository.elevated.values():
        if query in ev.infrastructure_code.upper() or query in ev.name.upper():
            results.append(SearchResultItem(
                id=ev.id,
                type="ELEVATED_INFRASTRUCTURE",
                title=f"{ev.name} ({ev.infrastructure_code})",
                subtitle=f"Z: {ev.z_min_m}m to {ev.z_max_m}m",
                proposed_3d_id=ev.proposed_3d_id,
                status=ev.verification_status
            ))

    return SearchResponse(
        query=q,
        total_results=len(results),
        results=results
    )
